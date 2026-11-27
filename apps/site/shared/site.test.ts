import { describe, expect, it } from "vitest";
import * as dataFold from "../../../packages/data/src/segment/fold.ts";
import { entryPath, foldForCompare, RESERVED, slugify } from "./fold.ts";
import { posAnchor, posTitle } from "./pos.ts";
import { bodyHtml, blockHtml, escapeHtml, prose, type Locate } from "./render.ts";
import { addToTrail } from "./trail.ts";
import config from "../../../w1913.config.ts";

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

const locate: Locate = (id) => (id === "grand-1" ? { path: "/grand", anchor: "a" } : null);

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
