// Inflected forms the dictionary lists in its header lines (data 0.5,
// "forms" layer): "imp. Went; p. p. Gone; p. pr. & vb. n. Going."

/** The grammatical labels that introduce listed forms, longest first. */
const LABEL = /^(?:imp\.|p\. ?p\.|p\. ?pr\.|vb\. ?n\.|pl\.|compar\.|comp\.|superl\.|pret\.|3d pers\. sing\. pres\.|sing\.|&|or|and|,)\s*/i;

/**
 * Rule: read the inflection line clause by clause (split at ";"). A clause
 * counts only when it starts with a grammatical label; after the labels, the
 * capitalised words joined by "or", "," or "&" are the forms, up to the first
 * other word, or through a form that ends the sentence ("superl. Best.
 * These words…" stops at Best). Single letters and abbreviations ("L.", "E.") are not forms.
 * Reading stops at the first clause that does not start with a label, so
 * commentary ("Went comes from the AS. wendan") is never read as forms.
 */
export function listedForms(line: string | null): string[] {
  if (!line) return [];
  const out: string[] = [];
  for (const raw of line.replace(/\s+/g, " ").split(";")) {
    let s = raw.trim();
    if (!LABEL.test(s) || /^(?:&|or|and|,)/i.test(s)) break;
    let m: RegExpExecArray | null;
    while ((m = LABEL.exec(s)) && m[0].length) s = s.slice(m[0].length);
    for (const tok of s.split(/\s+/)) {
      const w = tok.replace(/[.,()]+$/, "").replace(/^\(/, "");
      if (/^(?:or|and|&)$/i.test(w)) continue;
      if (!/^\p{Lu}[\p{Ll}'æœ-]{1,}$/u.test(w)) break;
      if (!out.includes(w)) out.push(w);
      if (/\.$/.test(tok) && tok !== s.split(/\s+/).at(-1)) return out;
    }
  }
  return out;
}
