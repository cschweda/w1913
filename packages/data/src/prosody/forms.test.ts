import { describe, expect, it } from "vitest";
import { listedForms } from "./forms.ts";
import { prosodyOf, stressPattern } from "./prosody.ts";

describe("listed inflected forms", () => {
  it("reads irregular and regular forms", () => {
    expect(listedForms("imp. Went; p. p. Gone; p. pr. & vb. n. Going. Went comes from the AS, wendan. See Wend, v. i.")).toEqual(["Went", "Gone", "Going"]);
    expect(listedForms("imp. Ran or Run; p. p. Run; p. pr. & vb. n. Running.")).toEqual(["Ran", "Run", "Running"]);
    expect(listedForms("pl. Children.")).toEqual(["Children"]);
    expect(listedForms("imp. & p. p. Boweled or Bowelled; p. pr.& vb. n. Boweling or Bowelling.")).toEqual(["Boweled", "Bowelled", "Boweling", "Bowelling"]);
  });
  it("stops at commentary and skips abbreviations", () => {
    expect(listedForms("Compar. Better; superl. Best. These words, though used as the comparative and superlative of good, are from a different root.")).toEqual(["Better", "Best"]);
    expect(listedForms("pl. L. Placentæ, E.")).toEqual([]);
    expect(listedForms("pl. -ties.")).toEqual([]);
    expect(listedForms(null)).toEqual([]);
  });
});

describe("stress pattern", () => {
  it("is one digit per syllable", () => {
    expect(stressPattern(prosodyOf('Sub*lime"')!)).toBe("01");
    expect(stressPattern(prosodyOf('Sau"ter')!)).toBe("10");
  });
});
