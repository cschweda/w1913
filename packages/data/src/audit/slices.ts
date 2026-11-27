import type { RawEntry } from "../segment/segment.ts";

export type SliceName = "X-Z" | "SU";

/** Rule: X-Z is every entry whose headword line starts with X, Y or Z; SU every entry whose headword line starts with "SU". */
export function inSlice(e: RawEntry, slice: SliceName): boolean {
  return slice === "X-Z" ? /^[XYZ]/.test(e.headwordLine) : e.headwordLine.startsWith("SU");
}

export function slice(entries: readonly RawEntry[], name: SliceName): RawEntry[] {
  return entries.filter((e) => inSlice(e, name));
}
