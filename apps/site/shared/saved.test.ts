import { describe, expect, it } from "vitest";
import { MAX_SAVED, mergeSaved, parseSavedFile, toSavedFile, type SavedWord } from "./saved.ts";

const w = (slug: string, saved: string, headword = slug): SavedWord => ({ slug, headword, saved });

describe("saved words", () => {
  it("merges without duplicates, keeping the earlier save, newest first", () => {
    const out = mergeSaved([w("lofty", "2026-11-02T00:00:00Z")], [w("lofty", "2026-11-01T00:00:00Z"), w("sublime", "2026-11-03T00:00:00Z")]);
    expect(out.map((x) => [x.slug, x.saved.slice(0, 10)])).toEqual([["sublime", "2026-11-03"], ["lofty", "2026-11-01"]]);
  });
  it("keeps at most MAX_SAVED", () => {
    const many = Array.from({ length: MAX_SAVED + 5 }, (_, i) => w(`w${i}`, new Date(2026, 0, 1, 0, i).toISOString()));
    expect(mergeSaved([], many)).toHaveLength(MAX_SAVED);
  });
  it("round-trips through an export file", () => {
    const words = [w("saunter", "2026-11-27T10:00:00.000Z", "Saunter")];
    const r = parseSavedFile(JSON.stringify(toSavedFile(words)));
    expect(r).toEqual({ words, skipped: 0 });
  });
  it("refuses files that are not saved words, and skips bad entries", () => {
    expect(parseSavedFile("not json")).toEqual({ error: "That file is not JSON." });
    expect(parseSavedFile('{"hello":1}')).toEqual({ error: "That is not a W1913 saved-words file." });
    const r = parseSavedFile(JSON.stringify([w("ok", "2026-11-27T00:00:00Z"), { slug: "<script>", headword: "x", saved: "2026-11-27" }, w("bad", "not a date")]));
    expect(r).toMatchObject({ skipped: 2 });
    expect("words" in r && r.words.map((x) => x.slug)).toEqual(["ok"]);
  });
});
