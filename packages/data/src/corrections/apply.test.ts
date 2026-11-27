import { describe, expect, it } from "vitest";
import { applyCorrections, Correction, loadCorrections } from "./apply.ts";

const c = (o: Partial<Correction>): Correction => ({ line: 2, find: "x", replace: "y", reason: "typo", checkedAgainst: "1913 printed page 1, col. 1", checkedBy: "CS", date: "2026-12-01", ...o });

describe("corrections", () => {
  it("replaces text that occurs once on the named line, leaving the input alone", () => {
    const lines = ["A", "Philadephia is a city.", "C"];
    const out = applyCorrections(lines, 1, [c({ find: "Philadephia", replace: "Philadelphia" })]);
    expect(out[1]).toBe("Philadelphia is a city.");
    expect(lines[1]).toBe("Philadephia is a city.");
  });
  it("refuses text that is missing or occurs more than once", () => {
    expect(() => applyCorrections(["", "a a"], 1, [c({ find: "a" })])).toThrow(/found 2 times/);
    expect(() => applyCorrections(["", "b"], 1, [c({ find: "a" })])).toThrow(/found 0 times/);
    expect(() => applyCorrections([""], 1, [c({ line: 9 })])).toThrow(/no such line/);
  });
  it("requires the printed page a correction was checked against", () => {
    expect(Correction.safeParse(c({ checkedAgainst: "" })).success).toBe(false);
  });
  it("the shipped file is valid", () => {
    expect(Array.isArray(loadCorrections().list)).toBe(true);
  });
});
