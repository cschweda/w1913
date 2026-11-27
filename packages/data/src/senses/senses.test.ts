import { describe, expect, it } from "vitest";
import { bracketGroups, isInflectionGroup, isLabelGroup, isParenLabel, isSpellingGroup } from "./brackets.ts";
import { findXrefs } from "./xrefs.ts";
import { isLabelOnly, parseBody, parseHeaderParagraph } from "./parse.ts";

describe("bracketGroups", () => {
  it("matches nested brackets and notes an Etym: label", () => {
    const g = bracketGroups("Yarn, n. Etym: [OE. yarn, [AS.] gearn.] [Obs.]");
    expect(g.map((x) => x.inner)).toEqual(["OE. yarn, [AS.] gearn.", "Obs."]);
    expect(g[0]!.etymLabel).toBe(true);
  });
  it("runs an unclosed group to the end", () => {
    expect(bracketGroups("n. Etym: [NL., fr. Gr. (Zoöl.)")[0]).toMatchObject({ closed: false, inner: "NL., fr. Gr. (Zoöl.)" });
  });
});

describe("group classes", () => {
  it("inflections", () => {
    expect(isInflectionGroup("imp. & p. p. Subjoined; p. pr. & vb. n. Subjoining.")).toBe(true);
    expect(isInflectionGroup("L. sublimis")).toBe(false);
  });
  it("labels", () => {
    expect(isLabelGroup("Obs. & R.")).toBe(true);
    expect(isLabelGroup("L. succedere, successum; sub under")).toBe(false);
  });
  it("spellings", () => {
    expect(isSpellingGroup("Written also tressel.")).toBe(true);
    expect(isSpellingGroup("See Strait.")).toBe(false);
  });
  it("parenthesised labels, not scientific names", () => {
    expect(isParenLabel("(Zoöl.)")).toBe(true);
    expect(isParenLabel("(R. C. Ch.)")).toBe(true);
    expect(isParenLabel("(med.)")).toBe(true);
    expect(isParenLabel("(Pseudemus concinna)")).toBe(false);
  });
});

describe("findXrefs", () => {
  it("reads a list after See / cf.", () => {
    expect(findXrefs("See Cede, and cf. Success.").map((x) => x.to)).toEqual(["Cede", "Success"]);
  });
  it("keeps a part of speech and a sense number", () => {
    expect(findXrefs("Same as Hypostasis, 2.")[0]).toMatchObject({ to: "Hypostasis", sense: 2 });
    expect(findXrefs("See Like, a., and cf. Which.")[0]).toMatchObject({ to: "Like", pos: "a." });
  });
  it("does not read a language abbreviation as a word", () => {
    expect(findXrefs("cf. F. sublime. Cf. Eliminate.").map((x) => x.to)).toEqual(["Eliminate"]);
  });
  it("records offsets of the linked word", () => {
    const t = "Syn. See Grand.";
    const [x] = findXrefs(t);
    expect(t.slice(x!.start, x!.end)).toBe("Grand");
  });
});

describe("parseHeaderParagraph", () => {
  it("separates inflections, etymology and labels", () => {
    const p = 'Sub*join", v. t. [imp. & p. p. Subjoined.] Etym: [L. subjungere. See Join.] (Gram.)';
    const h = parseHeaderParagraph(p, 'Sub*join", v. t.'.length);
    expect(h.inflections).toBe("imp. & p. p. Subjoined.");
    expect(h.etymology?.text).toBe("L. subjungere. See Join.");
    expect(h.headerLabels).toEqual(["(Gram.)"]);
    expect(h.definition).toBeNull();
  });
  it("takes a short etymology after Etym: even though it looks like a label", () => {
    expect(parseHeaderParagraph("Sirt, n. Etym: [See Syrt.]", 7).etymology?.text).toBe("See Syrt.");
  });
  it("keeps a definition printed in the header", () => {
    const h = parseHeaderParagraph('A*ca"jou, n. The cashew tree; also, its fruit.', 'A*ca"jou, n.'.length);
    expect(h.definition).toBe("The cashew tree; also, its fruit.");
  });
});

describe("parseBody", () => {
  it("joins a Defn: to a numbered sense that holds only a label", () => {
    const { senses } = parseBody([["2. (Mus.)"], ["Defn: The name of the sixth tone."]]);
    expect(senses).toHaveLength(1);
    expect(senses[0]).toMatchObject({ n: 2, text: "(Mus.) The name of the sixth tone." });
  });
  it("opens a new unnumbered sense for a second Defn:", () => {
    expect(parseBody([["Defn: Of the Zuñis. --n."], ["Defn: A Zuñi."]]).senses.map((s) => s.n)).toEqual([null, null]);
  });
  it("reads lettered sub-senses and notes", () => {
    const { senses } = parseBody([["2. (Anat.)", "(a) One.", "(b) Two."], ["Note: A note."]]);
    expect(senses[0]!.sub.map((s) => s.letter)).toEqual(["a", "b"]);
    expect(senses[0]!.notes[0]!.text).toBe("A note.");
  });
  it("collects the Syn. section to the end", () => {
    expect(parseBody([["1. Lofty."], ["Syn.", " -- Exalted; lofty."]]).syn).toBe("Syn.\n -- Exalted; lofty.");
  });
  it("tells a label-only sense from one with text", () => {
    expect(isLabelOnly("(Anat.) [Obs.]")).toBe(true);
    expect(isLabelOnly("(Anat.) A bone.")).toBe(false);
  });
});
