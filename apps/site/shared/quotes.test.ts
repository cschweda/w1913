import { describe, expect, it } from "vitest";
import { bodyHtml, type QuoteMark, type RenderableEntry } from "./render.ts";

const text = 'Lifted up; lofty.\nSublime on these a tower of steel is reared. Dryden.';
const q = (o: Partial<QuoteMark>): QuoteMark => ({ sense: 0, sub: null, start: 0, end: 0, authorStart: 0, authorEnd: 0, kind: "block", author: "", authorKey: "", authorName: "", ref: null, ...o });
const entry = (quotes: QuoteMark[], t = text): RenderableEntry => ({
  inflections: null, etymology: null, headerLabels: [], headerMarks: [], spellings: [], headerRest: null, notes: [], syn: null,
  senses: [{ n: 1, text: t, xrefs: [], sub: [], notes: [] }], quotes,
});

describe("quotations in entries", () => {
  it("renders a block quotation as a blockquote with a linked citation and the full name for screen readers", () => {
    const start = text.indexOf("Sublime");
    const aStart = text.indexOf("Dryden");
    const html = bodyHtml(entry([q({ start, end: aStart - 1, authorStart: aStart, authorEnd: aStart + 6, author: "Dryden", authorKey: "dryden", authorName: "John Dryden" })]), () => null, "a");
    expect(html).toContain('<p class="st">Lifted up; lofty.</p><blockquote class="qt"><p>Sublime on these a tower of steel is reared.</p>');
    expect(html).toContain('<footer class="qa"><cite><a href="/author/dryden" class="x">Dryden<span class="vh"> (John Dryden)</span></a></cite></footer></blockquote>');
    expect(html).not.toContain("Dryden.</p>");
  });
  it("links the author of an inline quotation in place, keeping the quote marks", () => {
    const t = 'Eminent. "The sublime Julian leader." De Quincey.';
    const a = t.indexOf("De Quincey");
    const html = bodyHtml(entry([q({ kind: "inline", start: t.indexOf("The"), end: t.indexOf('."') + 1, authorStart: a, authorEnd: a + 10, author: "De Quincey", authorKey: "de-quincey", authorName: "Thomas De Quincey" })], t), () => null, "a");
    expect(html).toContain('&quot;The sublime Julian leader.&quot; <cite><a href="/author/de-quincey" class="x">De Quincey<span class="vh"> (Thomas De Quincey)</span></a></cite>.');
  });
  it("leaves a sense without quotations unchanged", () => {
    expect(bodyHtml(entry([]), () => null, "a")).toContain("Sublime on these a tower of steel is reared. Dryden.");
  });
});
