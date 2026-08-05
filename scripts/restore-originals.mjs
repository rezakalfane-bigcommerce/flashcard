import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const databasePath = process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : path.join(root, "data", "phrases.db");
const rows = JSON.parse(fs.readFileSync(path.join(root, "data", "phrases.json"), "utf8"));
const names = ["Að lágmarka", "Að lúffa", "Að undirbúa", "Að uppræta", "Að þroskast", "Ættarmót", "Ofviðri", "Öllu lokið", "Örlögin ráða", "Undan bragði", "Undan vindi", "Undir rós", "Í dentíð", "Í kyrrþey", "Í laumi", "Í sífellu", "Með köflum", "Núliðin tíð", "Tíminn líður", "Að sjóast"];
const originals = rows.filter((row) => names.includes(row.icelandic));
if (originals.length !== names.length) throw new Error(`Expected ${names.length} source records, found ${originals.length}`);
const db = new Database(databasePath);
db.pragma("busy_timeout = 10000");
const update = db.prepare(`UPDATE phrases SET english = ?, meaning = ?, literal = ?, why = ?, source = ?, category = ?, translation_status = 'translated', review_status = 'unreviewed', admin_notes = '', translated_by = '', updated_at = CURRENT_TIMESTAMP WHERE icelandic = ?`);
db.transaction(() => {
  for (const row of originals) {
    const result = update.run(row.meaning ?? "", row.meaning ?? "", row.literal ?? "", row.why ?? "", row.source ?? "Tilvitnun", row.category ?? "Expressions", row.icelandic);
    if (result.changes !== 1) throw new Error(`Expected one database record for ${row.icelandic}, changed ${result.changes}`);
  }
})();
console.log(`Restored ${originals.length} original records in ${databasePath}`);
