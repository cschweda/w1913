// pnpm --filter @w1913/data run edition [--force]
// Deploy contract (KICKOFF.md): verify the canonical source, then build the
// edition release the site pins, reusing a cached build when nothing changed.
import { canonicalFile } from "../paths.ts";
import { readChecksums } from "../source/checksums-file.ts";
import { ensureFile } from "../source/download.ts";
import { buildRelease, SPIKE_RELEASE } from "../edition/build.ts";

const checksums = await readChecksums();
const entry = checksums.canonical["29765.txt"];
if (!entry) throw new Error("checksums.json has no entry for 29765.txt");
const src = await ensureFile(canonicalFile, entry);
console.log(`29765.txt: ${src.action}`);

const r = await buildRelease(SPIKE_RELEASE, { force: process.argv.includes("--force") });
console.log(
  `w1913-${r.manifest.version}: ${r.reused ? "reused cached build" : "built"} in ${Math.round(r.ms)} ms; ` +
    `${r.manifest.entries} entries, layers ${r.manifest.layers.join(", ")}, parser ${r.manifest.parserVersion}`,
);
console.log(`  ${r.dir}`);
