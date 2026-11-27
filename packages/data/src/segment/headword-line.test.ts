import { describe, expect, it } from "vitest";
import { isLetterEntryLine, looksLikeHeadwordLine, splitVariants } from "./headword-line.ts";

describe("looksLikeHeadwordLine", () => {
  it.each(["SUBLIME", "ABATIS; ABATTIS", "A 1", "JACK-'-LANTERN", "X RAYS; X-RAYS", "B"])("accepts %j", (l) => {
    expect(looksLikeHeadwordLine(l)).toBe(true);
  });
  it.each([
    ["the Morse code table", "J .---     P .--.     X -..-"],
    ["a sense number", "5. (R.C.CH.)"],
    ["a sense number with a letter", "1. T"],
    ["a header line", 'Sub*lime", a.'],
    ["a line in lower case", "Defn: A yardstick."],
    ["digits only", "1913"],
  ])("rejects %s", (_, l) => {
    expect(looksLikeHeadwordLine(l)).toBe(false);
  });
});

describe("isLetterEntryLine", () => {
  it("accepts a lone capital", () => expect(isLetterEntryLine("Y")).toBe(true));
  it("rejects a letter with a full stop (a stray line)", () => expect(isLetterEntryLine("M.")).toBe(false));
});

describe("splitVariants", () => {
  it("splits on semicolons", () => {
    expect(splitVariants("ABATIS; ABATTIS")).toEqual(["ABATIS", "ABATTIS"]);
    expect(splitVariants("SUBLIME")).toEqual(["SUBLIME"]);
  });
});
