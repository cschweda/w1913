// Phase 1 exit test (DESIGN.md §6): 50 golden entries of different shapes,
// copied verbatim from #29765 (public domain) into __fixtures__/golden50.txt.
// The parse of each is summarised in __snapshots__/golden50.txt, which was
// read and checked by hand (27 Nov 2026). A parser change that alters any of
// them shows up as a diff there, to be checked again before the snapshot is
// updated (vitest -u).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { segment } from "../segment/segment.ts";
import { toSegmentEntries } from "../edition/segment-layer.ts";
import { canonicalFile } from "../paths.ts";
import { loadCanonical } from "../source/load.ts";
import { parseSenses, type Block, type SensesLayer } from "./parse.ts";

const GOLDEN: { line: number; headwordLine: string }[] = [
  { line: 32, headwordLine: "A" }, { line: 146, headwordLine: "A 1" }, { line: 284, headwordLine: "ABACUS" },
  { line: 809, headwordLine: "ABBACY" }, { line: 2057, headwordLine: "ABLE" }, { line: 20661, headwordLine: "AJOUAN; AJOWAN" },
  { line: 25430, headwordLine: "ALMSMAN" }, { line: 39721, headwordLine: "ANTIVENIN" }, { line: 40492, headwordLine: "APEX" },
  { line: 73785, headwordLine: "BATTLEMENT" }, { line: 77332, headwordLine: "BEEN" }, { line: 174791, headwordLine: "CONFIDANT; CONFIDANTE" },
  { line: 186039, headwordLine: "COOTER" }, { line: 206997, headwordLine: "CURDLE" }, { line: 274100, headwordLine: "EGRETTE" },
  { line: 276816, headwordLine: "ELENCH" }, { line: 355465, headwordLine: "GAUGE" }, { line: 358528, headwordLine: "GEODE" },
  { line: 385194, headwordLine: "HANK" }, { line: 434567, headwordLine: "INDORSE" }, { line: 451382, headwordLine: "INTRA-" },
  { line: 459376, headwordLine: "JACKSNIPE" }, { line: 526694, headwordLine: "MERE" }, { line: 532182, headwordLine: "MIGHT" },
  { line: 538651, headwordLine: "MISTURA" }, { line: 606703, headwordLine: "PARR" }, { line: 643662, headwordLine: "POLACCA" },
  { line: 653599, headwordLine: "PRAECIPE" }, { line: 659841, headwordLine: "PRESS WORK" }, { line: 730832, headwordLine: "ROUT" },
  { line: 737934, headwordLine: "SAINFOIN" }, { line: 784349, headwordLine: "SKIDDER" }, { line: 794272, headwordLine: "SOCKDOLAGER" },
  { line: 832965, headwordLine: "SUBJECT" }, { line: 833193, headwordLine: "SUBJOIN" }, { line: 833414, headwordLine: "SUBLIME" },
  { line: 834853, headwordLine: "SUBSTANCE" }, { line: 835522, headwordLine: "SUBTLE" }, { line: 836040, headwordLine: "SUCCEED" },
  { line: 836532, headwordLine: "SUCH" }, { line: 849027, headwordLine: "SYENITE" }, { line: 891562, headwordLine: "TRESTLE" },
  { line: 934740, headwordLine: "VINCENTIAN" }, { line: 962175, headwordLine: "WOAD" }, { line: 967336, headwordLine: "XANTHAMIDE" },
  { line: 967411, headwordLine: "XANTHINE; XANTHIN" }, { line: 967798, headwordLine: "XIPHIAS" }, { line: 968713, headwordLine: "YARE" },
  { line: 968235, headwordLine: "Y" }, { line: 973566, headwordLine: "ZUIAN" },
];

const fixture = readFileSync(path.join(import.meta.dirname, "__fixtures__/golden50.txt"), "utf8").split("\n");

const short = (s: string, n = 70) => {
  const one = s.replace(/\n/g, " ");
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
};
const refs = (b: Block) =>
  b.xrefs.length ? "  → " + b.xrefs.map((x) => x.to + (x.pos ? `,${x.pos}` : "") + (x.sense ? `#${x.sense}` : "")).join(" ") : "";

/** A readable summary of one parsed entry, for the snapshot. */
function summarise(headword: string, pos: string | null, s: SensesLayer): string {
  const out = [`## ${headword}${pos ? ` (${pos})` : ""}`];
  if (s.headerLabels.length || s.headerMarks.length) out.push(`labels: ${[...s.headerLabels, ...s.headerMarks].join(" ")}`);
  if (s.inflections) out.push(`inflections: ${short(s.inflections)}`);
  for (const sp of s.spellings) out.push(`spelling: ${short(sp)}`);
  if (s.etymology) out.push(`etymology: ${short(s.etymology.text)}${refs(s.etymology)}`);
  if (s.headerRest) out.push(`header rest: ${short(s.headerRest)}`);
  for (const n of s.notes) out.push(`entry note: ${short(n.text, 50)}${refs(n)}`);
  for (const x of s.senses) {
    out.push(`sense ${x.n ?? "-"}: ${short(x.text)}${refs(x)}`);
    for (const sub of x.sub) out.push(`  (${sub.letter}) ${short(sub.text, 64)}${refs(sub)}`);
    for (const n of x.notes) out.push(`  note: ${short(n.text, 60)}${refs(n)}`);
  }
  if (s.syn) out.push(`syn: ${short(s.syn)}`);
  return out.join("\n");
}

describe("golden 50 (fixture)", () => {
  const seg = segment(fixture, 1).entries;
  const shown = toSegmentEntries(seg);

  it("holds the 50 golden entries", () => {
    expect(seg.map((e) => e.headwordLine)).toEqual(GOLDEN.map((g) => g.headwordLine));
  });

  it("parses each as recorded in the hand-checked snapshot", async () => {
    const text = seg.map((e, i) => summarise(shown[i]!.headword, shown[i]!.pos, parseSenses(e))).join("\n\n") + "\n";
    await expect(text).toMatchFileSnapshot("./__snapshots__/golden50.txt");
  });
});

// Proves the fixture is verbatim. Skipped when the (gitignored) source is absent.
describe.skipIf(!existsSync(canonicalFile))("golden 50 (canonical file)", () => {
  it("each fixture entry is byte-for-byte the entry at its recorded line", async () => {
    const c = await loadCanonical();
    const byLine = new Map(segment(c.lines, c.firstLineNumber).entries.map((e) => [e.line, e]));
    const fx = segment(fixture, 1).entries;
    GOLDEN.forEach((g, i) => expect(byLine.get(g.line)?.lines).toEqual(fx[i]!.lines));
  });
});
