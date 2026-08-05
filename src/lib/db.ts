import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Phrase = {
  id: number;
  icelandic: string;
  meaning: string;
  literal: string;
  why: string;
  source: string;
  category: string;
  mastery: number;
  reviews: number;
};

export type DashboardData = {
  phrases: Phrase[];
  stats: { total: number; mastered: number; reviews: number };
};

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const databasePath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.join(dataDir, "phrases.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icelandic TEXT NOT NULL,
    english TEXT NOT NULL,
    pronunciation TEXT NOT NULL DEFAULT '',
    meaning TEXT NOT NULL DEFAULT '',
    literal TEXT NOT NULL DEFAULT '',
    why TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'Tilvitnun',
    category TEXT NOT NULL DEFAULT 'Everyday',
    mastery INTEGER NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const columns = db.prepare("PRAGMA table_info(phrases)").all() as { name: string }[];
for (const column of ["meaning", "literal", "why"]) {
  if (!columns.some(({ name }) => name === column)) db.exec(`ALTER TABLE phrases ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
}
if (!columns.some(({ name }) => name === "source")) {
  db.exec("ALTER TABLE phrases ADD COLUMN source TEXT NOT NULL DEFAULT 'Tilvitnun'");
}
db.exec(`
  UPDATE phrases SET meaning = english WHERE meaning = '';
  UPDATE phrases SET literal = pronunciation WHERE literal = '';
`);

const seed = db.prepare(`
  INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category)
  VALUES (?, ?, '', ?, ?, ?, ?, ?)
`);

if ((db.prepare("SELECT COUNT(*) AS count FROM phrases").get() as { count: number }).count === 0) {
  const seedPhrases = JSON.parse(
    fs.readFileSync(path.join(dataDir, "phrases.json"), "utf8"),
  ) as Pick<Phrase, "icelandic" | "meaning" | "literal" | "why" | "source" | "category">[];
  const seedAll = db.transaction(() => {
    for (const phrase of seedPhrases) {
      seed.run(
        phrase.icelandic,
        phrase.meaning,
        phrase.meaning,
        phrase.literal,
        phrase.why,
        phrase.source,
        phrase.category,
      );
    }
  });
  seedAll();
}

export function getDashboardData(): DashboardData {
  const phrases = db.prepare("SELECT id, icelandic, meaning, literal, why, source, category, mastery, reviews FROM phrases ORDER BY mastery ASC, id ASC").all() as Phrase[];
  return {
    phrases,
    stats: {
      total: phrases.length,
      mastered: phrases.filter((phrase) => phrase.mastery >= 4).length,
      reviews: phrases.reduce((sum, phrase) => sum + phrase.reviews, 0),
    },
  };
}

export function createPhrase(input: Omit<Phrase, "id" | "mastery" | "reviews">) {
  db.prepare("INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category) VALUES (?, ?, '', ?, ?, ?, ?, ?)")
    .run(input.icelandic, input.meaning, input.meaning, input.literal, input.why, input.source, input.category);
}

export function reviewPhrase(id: number, remembered: boolean) {
  db.prepare(`
    UPDATE phrases
    SET mastery = MAX(0, MIN(5, mastery + ?)), reviews = reviews + 1
    WHERE id = ?
  `).run(remembered ? 1 : -1, id);
}
