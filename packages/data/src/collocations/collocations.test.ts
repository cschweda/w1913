import { describe, expect, it } from "vitest";
import { findCollocations, usesHeadword } from "./parse.ts";

const phrases = (text: string, hw: string) => findCollocations(text, hw).map((c) => c.phrases.map((p) => p.text));

describe("findCollocations", () => {
  const bill = "Any paper, containing a statement of particulars; as, a bill of\ncharges; a bill of fare,\netc. Bill of adventure. See under Adventure.\n -- Bill of costs, a statement of the items.\n -- Bill of exchange (Com.), a written order.\n -- Bill of health, a certificate.";
  it("finds marked phrases and the unmarked first one of a run", () => {
    expect(phrases(bill, "Bill")).toEqual([["Bill of adventure"], ["Bill of costs"], ["Bill of exchange"], ["Bill of health"]]);
  });
  it("splits each definition at the next phrase and keeps labels in the head", () => {
    const cs = findCollocations(bill, "Bill");
    const ex = cs[2]!;
    expect(bill.slice(ex.at, ex.defStart)).toBe("-- Bill of exchange (Com.), ");
    expect(bill.slice(ex.defStart, ex.end)).toBe("a written order.");
    expect(cs[0]!.see).toBe("Adventure");
    expect(bill.slice(0, cs[0]!.at).trimEnd()).toMatch(/etc\.$/);
  });
  it("groups phrases that share a definition", () => {
    expect(phrases(" -- Apple of love, or Love apple, the tomato.", "Apple")).toEqual([["Apple of love", "Love apple"]]);
    expect(phrases("A heavy fire. Blue fire, Red fire, Green fire (Pyrotech.),\ncompositions of sulphur.", "Fire")).toEqual([["Blue fire", "Red fire", "Green fire"]]);
    expect(phrases("An opossum. [Colloq. U. S.] To play possum, To act possum, to\nfeign ignorance.", "Possum")).toEqual([["To play possum", "To act possum"]]);
  });
  it("takes a label with no comma after it, and a label on the next line", () => {
    expect(phrases(" -- Apple fly, a fly.\n -- Apple midge (Zoöl.) a small insect.", "Apple")).toEqual([["Apple fly"], ["Apple midge"]]);
    const t = " -- Apple snail or Apple shell\n(Zoöl.), a fresh-water shell.";
    const c = findCollocations(t, "Apple")[0]!;
    expect(c.phrases.map((p) => p.text)).toEqual(["Apple snail", "Apple shell"]);
    expect(t.slice(c.defStart, c.end)).toBe("a fresh-water shell.");
  });
  it("skips run-in derivatives, sentences and quotations", () => {
    expect(phrases("Lofty; grand.\n -- Sub*lime\"ly, adv.\n -- Sublime ness, n.", "Sublime")).toEqual([]);
    expect(phrases("Lofty.\nSublime on these a tower of steel is reared. Dryden.", "Sublime")).toEqual([]);
    expect(phrases("The plant. The plants, which grow, are tall.", "Plant")).toEqual([]);
    expect(phrases("Vile. \"You filthy bung, away.\" Shak.", "Bung")).toEqual([]);
  });
  it("needs the headword for an unmarked phrase", () => {
    expect(phrases("A paper. Any paper, a written thing.", "Bill")).toEqual([]);
    expect(usesHeadword("Bills of mortality", "Bill")).toBe(true);
    expect(usesHeadword("Love apple", "Bill")).toBe(false);
  });
});
