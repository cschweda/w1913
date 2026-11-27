// pnpm --filter @w1913/data run eval
// Phase 0 alignment proof (KICKOFF.md step 7): pair plain and tagged
// entries, then report word-level similarity on the X-Z and SU slices.
// Development only; writes cache/eval/alignment.json (gitignored).
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { evalDir, taggedDir } from "../paths.ts";
import { loadCanonical } from "../source/load.ts";
import { segment } from "../segment/segment.ts";
import { inSlice, type SliceName } from "../audit/slices.ts";
import { TAGGED } from "../source/tagged-files.ts";
import { tokenizeTagged, type TaggedEntry } from "./tagged.ts";
import { pairEntries } from "./align.ts";
import { similarity, words } from "./similarity.ts";

const t0 = performance.now();
const tagged: TaggedEntry[] = [];
const missing: string[] = [];
for (const spec of TAGGED) {
  const file = path.join(taggedDir, spec.name);
  if (!existsSync(file)) { missing.push(spec.name); continue; }
  tagged.push(...tokenizeTagged(spec.name, (await readFile(file)).toString("latin1")));
}
if (tagged.length === 0) {
  console.log("No tagged files in cache/tagged; run `pnpm --filter @w1913/data run download` first. Skipping.");
  process.exit(0);
}

const canonical = await loadCanonical();
const { entries } = segment(canonical.lines, canonical.firstLineNumber);
const pairing = pairEntries(entries, tagged);

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? NaN;
};
const share = (xs: number[], min: number) => xs.filter((x) => x >= min).length / xs.length;

// The plain side drops its capital headword line, which the tagged edition does not have.
const plainWords = (lines: string[]) => words(lines.slice(1).join(" "));

const slices: SliceName[] = ["X-Z", "SU"];
const perSlice = Object.fromEntries(
  slices.map((name) => {
    const pairs = pairing.pairs.filter((p) => inSlice(p.plain, name));
    const sliceEntries = entries.filter((e) => inSlice(e, name)).length;
    const scored = pairs.map((p) => ({
      line: p.plain.line,
      headword: p.plain.headwordLine,
      taggedFile: p.tagged.file,
      taggedLine: p.tagged.line,
      sim: similarity(plainWords(p.plain.lines), words(p.tagged.text)),
    }));
    const sims = scored.map((s) => s.sim);
    return [
      name,
      {
        plainEntries: sliceEntries,
        paired: pairs.length,
        median: quantile(sims, 0.5),
        p10: quantile(sims, 0.1),
        atLeast099: share(sims, 0.99),
        atLeast090: share(sims, 0.9),
        atLeast080: share(sims, 0.8),
        lowest: [...scored].sort((a, b) => a.sim - b.sim).slice(0, 15),
      },
    ];
  }),
);

const report = {
  generated: new Date().toISOString(),
  taggedFilesMissing: missing,
  taggedEntries: tagged.length,
  plainEntries: entries.length,
  pairing: {
    sharedHeadwords: pairing.sharedHeadwords,
    sameEntryCount: pairing.sameEntryCount,
    plainOnlyHeadwords: pairing.plainOnly,
    taggedOnlyHeadwords: pairing.taggedOnly,
    pairs: pairing.pairs.length,
  },
  slices: perSlice,
  ms: Math.round(performance.now() - t0),
};
await mkdir(evalDir, { recursive: true });
await writeFile(path.join(evalDir, "alignment.json"), JSON.stringify(report, null, 2) + "\n");

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
console.log(`Tagged entries ${tagged.length.toLocaleString()} · plain entries ${entries.length.toLocaleString()}${missing.length ? ` · missing files: ${missing.join(", ")}` : ""}`);
console.log(`Headwords in both ${pairing.sharedHeadwords.toLocaleString()}; same entry count in both ${pairing.sameEntryCount.toLocaleString()}; plain-only ${pairing.plainOnly.toLocaleString()}; tagged-only ${pairing.taggedOnly.toLocaleString()}`);
for (const name of slices) {
  const s = perSlice[name]!;
  console.log(`${name}: paired ${s.paired}/${s.plainEntries} · median ${s.median.toFixed(3)} · p10 ${s.p10.toFixed(3)} · ≥0.99 ${pct(s.atLeast099)} · ≥0.90 ${pct(s.atLeast090)} · ≥0.80 ${pct(s.atLeast080)}`);
}
console.log(`(${report.ms} ms) Full report: ${path.join(evalDir, "alignment.json")}`);
