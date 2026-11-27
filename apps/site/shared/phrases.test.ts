import { describe, expect, it } from "vitest";
import { bodyHtml, type CollocMark, type RenderableEntry } from "./render.ts";

const text = "Any paper; a bill of fare, etc. Bill of adventure. See under Adventure.\n -- Apple of love, or Love apple, the tomato.";
const at2 = text.indexOf("-- Apple");
const cols: CollocMark[] = [
  { sense: 0, sub: null, note: null, at: 32, defStart: 51, end: at2 - 2, phrases: [{ start: 32, end: 49, text: "Bill of adventure" }], see: "Adventure", seeId: null },
  {
    sense: 0, sub: null, note: null, at: at2, defStart: text.indexOf("the tomato"), end: text.length,
    phrases: [{ start: at2 + 3, end: at2 + 16, text: "Apple of love" }, { start: text.indexOf("Love apple"), end: text.indexOf("Love apple") + 10, text: "Love apple" }], see: null, seeId: null,
  },
];
const entry = (c: CollocMark[]): RenderableEntry => ({
  inflections: null, etymology: null, headerLabels: [], headerMarks: [], spellings: [], headerRest: null, notes: [], syn: null,
  senses: [{ n: 1, text, xrefs: [], sub: [], notes: [] }], quotes: [], collocations: c,
});

describe("phrases in entries", () => {
  const html = bodyHtml(entry(cols), () => null, "n");
  it("ends the sense where its phrases begin", () => {
    expect(html).toContain('<li id="n-1" value="1"><p class="st">Any paper; a bill of fare, etc.</p></li>');
  });
  it("lists each run with its phrases as anchored dfn elements", () => {
    expect(html).toContain('<h3 id="n-phrases-h" class="cap sh">Phrases</h3>');
    expect(html).toContain('<dt><dfn id="n-p-bill-of-adventure">Bill of adventure</dfn></dt><dd><p class="st">See under Adventure.</p></dd>');
    expect(html).toContain('<dt><dfn id="n-p-apple-of-love">Apple of love</dfn>, or <dfn id="n-p-love-apple">Love apple</dfn></dt><dd><p class="st">the tomato.</p></dd>');
  });
  it("leaves the sense whole without the layer", () => {
    expect(bodyHtml(entry([]), () => null, "n")).not.toContain("Phrases");
  });
});
