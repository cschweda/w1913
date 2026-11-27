import { describe, expect, it } from "vitest";
import { gutenbergBody, normaliseLineEndings } from "./text.ts";

describe("normaliseLineEndings", () => {
  it("turns CRLF into LF and counts it", () => {
    expect(normaliseLineEndings("a\r\nb\r\n")).toEqual({ text: "a\nb\n", crlf: 2, loneCr: 0 });
  });
  it("leaves a lone CR in place and reports it", () => {
    expect(normaliseLineEndings("a\rb\n")).toEqual({ text: "a\rb\n", crlf: 0, loneCr: 1 });
  });
});

describe("gutenbergBody", () => {
  const file = ["header", "*** START OF THE PROJECT GUTENBERG EBOOK X ***", "", "A", "*** END OF THE PROJECT GUTENBERG EBOOK X ***", "licence"];
  it("returns the lines between the markers with the 1-based number of the first", () => {
    expect(gutenbergBody(file)).toEqual({ lines: ["", "A"], firstLineNumber: 3 });
  });
  it("refuses a file without markers", () => {
    expect(() => gutenbergBody(["A", "B"])).toThrow();
  });
});
