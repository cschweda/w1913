import { describe, expect, it } from "vitest";
import { findGaps, paragraphs } from "./gaps.ts";

const count = (lines: string[], id: string) => findGaps(lines, 1).find((g) => g.id === id)!.count;

describe("paragraphs", () => {
  it("joins wrapped lines and splits on blank lines", () => {
    expect(paragraphs(["a", "b", "", "c"], 5)).toEqual([{ line: 5, text: "a b" }, { line: 8, text: "c" }]);
  });
});

describe("script-language-then-punctuation", () => {
  it("applies when the Greek word is missing", () => {
    expect(count(['Xe"ni*um, n.; pl. Xenia. Etym: [L., from Gr. (Class. Antiq.)'], "script-language-then-punctuation")).toBe(1);
  });
  it("applies at the end of a paragraph", () => {
    expect(count(["Etym: [L. arena sand + Gr.", ""], "script-language-then-punctuation")).toBe(1);
  });
  it("does not apply when the word continues on the next line", () => {
    expect(count(["Etym: [L., from Gr.", "Acantha.]"], "script-language-then-punctuation")).toBe(0);
  });
});

describe("other gap traces", () => {
  it("finds stray entities and empty brackets", () => {
    expect(count(["Etym: [Gr. &a; priv. + keras a horn.]"], "stray-entity")).toBe(1);
    expect(count(["Defn: A character [] called the pause."], "empty-brackets")).toBe(1);
  });
  it("does not flag ordinary brackets", () => {
    expect(count(["Etym: [L. sublimis.]"], "empty-brackets")).toBe(0);
  });
});
