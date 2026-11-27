// The period check (DESIGN.md §4, "Would my 1890s narrator say this?"):
// which words of a passage this dictionary does not contain. Runs in the
// browser on the static word list; the passage is never sent anywhere.
import { foldForCompare } from "./fold.ts";
import { lookupWith } from "./inflect.ts";

export interface Token { text: string; word: boolean; missing: boolean }
export interface Check { tokens: Token[]; words: number; missing: { word: string; count: number }[] }

const WORD = /\p{L}[\p{L}'’]*(?:-\p{L}[\p{L}'’]*)*/gu;

/**
 * Rule: a word is found when it, or a stem of it (the same suffix stripper the
 * server uses), is a headword, variant or listed inflection. A hyphenated word
 * is found whole or when every part is. A trailing apostrophe is ignored.
 * When `skipNames` is set, a capitalised word that does not begin a sentence
 * is taken as a name and not checked. Single letters are not checked.
 */
export function checkPassage(text: string, has: (fold: string) => boolean, skipNames = true): Check {
  const exact = (w: string) => (has(foldForCompare(w)) ? w : null);
  const found = (w: string) => !!lookupWith(w.replace(/[’]/g, "'").replace(/'$/, ""), exact, foldForCompare);
  const tokens: Token[] = [];
  const counts = new Map<string, number>();
  let at = 0;
  let words = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index > at) tokens.push({ text: text.slice(at, m.index), word: false, missing: false });
    const w = m[0];
    const before = text.slice(0, m.index).trimEnd();
    const startsSentence = before === "" || /[.!?:"“(\n]$/.test(before);
    const isName = skipNames && /^\p{Lu}/u.test(w) && !startsSentence;
    let missing = false;
    if (w.length > 1 && !isName) {
      words++;
      missing = !found(w) && !(w.includes("-") && w.split("-").every((p) => p.length < 2 || found(p)));
      if (missing) counts.set(w.toLowerCase(), (counts.get(w.toLowerCase()) ?? 0) + 1);
    }
    tokens.push({ text: w, word: true, missing });
    at = m.index + w.length;
  }
  if (at < text.length) tokens.push({ text: text.slice(at), word: false, missing: false });
  return { tokens, words, missing: [...counts].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)) };
}
