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
  translationStatus: TranslationStatus;
  reviewStatus: ReviewStatus;
  adminNotes: string;
  translatedBy: string;
  updatedAt: string;
};

export type TranslationStatus = "missing" | "draft" | "translated" | "reviewed";
export type ReviewStatus = "unreviewed" | "needs_review" | "approved" | "rejected";

export type AdminFilters = {
  query?: string;
  source?: string;
  translationStatus?: string;
  reviewStatus?: string;
  level?: number;
  sort?: "icelandic" | "level" | "complexity" | "source" | "updated";
  direction?: "asc" | "desc";
  page?: number;
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
db.pragma("busy_timeout = 10000");
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
    translation_status TEXT NOT NULL DEFAULT 'missing',
    review_status TEXT NOT NULL DEFAULT 'unreviewed',
    admin_notes TEXT NOT NULL DEFAULT '',
    translated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function rebalanceLevels() {
  const rebalance = db.transaction(() => {
    const ranked = db.prepare("SELECT id FROM phrases ORDER BY complexity ASC, LENGTH(icelandic) ASC, icelandic COLLATE NOCASE ASC, id ASC").all() as { id: number }[];
    const assignLevel = db.prepare("UPDATE phrases SET level = ? WHERE id = ?");
    ranked.forEach((phrase, index) => assignLevel.run(Math.floor(index / 20) + 1, phrase.id));
  });
  rebalance.immediate();
}

const initializeDatabase = db.transaction(() => {
  const columns = db.prepare("PRAGMA table_info(phrases)").all() as { name: string }[];
  for (const column of ["meaning", "literal", "why"]) {
    if (!columns.some(({ name }) => name === column)) db.exec(`ALTER TABLE phrases ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
  }
  if (!columns.some(({ name }) => name === "source")) db.exec("ALTER TABLE phrases ADD COLUMN source TEXT NOT NULL DEFAULT 'Tilvitnun'");
  if (!columns.some(({ name }) => name === "complexity")) db.exec("ALTER TABLE phrases ADD COLUMN complexity INTEGER NOT NULL DEFAULT 0");
  if (!columns.some(({ name }) => name === "level")) db.exec("ALTER TABLE phrases ADD COLUMN level INTEGER NOT NULL DEFAULT 0");
  if (!columns.some(({ name }) => name === "correct_streak")) db.exec("ALTER TABLE phrases ADD COLUMN correct_streak INTEGER NOT NULL DEFAULT 0");
  if (!columns.some(({ name }) => name === "next_review_at")) db.exec("ALTER TABLE phrases ADD COLUMN next_review_at TEXT NOT NULL DEFAULT ''");
  for (const [column, definition] of [
    ["translation_status", "TEXT NOT NULL DEFAULT 'missing'"],
    ["review_status", "TEXT NOT NULL DEFAULT 'unreviewed'"],
    ["admin_notes", "TEXT NOT NULL DEFAULT ''"],
    ["translated_by", "TEXT NOT NULL DEFAULT ''"],
    ["updated_at", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!columns.some(({ name }) => name === column)) db.exec(`ALTER TABLE phrases ADD COLUMN ${column} ${definition}`);
  }

  db.exec(`
    UPDATE phrases SET next_review_at = CURRENT_TIMESTAMP WHERE next_review_at = '';
    UPDATE phrases SET translation_status = 'translated' WHERE translation_status = 'missing' AND meaning != '';
    UPDATE phrases SET updated_at = created_at WHERE updated_at = '';
    CREATE TABLE IF NOT EXISTS study_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_level INTEGER NOT NULL DEFAULT 1
    );
    INSERT OR IGNORE INTO study_state (id, current_level) VALUES (1, 1);
    UPDATE phrases SET meaning = english WHERE meaning = '';
    UPDATE phrases SET literal = pronunciation WHERE literal = '';
  `);

  if ((db.prepare("SELECT COUNT(*) AS count FROM phrases").get() as { count: number }).count === 0) {
    const seedPhrases = JSON.parse(fs.readFileSync(path.join(dataDir, "phrases.json"), "utf8")) as Pick<
      Phrase,
      "icelandic" | "meaning" | "literal" | "why" | "source" | "category"
    >[];
    const seed = db.prepare(`
      INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category, complexity)
      VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)
    `);
    for (const phrase of seedPhrases) {
      seed.run(phrase.icelandic, phrase.meaning, phrase.meaning, phrase.literal, phrase.why, phrase.source, phrase.category, calculateComplexity(phrase.icelandic));
    }
  }

  const expressions = db.prepare("SELECT id, icelandic, complexity FROM phrases").all() as Pick<Phrase, "id" | "icelandic" | "complexity">[];
  const updateComplexity = db.prepare("UPDATE phrases SET complexity = ? WHERE id = ?");
  for (const phrase of expressions) {
    const score = calculateComplexity(phrase.icelandic);
    if (score !== phrase.complexity) updateComplexity.run(score, phrase.id);
  }

  if ((db.prepare("SELECT COUNT(*) AS count FROM phrases WHERE level = 0").get() as { count: number }).count > 0) {
    rebalanceLevels();
  }
});

initializeDatabase.immediate();

export function getDashboardData(): DashboardData {
  const { currentLevel } = db.prepare("SELECT current_level AS currentLevel FROM study_state WHERE id = 1").get() as { currentLevel: number };
  const { totalLevels } = db.prepare("SELECT MAX(level) AS totalLevels FROM phrases").get() as { totalLevels: number };
  const phrases = db.prepare(`
    SELECT id, icelandic, meaning, literal, why, source, category, mastery, reviews,
      complexity, level, correct_streak AS correctStreak, next_review_at AS nextReviewAt,
      translation_status AS translationStatus, review_status AS reviewStatus,
      admin_notes AS adminNotes, translated_by AS translatedBy, updated_at AS updatedAt
    FROM phrases WHERE level = ? ORDER BY complexity ASC, id ASC
  `).all(currentLevel) as Phrase[];
  const totals = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN mastery >= 4 THEN 1 ELSE 0 END) AS mastered, SUM(reviews) AS reviews FROM phrases").get() as { total: number; mastered: number; reviews: number };
  return {
    phrases,
    stats: totals,
    study: { currentLevel, totalLevels, levelMastered: phrases.filter((phrase) => phrase.mastery >= 2).length },
  };
}

export function createPhrase(input: Pick<Phrase, "icelandic" | "meaning" | "literal" | "why" | "source" | "category">) {
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

const adminSelect = `
  SELECT id, icelandic, meaning, literal, why, source, category, mastery, reviews,
    complexity, level, correct_streak AS correctStreak, next_review_at AS nextReviewAt,
    translation_status AS translationStatus, review_status AS reviewStatus,
    admin_notes AS adminNotes, translated_by AS translatedBy, updated_at AS updatedAt
  FROM phrases
`;

export function getExpression(id: number) {
  return db.prepare(`${adminSelect} WHERE id = ?`).get(id) as Phrase | undefined;
}

export function getAdminExpressions(filters: AdminFilters) {
  const clauses: string[] = [];
  const values: Array<string | number> = [];
  if (filters.query) {
    clauses.push("(icelandic LIKE ? OR meaning LIKE ? OR literal LIKE ? OR why LIKE ?)");
    const query = `%${filters.query}%`;
    values.push(query, query, query, query);
  }
  if (filters.translationStatus) { clauses.push("translation_status = ?"); values.push(filters.translationStatus); }
  if (filters.reviewStatus) { clauses.push("review_status = ?"); values.push(filters.reviewStatus); }
  if (filters.level) { clauses.push("level = ?"); values.push(filters.level); }

  const sourceFacetWhere = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sourceFacetValues = [...values];
  if (filters.source) { clauses.push("source = ?"); values.push(filters.source); }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortColumns = { icelandic: "icelandic COLLATE NOCASE", level: "level", complexity: "complexity", source: "source", updated: "updated_at" };
  const sort = sortColumns[filters.sort ?? "level"];
  const direction = filters.direction === "desc" ? "DESC" : "ASC";
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 50;
  const rows = db.prepare(`${adminSelect} ${where} ORDER BY ${sort} ${direction}, id ASC LIMIT ? OFFSET ?`).all(...values, pageSize, (page - 1) * pageSize) as Phrase[];
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM phrases ${where}`).get(...values) as { total: number };
  const sources = db.prepare(`SELECT source, COUNT(*) AS count FROM phrases ${sourceFacetWhere} GROUP BY source ORDER BY source`).all(...sourceFacetValues) as { source: string; count: number }[];
  if (filters.source && !sources.some(({ source }) => source === filters.source)) sources.push({ source: filters.source, count: 0 });
  sources.sort((a, b) => a.source.localeCompare(b.source));
  const { totalLevels } = db.prepare("SELECT MAX(level) AS totalLevels FROM phrases").get() as { totalLevels: number };
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), sources, totalLevels };
}

export type ExpressionInput = Pick<Phrase, "icelandic" | "meaning" | "literal" | "why" | "source" | "category" | "translationStatus" | "reviewStatus" | "adminNotes">;

export function updateExpression(id: number, input: ExpressionInput, translatedBy = "") {
  const complexity = calculateComplexity(input.icelandic);
  db.prepare(`
    UPDATE phrases SET icelandic = ?, english = ?, meaning = ?, literal = ?, why = ?,
      source = ?, category = ?, translation_status = ?, review_status = ?, admin_notes = ?,
      translated_by = CASE WHEN ? != '' THEN ? ELSE translated_by END,
      complexity = ?, level = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(input.icelandic, input.meaning, input.meaning, input.literal, input.why, input.source, input.category, input.translationStatus, input.reviewStatus, input.adminNotes, translatedBy, translatedBy, complexity, id);
  rebalanceLevels();
}

export function createAdminExpression(input: ExpressionInput) {
  const complexity = calculateComplexity(input.icelandic);
  const result = db.prepare(`
    INSERT INTO phrases (icelandic, english, pronunciation, meaning, literal, why, source, category,
      complexity, level, translation_status, review_status, admin_notes)
    VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(input.icelandic, input.meaning, input.meaning, input.literal, input.why, input.source, input.category, complexity, input.translationStatus, input.reviewStatus, input.adminNotes);
  rebalanceLevels();
  return Number(result.lastInsertRowid);
}
