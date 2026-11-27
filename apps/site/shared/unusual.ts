// Unusual-word previews (DESIGN.md §4, "What does this word mean?"): words in
// a definition that are themselves headwords but rare in the dictionary's
// own definitions. Measured from the edition alone; no outside word lists.
import { foldForCompare } from "./fold.ts";

export interface UnusualSpan { start: number; end: number; slug: string }

/** Lower-case words of six or more letters, not inside a longer word or a hyphenation. */
export const UNUSUAL_WORD = /(?<![\p{L}'-])(\p{Ll}{6,})(?![\p{L}'-])/gu;

/** How many entries' definitions use each word (each entry counted once). */
export function definitionFrequency(texts: Iterable<string[]>): Map<string, number> {
  const df = new Map<string, number>();
  for (const entryTexts of texts) {
    const seen = new Set<string>();
    for (const t of entryTexts) for (const m of t.matchAll(UNUSUAL_WORD)) seen.add(m[1]!);
    for (const w of seen) df.set(w, (df.get(w) ?? 0) + 1);
  }
  return df;
}

/**
 * Rule: a word in a sense is marked when it is a headword (exact match after
 * folding), used in at most `maxEntries` entries' definitions, and not of the
 * entry's own family (sharing its first five letters). At most `perSense`
 * are marked, the rarest first; only the first occurrence of each.
 */
export function unusualSpans(
  text: string,
  opts: { df: Map<string, number>; slugOf: (fold: string) => string | null; ownStem: string; maxEntries: number; perSense: number },
): UnusualSpan[] {
  const found = new Map<string, UnusualSpan & { df: number }>();
  for (const m of text.matchAll(UNUSUAL_WORD)) {
    const w = m[1]!;
    if (found.has(w)) continue;
    const n = opts.df.get(w) ?? 0;
    if (n === 0 || n > opts.maxEntries) continue;
    const f = foldForCompare(w);
    if (opts.ownStem && f.startsWith(opts.ownStem)) continue;
    const slug = opts.slugOf(f);
    if (!slug) continue;
    found.set(w, { start: m.index, end: m.index + w.length, slug, df: n });
  }
  return [...found.values()]
    .sort((a, b) => a.df - b.df || a.start - b.start)
    .slice(0, opts.perSense)
    .sort((a, b) => a.start - b.start)
    .map(({ start, end, slug }) => ({ start, end, slug }));
}
