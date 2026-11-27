import { describe, expect, it } from "vitest";
import { isEntryStart, reassemble, segment, wrapsOntoNext } from "./segment.ts";

describe("isEntryStart", () => {
  const lines = ["", "SUBLIME", 'Sub*lime", a.', "", "Defn: text", "SUBLIMED", "", "Y", "", "Defn: letter", "", "M.", ""];
  it("starts an entry at a capital line after a blank line", () => expect(isEntryStart(lines, 1)).toBe(true));
  it("does not start one when the previous line is not blank", () => expect(isEntryStart(lines, 5)).toBe(false));
  it("starts an alphabet-letter entry even though a blank line follows", () => expect(isEntryStart(lines, 7)).toBe(true));
  it("does not start one at a stray line followed by a blank line", () => expect(isEntryStart(lines, 11)).toBe(false));
});

describe("wrapsOntoNext", () => {
  it("joins a headword line that wraps", () => {
    expect(wrapsOntoNext(["", "CONSOLATION GAME; CONSOLATION", "RACE", "Con`so*la\"tion game"], 1)).toBe(true);
  });
  it("does not join a headword to its header line", () => {
    expect(wrapsOntoNext(["", "SUBLIME", 'Sub*lime", a.', ""], 1)).toBe(false);
  });
});

describe("segment", () => {
  const body = ["", "", "AB", "Ab, n.", "", "Defn: One.", "", "M.", "", "ABA", "Ab\"a, n.", "", "Defn: Two.", ""];
  const seg = segment(body, 10);
  it("splits entries and keeps stray lines inside the preceding entry", () => {
    expect(seg.entries.map((e) => e.headwordLine)).toEqual(["AB", "ABA"]);
    expect(seg.entries[0]!.lines).toContain("M.");
  });
  it("numbers lines from the given offset", () => {
    expect(seg.entries.map((e) => e.line)).toEqual([12, 19]);
  });
  it("is lossless", () => {
    expect(reassemble(seg)).toEqual(body);
  });
});
