// pnpm --filter @w1913/data run phase0
// The Phase 0 numbers (KICKOFF.md steps 4-5): structure counts for the whole
// file and for the X-Z and SU slices, the echo failures by class, the
// character audit, and the gap audit. Writes cache/phase0/report.json and
// prints a summary.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { phase0Dir } from "../paths.ts";
import { loadCanonical } from "../source/load.ts";
import { segment } from "../segment/segment.ts";
import { countStructures } from "../audit/counts.ts";
import { classifyEcho } from "../audit/echo.ts";
import { slice, type SliceName } from "../audit/slices.ts";
import { nonAsciiChars } from "../audit/chars.ts";
import { findGaps } from "../audit/gaps.ts";
import { looksLikeHeadwordLine } from "../segment/headword-line.ts";

const t0 = performance.now();
const canonical = await loadCanonical();
const seg = segment(canonical.lines, canonical.firstLineNumber);
const segMs = performance.now() - t0;

const slices: SliceName[] = ["X-Z", "SU"];
const echoFailures = seg.entries
  .filter((e) => !e.echoes)
  .map((e) => ({ line: e.line, class: classifyEcho(e), headwordLine: e.headwordLine, headerLine: e.headerLine }));

// Stray lines: short capital lines inside an entry, after a blank line, that
// are not headword lines because a blank line follows ("M.", "P.", "X.").
const stray = seg.entries.flatMap((e) =>
  e.lines.flatMap((l, i) =>
    i > 0 && e.lines[i - 1] === "" && /^[A-Z]\.$/.test(l) && !looksLikeHeadwordLine(e.lines[i + 1] ?? "")
      ? [{ line: e.line + i, text: l, inEntry: e.headwordLine }]
      : [],
  ),
);

const sliceReport = Object.fromEntries(
  slices.map((name) => {
    const es = slice(seg.entries, name);
    const lines = es.flatMap((e) => e.lines);
    return [
      name,
      {
        counts: countStructures(es),
        firstLine: es[0]?.line,
        lastLine: es.at(-1)?.line,
        echoFailures: es.filter((e) => !e.echoes).map((e) => ({ line: e.line, class: classifyEcho(e), headwordLine: e.headwordLine, headerLine: e.headerLine })),
        nonAsciiChars: nonAsciiChars(lines),
        gaps: findGaps(lines, es[0]?.line ?? 0, 3),
      },
    ];
  }),
);

const report = {
  generated: new Date().toISOString(),
  source: { firstBodyLine: canonical.firstLineNumber, bodyLines: canonical.lines.length, ...canonical.normalised },
  timingMs: { loadAndSegment: Math.round(segMs) },
  whole: {
    counts: countStructures(seg.entries),
    preludeLines: seg.prelude.length,
    echoFailures,
    strayLines: stray,
    gaps: findGaps(canonical.lines, canonical.firstLineNumber, 5),
    nonAsciiChars: nonAsciiChars(canonical.lines),
  },
  slices: sliceReport,
};

await mkdir(phase0Dir, { recursive: true });
const out = path.join(phase0Dir, "report.json");
await writeFile(out, JSON.stringify(report, null, 2) + "\n");

const fmt = (n: number) => n.toLocaleString("en-US");
const show = (label: string, c: ReturnType<typeof countStructures>) => {
  console.log(`\n== ${label}`);
  console.log(`entries ${fmt(c.entries)} · distinct headwords ${fmt(c.distinctHeadwords)} · variant lines ${fmt(c.variantLines)} (umlaut pseudo-variants ${c.umlautVariants}) · wrapped ${c.wrappedHeadwordLines}`);
  console.log(`header lines ${fmt(c.withHeaderLine)} · with marks ${fmt(c.headerWithMarks)} · pos detected ${fmt(c.posDetected)}`);
  console.log(`echo: ${Object.entries(c.echo).map(([k, v]) => `${k} ${fmt(v)}`).join(" · ")}`);
  console.log(`Etym: ${fmt(c.etym)} · Defn: ${fmt(c.defnLines)} (after a numbered line ${fmt(c.defnAfterNumberedLine)}) · numbered ${fmt(c.numberedSenseLines)} · lettered ${fmt(c.letteredSubsenseLines)} · Note: ${fmt(c.note)} · Syn. ${fmt(c.syn)}`);
};
console.log(`Loaded and segmented in ${Math.round(segMs)} ms; CRLF normalised ${fmt(canonical.normalised.crlf)}, lone CR ${canonical.normalised.loneCr}`);
show("Whole file", report.whole.counts);
for (const name of slices) show(`Slice ${name}`, sliceReport[name]!.counts);
console.log(`\nStray lines between entries: ${stray.map((s) => `${s.text} (line ${s.line})`).join(", ") || "none"}`);
console.log("\nGap traces, whole file:");
for (const g of report.whole.gaps) console.log(`  ${g.id}: ${fmt(g.count)}`);
console.log(`\nNon-ASCII characters, whole file: ${report.whole.nonAsciiChars.length} distinct`);
console.log(`\nFull report: ${out}`);
