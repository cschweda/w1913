// RawEntry + segment entry -> senses layer, with cross-references resolved
// against the whole edition's headwords.
import { foldForCompare } from "../segment/fold.ts";
import type { RawEntry } from "../segment/segment.ts";
import { parseSenses, type Block, type SensesLayer } from "../senses/parse.ts";
import type { XrefMatch } from "../senses/xrefs.ts";
import type { SegmentEntry, SensesEntry } from "./schema.ts";

type ResolvedXref = XrefMatch & { id: string | null };

/**
 * Rule: a cross-reference resolves to the entries whose display headword or
 * variant folds to the same letters. When it names a part of speech, the
 * homograph with that part of speech wins; otherwise the first in edition
 * order. A word that matches no headword is kept with id null.
 */
export function makeResolver(entries: readonly SegmentEntry[]): (x: XrefMatch) => string | null {
  const byFold = new Map<string, SegmentEntry[]>();
  for (const e of entries) {
    for (const form of [e.headword, ...e.variants]) {
      const k = foldForCompare(form);
      const list = byFold.get(k);
      if (!list) byFold.set(k, [e]);
      else if (!list.includes(e)) list.push(e);
    }
  }
  const norm = (p: string | null) => (p ?? "").replace(/\s+/g, "");
  return (x) => {
    const list = byFold.get(foldForCompare(x.to));
    if (!list) return null;
    if (x.pos) {
      const hit = list.find((e) => norm(e.pos) === norm(x.pos));
      if (hit) return hit.id;
    }
    return list[0]!.id;
  };
}

export function toSensesEntry(seg: SegmentEntry, raw: RawEntry, resolve: (x: XrefMatch) => string | null): SensesEntry {
  const layer: SensesLayer = parseSenses(raw);
  const fix = <T extends Block>(b: T): T & { xrefs: ResolvedXref[] } => ({ ...b, xrefs: b.xrefs.map((x) => ({ ...x, id: resolve(x) })) });
  return {
    ...seg,
    inflections: layer.inflections,
    etymology: layer.etymology ? fix(layer.etymology) : null,
    headerLabels: layer.headerLabels,
    headerMarks: layer.headerMarks,
    spellings: layer.spellings,
    headerRest: layer.headerRest,
    senses: layer.senses.map((s) => ({ ...fix(s), sub: s.sub.map(fix), notes: s.notes.map(fix) })),
    notes: layer.notes.map(fix),
    syn: layer.syn,
    layers: ["segment", "senses"],
  };
}
