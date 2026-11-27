// Rhymes (v0.17.0; DESIGN.md §4, "I need a word with this rhythm"). Two keys
// per entry, and two words rhyme when their keys are equal:
//  - the sound key, from CMU (shared/sounds.ts): the phones from the last
//    primary-stressed vowel to the end ("AY M" for time, sublime, climb);
//  - the spelling key, for words CMU lacks: the letters from the 1913's
//    stressed vowel to the end ("affle" for yaffle, baffle, snaffle). English
//    spelling misleads (love, move), so these are labelled "may not rhyme".
import type { Phones } from "./sounds.ts";
import type { Prosody } from "./prosody.ts";

/** Rule: from the last vowel carrying primary stress (1) to the end, stress digits dropped. */
export function soundKey(ph: Phones): string | null {
  let i = -1;
  ph.forEach((p, k) => { if (p.endsWith("1")) i = k; });
  return i < 0 ? null : ph.slice(i).map((p) => p.replace(/\d$/, "")).join(" ");
}

const fold = (s: string) => s.replace(/æ/gi, "ae").replace(/œ/gi, "oe").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z]/g, "");

/** The first vowel letter: a, e, i, o, u, or y after the first letter ("Yaf" → a, "Sky" → y). */
const firstVowel = (syl: string) => { for (let k = 0; k < syl.length; k++) if (/[aeiou]/.test(syl[k]!) || (k > 0 && syl[k] === "y")) return k; return -1; };

/**
 * Rule: the syllable with primary stress (or the only syllable), from its
 * first vowel letter, and every syllable after it, folded to plain letters.
 * A headword the 1913 prints without marks counts as one syllable when it
 * has one vowel group once a final silent e is set aside ("Time"). Null when
 * the 1913 marks no primary stress on a word of several syllables.
 */
export function spellingKey(p: Prosody | null, headword = ""): string | null {
  let syls: { text: string }[];
  let i: number;
  if (p) {
    syls = p.syllables;
    i = p.syllables.findIndex((s) => s.stress === 1);
    if (i < 0 && syls.length === 1) i = 0;
  } else {
    const w = fold(headword);
    if (!w || !/^[a-z]+$/.test(headword.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")) || (w.replace(/e$/, "").match(/[aeiouy]+/g) ?? []).length !== 1) return null;
    syls = [{ text: w }];
    i = 0;
  }
  if (i < 0) return null;
  const syl = fold(syls[i]!.text);
  const start = firstVowel(syl);
  if (start < 0) return null;
  const key = syl.slice(start) + syls.slice(i + 1).map((s) => fold(s.text)).join("");
  return key.length >= 2 ? key : null;
}
