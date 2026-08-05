import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { calculateComplexity } from "@/lib/complexity";

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
  complexity: number;
  level: number;
  correctStreak: number;
  nextReviewAt: string;
};

export type DashboardData = {
  phrases: Phrase[];
  stats: { total: number; mastered: number; reviews: number };
  study: { currentLevel: number; totalLevels: number; levelMastered: number };
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
    complexity INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
if (!columns.some(({ name }) => name === "complexity")) {
  db.exec("ALTER TABLE phrases ADD COLUMN complexity INTEGER NOT NULL DEFAULT 0");
}
if (!columns.some(({ name }) => name === "level")) {
  db.exec("ALTER TABLE phrases ADD COLUMN level INTEGER NOT NULL DEFAULT 0");
}
if (!columns.some(({ name }) => name === "correct_streak")) {
  db.exec("ALTER TABLE phrases ADD COLUMN correct_streak INTEGER NOT NULL DEFAULT 0");
}
if (!columns.some(({ name }) => name === "next_review_at")) {
  db.exec("ALTER TABLE phrases ADD COLUMN next_review_at TEXT NOT NULL DEFAULT ''");
}
db.exec("UPDATE phrases SET next_review_at = CURRENT_TIMESTAMP WHERE next_review_at = ''");
db.exec(`
  CREATE TABLE IF NOT EXISTS study_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_level INTEGER NOT NULL DEFAULT 1
  );
  INSERT OR IGNORE INTO study_state (id, current_level) VALUES (1, 1);
`);
db.exec(`
  UPDATE phrases SET meaning = english WHERE meaning = '';
  UPDATE phrases SET literal = pronunciation WHERE literal = '';
`);

const seed = db.prepare(`
  INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category, complexity)
  VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)
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
        calculateComplexity(phrase.icelandic),
      );
    }
  });
  seedAll();
}

const expressionsToScore = db.prepare("SELECT id, icelandic, complexity FROM phrases").all() as Pick<Phrase, "id" | "icelandic" | "complexity">[];
const updateComplexity = db.prepare("UPDATE phrases SET complexity = ? WHERE id = ?");
db.transaction(() => {
  for (const phrase of expressionsToScore) {
    const score = calculateComplexity(phrase.icelandic);
    if (score !== phrase.complexity) updateComplexity.run(score, phrase.id);
  }
})();

if ((db.prepare("SELECT COUNT(*) AS count FROM phrases WHERE level = 0").get() as { count: number }).count > 0) {
  const ranked = db.prepare("SELECT id FROM phrases ORDER BY complexity ASC, LENGTH(icelandic) ASC, icelandic COLLATE NOCASE ASC, id ASC").all() as { id: number }[];
  const assignLevel = db.prepare("UPDATE phrases SET level = ? WHERE id = ?");
  db.transaction(() => {
    ranked.forEach((phrase, index) => assignLevel.run(Math.floor(index / 20) + 1, phrase.id));
  })();
}

export function getDashboardData(): DashboardData {
  const { currentLevel } = db.prepare("SELECT current_level AS currentLevel FROM study_state WHERE id = 1").get() as { currentLevel: number };
  const { totalLevels } = db.prepare("SELECT MAX(level) AS totalLevels FROM phrases").get() as { totalLevels: number };
  const phrases = db.prepare(`
    SELECT id, icelandic, meaning, literal, why, source, category, mastery, reviews,
      complexity, level, correct_streak AS correctStreak, next_review_at AS nextReviewAt
    FROM phrases WHERE level = ? ORDER BY complexity ASC, id ASC
  `).all(currentLevel) as Phrase[];
  const totals = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN mastery >= 4 THEN 1 ELSE 0 END) AS mastered, SUM(reviews) AS reviews FROM phrases").get() as { total: number; mastered: number; reviews: number };
  return {
    phrases,
    stats: totals,
    study: { currentLevel, totalLevels, levelMastered: phrases.filter((phrase) => phrase.mastery >= 2).length },
  };
}

export function createPhrase(input: Omit<Phrase, "id" | "mastery" | "reviews" | "complexity" | "level" | "correctStreak" | "nextReviewAt">) {
  const complexity = calculateComplexity(input.icelandic);
  const { preceding } = db.prepare("SELECT COUNT(*) AS preceding FROM phrases WHERE complexity <= ?").get(complexity) as { preceding: number };
  const level = Math.floor(preceding / 20) + 1;
  db.prepare("INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category, complexity, level) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?)")
    .run(input.icelandic, input.meaning, input.meaning, input.literal, input.why, input.source, input.category, complexity, level);
}

export function reviewPhrase(id: number, remembered: boolean) {
  const phrase = db.prepare("SELECT correct_streak AS correctStreak, level FROM phrases WHERE id = ?").get(id) as { correctStreak: number; level: number } | undefined;
  if (!phrase) return;

  const nextStreak = remembered ? phrase.correctStreak + 1 : 0;
  const intervalsInMinutes = [2, 10, 24 * 60, 3 * 24 * 60, 7 * 24 * 60, 14 * 24 * 60, 30 * 24 * 60];
  const minutes = remembered ? intervalsInMinutes[Math.min(nextStreak, intervalsInMinutes.length - 1)] : 2;
  const nextReviewAt = new Date(Date.now() + minutes * 60_000).toISOString();

  db.prepare(`
    UPDATE phrases SET
      mastery = MAX(0, MIN(5, mastery + ?)),
      reviews = reviews + 1,
      correct_streak = ?,
      next_review_at = ?
    WHERE id = ?
  `).run(remembered ? 1 : -1, nextStreak, nextReviewAt, id);

  const { incomplete } = db.prepare("SELECT COUNT(*) AS incomplete FROM phrases WHERE level = ? AND mastery < 2").get(phrase.level) as { incomplete: number };
  const { totalLevels } = db.prepare("SELECT MAX(level) AS totalLevels FROM phrases").get() as { totalLevels: number };
  if (incomplete === 0 && phrase.level < totalLevels) {
    db.prepare("UPDATE study_state SET current_level = ? WHERE id = 1 AND current_level = ?").run(phrase.level + 1, phrase.level);
  }
}

export function setStudyLevel(requestedLevel: number) {
  const { totalLevels } = db.prepare("SELECT MAX(level) AS totalLevels FROM phrases").get() as { totalLevels: number };
  const level = Math.max(1, Math.min(totalLevels, Math.trunc(requestedLevel)));
  db.prepare("UPDATE study_state SET current_level = ? WHERE id = 1").run(level);
}
