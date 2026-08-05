import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const source = path.resolve(process.argv[2] || "data/phrases.tsv");
if (!fs.existsSync(source)) {
  throw new Error(`TSV file not found: ${source}`);
}

const lines = fs.readFileSync(source, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
const headers = lines.shift()?.split("\t").map((value) => value.trim()) ?? [];
const required = ["Phrase_IS", "Literal_EN", "Meaning_EN", "The_Why (Etymology/Context)"];
for (const header of required) {
  if (!headers.includes(header)) throw new Error(`Missing required column: ${header}`);
}

const rows = lines.map((line, lineIndex) => {
  const values = line.split("\t");
  if (values.length < 4) throw new Error(`Invalid TSV row ${lineIndex + 2}`);
  return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
});

function calculateComplexity(expression) {
  const words = expression.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  if (!words.length) return 1;
  const lengths = words.map((word) => Array.from(word).length);
  const averageLength = lengths.reduce((sum, length) => sum + length, 0) / words.length;
  const longWordRatio = lengths.filter((length) => length >= 9).length / words.length;
  const letterCount = lengths.reduce((sum, length) => sum + length, 0);
  const variants = (expression.match(/[()/]/g) ?? []).length;
  return Math.max(1, Math.min(100, Math.round(
    Math.min(65, words.length * 7) +
    Math.min(16, Math.max(0, averageLength - 4) * 3) +
    longWordRatio * 10 +
    Math.min(5, Math.max(0, letterCount - 30) / 8) +
    Math.min(4, variants),
  )));
}

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "phrases.db"));
const columns = db.prepare("PRAGMA table_info(phrases)").all();
if (!columns.length) throw new Error("Open the app once before importing so the database schema is created.");

const insert = db.prepare(`
  INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category, complexity)
  VALUES (?, ?, '', ?, ?, ?, ?, 'Expressions', ?)
`);
const defaultSource = process.argv[3] || "Tilvitnun";
const importRows = db.transaction(() => {
  db.prepare("DELETE FROM phrases").run();
  for (const row of rows) {
    insert.run(
      row.Phrase_IS,
      row.Meaning_EN,
      row.Meaning_EN,
      row.Literal_EN,
      row["The_Why (Etymology/Context)"],
      row.Source || defaultSource,
      calculateComplexity(row.Phrase_IS),
    );
  }
});

importRows();
console.log(`Imported ${rows.length} phrases from ${source}`);
