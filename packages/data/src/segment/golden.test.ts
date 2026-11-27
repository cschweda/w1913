// Golden tests: 12 entries of different shapes, copied verbatim from the
// canonical file (#29765, public domain) into __fixtures__/golden.txt.
// Expected values were checked by hand on 27 Nov 2026.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { segment } from "./segment.ts";
import { toSegmentEntries } from "../edition/segment-layer.ts";
import { classifyEcho } from "../audit/echo.ts";
import { canonicalFile } from "../paths.ts";
import { loadCanonical } from "../source/load.ts";

const fixture = readFileSync(path.join(import.meta.dirname, "__fixtures__/golden.txt"), "utf8").split("\n");

// line = where the entry's headword line sits in the line-normalised canonical file.
const GOLDEN = [
  { shape: "single definition", line: 967336, headwordLine: "XANTHAMIDE", headword: "Xanthamide", variants: [], marked: 'Xanth*am"ide', pos: "n.", echo: "echoes" },
  { shape: "phrase variants joined by 'or'", line: 967886, headwordLine: "X RAYS; X-RAYS", headword: "X rays", variants: ["X-rays"], marked: 'X rays, or X"-rays`', pos: "n. pl.", echo: "echoes" },
  { shape: "Defn under numbered labels; lettered sub-senses; Greek gap", line: 967798, headwordLine: "XIPHIAS", headword: "Xiphias", variants: [], marked: 'Xiph"i*as', pos: "n.", echo: "echoes" },
  { shape: "authority after a definition (not a quotation)", line: 968708, headwordLine: "YARDWAND", headword: "Yardwand", variants: [], marked: 'Yard"wand`', pos: "n.", echo: "echoes" },
  { shape: "inline quotation and block quotation", line: 968713, headwordLine: "YARE", headword: "Yare", variants: [], marked: "Yare", pos: "a.", echo: "echoes" },
  { shape: "variant pair", line: 967411, headwordLine: "XANTHINE; XANTHIN", headword: "Xanthine", variants: ["Xanthin"], marked: 'Xan"thine', pos: "n.", echo: "echoes" },
  { shape: "ö headword with an umlaut pseudo-variant", line: 973052, headwordLine: "ZOOCHEMICAL; ZOOECHEMICAL", headword: "Zoöchemical", variants: [], marked: 'Zo`ö*chem"ic*al', pos: "a.", echo: "echoes" },
  { shape: "Syn. paragraph", line: 833193, headwordLine: "SUBJOIN", headword: "Subjoin", variants: [], marked: 'Sub*join"', pos: "v. t.", echo: "echoes" },
  { shape: "plural in the header; Greek gap", line: 967642, headwordLine: "XENIUM", headword: "Xenium", variants: [], marked: 'Xe"ni*um', pos: "n.", echo: "echoes" },
  { shape: "alphabet-letter entry, no header line", line: 968235, headwordLine: "Y", headword: "Y", variants: [], marked: null, pos: null, echo: "letter-entry" },
  { shape: "headword line lost ñ", line: 973566, headwordLine: "ZUIAN", headword: "Zuñian", variants: [], marked: 'Zu"ñi*an', pos: "a.", echo: "headword-line-lost-letters" },
  { shape: "numbered senses, quotations, Syn. (DESIGN.md's example)", line: 833414, headwordLine: "SUBLIME", headword: "Sublime", variants: [], marked: 'Sub*lime"', pos: "a.", echo: "echoes" },
] as const;

describe("golden entries (fixture)", () => {
  const seg = segment(fixture, 1);
  const out = toSegmentEntries(seg.entries);

  it("finds exactly the 12 golden entries", () => {
    expect(seg.entries.map((e) => e.headwordLine)).toEqual(GOLDEN.map((g) => g.headwordLine));
  });

  GOLDEN.forEach((g, i) => {
    it(`${g.headwordLine}: ${g.shape}`, () => {
      const e = out[i]!;
      expect({ headword: e.headword, variants: e.variants, marked: e.marked, pos: e.pos }).toEqual({
        headword: g.headword, variants: [...g.variants], marked: g.marked, pos: g.pos,
      });
      expect(classifyEcho(seg.entries[i]!)).toBe(g.echo);
      expect(e.text.split("\n")[0]).toBe(g.headwordLine);
    });
  });
});

// Proves the fixture is still verbatim in the canonical file. Skipped when
// the (gitignored) source is not present, e.g. in CI.
describe.skipIf(!existsSync(canonicalFile))("golden entries (canonical file)", () => {
  it("each fixture entry is byte-for-byte the entry at its recorded line", async () => {
    const c = await loadCanonical();
    const real = segment(c.lines, c.firstLineNumber).entries;
    const byLine = new Map(real.map((e) => [e.line, e]));
    const fixtureEntries = segment(fixture, 1).entries;
    GOLDEN.forEach((g, i) => {
      const r = byLine.get(g.line);
      expect(r?.headwordLine).toBe(g.headwordLine);
      expect(r?.lines).toEqual(fixtureEntries[i]!.lines);
    });
  });
});
