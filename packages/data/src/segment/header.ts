// The header line: marked headword form(s), then part of speech.
//   Sub*lime", a. [Compar. Sublimer; ...] Etym: [L. ...
//   Ab"a*tis, Ab"at*tis, n.
//   A*chæ"an, A*cha"ian a. Etym: [...]          (comma missing before pos)
import { foldForCompare, stripMarks } from "./fold.ts";

// Closed vocabulary, measured on the header lines of #29765 (Phase 0).
const ATOM = String.raw`(?:n|a|v|t|i|adv|prep|conj|interj|pron|p|pr|pa|pl|sing|imp|vb|obs)\.`;
const TERM = String.raw`${ATOM}(?:\s?${ATOM})*`;
const POS = String.raw`${TERM}(?:\s&\s${TERM})*`;
const POS_AFTER_FORMS = new RegExp(String.raw`(?:,\s*|\s)(${POS})(?=\s|$|[\[(;,])`);
const FORMS_END = /,\s|\.\s|\sEtym:|\s\[|\s\(/;

export interface Header {
  /** The marked form(s) as printed, before the part of speech. */
  marked: string;
  /** Each marked form, split on ", ", ", or " and " or ". */
  forms: string[];
  /** Part of speech as printed ("a.", "v. t. & i."), or null if none was found. */
  pos: string | null;
}

/**
 * Rule: the part of speech is the first run of abbreviations from a closed
 * vocabulary (n. a. v. t. i. adv. prep. conj. interj. pron. p. pr. pa. pl.
 * sing. imp. vb. obs., joined by spaces or " & ") that follows a comma or a
 * space after the first form and is followed by a space, a bracket, a comma,
 * a semicolon, or the end of the line. The marked forms are everything
 * before it, cut at the first " (" (a pronunciation respelling follows some
 * forms). Both are looked for only before the first "Etym:" or " [". With no
 * part of speech, the forms end at the first ", ", ". ", " Etym:", " [" or
 * " (" ("A 1. A registry mark ..." has the form "A 1").
 * Forms are separated by ", ", ", or ", " or ", or a run of spaces.
 */
export function parseHeader(line: string): Header {
  // Forms and part of speech come before any etymology or bracket; never
  // look for them inside "Etym: [OE. beon, ben, bin, p. p. of been ...]".
  const stop = line.search(/Etym:|\s\[/);
  const region = stop < 0 ? line : line.slice(0, stop);
  const firstFormEnd = region.search(/[,\s]/);
  const searchFrom = firstFormEnd < 0 ? region.length : firstFormEnd;
  const m = POS_AFTER_FORMS.exec(region.slice(searchFrom));
  let marked: string;
  let pos: string | null = null;
  if (m) {
    marked = line.slice(0, searchFrom + m.index);
    pos = m[1]!.trim();
  } else {
    const end = region.search(FORMS_END);
    marked = end < 0 ? region : region.slice(0, end);
  }
  // A pronunciation respelling in parentheses follows some forms
  // (`Cor"net*er (kr"nt-r), n.`). It is not part of the form; it stays in the
  // entry's text.
  const paren = marked.search(/(^|\s)\(/);
  if (paren >= 0) marked = marked.slice(0, paren);
  marked = marked.replace(/[,;\s]+$/, "");
  const forms = marked.split(/,\s*(?:or\s+)?|;\s*|\s+or\s+|\s{2,}/).map((f) => f.trim()).filter(Boolean);
  return { marked, forms, pos };
}

/** Rule: a header line "echoes" a headword when, after folding, it starts with one of the headword line's variants. */
export function headerEchoes(headerLine: string, variants: readonly string[]): boolean {
  const h = foldForCompare(headerLine);
  return variants.some((v) => {
    const f = foldForCompare(v);
    return f.length > 0 && h.startsWith(f);
  });
}

/** "SUBLIME" -> "Sublime"; "A PER SE" -> "A per se". Used only when no header form matches. */
export function fromCapitals(variant: string): string {
  const lower = variant.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export interface DisplayForm {
  text: string;
  /** Where the display form came from. */
  source: "header" | "headword-line";
}

/**
 * Rule: a variant is displayed as the header form that folds to the same
 * letters (keeping æ, ö, ñ and the printed capitalisation), with stress marks
 * removed; the form in the same position wins when several fold alike
 * ("X rays" / "X-rays"). When no header form matches, the headword line is used, from
 * capitals. The headword line drops letters it cannot spell in ASCII
 * ("CAADA" for Cañada) and the header line sometimes drops œ ("Au*to"cious"
 * for AUTOECIOUS), so when no form matches, the header form in the same
 * position is used only when it adds one to three letters to the variant's
 * folded spelling and contains all of them in order (the headword line lost
 * them); otherwise the headword line is used. A trailing full stop on a form
 * is dropped.
 */
export function displayForm(variant: string, forms: readonly string[], index: number): DisplayForm {
  const fv = foldForCompare(variant);
  const same = forms[index];
  // A trailing full stop on a form ("Been.") is punctuation, unless the
  // headword line has one too.
  const shown = (f: string) => {
    const t = stripMarks(f);
    return t.endsWith(".") && !variant.endsWith(".") ? t.slice(0, -1) : t;
  };
  // Prefer the form in the same position: "X rays" and "X-rays" fold alike.
  if (same && foldForCompare(same) === fv) return { text: shown(same), source: "header" };
  const exact = forms.find((f) => foldForCompare(f) === fv);
  if (exact) return { text: shown(exact), source: "header" };
  // The header form may keep letters the ASCII headword line dropped
  // ("Cañada" for CAADA), but only a few, and only by adding letters.
  if (same) {
    const fs = foldForCompare(same);
    if (fs.length > fv.length && fs.length <= fv.length + 3 && isSubsequenceOf(fv, fs)) return { text: shown(same), source: "header" };
  }
  return { text: fromCapitals(variant), source: "headword-line" };
}

/** ö -> oe, ü -> ue, ä -> ae (and capitals): the German-style spelling some headword lines add. */
function umlautAsE(s: string): string {
  return s.replace(/Ö/g, "OE").replace(/ö/g, "oe").replace(/Ü/g, "UE").replace(/ü/g, "ue").replace(/Ä/g, "AE").replace(/ä/g, "ae");
}

/**
 * Rule: a headword-line variant is a transliteration, not a spelling, when no
 * header form folds to it but some header form containing ö, ü or ä does once
 * that letter is written oe, ue or ae. "ZOOCHEMICAL; ZOOECHEMICAL" over
 * `Zo`ö*chem"ic*al` is one printed word, not two. Such variants are left out
 * of the edition's `variants` (they remain in its text) and counted in the report.
 */
export function isUmlautTransliteration(variant: string, forms: readonly string[]): boolean {
  const fv = foldForCompare(variant);
  if (forms.some((f) => foldForCompare(f) === fv)) return false;
  return forms.some((f) => /[öüäÖÜÄ]/.test(f) && foldForCompare(umlautAsE(f)) === fv);
}

function isSubsequenceOf(short: string, long: string): boolean {
  let j = 0;
  for (let i = 0; i < long.length && j < short.length; i++) if (long[i] === short[j]) j++;
  return j === short.length;
}
