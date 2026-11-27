import { describe, expect, it } from "vitest";
import { displayForm, headerEchoes, isUmlautTransliteration, parseHeader } from "./header.ts";

describe("parseHeader", () => {
  it("finds the form and part of speech", () => {
    expect(parseHeader('Sub*lime", a. [Compar. Sublimer; superl. Sublimest.] Etym: [L.')).toEqual({
      marked: 'Sub*lime"', forms: ['Sub*lime"'], pos: "a.",
    });
  });
  it("finds a compound part of speech", () => {
    expect(parseHeader('Re*o"pen, v. t. & i.').pos).toBe("v. t. & i.");
  });
  it("finds the part of speech when the comma before it is missing", () => {
    const h = parseHeader('A*chæ"an, A*cha"ian a. Etym: [L. Achaeus');
    expect(h.pos).toBe("a.");
    expect(h.forms).toEqual(['A*chæ"an', 'A*cha"ian']);
  });
  it("cuts a pronunciation respelling off the form", () => {
    expect(parseHeader('Cor"net*er (kr"nt-r), n.')).toEqual({ marked: 'Cor"net*er', forms: ['Cor"net*er'], pos: "n." });
  });
  it("splits forms joined by or", () => {
    expect(parseHeader('A*bime" or A*byme", n.').forms).toEqual(['A*bime"', 'A*byme"']);
  });
  it("reports no part of speech when there is none", () => {
    const h = parseHeader("Lymph node. (Anat.)");
    expect(h.pos).toBeNull();
    expect(h.marked).toBe("Lymph node");
    expect(parseHeader("A 1. A registry mark given by underwriters (as at Lloyd's)").marked).toBe("A 1");
  });
  it("does not read a word inside an etymology as a part of speech", () => {
    expect(parseHeader('Yarn, n. Etym: [OE. yarn, AS. gearn').pos).toBe("n.");
  });
});

describe("headerEchoes", () => {
  it("echoes after folding", () => {
    expect(headerEchoes('Æ"gis, n. Etym: [L. aegis', ["AEGIS"])).toBe(true);
    expect(headerEchoes('Ab"a*tis, Ab"at*tis, n.', ["ABATIS", "ABATTIS"])).toBe(true);
  });
  it("does not echo when the headword line lost a letter", () => {
    expect(headerEchoes('Ca*ña"da, n. [Sp.]', ["CAADA"])).toBe(false);
  });
});

describe("displayForm", () => {
  it("uses the printed header form, keeping its accents", () => {
    expect(displayForm("ZUIAN", ['Zu"ñi*an'], 0)).toEqual({ text: "Zuñian", source: "header" });
  });
  it("prefers the form in the same position when two fold alike", () => {
    expect(displayForm("X-RAYS", ["X rays", 'X"-rays`'], 1).text).toBe("X-rays");
  });
  it("falls back to the headword line when the header lost letters", () => {
    expect(displayForm("AUTOECIOUS", ['Au*to"cious'], 0)).toEqual({ text: "Autoecious", source: "headword-line" });
  });
});

describe("isUmlautTransliteration", () => {
  it("spots ö written as oe on the headword line", () => {
    expect(isUmlautTransliteration("ZOOECHEMICAL", ['Zo`ö*chem"ic*al'])).toBe(true);
  });
  it("leaves a real spelling alone", () => {
    expect(isUmlautTransliteration("ZOOCHEMICAL", ['Zo`ö*chem"ic*al'])).toBe(false);
    expect(isUmlautTransliteration("ABATTIS", ['Ab"a*tis', 'Ab"at*tis'])).toBe(false);
  });
});
