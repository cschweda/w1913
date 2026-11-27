// RawEntry + segment entry -> senses layer, with cross-references resolved
// against the whole edition's headwords.
import { foldForCompare } from "../segment/fold.ts";
import type { RawEntry } from "../segment/segment.ts";
import { parseSenses, type Block, type SensesLayer } from "../senses/parse.ts";
import type { XrefMatch } from "../senses/xrefs.ts";
import { parseSyn } from "../syn/parse.ts";
import type { SegmentEntry, SensesEntry, SynEntry } from "./schema.ts";

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

/**
 * The syn layer on top of the senses layer. Rule: each list word and each
 * compared word resolves like a cross-reference to the word itself (no part
 * of speech); essays and the note keep their own cross-references.
 */
export function toSynEntry(e: SensesEntry, resolve: (x: XrefMatch) => string | null): SynEntry {
  const s = parseSyn(e.syn);
  const id = (word: string) => resolve({ start: 0, end: 0, to: word, pos: null, sense: null });
  const fix = <T extends { xrefs: XrefMatch[] }>(b: T) => ({ ...b, xrefs: b.xrefs.map((x) => ({ ...x, id: resolve(x) })) });
  return {
    ...e,
    synonyms: s && {
      words: s.words.map((w) => ({ text: w.text, lookup: w.lookup, id: id(w.lookup) })),
      note: s.note ? fix(s.note) : null,
      essays: s.essays.map((x) => ({ ...fix(x), compares: x.compares.map((c) => ({ text: c, id: id(c) })) })),
      derived: s.derived,
    },
    layers: ["segment", "senses", "syn"],
  };
}
