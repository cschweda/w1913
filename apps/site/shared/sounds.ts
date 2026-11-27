// "Sounds like" (v0.16.0): a plain sound-it-out spelling of the headword
// ("suh-BLYME"), from the CMU Pronouncing Dictionary: modern American, not
// the 1913's (DESIGN.md §2, "Outside sources"). Shown only where it agrees
// with the 1913's own syllables and stress, so a page never contradicts itself.

/** A pronunciation as ARPAbet phones ("S AH0 B L AY1 M"). */
export type Phones = string[];

/** Rule: one word per line, "WORD  PH ONES", alternates as "word(2)"; comments after "#" and lines starting ";;;" are ignored. */
export function parseCmu(text: string): Map<string, Phones[]> {
  const out = new Map<string, Phones[]>();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith(";;;")) continue;
    const m = /^([^\s(]+)(?:\(\d+\))?\s+([A-Z0-9 ]+?)\s*(?:#.*)?$/.exec(line);
    if (!m) continue;
    const w = m[1]!.toLowerCase();
    const list = out.get(w);
    const ph = m[2]!.trim().split(/\s+/);
    if (list) list.push(ph); else out.set(w, [ph]);
  }
  return out;
}

const isVowel = (p: string) => /\d$/.test(p);
const ONSETS = new Set([
  "B L", "B R", "D R", "D W", "F L", "F R", "G L", "G R", "G W", "K L", "K R", "K W", "P L", "P R", "S K", "S L", "S M", "S N", "S P", "S T", "S W",
  "SH R", "T R", "T W", "TH R", "TH W", "B Y", "F Y", "K Y", "M Y", "P Y", "HH Y", "V Y", "G Y",
  "S K R", "S K W", "S P L", "S P R", "S T R", "S K Y", "S P Y",
]);
const legalOnset = (cs: string[]) => cs.length === 0 || (cs.length === 1 ? cs[0] !== "NG" : ONSETS.has(cs.join(" ")));
/** Short vowels that close a stressed syllable ("HAP-ee", not "HA-pee"). */
const SHORT = new Set(["AE", "EH", "IH", "AH", "UH"]);

export interface Syl { onset: string[]; vowel: string; stress: 0 | 1 | 2; coda: string[] }

/**
 * Rule: each vowel is a syllable. Consonants between two vowels go to the
 * next syllable as far as they form an English onset ("sub-lime", "mon-ster");
 * after a stressed short vowel one consonant stays behind ("hap-py").
 */
export function syllabify(ph: Phones): Syl[] {
  const idx = ph.map((p, i) => (isVowel(p) ? i : -1)).filter((i) => i >= 0);
  const syls: Syl[] = idx.map((i) => ({ onset: [], vowel: ph[i]!.slice(0, -1), stress: Number(ph[i]!.slice(-1)) as 0 | 1 | 2, coda: [] }));
  if (!syls.length) return [];
  syls[0]!.onset = ph.slice(0, idx[0]);
  syls.at(-1)!.coda = ph.slice(idx.at(-1)! + 1);
  for (let k = 0; k < idx.length - 1; k++) {
    const between = ph.slice(idx[k]! + 1, idx[k + 1]);
    let split = 0;
    while (split < between.length && !legalOnset(between.slice(split))) split++;
    const prev = syls[k]!;
    if (split === 0 && between.length && prev.stress === 1 && SHORT.has(prev.vowel)) split = 1;
    prev.coda = between.slice(0, split);
    syls[k + 1]!.onset = between.slice(split);
  }
  return syls;
}

const CONS: Record<string, string> = { CH: "ch", DH: "dh", HH: "h", JH: "j", NG: "ng", SH: "sh", TH: "th", ZH: "zh", Y: "y" };
const cons = (c: string) => CONS[c] ?? c.toLowerCase();
const VOWEL: Record<string, string> = { AE: "a", EH: "e", IH: "i", UH: "uu", AA: "ah", AO: "aw", AW: "ow", OY: "oy", EY: "ay", IY: "ee", OW: "oh", UW: "oo" };
/** A vowel and an R in the same syllable. */
const R_VOWEL: Record<string, string> = { AA: "ar", AO: "or", EH: "air", IH: "eer", IY: "eer", UH: "oor", UW: "oor", AY: "yr", AW: "owr", AE: "arr", EY: "air", OW: "or" };

function sylText(s: Syl, last: boolean): string {
  const onset = s.onset.map(cons).join("");
  let coda = s.coda;
  let v: string;
  if (coda[0] === "R" && R_VOWEL[s.vowel]) { v = R_VOWEL[s.vowel]!; coda = coda.slice(1); }
  else if (s.vowel === "ER") v = s.stress ? "ur" : "er";
  else if (s.vowel === "AH") v = s.stress ? (coda.length ? "u" : "uh") : "uh";
  else if (s.vowel === "AY") v = !onset ? "eye" : "y";
  else v = VOWEL[s.vowel] ?? s.vowel.toLowerCase();
  let c = coda.map(cons).join("");
  // A lone final s is written "ss", so "ice" does not read as "eyes".
  if (last && c === "s") c = "ss";
  // "BLYME", "TYME": a closed long i is written y…e, as in respelling keys.
  if (s.vowel === "AY" && onset && c && !c.endsWith("e")) return onset + v + c + "e";
  return onset + v + c;
}

/** Rule: syllables joined by hyphens, the primary-stressed one in capitals ("GOS-uh-mer"). */
export function respell(ph: Phones): string {
  const syls = syllabify(ph);
  return syls.map((s, i) => { const t = sylText(s, i === syls.length - 1); return s.stress === 1 ? t.toUpperCase() : t; }).join("-");
}

/** The stress pattern of a pronunciation in the edition's digits: 1 primary, 2 secondary, 0 none. */
export const stressOf = (ph: Phones) => ph.filter(isVowel).map((p) => p.slice(-1)).join("");

/**
 * Rule: given the 1913's stress pattern for the entry, the first CMU
 * pronunciation with the same number of syllables and its primary stress on
 * the same syllable; with no pattern, or none marked (one syllable), only a
 * word CMU pronounces one way.
 * Otherwise none: the page shows no pronunciation rather than a conflicting one.
 */
export function agreeing(prons: Phones[] | undefined, stress: string | null): Phones | null {
  if (!prons?.length) return null;
  // One syllable: the 1913 marks no stress on it, so only a word CMU says one way ("time"; never "lead", "wind").
  if (!stress || !stress.includes("1")) return prons.length === 1 && (!stress || stressOf(prons[0]!).length === stress.length) ? prons[0]! : null;
  return prons.find((p) => { const s = stressOf(p); return s.length === stress.length && s.indexOf("1") === stress.indexOf("1"); }) ?? null;
}
