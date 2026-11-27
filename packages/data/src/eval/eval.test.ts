// The sample markup below is written for this test in the style the
// transcribers' legend describes; it is not copied from the tagged files.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeEntities, stripTags, tokenizeTagged } from "./tagged.ts";
import { similarity, words } from "./similarity.ts";

const sample = [
  "front matter, skipped",
  '<p><hw>Ex"am*ple</hw> (?), <pos><i>n.</i></pos> <def>A thing to test with.</def></p>',
  "",
  "<p><blockquote>A made-up line.</blockquote> <i>Nobody.</i></p>",
  "",
  '<p>{ <hw>Fo"o</hw>, <hw>Fo"oe</hw> }, <pos><i>n.</i></pos> <def>Tw&oacute; <ae/ <i>forms</def></p>',
].join("\r\n");

describe("tokenizeTagged", () => {
  const es = tokenizeTagged("sample.txt", sample);
  it("finds entries at both openers and attaches continuation paragraphs", () => {
    expect(es.map((e) => e.headword)).toEqual(['Ex"am*ple', 'Fo"o']);
    expect(es[0]!.text).toContain("A made-up line.");
    expect(es.map((e) => e.line)).toEqual([2, 6]);
  });
  it("survives an unclosed tag", () => {
    expect(es[1]!.text).toContain("forms");
  });
});

describe("decodeEntities", () => {
  it("maps letter entities to their base letters and named ones to characters", () => {
    expect(decodeEntities("Tw&oacute; <ae/ &frac12;")).toBe("Two æ ½");
  });
  it("drops unknown symbols", () => {
    expect(decodeEntities("&CHI; x")).toBe(" x");
  });
});

describe("similarity", () => {
  it("ignores marks, labels and punctuation", () => {
    expect(similarity(words('Sub*lime", a. Defn: Lofty.'), words("Sublime a. Lofty"))).toBe(1);
  });
  it("drops with each word that differs", () => {
    expect(similarity(words("a b c d"), words("a b x d"))).toBeCloseTo(0.75);
  });
  it("strips tags", () => {
    expect(stripTags("<i>a</i> <b>b</b>").trim()).toBe("a b");
  });
});

describe("evaluation boundary", () => {
  it("no module outside src/eval imports from it", () => {
    const src = path.resolve(import.meta.dirname, "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== "eval") walk(p); continue; }
        if (!p.endsWith(".ts")) continue;
        if (/from\s+["'][^"']*\/eval\//.test(readFileSync(p, "utf8"))) offenders.push(path.relative(src, p));
      }
    };
    walk(src);
    expect(offenders).toEqual([]);
  });
});
