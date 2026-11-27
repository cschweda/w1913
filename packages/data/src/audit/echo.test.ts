import { describe, expect, it } from "vitest";
import { segment } from "../segment/segment.ts";
import { classifyEcho, isSubsequence } from "./echo.ts";

const one = (...lines: string[]) => segment(["", ...lines, "", "Defn: x."]).entries[0]!;

describe("classifyEcho", () => {
  it("echoes", () => expect(classifyEcho(one("SUBLIME", 'Sub*lime", a.'))).toBe("echoes"));
  it("headword line lost letters", () => expect(classifyEcho(one("SEOR", 'Se*ñor", n. [Sp.]'))).toBe("headword-line-lost-letters"));
  it("header line lost letters", () => expect(classifyEcho(one("AUTOECISM", 'Au*to"cism, n.'))).toBe("header-line-lost-letters"));
  it("phrase variants with or", () => expect(classifyEcho(one("FUSE PLUG; FUZE PLUG", "Fuse, or Fuze, plug ."))).toBe("or-variant-phrase"));
  it("anything else is other", () => expect(classifyEcho(one("OVERTHWART", ", v. t."))).toBe("other"));
});

describe("isSubsequence", () => {
  it("applies", () => expect(isSubsequence("caada", "canada")).toBe(true));
  it("does not apply", () => expect(isSubsequence("cnaada", "canada")).toBe(false));
});
