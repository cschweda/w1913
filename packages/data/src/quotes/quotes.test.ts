import { describe, expect, it } from "vitest";
import { findQuotes } from "./parse.ts";
import { AUTHORS, normaliseAuthor } from "./authors.ts";

// Hand-written examples in the 1913's own shapes (no tagged text here).
describe("quotations", () => {
  it("finds a block quotation after the definition, with its author", () => {
    const t = "Sum of scenes or views; general aspect.\nNever need an American look beyond his own country for the sublime\nand beautiful of natural scenery. W. Irving.";
    const q = findQuotes(t).quotes;
    expect(q.map((x) => [x.kind, x.author])).toEqual([["block", "W. Irving"]]);
    expect(t.slice(q[0]!.start, q[0]!.end)).toMatch(/^Never need.*scenery\.$/s);
  });
  it("keeps a wrapped author whole and reads Scripture references", () => {
    const t = "Sudden; hasty.\nThe cause of this abrupt departure. Sir T.\nBrowne.\nIn all thy ways acknowledge Him. Prov. iii. 6.";
    expect(findQuotes(t).quotes.map((x) => x.author)).toEqual(["Sir T. Browne", "Prov. iii. 6"]);
  });
  it("finds an inline quotation and an author on a line of its own", () => {
    const t = 'Distinguished by lofty traits; -- said of persons. "The sublime Julian leader." De Quincey.\nReasons were adduced on both sides. Macaulay.\nEnough could not be adduced to satisfy the purpose of illustration.\nDe Quincey.';
    expect(findQuotes(t).quotes.map((x) => [x.kind, x.author])).toEqual([["inline", "De Quincey"], ["block", "Macaulay"], ["block", "De Quincey"]]);
  });
  it("reads a bare name after the definition as an authority, not a quotation", () => {
    const f = findQuotes("To exhibit as a scene; to display. [Obs.]\nAbp. Sancroft.");
    expect(f.quotes).toEqual([]);
    expect(f.authorities.map((a) => a.author)).toEqual(["Abp. Sancroft"]);
  });
  it("does not read cross-references or run-on phrases as quotations", () => {
    expect(findQuotes("A thing.\nSee Sublime.").quotes).toEqual([]);
    expect(findQuotes("A lace.\nLaced mutton, a prostitute. [Old slang] -- Laced stocking, a stocking. Dunglison.").quotes).toEqual([]);
  });
});

describe("authors", () => {
  it("has unique keys and forms", () => {
    expect(new Set(AUTHORS.map((a) => a.key)).size).toBe(AUTHORS.length);
    const forms = AUTHORS.flatMap((a) => a.forms.map((f) => f.toLowerCase()));
    expect(new Set(forms).size).toBe(forms.length);
  });
  it("normalises printed forms, typos and Scripture", () => {
    expect(normaliseAuthor("Shak").name).toBe("William Shakespeare");
    expect(normaliseAuthor("Macualay").key).toBe("macaulay");
    expect(normaliseAuthor("1 Cor. xii. 5")).toMatchObject({ key: "bible", ref: "1 Corinthians xii. 5" });
    expect(normaliseAuthor("Jer. Taylor").key).toBe("jeremy-taylor");
    expect(normaliseAuthor("Jer. xlii. 4")).toMatchObject({ key: "bible", ref: "Jeremiah xlii. 4" });
    expect(normaliseAuthor("Knight")).toMatchObject({ key: "knight", name: "Knight", known: false });
    // Identified in the top-300 pass, keeping the key the printed form had.
    expect(normaliseAuthor("Rogers")).toMatchObject({ key: "rogers", name: "Samuel Rogers", known: true });
    expect(normaliseAuthor("W. Irwing").key).toBe("washington-irving");
  });
});
