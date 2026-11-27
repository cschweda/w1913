// What this server is running: the W1913 version (built in from the root
// package.json) and the commit. rebuild.sh writes the commit to .release-sha
// at the root of each release, which is the server's working directory under
// PM2; in development there is none and the commit reads "dev".
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let commit: string | null = null;

export function releaseCommit(): string {
  if (commit === null) {
    try {
      commit = readFileSync(resolve(process.cwd(), ".release-sha"), "utf8").trim() || "dev";
    } catch {
      commit = process.env.W1913_COMMIT || "dev";
    }
  }
  return commit;
}
