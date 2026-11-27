// The static shards db-import writes beside the database (DESIGN.md §4b):
// read one file per request, so the server never holds the lookup build.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import config from "../../../../w1913.config.ts";

/** A shard (or index.json) as JSON text, or null when this release has none. `name` is already validated. */
export function readShard(name: string): string | null {
  const db = resolve(process.env.W1913_DB_PATH || useRuntimeConfig().dbPath);
  const file = resolve(dirname(db), `shards-${config.edition.version}`, name);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}
