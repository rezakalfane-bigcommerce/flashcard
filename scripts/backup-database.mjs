import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : path.join(root, "data", "phrases.db");
const backupDir = path.join(root, "data", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const destinationPath = path.join(backupDir, `phrases-${stamp}.db`);
const source = new Database(sourcePath, { readonly: true });
await source.backup(destinationPath);
source.close();
console.log(`Backed up ${sourcePath} to ${destinationPath}`);
