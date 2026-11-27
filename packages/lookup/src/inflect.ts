// The suffix stripper (DESIGN.md §2 problem 9, §4): from an inflected or
// archaic form to the forms it may come from. One module, used by the server
// (lookup, unusual words) and the browser (/check), so both give the same
// answer. It proposes candidates; only those that are headwords count.

const VOWEL = /[aeiouy]/;
const doubled = (s: string) => s.length >= 3 && s.at(-1) === s.at(-2) && !VOWEL.test(s.at(-1)!) && !/(?:ll|ss|ff|zz)$/.test(s);

/**
 * Rule: the base forms a word may be inflected from, most likely first, never
 * the word itself. Covers plurals and the third person (-s, -es, -ies),
 * possessives ('s, s'), past and participles (-ed, -ied, -ing, with a
 * restored -e or an undoubled consonant: loved → love, stopped → stop),
 * comparatives (-er, -est, -ier, -iest), adverbs (-ly, -ily), and the
 * archaic forms the 1913's quotations use (-eth, -est, -edst, -'d, -'st).
 * and the learned plurals (-ae → -a, -i → -us, -a → -um or -on, -ses → -sis,
 * -ices → -ix or -ex). Candidates shorter than two letters are dropped.
 */
export function stems(word: string): string[] {
  const w = word.toLowerCase().replace(/[’]/g, "'");
  const out: string[] = [];
  const add = (s: string) => { if (s.length >= 2 && s !== w && !out.includes(s)) out.push(s); };
  const root = (s: string) => { add(s); add(s + "e"); if (doubled(s)) add(s.slice(0, -1)); };

  if (/'s$/.test(w)) add(w.slice(0, -2));
  if (/s'$/.test(w)) add(w.slice(0, -1));
  if (/'d$/.test(w)) root(w.slice(0, -2));
  if (/'st$/.test(w)) root(w.slice(0, -3));
  if (/ies$/.test(w)) add(w.slice(0, -3) + "y");
  if (/(?:s|x|z|ch|sh|o)es$/.test(w)) add(w.slice(0, -2));
  if (/[^s]s$/.test(w)) add(w.slice(0, -1));
  if (/ied$/.test(w)) add(w.slice(0, -3) + "y");
  if (/edst$/.test(w)) root(w.slice(0, -4));
  if (/ed$/.test(w)) root(w.slice(0, -2));
  if (/ing$/.test(w)) root(w.slice(0, -3));
  if (/eth$/.test(w)) root(w.slice(0, -3));
  if (/iest$/.test(w)) add(w.slice(0, -4) + "y");
  if (/ier$/.test(w)) add(w.slice(0, -3) + "y");
  if (/est$/.test(w)) root(w.slice(0, -3));
  if (/st$/.test(w) && !/est$/.test(w)) add(w.slice(0, -2));
  if (/er$/.test(w)) root(w.slice(0, -2));
  if (/ily$/.test(w)) add(w.slice(0, -3) + "y");
  if (/ly$/.test(w)) { add(w.slice(0, -2)); add(w.slice(0, -2) + "le"); }
  if (/ies$/.test(w) || /ied$/.test(w)) add(w.slice(0, -1));
  if (/ae$/.test(w)) add(w.slice(0, -1));
  if (/ices$/.test(w)) { add(w.slice(0, -4) + "ix"); add(w.slice(0, -4) + "ex"); }
  if (/ses$/.test(w)) add(w.slice(0, -2) + "is");
  if (/i$/.test(w)) add(w.slice(0, -1) + "us");
  if (/a$/.test(w)) { add(w.slice(0, -1) + "um"); add(w.slice(0, -1) + "on"); }
  return out;
}

/**
 * Rule (DESIGN.md §4, inflected lookup): the word's own entry when it is a
 * headword, variant or listed inflection (`exact`); otherwise the first of
 * its stems() that is one ("walked" → walk, "goeth" → go). `via` names the
 * form that led there, or is null for a direct match.
 */
export function lookupWith(
  word: string,
  exact: (w: string) => string | null,
  fold: (s: string) => string,
  /** Lookup for stems; by default exact. The server's leaves out prefixes and suffixes ("Com-"), which are never stems. */
  stemExact: (w: string) => string | null = exact,
): { slug: string; via: string | null } | null {
  const direct = exact(word);
  if (direct) return { slug: direct, via: null };
  if (!fold(word)) return null;
  for (const s of stems(word.toLowerCase())) {
    const slug = stemExact(s);
    if (slug) return { slug, via: word };
  }
  return null;
}
