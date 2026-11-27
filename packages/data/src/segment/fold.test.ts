import { describe, expect, it } from "vitest";
import { foldForCompare, slugify, stripMarks } from "./fold.ts";

describe("foldForCompare", () => {
  it("folds ligatures, diacritics, marks, spaces and case", () => {
    expect(foldForCompare('Æ"gis')).toBe("aegis");
    expect(foldForCompare('Ac"ti*no*zo"ön')).toBe("actinozoon");
    expect(foldForCompare('Ac*count"a*ble ness')).toBe(foldForCompare("ACCOUNTABLENESS"));
  });
  it("does not invent letters the source lacks", () => {
    expect(foldForCompare("CAADA")).not.toBe(foldForCompare('Ca*ña"da'));
  });
});

describe("slugify", () => {
  it("makes URL slugs with hyphens between words", () => {
    expect(slugify("Sublime")).toBe("sublime");
    expect(slugify("A per se")).toBe("a-per-se");
    expect(slugify("Zuñian")).toBe("zunian");
    expect(slugify('Jack"-o\'-lan`tern')).toBe("jack-o-lantern");
  });
});

describe("stripMarks", () => {
  it("removes syllable and stress marks only", () => {
    expect(stripMarks('Zo`ö*chem"ic*al')).toBe("Zoöchemical");
    expect(stripMarks("Jack-o'-lantern")).toBe("Jack-o'-lantern");
  });
});
