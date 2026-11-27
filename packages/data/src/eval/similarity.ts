// Word-level similarity between two versions of an entry.
import { foldForCompare } from "../segment/fold.ts";

/**
 * Rule: words are runs of letters and digits after folding (so "Zoöl." and
 * "Zool." match, and stress marks and punctuation vanish). The labels
 * "Etym:" and "Defn:", which only the plain text has, are removed first.
 */
export function words(text: string): string[] {
  return text
    .replace(/\b(?:Etym|Defn):/g, " ")
    .split(/[^\p{L}\p{N}*"`']+/u)
    .map(foldForCompare)
    .filter((w) => w.length > 0);
}

/** Length of the longest common subsequence of two word lists. */
export function lcsLength(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let prev = new Uint32Array(b.length + 1);
  let cur = new Uint32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const ai = a[i - 1];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = ai === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length]!;
}

/** Rule: similarity = 2 × LCS / (|a| + |b|), the same ratio difflib reports. 1 means identical word sequences. */
export function similarity(a: readonly string[], b: readonly string[]): number {
  if (a.length + b.length === 0) return 1;
  return (2 * lcsLength(a, b)) / (a.length + b.length);
}
