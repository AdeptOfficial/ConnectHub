import { Database } from "bun:sqlite";
import { runMigrations } from "./schema";

import path from "path";

const SERVER_ROOT = path.resolve(import.meta.dir, "../..");
const DB_PATH = process.env.DB_PATH || path.join(SERVER_ROOT, "data", "connecthub.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    // Ensure data directory exists
    const dir = DB_PATH.substring(0, DB_PATH.lastIndexOf("/"));
    if (dir) {
      const fs = require("fs");
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    runMigrations(db);
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
