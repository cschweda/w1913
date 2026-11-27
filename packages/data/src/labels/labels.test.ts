import { describe, expect, it } from "vitest";
import { LABELS, labelsInGroup, labelsInText } from "./vocabulary.ts";

describe("label vocabulary", () => {
  it("has unique codes and forms", () => {
    expect(new Set(LABELS.map((l) => l.code)).size).toBe(LABELS.length);
    const forms = LABELS.flatMap((l) => l.forms);
    expect(new Set(forms).size).toBe(forms.length);
  });
  it("reads single and combined groups, merging spelling variants", () => {
    expect(labelsInGroup("[Obs.]")).toEqual(["obs"]);
    expect(labelsInGroup("(Zoöl)")).toEqual(["zoology"]);
    expect(labelsInGroup("[Obs. or Prov. Eng.]")).toEqual(["obs", "prov-eng"]);
    expect(labelsInGroup("(Bot. & Zoöl.)")).toEqual(["botany", "zoology"]);
    expect(labelsInGroup("[Local, U. S.]")).toEqual(["local", "us"]);
    expect(labelsInGroup("[Prov.\nEng.]")).toEqual(["prov-eng"]);
  });
  it("rejects groups that are not labels", () => {
    expect(labelsInGroup("(Pseudemus concinna)")).toBeNull();
    expect(labelsInGroup("[F.]")).toBeNull();
    expect(labelsInGroup("(Obs. stuff)")).toBeNull();
  });
  it("finds every label group in a text", () => {
    expect(labelsInText("(Naut.) A rope. [Obs.] Shak.")).toEqual(["nautical", "obs"]);
  });
});
