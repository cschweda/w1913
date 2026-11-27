// Pairing plain entries with tagged entries (DESIGN.md §2, "Alignment").
import type { RawEntry } from "../segment/segment.ts";
import { foldForCompare } from "../segment/fold.ts";
import type { TaggedEntry } from "./tagged.ts";

export interface Pair {
  plain: RawEntry;
  tagged: TaggedEntry;
}

export interface Pairing {
  pairs: Pair[];
  /** Folded headwords present in both editions. */
  sharedHeadwords: number;
  /** Of those, how many have the same number of entries in each. */
  sameEntryCount: number;
  plainOnly: number;
  taggedOnly: number;
}

/** Rule: a plain entry's headword for pairing is its first header form if it has one (keeps æ, ñ), else its first headword-line variant; folded. */
export function plainKey(e: RawEntry): string {
  return foldForCompare(e.header?.forms[0] ?? e.variants[0] ?? e.headwordLine);
}

/**
 * Rule: group each edition's entries by folded headword, in file order, and
 * pair the i-th entry of a group with the i-th entry of the same group in the
 * other edition (homograph order).
 */
export function pairEntries(plain: readonly RawEntry[], tagged: readonly TaggedEntry[]): Pairing {
  const group = <T>(xs: readonly T[], key: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of xs) {
      const k = key(x);
      if (!k) continue;
      const g = m.get(k);
      if (g) g.push(x); else m.set(k, [x]);
    }
    return m;
  };
  const P = group(plain, plainKey);
  const T = group(tagged, (t) => t.headwordFold);
  const pairs: Pair[] = [];
  let shared = 0, same = 0, plainOnly = 0;
  for (const [k, ps] of P) {
    const ts = T.get(k);
    if (!ts) { plainOnly++; continue; }
    shared++;
    if (ts.length === ps.length) same++;
    for (let i = 0; i < Math.min(ps.length, ts.length); i++) pairs.push({ plain: ps[i]!, tagged: ts[i]! });
  }
  let taggedOnly = 0;
  for (const k of T.keys()) if (!P.has(k)) taggedOnly++;
  return { pairs, sharedHeadwords: shared, sameEntryCount: same, plainOnly, taggedOnly };
}
