// pnpm --filter @w1913/data run download [--canonical-only]
// Verifies (or fetches) the canonical file, then fetches the tagged files
// for the evaluation command and records their checksums on first fetch.
import path from "node:path";
import { canonicalFile, taggedDir } from "../paths.ts";
import { readChecksums, writeChecksums } from "../source/checksums-file.ts";
import { ensureFile } from "../source/download.ts";
import { TAGGED } from "../source/tagged-files.ts";

const canonicalOnly = process.argv.includes("--canonical-only");
const checksums = await readChecksums();

const canonical = checksums.canonical["29765.txt"];
if (!canonical) throw new Error("checksums.json has no entry for 29765.txt");
const c = await ensureFile(canonicalFile, canonical);
console.log(`29765.txt: ${c.action} (${c.sha256.slice(0, 16)}…)${c.url ? ` from ${c.url}` : ""}`);

if (!canonicalOnly) {
  let recorded = 0;
  const failed: string[] = [];
  for (const spec of TAGGED) {
    const known = checksums.tagged[spec.name];
    const entry = { urls: spec.urls, sha256: known?.sha256 ?? null, ...(spec.extract ? { extract: spec.extract } : {}) };
    try {
      const r = await ensureFile(path.join(taggedDir, spec.name), entry);
      if (r.action === "recorded") {
        checksums.tagged[spec.name] = { ...entry, sha256: r.sha256 };
        recorded++;
      }
      console.log(`${spec.name}: ${r.action}${r.url ? ` from ${new URL(r.url).host}` : ""}`);
    } catch (err) {
      failed.push(spec.name);
      console.log(`${spec.name}: FAILED  ${(err as Error).message.split("\n")[0]}`);
    }
  }
  if (recorded > 0) {
    await writeChecksums(checksums);
    console.log(`Recorded ${recorded} new checksum(s) in packages/data/checksums.json; commit it.`);
  }
  if (failed.length > 0) {
    console.log(`\n${failed.length} tagged file(s) unavailable: ${failed.join(", ")}. The evaluation command will skip them.`);
  }
}
