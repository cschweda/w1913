// Print one value from w1913.config.ts, for the shell scripts.
//   node scripts/config-get.ts server.port            -> 3913
//   node scripts/config-get.ts deploy.smokePaths      -> / /sublime   (arrays: space-separated)
//   node scripts/config-get.ts deploy.root            -> /home/forge/w1913-deploy  (a leading ~ is expanded)
// Exits 1, naming the key, if it does not exist.
import os from "node:os";
import config from "../w1913.config.ts";

const key = process.argv[2] ?? "";
let v: unknown = config;
for (const part of key.split(".")) {
  if (v === null || typeof v !== "object" || !(part in (v as object))) {
    console.error(`w1913.config.ts has no setting "${key}"`);
    process.exit(1);
  }
  v = (v as Record<string, unknown>)[part];
}
const out = Array.isArray(v) ? v.join(" ") : typeof v === "object" ? JSON.stringify(v) : String(v);
console.log(out.replace(/^~(?=\/|$)/, os.homedir()));
