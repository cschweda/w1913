// Collocations in a sense's text (data 0.7, DESIGN.md §2 "What it does not
// mark", 3). The 1913 printed each phrase in bold after the senses; the plain
// text keeps only the run-in dashes: ` -- Bill of fare, a written or printed
// enumeration…`. A heuristic, measured against the tagged edition by
// src/eval/colloc-cli.ts (never a data source).

import { findQuotes } from "../quotes/parse.ts";

export interface Phrase { start: number; end: number; text: string }
export interface Collocation {
  /** Where the run begins in the text: its "--" dash, or its first phrase when unmarked. */
  at: number;
  /** Where the head (phrases, with any "or" and labels between) ends and the definition begins, and where that ends. */
  defStart: number;
  end: number;
  /** The phrases, as printed; more than one when they share the definition ("Apple of love, or Love apple"). */
  phrases: Phrase[];
  /** The word a "See under Exception." definition sends you to, or null. */
  see: string | null;
}

const WORD = String.raw`[\p{L}][\p{L}'’-]*`;
/**
 * A phrase: two to ten words, the first capitalised (or "To", "The", "A" and
 * a lower-case word), none carrying stress marks, ending at a comma, a full
 * stop and space, a semicolon, a label in parentheses, or "(a)".
 */
const PHRASE = new RegExp(
  String.raw`^((?:[A-Z][\p{L}'’-]*|[A-Z]\.|St\.)(?: (?:${WORD}|&)){1,9}?)(?=(?: ?\([^()\n]{1,40}\))+ (?=[a-z])|(?: ?\([^()\n]{1,40}\))*(?:,|\.(?:\s|$)|;|:| \(a\)| or\b| \(? ?Etym:| is (?=[A-Z]\p{L}*\. [a-z])))`,
  "u",
);
/** After the phrase: a part of speech means a run-in derivative ("-- Sublimely, adv."), not a collocation. */
const POS_AFTER = /^,\s*(?:n|a|adv|v|v\. ?t|v\. ?i|p\. ?p|p\. ?a|pl|prep|conj|interj|imp)\.(?:\s|$|,)/;
const MARKER = /(?:^|\n| )-- (?=[A-Z])|(?<=[.;] )- (?=[A-Z])/g;

function phraseAt(text: string, pos: number): { phrase: string; end: number } | null {
  const m = PHRASE.exec(text.slice(pos, pos + 200).replace(/\n/g, " "));
  if (!m) return null;
  const phrase = m[1]!;
  if (/^(?:See|Same|Cf|Also|Called|Note|Defn|Etym)\b/.test(phrase) || /\b(?:Etym|Defn|Note)$/.test(phrase)) return null;
  const after = text.slice(pos + phrase.length, pos + phrase.length + 20);
  if (POS_AFTER.test(after)) return null;
  return { phrase, end: pos + phrase.length };
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
/** Rule: the phrase uses the headword when one of its words starts with the headword's first letters (all but a final e/y, at least 3). */
export function usesHeadword(phrase: string, headword: string): boolean {
  const h = fold(headword.split(/[\s-]/)[0]!);
  const stem = h.length > 4 ? h.replace(/(?:e|y|es|s)$/, "") : h;
  return phrase.split(/[\s-]+/).some((w) => fold(w).startsWith(stem.slice(0, Math.max(3, stem.length))));
}

/** What may follow an unmarked phrase: a comma and a lower-case definition, a label, "(a)", or ". See". */
const STRONG = /^(?: ?\([^()\n]{1,40}\))*(?:,\s+(?:[a-z(]|"[a-z])|\s+\(a\)|\.\s+(?:See|Same as)\b|\.\s+\(|\s*\(? ?Etym:)|^ \([^()\n]{1,40}\)[,.]/;
/** "Apple of love, or Love apple, the tomato": a second phrase after ", or". */
const OR_NEXT = /^(,? or |, )(?=[A-Z])/;
const words = (p: string) => new Set(p.split(/[\s-]+/).map(fold));

/** Words that open a sentence of text or verse, not an unmarked phrase. */
const OPENERS = new Set("A An The This That These Those Each Every Some Any His Her Its Our Their My Your Thy If When So But And Or Nor Yet Ah O Oh We He She It They You I Him Them There Here Here's Either Neither Both What Which Who How Why Where Then Thus Hence Let Behold Under".split(" "));

/**
 * Rules: a collocation begins at " -- " followed by a phrase (PHRASE) that is
 * not a run-in derivative. It may also begin unmarked, at a sentence or line
 * start other than the text's own start, when its phrase uses the headword,
 * has at most five words, and is followed by a lower-case definition, a
 * label, "(a)" or ". See" (the 1913 often printed the first phrase of a run,
 * or a lone one, without the dash: "etc. Bill of adventure. See under
 * Adventure."). "X, or Y, …" gives two phrases with one definition. Each
 * definition runs to the next collocation or the end of the text.
 */
export function findCollocations(text: string, headword: string): Collocation[] {
  const quoted = findQuotes(text).quotes.map((q) => [q.start, q.authorEnd] as const);
  const inQuote = (pos: number) => quoted.some(([a, b]) => pos >= a && pos < b);
  const found: { at: number; start: number; phrase: string; phraseEnd: number }[] = [];
  const chain = (p: { phrase: string; end: number }) => {
    const out: { start: number; phrase: string; phraseEnd: number }[] = [];
    // Alternatives sharing the definition: "Apple of love, or Love apple, the
    // tomato"; "Blue fire, Red fire, Green fire (Pyrotech.), compositions…".
    // After a bare comma the next phrase must share a word with the first.
    const first = words(p.phrase);
    let end = p.end;
    for (let n = 0; n < 6; n++) {
      const or = OR_NEXT.exec(text.slice(end, end + 12).replace(/\n/g, " "));
      if (!or) break;
      const at = end + or[0].length;
      const q = phraseAt(text, at);
      if (!q || q.phrase.split(" ").length > 6 || /^[A-Z]\./.test(q.phrase)) break;
      if (or[1] === ", " && ![...words(q.phrase)].some((w) => w.length > 2 && first.has(w))) break;
      out.push({ start: at, phrase: q.phrase, phraseEnd: q.end });
      end = q.end;
    }
    return { alts: out, end };
  };
  const add = (at: number, start: number, p: { phrase: string; end: number }, alts: ReturnType<typeof chain>["alts"]) => {
    found.push({ at, start, phrase: p.phrase, phraseEnd: p.end });
    for (const a of alts) found.push({ at: -1, ...a });
  };
  for (const m of text.matchAll(MARKER)) {
    const start = m.index + m[0].length;
    const p = phraseAt(text, start);
    if (p && !inQuote(start)) add(m[0].startsWith("-") ? m.index : m.index + 1, start, p, chain(p).alts);
  }
  for (const m of text.matchAll(/(?<=[.!?:"\]]\s+|\n)(?=[A-Z])/g)) {
    const pos = m.index;
    if (pos === 0 || found.some((f) => f.start === pos || (pos > f.start && pos < f.phraseEnd))) continue;
    if (/-- $/.test(text.slice(0, pos))) continue;
    const p = phraseAt(text, pos);
    if (!p || p.phrase.split(" ").length > 5 || OPENERS.has(p.phrase.split(" ")[0]!) || inQuote(pos) || !usesHeadword(p.phrase, headword)) continue;
    const c = chain(p);
    if (!STRONG.test(text.slice(c.end, c.end + 60).replace(/\n/g, " "))) continue;
    add(pos, pos, p, c.alts);
  }
  found.sort((a, b) => a.start - b.start);
  const out: Collocation[] = [];
  for (const f of found) {
    const last = out.at(-1);
    if (f.at < 0 && last) { last.phrases.push({ start: f.start, end: f.phraseEnd, text: f.phrase }); continue; }
    out.push({ at: f.at < 0 ? f.start : f.at, defStart: 0, end: 0, phrases: [{ start: f.start, end: f.phraseEnd, text: f.phrase }], see: null });
  }
  out.forEach((c, i) => {
    const end = text.slice(0, out[i + 1]?.at ?? text.length).trimEnd().length;
    let d = c.phrases.at(-1)!.end;
    d += /^(?:\s?\([^()\n]{1,40}\))*/.exec(text.slice(d))![0].length;
    d += /^[,.;:]?\s*/.exec(text.slice(d))![0].length;
    c.defStart = Math.min(d, end);
    c.end = end;
    c.see = /^See (?:under )?([\p{L}][\p{L}'’ -]*?)[,.]/u.exec(text.slice(c.defStart, end))?.[1] ?? null;
  });
  return out;
}
