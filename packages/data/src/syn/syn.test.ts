import { describe, expect, it } from "vitest";
import { essayHeading, headingOnly, isDerivedForm, parseList, parseSyn, synSegments } from "./parse.ts";

describe("synSegments", () => {
  it("splits at line-initial dashes and accepts single-dash openings", () => {
    expect(synSegments("Syn.\n -- Exalted; lofty.\n -- To Abate, Subside. These words ...")).toHaveLength(2);
    expect(synSegments("Syn.- To refer; allude. See Refer.")).toEqual(["To refer; allude. See Refer."]);
  });
  it("splits where an essay heading starts mid-line", () => {
    expect(synSegments("Syn.\n -- Kind, -- Obliging, Kind, Complaisant. These words differ.")).toEqual(["Kind", "Obliging, Kind, Complaisant. These words differ."]);
  });
  it("does not split at a dash inside prose", () => {
    expect(synSegments("Syn.\n -- Esteem is a sentiment of respect and attachment, -- the valuation of a person.")).toHaveLength(1);
  });
});

describe("parseList", () => {
  it("reads semicolon lists, drops a leading To for lookup, and keeps the note", () => {
    const { words, note } = parseList("To give up; yield; withdraw from. See Grand.");
    expect(words.map((w) => w.lookup)).toEqual(["give up", "yield", "withdraw from"]);
    expect(words[0]!.text).toBe("To give up");
    expect(note).toBe("See Grand.");
  });
  it("moves a pointer item to the note", () => {
    const { words, note } = parseList("Amanuensis; scribe; See the Note under Clerk.");
    expect(words.map((w) => w.text)).toEqual(["Amanuensis", "scribe"]);
    expect(note).toBe("See the Note under Clerk.");
  });
});

describe("essays", () => {
  const prose = "These words agree in representing a person as giving up some object.";
  it("finds a heading followed by prose", () => {
    expect(essayHeading(`To Abandon, Desert, Forsake. ${prose}`)).toEqual({ compares: ["Abandon", "Desert", "Forsake"], rest: prose });
  });
  it("does not take a short list followed by a pointer for a heading", () => {
    expect(essayHeading("Lofty, noble. See Grand.")).toBeNull();
  });
  it("recognises a heading standing alone", () => {
    expect(headingOnly("Ancient, Antiquated, Obsolete.")).toEqual(["Ancient", "Antiquated", "Obsolete"]);
  });
});

describe("isDerivedForm", () => {
  it("spots a run-in derived form", () => expect(isDerivedForm('Charm"ing*ly, adv.')).toBe(true));
  it("leaves a list alone", () => expect(isDerivedForm("Enchanting; bewitching.")).toBe(false));
});

describe("parseSyn", () => {
  it("parses list, note, essay and derived forms together", () => {
    const s = parseSyn('Syn.\n -- Abated; lessened. See Less.\n -- To Abate, Subside. These words imply a coming down from a previously raised state, and so on.\n -- A*bate"ment, n.')!;
    expect(s.words.map((w) => w.text)).toEqual(["Abated", "lessened"]);
    expect(s.note?.text).toBe("See Less.");
    expect(s.essays[0]!.compares).toEqual(["Abate", "Subside"]);
    expect(s.derived).toEqual(['A*bate"ment, n.']);
  });
  it("reads a section that opens with an essay", () => {
    const s = parseSyn("Syn.\n -- To Ascribe, Attribute, Impute. Attribute denotes, 1. To refer some quality to a being.")!;
    expect(s.words).toEqual([]);
    expect(s.essays[0]!.compares).toEqual(["Ascribe", "Attribute", "Impute"]);
  });
  it("joins a heading standing alone to the next segment", () => {
    const s = parseSyn("Syn.\n -- Old; antique.\n -- Ancient, Antiquated, Old.\n -- Ancient is opposed to modern, and has antiquity; as, an ancient family.")!;
    expect(s.essays[0]!.compares).toEqual(["Ancient", "Antiquated", "Old"]);
    expect(s.essays[0]!.text).toMatch(/^Ancient is opposed/);
  });
  it("treats a long headless segment as an essay on the list's words", () => {
    const long = "Conviction respects solely matters of belief or faith; persuasion respects matters of belief or practice. Conviction respects our most important duties.";
    expect(parseSyn(`Syn.\n -- Conviction; persuasion.\n -- ${long}`)!.essays[0]).toMatchObject({ compares: [] });
  });
  it("returns null for nothing", () => expect(parseSyn(null)).toBeNull());
});
