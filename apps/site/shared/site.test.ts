import { describe, expect, it } from "vitest";
import * as dataFold from "../../../packages/data/src/segment/fold.ts";
import { entryPath, foldForCompare, RESERVED, slugify } from "./fold.ts";
import { posAnchor, posTitle } from "./pos.ts";
import { bodyHtml, blockHtml, escapeHtml, prose, type Locate } from "./render.ts";
import { addToTrail } from "./trail.ts";
import config from "../../../w1913.config.ts";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { inRange, LATIN_RANGE } from "./font-range.ts";

describe("folding matches the edition's rules", () => {
  it.each(["Æ\"gis", "Zo`ö*chem\"ic*al", "Jack\"-o'-lan`tern", "Zuñian", "A per se", "X\"-rays`"])("%j", (w) => {
    expect(foldForCompare(w)).toBe(dataFold.foldForCompare(w));
    expect(slugify(w)).toBe(dataFold.slugify(w));
  });
});

describe("entryPath", () => {
  it("puts route words under /w/", () => {
    expect(entryPath("check")).toBe("/w/check");
    expect(entryPath("sublime")).toBe("/sublime");
  });
  it("takes the route words from w1913.config.ts", () => {
    expect([...RESERVED]).toEqual([...config.reservedWords]);
  });
});

describe("pos", () => {
  it("expands abbreviations for the abbr title", () => {
    expect(posTitle("v. t.")).toBe("transitive verb");
    expect(posTitle("a. & n.")).toBe("adjective and noun");
  });
  it("makes short anchors", () => {
    expect(posAnchor("v. t.")).toBe("vt");
    expect(posAnchor(null)).toBe("e");
  });
});

const locate: Locate = (id) => (id === "grand-1" ? { path: "/grand", slug: "grand", anchor: "a" } : null);

describe("render", () => {
  it("escapes everything from the source", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;");
  });
  it("joins wrapped lines and shows the printed dash as an em dash", () => {
    expect(prose("eminent; -- said of\npersons.")).toBe("eminent; — said of persons.");
  });
  it("links a resolved cross-reference and leaves an unresolved one as text", () => {
    const html = blockHtml({ text: "See Grand. See Nowhere.", xrefs: [
      { start: 4, end: 9, to: "Grand", id: "grand-1", sense: null },
      { start: 15, end: 22, to: "Nowhere", id: null, sense: null },
    ] }, locate);
    expect(html).toBe('<p>See <a href="/grand#a" class="x">Grand</a>. See Nowhere.</p>');
  });
  it("lists numbered senses with their printed numbers", () => {
    const html = bodyHtml({
      inflections: null, etymology: null, headerLabels: [], headerMarks: [], spellings: [], headerRest: null, notes: [], syn: null,
      senses: [
        { n: 1, text: "Lofty.", xrefs: [], sub: [], notes: [] },
        { n: 2, text: "(Anat.)", xrefs: [], sub: [{ letter: "a", text: "One.", xrefs: [] }], notes: [] },
      ],
    }, locate, "a");
    expect(html).toContain('<ol class="s"><li id="a-1" value="1">');
    expect(html).toContain('<ol class="sub" type="a"><li id="a-2a" value="1">');
  });
});

describe("trail", () => {
  it("keeps the most recent words, moving a revisit to the end", () => {
    let t = [{ slug: "a", headword: "A" }, { slug: "b", headword: "B" }];
    t = addToTrail(t, { slug: "a", headword: "A" });
    expect(t.map((x) => x.slug)).toEqual(["b", "a"]);
  });
  it("holds at most the configured number", () => {
    let t: { slug: string; headword: string }[] = [];
    for (let i = 0; i < 30; i++) t = addToTrail(t, { slug: `w${i}`, headword: `W${i}` });
    expect(t).toHaveLength(config.features.trailMax);
    expect(t.at(-1)!.slug).toBe("w29");
  });
});

describe("font coverage", () => {
  it("the CSS declares the same range the font was cut to", () => {
    const css = readFileSync(path.join(import.meta.dirname, "../app/assets/css/main.css"), "utf8");
    expect(css).toContain(`unicode-range: ${LATIN_RANGE.split(",").join(", ")};`);
  });
  it("the typography the renderer adds is covered", () => {
    for (const ch of "—″′·“”’…–") expect(inRange(LATIN_RANGE, ch.codePointAt(0)!)).toBe(true);
  });
  const edition = path.join(import.meta.dirname, "../../..", config.paths.editions, `w1913-${config.edition.version}`, `w1913-${config.edition.version}.jsonl`);
  it.skipIf(!existsSync(edition))("every character in the pinned edition is in the font", () => {
    const missing = new Set<string>();
    for (const ch of readFileSync(edition, "utf8")) {
      const cp = ch.codePointAt(0)!;
      if (cp > 0x7e && !inRange(LATIN_RANGE, cp)) missing.add(ch);
    }
    expect([...missing]).toEqual([]);
  });
});

import { abbreviate, abbreviationsIn } from "./abbreviations.ts";
import { prosodyOf } from "./prosody.ts";

describe("abbreviations", () => {
  it("decodes languages in an etymology", () => {
    expect(abbreviate("OE. sotil, L. subtilis", "etymology")).toBe('<abbr title="Old English">OE.</abbr> sotil, <abbr title="Latin">L.</abbr> subtilis');
  });
  it("decodes labels only inside brackets or parentheses", () => {
    expect(abbreviate("To inherit. [Obs. &amp; R.] Shak.", "text")).toBe('To inherit. [<abbr title="obsolete">Obs.</abbr> &amp; <abbr title="rare">R.</abbr>] Shak.');
    expect(abbreviate("Stooping and submiss. R. L. Stevenson.", "text")).toBe("Stooping and submiss. R. L. Stevenson.");
  });
  it("does not decode inside a word", () => {
    expect(abbreviate("Galatians", "etymology")).toBe("Galatians");
  });
  it("lists each abbreviation once for the key", () => {
    expect(abbreviationsIn('<abbr title="Latin">L.</abbr> x <abbr title="Latin">L.</abbr> <abbr title="obsolete">Obs.</abbr>')).toEqual([
      { abbr: "L.", meaning: "Latin" }, { abbr: "Obs.", meaning: "obsolete" },
    ]);
  });
});

describe("prosodyOf", () => {
  it("reads syllables and primary stress", () => {
    expect(prosodyOf('Sub*lime"')).toEqual({ syllables: [{ text: "Sub", stress: 0 }, { text: "lime", stress: 1 }], summary: "2 syllables, stress on the second" });
  });
  it("reads secondary stress", () => {
    expect(prosodyOf('Ac`e*to*ne"mi*a')?.summary).toBe("6 syllables, stress on the fourth, lighter stress on the first");
  });
  it("splits at hyphens", () => {
    expect(prosodyOf('Jack"-o\'-lan`tern')?.syllables.map((s) => s.text)).toEqual(["Jack", "o'", "lan", "tern"]);
  });
  it("uses only the first of several forms", () => {
    expect(prosodyOf('Ab"a*tis, Ab"at*tis')?.syllables).toHaveLength(3);
  });
  it("claims one syllable only for an unmarked word with one vowel group", () => {
    expect(prosodyOf("Yarn")?.summary).toBe("1 syllable");
    expect(prosodyOf("Saunter")).toBeNull();
    expect(prosodyOf(null)).toBeNull();
  });
});

describe("versioning", () => {
  it("CHANGELOG.md has a section for the version in package.json", () => {
    const root = path.join(import.meta.dirname, "../../..");
    const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { version: string };
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(readFileSync(path.join(root, "CHANGELOG.md"), "utf8")).toContain(`## [${version}] - `);
  });
  it("the README's version badge matches package.json", () => {
    const root = path.join(import.meta.dirname, "../../..");
    const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { version: string };
    expect(readFileSync(path.join(root, "README.md"), "utf8")).toContain(`badge/version-${version}-`);
  });
});

import { compareHref, essayHtml, synonymsHtml } from "./render.ts";

describe("synonyms rendering", () => {
  const loc: Locate = (id) => ({ "abandon-1": { path: "/abandon", slug: "abandon", anchor: "vt" }, "desert-1": { path: "/desert", slug: "desert", anchor: "n" }, "forsake-1": { path: "/forsake", slug: "forsake", anchor: "vt" } })[id] ?? null;
  const essay = { compares: [{ text: "Abandon", id: "abandon-1" }, { text: "Desert", id: "desert-1" }, { text: "Forsake", id: "forsake-1" }], text: "These words agree.", xrefs: [] };
  it("links listed words that resolve and leaves the others plain", () => {
    const html = synonymsHtml({ words: [{ text: "To give up", lookup: "give up", id: null }, { text: "desert", lookup: "desert", id: "desert-1" }], note: null, essays: [], derived: [] }, loc, "vt");
    expect(html).toContain('<li><span>To give up</span></li>');
    expect(html).toContain('<li><a href="/desert#n" class="x">desert</a></li>');
    expect(html).toContain('id="vt-syn"');
  });
  it("heads an essay with its compared words and a compare link", () => {
    const html = essayHtml(essay, loc);
    expect(html).toContain('<a href="/abandon#vt" class="x">Abandon</a>');
    expect(html).toContain('href="/synonyms/compare?w=abandon,desert,forsake"');
  });
  it("offers no compare link with fewer than two resolved words", () => {
    expect(compareHref([{ text: "Abandon", id: "abandon-1" }, { text: "Nowhere", id: null }], loc)).toBeNull();
  });
});
