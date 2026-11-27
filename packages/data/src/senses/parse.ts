// The "senses" layer (data 0.2): an entry's header paragraph and body,
// split into inflections, etymology, senses, sub-senses, notes and the
// synonym paragraph. Text is kept exactly as printed, lines joined with
// "\n"; quotations and labels stay inside sense text until their own layers.
import type { RawEntry } from "../segment/segment.ts";
import { bracketGroups, isInflectionGroup, isLabelGroup, isParenLabel, isSpellingGroup } from "./brackets.ts";
import { findXrefs, type XrefMatch } from "./xrefs.ts";

export interface Block {
  text: string;
  xrefs: XrefMatch[];
}
export interface SubSense extends Block {
  letter: string;
}
export interface Sense extends Block {
  /** The printed sense number, or null for an unnumbered definition. */
  n: number | null;
  sub: SubSense[];
  notes: Block[];
}
export interface SensesLayer {
  /** "Compar. Sublimer; superl. Sublimest." or "imp. & p. p. Subjoined; ..." without brackets. */
  inflections: string | null;
  etymology: Block | null;
  /** Parenthesised labels in the header paragraph as printed: "(Chem.)". */
  headerLabels: string[];
  /** Other bracketed groups in the header paragraph, as printed: labels "[Obs.]" and anything unclassified. */
  headerMarks: string[];
  /** Alternative spellings noted in the header: "Written also tressel." (brackets removed). */
  spellings: string[];
  /** Any other text left in the header paragraph after the forms ("A registry mark ..."). */
  headerRest: string | null;
  senses: Sense[];
  /** Notes that come before any sense. */
  notes: Block[];
  /** The "Syn." paragraph(s) as printed, for the syn layer (0.3). */
  syn: string | null;
}

const block = (text: string): Block => ({ text, xrefs: findXrefs(text) });

/** Split an entry's lines into paragraphs (runs of non-blank lines). */
export function paragraphsOf(lines: readonly string[]): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (l === "") { if (cur.length) out.push(cur); cur = []; } else cur.push(l);
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Rule: a paragraph whose text is only labels ("(Mus.)", "(Anat.) [Obs.]") or nothing carries no definition yet. */
export function isLabelOnly(text: string): boolean {
  return /^(?:\s*(?:\([^()]{1,40}\)|\[[^\[\]]{1,30}\]))*\s*$/.test(text);
}

/**
 * Header paragraph. Rule: read left to right from the end of the forms and
 * part of speech, taking off, in any order: "Etym:", bracketed groups (an
 * inflection list, a spelling note, the etymology: the first other group
 * after "Etym:", else the first other group; anything else is kept as
 * printed in headerMarks), parenthesised labels ("(Zoöl.)"), plural
 * and other inflection phrases ("pl. Abbacies.", "E. pl. Abacuses ; L. pl.
 * Abaci."), "Also <form> ." phrases, and separators. Whatever follows, kept
 * verbatim, is a definition printed in the header when it reads as text
 * (three or more words with a lower-case one), else headerRest.
 */
export function parseHeaderParagraph(para: string, formsEnd: number): Pick<SensesLayer, "inflections" | "etymology" | "headerLabels" | "headerMarks" | "headerRest" | "spellings"> & { definition: string | null } {
  const groups = bracketGroups(para);
  const plain = (g: (typeof groups)[number]) => !isInflectionGroup(g.inner) && !isLabelGroup(g.inner) && !isSpellingGroup(g.inner);
  // A group straight after "Etym:" is the etymology even when it is short
  // enough to look like a label ("Etym: [L.]", "Etym: [See Strait.]").
  const etymGroup =
    groups.find((g) => g.start >= formsEnd && g.etymLabel && !isSpellingGroup(g.inner)) ??
    groups.find((g) => g.start >= formsEnd && plain(g));
  const spellings: string[] = [];
  const inflections: string[] = [];
  let etymology: Block | null = null;
  const headerMarks: string[] = [];
  const headerLabels: string[] = [];
  let i = formsEnd;
  let lastWasInflection = false;
  for (;;) {
    const sep = /^[\s,;.]+/.exec(para.slice(i));
    if (sep) i += sep[0].length;
    if (i >= para.length) break;
    const rest = para.slice(i);
    if (!rest.startsWith("pl.") && !/^[A-Z]{1,2}\.\s/.test(rest)) lastWasInflection = false;
    if (rest.startsWith("Etym:")) { i += 5; continue; }
    if (rest.startsWith("[")) {
      const g = groups.find((x) => x.start === i);
      if (!g) break;
      if (g === etymGroup) etymology = block(g.inner);
      else if (isInflectionGroup(g.inner)) inflections.push(g.inner);
      else if (isSpellingGroup(g.inner)) spellings.push(g.inner);
      else headerMarks.push(`[${g.inner}]`);
      i = g.end;
      continue;
    }
    const paren = /^\([^()]{0,60}\)/.exec(rest);
    if (paren && (isParenLabel(paren[0]) || /^\(\s*#?\s*\)$/.test(paren[0]))) {
      if (isParenLabel(paren[0])) headerLabels.push(paren[0]);
      i += paren[0].length;
      continue;
    }
      // Plurals may name languages and run on after a semicolon:
    // "pl. Abbacies.", "E. pl. Abacuses ; L. pl. Abaci.", "pl. E. Apexes; L. Apices."
    const infl = /^(?:(?:[A-Z]{1,2}\.\s+)?pl\.\s+(?:[A-Z]{1,2}\.\s+)?[^.;\[(]*[.;]|(?:imp\.|p\. ?p\.|pret\.|obs\.)[^.;\[(]*[.;]|Also\s+[^.;\[(]*\.)/.exec(rest);
    const more = lastWasInflection ? /^[A-Z]{1,2}\.\s+[A-Z][^.;\[(]*[.;]/.exec(rest) : null;
    const hit = infl ?? more;
    if (hit) { inflections.push(hit[0].replace(/[;\s]+$/, "")); i += hit[0].length; lastWasInflection = true; continue; }
    break;
  }
  // The scan can stop at debris before the etymology ("pl. Fellies (. Etym:
  // [OE. feli, ..."); the etymology is still taken, and cut out of what is left.
  let tail = para.slice(i);
  if (!etymology && etymGroup && etymGroup.start >= i) {
    etymology = block(etymGroup.inner);
    tail = para.slice(i, etymGroup.start).replace(/Etym:\s*$/, "") + " " + para.slice(etymGroup.end);
  }
  const remainder = tail.replace(/\s+/g, (w) => (w.includes("\n") ? "\n" : " ")).trim();
  // A definition reads as text: three or more words, one in lower case. Not
  // text: a second marked form (stress marks inside a word, "Con`fi*dante",
  // n. fem.") or a remark wholly in parentheses ("(named a in the English ...).").
  const looksLikeText =
    remainder.split(/\s+/).length >= 3 &&
    /\b[a-z]{2,}\b/.test(remainder) &&
    !/\p{L}[*"`]\p{L}|\p{L}"[\s,]/u.test(remainder) &&
    !/^\([^()]*\)\.?$/.test(remainder);
  return {
    inflections: inflections.length ? inflections.join(" ") : null,
    etymology, headerLabels, headerMarks, spellings,
    headerRest: remainder && !looksLikeText ? remainder : null,
    definition: remainder && looksLikeText ? remainder : null,
  };
}

/**
 * Body. Rules, paragraph by paragraph:
 * - "Syn." starts the synonym section, which runs to the end of the entry
 *   unless a later paragraph opens a numbered sense or a "Defn:".
 * - "N." opens sense N; the rest of the paragraph is its text. Lines inside
 *   it that open with "(a) ", "(b) " ... are sub-senses.
 * - "Defn:" joins the current sense when that sense so far holds only labels
 *   ("2. (Mus.)" / "Defn: The name of ..."); otherwise it opens an unnumbered
 *   sense.
 * - "Note:" attaches to the current sense, or to the entry before any sense.
 * - A paragraph opening "(a) " is a sub-sense of the current sense.
 * - Any other paragraph continues the last thing written (sense, sub-sense or
 *   note), separated by a blank line.
 */
export function parseBody(paras: readonly string[][], initial: Sense[] = []): Pick<SensesLayer, "senses" | "notes" | "syn"> {
  const senses: Sense[] = [...initial];
  const notes: Block[] = [];
  const synParts: string[] = [];
  let inSyn = false;
  type Target = { kind: "sense"; s: Sense } | { kind: "sub"; s: SubSense } | { kind: "note"; s: Block };
  let last: Target | null = senses.length ? { kind: "sense", s: senses.at(-1)! } : null;

  const current = () => senses.at(-1) ?? null;
  const append = (t: Target, more: string) => {
    t.s.text = t.s.text ? `${t.s.text}\n\n${more}` : more;
  };
  const splitSubs = (lines: string[], s: Sense) => {
    const head: string[] = [];
    let sub: string[] | null = null;
    let letter = "";
    const flush = () => { if (sub) s.sub.push({ letter, ...block(sub.join("\n")) }); };
    for (const l of lines) {
      const m = /^\s?\(([a-z])\)\s+(.*)$/.exec(l);
      if (m) { flush(); letter = m[1]!; sub = [m[2]!]; }
      else if (sub) sub.push(l);
      else head.push(l);
    }
    flush();
    return head.join("\n");
  };

  for (const p of paras) {
    const first = p[0]!;
    const numbered = /^(\d+)\.\s*(.*)$/.exec(first);
    const defn = /^Defn:\s?(.*)$/.exec(first);
    if (inSyn && !numbered && !defn) { synParts.push(p.join("\n")); continue; }
    inSyn = false;
    if (/^Syn\./.test(first)) { inSyn = true; synParts.push(p.join("\n")); continue; }

    if (numbered) {
      const s: Sense = { n: Number(numbered[1]), text: "", xrefs: [], sub: [], notes: [] };
      s.text = splitSubs([numbered[2]!, ...p.slice(1)].filter((l, i) => i > 0 || l !== ""), s);
      senses.push(s);
      last = s.sub.length ? { kind: "sub", s: s.sub.at(-1)! } : { kind: "sense", s };
    } else if (defn) {
      const lines = [defn[1]!, ...p.slice(1)];
      const cur = current();
      if (cur && cur.sub.length === 0 && isLabelOnly(cur.text)) {
        const body = splitSubs(lines, cur);
        cur.text = cur.text ? `${cur.text} ${body}` : body;
        last = cur.sub.length ? { kind: "sub", s: cur.sub.at(-1)! } : { kind: "sense", s: cur };
      } else {
        const s: Sense = { n: null, text: "", xrefs: [], sub: [], notes: [] };
        s.text = splitSubs(lines, s);
        senses.push(s);
        last = s.sub.length ? { kind: "sub", s: s.sub.at(-1)! } : { kind: "sense", s };
      }
    } else if (/^Note:/.test(first)) {
      const n = block(p.join("\n").replace(/^Note:\s?/, ""));
      const cur = current();
      (cur ? cur.notes : notes).push(n);
      last = { kind: "note", s: n };
    } else if (/^\s?\([a-z]\)\s/.test(first)) {
      if (!current()) senses.push({ n: null, text: "", xrefs: [], sub: [], notes: [] });
      const cur = current()!;
      const rest = splitSubs(p, cur);
      if (rest) append({ kind: "sense", s: cur }, rest);
      last = { kind: "sub", s: cur.sub.at(-1)! };
    } else if (last) {
      append(last, p.join("\n"));
    } else {
      const s: Sense = { n: null, text: p.join("\n"), xrefs: [], sub: [], notes: [] };
      senses.push(s);
      last = { kind: "sense", s };
    }
  }
  // Cross-references are found once all text is final.
  for (const s of senses) {
    s.xrefs = findXrefs(s.text);
    for (const sub of s.sub) sub.xrefs = findXrefs(sub.text);
    for (const n of s.notes) n.xrefs = findXrefs(n.text);
  }
  for (const n of notes) n.xrefs = findXrefs(n.text);
  return { senses, notes, syn: synParts.length ? synParts.join("\n\n") : null };
}

/** The senses layer for one segmented entry. */
export function parseSenses(e: RawEntry): SensesLayer {
  const paras = paragraphsOf(e.lines.slice(e.wrapped ? 2 : 1));
  if (e.headerLine === null) {
    return { inflections: null, etymology: null, headerLabels: [], headerMarks: [], spellings: [], headerRest: null, ...parseBody(paras) };
  }
  // Lettered sub-senses can follow the header line in the same paragraph.
  const headerLines = paras[0] ?? [];
  const cut = headerLines.findIndex((l, i) => i > 0 && /^\s?\([a-z]\)\s/.test(l));
  const body = paras.slice(1);
  if (cut > 0) body.unshift(headerLines.slice(cut));
  const headerPara = (cut > 0 ? headerLines.slice(0, cut) : headerLines).join("\n");
  const h = parseHeaderParagraph(headerPara, formsEnd(headerPara, e));
  const initial: Sense[] = h.definition ? [{ n: null, text: h.definition, xrefs: [], sub: [], notes: [] }] : [];
  const { definition: _definition, ...header } = h;
  return { ...header, ...parseBody(body, initial) };
}

/** Where the marked forms and part of speech end in the header paragraph. */
function formsEnd(headerPara: string, e: RawEntry): number {
  const marked = e.header?.marked ?? "";
  let end = headerPara.startsWith(marked) ? marked.length : 0;
  const pos = e.header?.pos;
  if (pos) {
    const at = headerPara.indexOf(pos, end);
    if (at >= 0 && at - end < 40) end = at + pos.length;
  }
  return end;
}
