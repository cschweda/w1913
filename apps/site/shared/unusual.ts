// Unusual-word previews (DESIGN.md §4, "What does this word mean?"): words in
// a definition that are themselves headwords and may need explaining: rare in
// the dictionary's own definitions, or the few words a short definition rests
// on. Was: rare in the dictionary's
// own definitions. Measured from the edition alone; no outside word lists.
import { foldForCompare } from "./fold.ts";
import { stems } from "./inflect.ts";

export interface UnusualSpan { start: number; end: number; slug: string }

/** Lower-case words of six or more letters, not inside a longer word or a hyphenation. */
export const UNUSUAL_WORD = /(?<![\p{L}'-])(\p{Ll}{6,})(?![\p{L}'-])/gu;

/** Words of four or more letters, for short definitions. */
export const GLOSS_WORD = /(?<![\p{L}'-])(\p{Ll}{4,})(?![\p{L}'-])/gu;

/** How many entries' definitions use each word of four or more letters (each entry counted once). */
export function definitionFrequency(texts: Iterable<string[]>): Map<string, number> {
  const df = new Map<string, number>();
  for (const entryTexts of texts) {
    const seen = new Set<string>();
    for (const t of entryTexts) for (const m of t.matchAll(GLOSS_WORD)) seen.add(m[1]!);
    for (const w of seen) df.set(w, (df.get(w) ?? 0) + 1);
  }
  return df;
}

/** Words never worth a link in a short definition. */
const GLOSS_SKIP = new Set("same that this with from which what when where whose than they them their there these those into upon also such like used being been have very more most some kind sort form name small large thing person persons".split(" "));

/**
 * Rule: a short definition is one whose text, without bracketed or
 * parenthesised groups and the trailing citation, has at most six words
 * ("The yaffle.", "A kind of yew."). Its meaning rests on those few words.
 */
export function isShortDefinition(text: string): boolean {
  const bare = text.replace(/\([^()]*\)|\[[^[\]]*\]/g, " ").replace(/\.\s+\p{Lu}[\p{L}. ]*\.?\s*$/u, ".");
  const words = bare.match(/\p{L}+/gu) ?? [];
  return words.length > 0 && words.length <= 6;
}

/**
 * Rule: a word in a sense is marked when it is a headword (exact match after
 * folding), used in at most `maxEntries` entries' definitions, not an
 * inflection of another headword (stems(): "strutting" of "strut"), and not
 * of the entry's own family (sharing its first five letters). In a short
 * definition (isShortDefinition), every word of four or more letters that is
 * a headword, or inflects one, is marked when used in at most
 * `shortMaxEntries` entries' definitions: a looser limit, since the meaning
 * rests on those few words ("The yaffle.": yaffle, in 16). At most `perSense`
 * are marked, the rarest first; only the first occurrence of each.
 */
export function unusualSpans(
  text: string,
  opts: { df: Map<string, number>; slugOf: (fold: string) => string | null; ownStem: string; maxEntries: number; perSense: number; shortMaxEntries: number },
): UnusualSpan[] {
  const found = new Map<string, UnusualSpan & { df: number }>();
  const short = isShortDefinition(text);
  for (const m of text.matchAll(short ? GLOSS_WORD : UNUSUAL_WORD)) {
    const w = m[1]!;
    if (found.has(w) || GLOSS_SKIP.has(w)) continue;
    const n = opts.df.get(w) ?? 0;
    if (n === 0 || n > (short ? opts.shortMaxEntries : opts.maxEntries)) continue;
    const f = foldForCompare(w);
    if (opts.ownStem && f.startsWith(opts.ownStem)) continue;
    let slug = opts.slugOf(f);
    if (slug && !short && stems(f).some((s) => opts.slugOf(s))) continue;
    if (!slug && short) for (const s of stems(f)) if ((slug = opts.slugOf(s))) break;
    if (!slug) continue;
    found.set(w, { start: m.index, end: m.index + w.length, slug, df: n });
  }
  return [...found.values()]
    .sort((a, b) => a.df - b.df || a.start - b.start)
    .slice(0, short ? 3 : opts.perSense)
    .sort((a, b) => a.start - b.start)
    .map(({ start, end, slug }) => ({ start, end, slug }));
}
