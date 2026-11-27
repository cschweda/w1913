// pnpm --filter @w1913/data run edition [--force]
// Deploy contract (KICKOFF.md): verify the canonical source, then build every
// edition release (so the one the site pins exists), reusing cached builds.
// --version=0.2 builds just one; --force rebuilds.
import { canonicalFile } from "../paths.ts";
import { readChecksums } from "../source/checksums-file.ts";
import { ensureFile } from "../source/download.ts";
import { buildRelease, RELEASES } from "../edition/build.ts";

const checksums = await readChecksums();
const entry = checksums.canonical["29765.txt"];
if (!entry) throw new Error("checksums.json has no entry for 29765.txt");
const src = await ensureFile(canonicalFile, entry);
console.log(`29765.txt: ${src.action}`);

// Builds every release; each is reused when its inputs have not changed.
const only = process.argv.find((a) => a.startsWith("--version="))?.slice("--version=".length);
for (const spec of RELEASES.filter((r) => !only || r.version === only)) {
  const r = await buildRelease(spec, { force: process.argv.includes("--force") });
  console.log(
    `w1913-${r.manifest.version}: ${r.reused ? "reused cached build" : "built"} in ${Math.round(r.ms)} ms; ` +
      `${r.manifest.entries} entries, layers ${r.manifest.layers.join(", ")}, parser ${r.manifest.parserVersion}, ` +
      `${(r.manifest.jsonl.bytes / 1e6).toFixed(1)} MB`,
  );
}
