// A tolerant tokenizer for the tagged v0.50 files. Never a strict XML/HTML
// parser: the files have mis-nested tags and two entry openers.
import { foldForCompare } from "../segment/fold.ts";

export interface TaggedEntry {
  file: string;
  /** 1-based line of the opening paragraph in the CRLF-normalised file. */
  line: number;
  /** First headword, marks kept, entities decoded. */
  headword: string;
  headwordFold: string;
  /** The entry with tags removed and entities decoded to letters. */
  text: string;
}

const NAMED: Record<string, string> = {
  aelig: "æ", AElig: "Æ", oelig: "œ", OElig: "Œ", ae: "æ", AE: "Æ", oe: "œ", OE: "Œ",
  amp: "&", lt: "<", gt: ">", quot: '"', sect: "§", deg: "°", pound: "£", frac12: "½", frac14: "¼", frac34: "¾",
  times: "×", divide: "÷", middot: "·", mdash: "--", ndash: "-", nsm: "", th: "th", filig: "fi", fllig: "fl",
};
// Diacritic suffixes used in the transcribers' entity names: &eacute; &oomac; &ebreve; <xring/ ...
const DIACRITIC = /(acute|grave|circ|cir|uml|um|tilde|til|cedil|ring|macr|mac|breve|bre|dot|sdot|dd|car|cr|sl|sm|smac)$/;

/**
 * Rule: an entity is either &name; or the older <name/ form. Known names map
 * to their character; a letter plus a diacritic suffix (eacute, oomac,
 * ebreve) maps to its base letter(s), which is all the comparison needs;
 * anything else becomes an empty string (Greek letters, symbols).
 */
export function decodeEntityName(name: string): string {
  if (name in NAMED) return NAMED[name]!;
  const base = name.replace(DIACRITIC, "");
  if (base !== name && /^[A-Za-z]{1,2}$/.test(base)) return base;
  return "";
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&([A-Za-z0-9]+);/g, (_, n: string) => decodeEntityName(n))
    .replace(/<([A-Za-z][A-Za-z0-9]*)\//g, (_, n: string) => decodeEntityName(n));
}

/** Rule: remove every tag-like <...> (attributes and broken nesting included), then decode entities. */
export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<\/?[A-Za-z][^<>]*>/g, " ")).replace(/[ \t]+/g, " ");
}

/**
 * Rule: an entry starts at a paragraph opening "<p><hw>" or "<p>{ <hw>"
 * (spaces allowed). Following paragraphs without that opener belong to it.
 * Text before the first entry (the front matter) is skipped.
 */
export function tokenizeTagged(file: string, raw: string): TaggedEntry[] {
  const text = raw.replace(/\r\n/g, "\n");
  const opener = /<p>\s*(?:\{\s*)?<hw>/g;
  const starts: number[] = [];
  for (const m of text.matchAll(opener)) starts.push(m.index);
  const lineAt = (() => {
    const nl: number[] = [];
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) nl.push(i);
    return (pos: number) => {
      let lo = 0, hi = nl.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid]! < pos) lo = mid + 1; else hi = mid; }
      return lo + 1;
    };
  })();
  return starts.map((s, i) => {
    const chunk = text.slice(s, starts[i + 1] ?? text.length);
    const hw = /<hw>([\s\S]*?)<\/hw>/.exec(chunk)?.[1] ?? "";
    const headword = stripTags(hw).trim();
    return { file, line: lineAt(s), headword, headwordFold: foldForCompare(headword), text: stripTags(chunk) };
  });
}
