import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const databasePath = process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : path.join(root, "data", "phrases.db");
const seedPath = path.join(root, "data", "phrases.json");
try {
  await fs.access(seedPath);
} catch {
  throw new Error("data/phrases.json has been removed; restore originals from the Turso backup or re-import the source data first.");
}
const rows = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const names = ["Að lágmarka", "Að lúffa", "Að undirbúa", "Að uppræta", "Að þroskast", "Ættarmót", "Ofviðri", "Öllu lokið", "Örlögin ráða", "Undan bragði", "Undan vindi", "Undir rós", "Í dentíð", "Í kyrrþey", "Í laumi", "Í sífellu", "Með köflum", "Núliðin tíð", "Tíminn líður", "Að sjóast"];
const originals = rows.filter((row) => names.includes(row.icelandic));
if (originals.length !== names.length) throw new Error(`Expected ${names.length} source records, found ${originals.length}`);
const db = new Database(databasePath);
db.pragma("busy_timeout = 10000");
const update = db.prepare(`UPDATE phrases SET english = ?, meaning = ?, literal = ?, why = ?, source = ?, category = ?, translation_status = CASE WHEN TRIM(?) = '' AND TRIM(?) = '' AND TRIM(?) = '' THEN 'missing' WHEN TRIM(?) = '' OR TRIM(?) = '' OR TRIM(?) = '' THEN 'partly_missing' ELSE 'translated' END, review_status = 'unreviewed', admin_notes = '', translated_by = '', updated_at = CURRENT_TIMESTAMP WHERE icelandic = ?`);
db.transaction(() => {
  for (const row of originals) {
    const meaning = row.meaning ?? "";
    const literal = row.literal ?? "";
    const why = row.why ?? "";
    const result = update.run(meaning, meaning, literal, why, row.source ?? "Tilvitnun", row.category ?? "Expressions", meaning, literal, why, meaning, literal, why, row.icelandic);
    if (result.changes !== 1) throw new Error(`Expected one database record for ${row.icelandic}, changed ${result.changes}`);
  }
})();
console.log(`Restored ${originals.length} original records in ${databasePath}`);
