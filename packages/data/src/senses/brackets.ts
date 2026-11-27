// Bracketed groups in a header paragraph: inflections, labels, etymology.

export interface BracketGroup {
  /** Index of the opening "[" in the paragraph. */
  start: number;
  /** Index just past the closing "]", or the paragraph length if it never closes. */
  end: number;
  /** The text inside the brackets. */
  inner: string;
  closed: boolean;
  /** Whether "Etym:" directly precedes the group. */
  etymLabel: boolean;
}

/**
 * Rule: a group opens at "[" and closes at the matching "]", counting nested
 * brackets ("[OE. yarn, [AS.] gearn]"). A group whose closing bracket was
 * lost (an untranscribed gap took it) runs to the end of the paragraph.
 */
export function bracketGroups(text: string): BracketGroup[] {
  const out: BracketGroup[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("[", i);
    if (open < 0) break;
    let depth = 0;
    let j = open;
    for (; j < text.length; j++) {
      if (text[j] === "[") depth++;
      else if (text[j] === "]" && --depth === 0) break;
    }
    const closed = j < text.length;
    const end = closed ? j + 1 : text.length;
    const before = text.slice(Math.max(0, open - 7), open);
    out.push({ start: open, end, inner: text.slice(open + 1, closed ? j : text.length).trim(), closed, etymLabel: /Etym:\s*$/.test(before) });
    i = end;
  }
  return out;
}

/** Rule: an inflection group starts with imp., p. p., p. pr., pl., Compar./Comp., superl., 3d pers., pret., or obs. ("[imp. & p. p. Subjoined; ...]"). */
export function isInflectionGroup(inner: string): boolean {
  return /^(imp\.|p\. ?p\.|p\. ?pr\.|pl\.|Compar\.|Comp\.|superl\.|3d pers\.|pret\.|obs\. )/i.test(inner);
}

/**
 * Rule: a parenthesised label is one to five words, each capitalised or an
 * abbreviation ending in ".", optionally joined by "&" or "of": "(Zoöl.)",
 * "(R. C. Ch.)", "(Logic)", "(Fine Arts)", "(med.)". A scientific name
 * "(Pseudemus concinna)" has a lower-case word without a full stop and is
 * not a label.
 */
export function isParenLabel(group: string): boolean {
  const word = String.raw`(?:\p{Lu}[\p{L}]*\.?|\p{Ll}[\p{L}]*\.|&|of)`;
  return new RegExp(String.raw`^\(${word}(?:\s+${word}){0,4}\)$`, "u").test(group) && group.length <= 40;
}

/**
 * Rule: a label group is one to four short words, each capitalised or an
 * abbreviation, optionally joined by "&" ("[Obs.]", "[Poetic]", "[Obs. & R.]",
 * "[Prov. Eng.]", "[Colloq. U. S.]"). Anything longer is not a label.
 */
export function isLabelGroup(inner: string): boolean {
  return /^(?:[A-Z][A-Za-z]*\.?|&)(?:\s(?:[A-Z][A-Za-z]*\.?|&)){0,4}$/.test(inner) && inner.length <= 30;
}

/** Rule: a spelling group starts "Written also", "Sometimes written", "Spelled also", "Also written" or "Formerly written" ("[Written also tressel.]"). */
export function isSpellingGroup(inner: string): boolean {
  return /^(?:Written also|Sometimes written|Spelled also|Also written|Formerly written|Also spelled|Written)\b/i.test(inner);
}
