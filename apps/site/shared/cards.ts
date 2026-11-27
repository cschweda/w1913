// Cards (DESIGN.md §4, "Teach me a word"): which entries may be drawn at
// random, and what a card shows.

export interface Card {
  slug: string;
  anchor: string;
  headword: string;
  marked: string | null;
  pos: string | null;
  posTitle: string | null;
  /** Up to three senses, plain text, as printed. */
  senses: string[];
  /** The entry's synonym words, linked where they resolved. */
  similar: { text: string; slug: string | null }[];
  /** A short quotation from the entry, with its author as printed and its key (data 0.6). */
  quote?: { text: string; author: string; key: string } | null;
}

const CROSS_REF_ONLY = /^(?:\([^)]*\)\s*|\[[^\]]*\]\s*)*(?:See|Same as|Cf\.|Compare|A variant of|Variant of|An obsolete form of|Obs\. form of|pl\. of|imp\. of|p\. p\. of)\b/i;

/** A sense's text as one line, labels and quotations kept. */
export const plainSense = (t: string) => t.replace(/\s*\n\s*/g, " ").replace(/--/g, "\u2014").trim();

/**
 * Rule (DESIGN.md §4): an entry is card_ok when at least one of its senses
 * (or sub-senses) is a real definition: not only a cross-reference ("See X",
 * "Same as X", "pl. of X") and at least 40 characters once labels in
 * brackets are set aside. Data 0.4 will also leave out entries whose only
 * senses carry natural-science labels.
 */
export function isCardOk(senseTexts: string[]): boolean {
  return senseTexts.some((t) => {
    const s = plainSense(t);
    if (CROSS_REF_ONLY.test(s)) return false;
    const bare = s.replace(/\([^)]*\)|\[[^\]]*\]/g, "").trim();
    return bare.length >= 40;
  });
}

/** Up to `n` senses for a card: the real definitions first, each at most 240 characters. */
export function cardSenses(senseTexts: string[], n = 3): string[] {
  const all = senseTexts.map(plainSense).filter(Boolean);
  const real = all.filter((s) => !CROSS_REF_ONLY.test(s));
  return (real.length ? real : all).slice(0, n).map((s) => (s.length > 240 ? `${s.slice(0, 239).replace(/\s+\S*$/, "")}\u2026` : s));
}
