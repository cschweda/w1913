// The dictionary database: read-only, opened once per process.
import Database from "better-sqlite3";
import { resolve } from "node:path";

let db: Database.Database | null = null;

export function useDb(): Database.Database {
  if (!db) {
    const file = resolve(process.env.W1913_DB_PATH || useRuntimeConfig().dbPath);
    db = new Database(file, { readonly: true, fileMustExist: true });
    db.pragma("query_only = ON");
  }
  return db;
}
