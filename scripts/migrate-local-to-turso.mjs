import Database from "better-sqlite3";
import { connect } from "@tursodatabase/serverless";

const local = new Database("data/phrases.db", { readonly: true });
const remote = connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

await remote.batch([`
  CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT, icelandic TEXT NOT NULL, english TEXT NOT NULL DEFAULT '',
    pronunciation TEXT NOT NULL DEFAULT '', meaning TEXT NOT NULL DEFAULT '', literal TEXT NOT NULL DEFAULT '',
    why TEXT NOT NULL DEFAULT '', audio_url TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'Tilvitnun',
    category TEXT NOT NULL DEFAULT 'Everyday', mastery INTEGER NOT NULL DEFAULT 0, reviews INTEGER NOT NULL DEFAULT 0,
    complexity INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 0, correct_streak INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, translation_status TEXT NOT NULL DEFAULT 'missing',
    review_status TEXT NOT NULL DEFAULT 'unreviewed', admin_notes TEXT NOT NULL DEFAULT '', translated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_study_state (user_id TEXT PRIMARY KEY, current_level INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS user_phrase_progress (user_id TEXT NOT NULL, phrase_id INTEGER NOT NULL, mastery INTEGER NOT NULL DEFAULT 0, reviews INTEGER NOT NULL DEFAULT 0, correct_streak INTEGER NOT NULL DEFAULT 0, next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, phrase_id))`,
]);

const rows = local.prepare("SELECT * FROM phrases ORDER BY id").all();
const phraseSql = `INSERT OR REPLACE INTO phrases (id, icelandic, english, pronunciation, meaning, literal, why, audio_url, source, category, mastery, reviews, complexity, level, correct_streak, next_review_at, translation_status, review_status, admin_notes, translated_by, updated_at, archived_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
for (let index = 0; index < rows.length; index += 200) {
  await remote.batch(rows.slice(index, index + 200).map((row) => ({ sql: phraseSql, args: [
    row.id, row.icelandic, row.english, row.pronunciation, row.meaning, row.literal, row.why, row.audio_url,
    row.source, row.category, row.mastery, row.reviews, row.complexity, row.level, row.correct_streak,
    row.next_review_at, row.translation_status, row.review_status, row.admin_notes, row.translated_by,
    row.updated_at, row.archived_at, row.created_at,
  ] })), "immediate");
}
for (const table of ["study_state", "user_study_state", "user_phrase_progress"]) {
  const tableRows = local.prepare(`SELECT * FROM ${table}`).all();
  if (table === "study_state") await remote.batch(["CREATE TABLE IF NOT EXISTS study_state (id INTEGER PRIMARY KEY CHECK (id = 1), current_level INTEGER NOT NULL DEFAULT 1)", ...tableRows.map((row) => ({ sql: "INSERT OR REPLACE INTO study_state (id, current_level) VALUES (?, ?)", args: [row.id, row.current_level] }))], "immediate");
  if (table === "user_study_state") await remote.batch(tableRows.map((row) => ({ sql: "INSERT OR REPLACE INTO user_study_state (user_id, current_level) VALUES (?, ?)", args: [row.user_id, row.current_level] })), "immediate");
  if (table === "user_phrase_progress") await remote.batch(tableRows.map((row) => ({ sql: "INSERT OR REPLACE INTO user_phrase_progress (user_id, phrase_id, mastery, reviews, correct_streak, next_review_at) VALUES (?, ?, ?, ?, ?, ?)", args: [row.user_id, row.phrase_id, row.mastery, row.reviews, row.correct_streak, row.next_review_at] })), "immediate");
}
console.log(JSON.stringify({ phrases: rows.length, archived: rows.filter((row) => row.archived_at).length }));
local.close();
