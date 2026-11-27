import { describe, expect, it } from "vitest";
import { segment } from "../segment/segment.ts";
import { SegmentEntry } from "./schema.ts";
import { toSegmentEntries } from "./segment-layer.ts";

const body = [
  "", "AUGUST", 'Au*gust", a.', "", "Defn: Grand.", "",
  "AUGUST", 'Au"gust, n.', "", "Defn: The eighth month.", "",
  "SUBLIME", 'Sub*lime", a.', "", "Defn: Lofty.", "",
];

describe("toSegmentEntries", () => {
  const out = toSegmentEntries(segment(body).entries);
  it("numbers homographs that share a slug, in edition order", () => {
    expect(out.map((e) => e.id)).toEqual(["august-1", "august-2", "sublime-1"]);
  });
  it("produces entries that pass the schema", () => {
    for (const e of out) expect(() => SegmentEntry.parse(e)).not.toThrow();
  });
  it("keeps the entry text verbatim, headword line first", () => {
    expect(out[2]!.text).toBe('SUBLIME\nSub*lime", a.\n\nDefn: Lofty.');
  });
});

describe("SegmentEntry schema", () => {
  it("rejects an entry with an unknown field", () => {
    const e = toSegmentEntries(segment(body).entries)[0]!;
    expect(() => SegmentEntry.parse({ ...e, extra: 1 })).toThrow();
  });
});
