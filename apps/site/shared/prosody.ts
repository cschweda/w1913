// Syllables and stress from a header's marks (DESIGN.md §4, "I need a word
// with this rhythm"). The printed convention, confirmed by the tagged
// edition's legend: "*" separates syllables, '"' follows a syllable with
// primary stress, "`" one with secondary stress. Phase 4 moves this into the
// edition's prosody layer; until then the site reads the marks directly.

export interface Syllable { text: string; stress: 0 | 1 | 2 }
export interface Prosody { syllables: Syllable[]; summary: string }

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
const VOWELS = /[aeiouyæœäëïöüéèêáàâíóôúûå]+/giu;

/**
 * Rule: read the first marked form; a syllable ends at "*", '"' (primary
 * stress), "`" (secondary stress), a hyphen or a space. A form with no marks
 * counts as one syllable only when it has a single vowel group ("Yarn");
 * otherwise nothing is claimed. Forms of more than 12 syllables are skipped.
 */
export function prosodyOf(marked: string | null): Prosody | null {
  if (!marked) return null;
  const form = marked.split(/,\s*(?:or\s+)?|\s+or\s+|;\s*/)[0]!.trim();
  if (!form) return null;
  if (!/[*"`]/.test(form)) {
    if (/[\s-]/.test(form) || (form.match(VOWELS) ?? []).length !== 1) return null;
    return { syllables: [{ text: form, stress: 0 }], summary: "1 syllable" };
  }
  const syllables: Syllable[] = [];
  let buf = "";
  const push = (stress: 0 | 1 | 2) => {
    if (buf) syllables.push({ text: buf, stress });
    else if (stress && syllables.length) syllables[syllables.length - 1]!.stress = stress;
    buf = "";
  };
  for (const ch of form) {
    if (ch === "*") push(0);
    else if (ch === '"') push(1);
    else if (ch === "`") push(2);
    else if (ch === "-" || ch === " ") push(0);
    else buf += ch;
  }
  push(0);
  if (syllables.length === 0 || syllables.length > ORDINALS.length) return null;
  const n = syllables.length;
  const primary = syllables.findIndex((s) => s.stress === 1);
  const secondary = syllables.map((s, i) => (s.stress === 2 ? i : -1)).filter((i) => i >= 0);
  let summary = `${n} syllable${n === 1 ? "" : "s"}`;
  if (primary >= 0 && n > 1) summary += `, stress on the ${ORDINALS[primary]}`;
  if (secondary.length && n > 1) summary += `, lighter stress on the ${secondary.map((i) => ORDINALS[i]).join(" and ")}`;
  return { syllables, summary };
}
