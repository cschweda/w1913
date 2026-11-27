// Quotations, authors and authorities in a sense's text (data 0.6, DESIGN.md
// §2 problem 5). A heuristic with three outcomes: a trailing name closes a
// quotation, cites an authority for the definition, or is ordinary text.
// Measured against the tagged edition by src/eval (never a data source).

export interface Quote {
  /** Offsets in the text: the quotation (without its quote marks) and its author. */
  start: number;
  end: number;
  authorStart: number;
  authorEnd: number;
  text: string;
  author: string;
  kind: "block" | "inline";
}
export interface Authority { start: number; end: number; author: string }
export interface Found { quotes: Quote[]; authorities: Authority[] }

const NAME = /^(?:[A-Z][\p{L}'’-]*|[A-Z]\p{L}*\.)[.,]?$/u;
const PARTICLE = /^(?:de|von|van|der|of|the|la|le|du|da|di|and|&)$/;
const REF = /^(?:[ivxlcdm]+[.,]|\d+(?:[.,:;]\d*)?[.,]?|\d+-\d+[.,]?)$/;
const ENDS_SENTENCE = /[.!?;:"”'’)\]]$/;
/** Tokens after which a name runs on: initials, titles, book abbreviations, chapter numbers ("Sir P.", "Bp.", "Heb. xi."). */
const RUNS_ON = /^(?:[A-Z]\.|(?:Bp|Abp|Sir|Dr|Mr|Mrs|St|Lord|Lady|De|Gen|Ex|Exod|Lev|Num|Deut|Josh|Judg|Sam|Kings|Chron|Neh|Esth|Ps|Prov|Eccl|Cant|Isa|Jer|Lam|Ezek|Dan|Hos|Mic|Hab|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Tit|Heb|Jas|Pet|Jude|Rev|Wisd|Ecclus|Macc)\.?|[ivxlcdm]+\.|\d)$/;
/** Words that start a cross-reference or a sentence of definition, never an author. */
const NOT_AUTHOR = new Set(["See", "Cf.", "Same", "As", "The", "A", "An", "In", "Also", "Hence", "Etym:", "Note:", "Syn."]);

interface Tok { s: string; start: number; end: number }
function tokens(text: string, from: number, to: number): Tok[] {
  const out: Tok[] = [];
  for (const m of text.slice(from, to).matchAll(/\S+/g)) out.push({ s: m[0], start: from + m.index, end: from + m.index + m[0].length });
  return out;
}

/**
 * Rule: the author at the end of a span is the longest run of name tokens
 * (capitalised words, initials, abbreviations; particles like "de" between
 * names; roman and arabic numbers of a Scripture reference after a name),
 * of at most six tokens, ending in a full stop, whose preceding token ends a
 * sentence (or which starts the span), and which does not begin with a
 * cross-reference word. Returns the index of its first token, or -1.
 */
function authorRun(toks: Tok[]): number {
  if (!toks.length || !/\.$/.test(toks.at(-1)!.s)) return -1;
  let i = toks.length - 1;
  let seenName = false;
  const isRunTok = (t: string, k: number) => NAME.test(t) || (PARTICLE.test(t) && k < toks.length - 1) || REF.test(t);
  while (i >= 0 && toks.length - i <= 6 && isRunTok(toks[i]!.s, i)) i--;
  let best = -1;
  for (let s = i + 1; s < toks.length; s++) {
    // "1 Chron. xxix. 12": a book number may open the run.
    const opener = NAME.test(toks[s]!.s) || (/^[1-4]$/.test(toks[s]!.s) && NAME.test(toks[s + 1]?.s ?? ""));
    if (!opener || NOT_AUTHOR.has(toks[s]!.s)) continue;
    if (s === 0 || ENDS_SENTENCE.test(toks[s - 1]!.s)) { best = s; break; }
  }
  if (best < 0) return -1;
  for (let k = best; k < toks.length; k++) if (NAME.test(toks[k]!.s)) seenName = true;
  // A Scripture reference must follow a book name; a run of numbers alone is not an author.
  return seenName ? best : -1;
}

/**
 * Rule: units are the text split where a line ends a sentence and the next
 * line starts with a capital or a quote mark. The first unit is the
 * definition. A later unit ending in an author run is a block quotation (the
 * unit before the run), or an authority when the run is the whole unit.
 * Within any unit, a "…" span opened after a space and before a capital and
 * directly followed by an author run is an inline quotation. A unit that is
 * only an author run closes the unit before it as a block quotation, unless
 * that unit is the definition or already closed (then it is an authority). A first unit
 * ending in an author run after a sentence (no quotation) is an authority.
 */
export function findQuotes(text: string): Found {
  const quotes: Quote[] = [];
  const authorities: Authority[] = [];
  const cuts = [0];
  for (const m of text.matchAll(/\n/g)) {
    const before = text.slice(0, m.index).trimEnd();
    const after = text.slice(m.index + 1);
    // A line ending in an initial, title or reference number ("Sir T.", "Heb. xi.") runs on into a name, not a new unit.
    const last = before.split(/\s+/).at(-1) ?? "";
    if (/^(?:[A-Z]\.|(?:Bp|Abp|Jer|Sir|Dr|Mr|Mrs|St|Gen|Ex|Exod|Lev|Num|Deut|Ps|Prov|Eccl|Isa|Jer|Ezek|Dan|Matt|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Heb|Rev)\.|[ivxlcdm]+\.)$/.test(last)) continue;
    if (ENDS_SENTENCE.test(before) && /^["“]?[A-Z]/.test(after)) cuts.push(m.index + 1);
  }
  cuts.push(text.length);
  /** Units already closed by an author. */
  const closed = new Set<number>([0]);

  for (let u = 0; u < cuts.length - 1; u++) {
    const from = cuts[u]!;
    const to = cuts[u + 1]!;
    const toks = tokens(text, from, to);
    // Inline quotations anywhere in the unit.
    const inlineEnds: number[] = [];
    for (const m of text.slice(from, to).matchAll(/(?<=^|[\s(])["“]([A-Z][^"”]{2,600}?)["”](?=\s)/g)) {
      const qStart = from + m.index + 1;
      const qEnd = qStart + m[1]!.length;
      // The author run must follow directly and end at a full stop.
      const rest = tokens(text, qEnd + 1, to);
      // The run goes on while a token does not end in a full stop, or is an initial, title or reference that runs on.
      let k = 0;
      while (k < rest.length - 1 && k < 6 && (NAME.test(rest[k]!.s) || REF.test(rest[k]!.s) || PARTICLE.test(rest[k]!.s)) && (!/\.$/.test(rest[k]!.s) || RUNS_ON.test(rest[k]!.s))) k++;
      const startsOk = NAME.test(rest[0]?.s ?? "") || (/^[1-4]$/.test(rest[0]?.s ?? "") && NAME.test(rest[1]?.s ?? ""));
      if (k >= rest.length || !startsOk || NOT_AUTHOR.has(rest[0]!.s) || !(NAME.test(rest[k]!.s) || REF.test(rest[k]!.s)) || !/\.$/.test(rest[k]!.s)) continue;
      const aStart = rest[0]!.start;
      const aEnd = rest[k]!.end - 1;
      quotes.push({ start: qStart, end: qEnd, authorStart: aStart, authorEnd: aEnd, text: text.slice(qStart, qEnd), author: text.slice(aStart, aEnd).replace(/\s+/g, " "), kind: "inline" });
      inlineEnds.push(rest[k]!.end);
    }
    const run = authorRun(toks);
    if (run < 0 || inlineEnds.includes(toks.at(-1)!.end)) continue;
    const aStart = toks[run]!.start;
    const aEnd = toks.at(-1)!.end - 1;
    const author = text.slice(aStart, aEnd).replace(/\s+/g, " ");
    if (run === 0 && u >= 2 && !closed.has(u - 1)) {
      // An author on a line of its own closes the unit before it ("…of illustration.\nDe Quincey.").
      const pf = cuts[u - 1]!;
      const pt = text.slice(pf, from).trimEnd();
      if (!/(?:^|\s)--\s/.test(pt)) {
        quotes.push({ start: pf, end: pf + pt.length, authorStart: aStart, authorEnd: aEnd, text: pt.replace(/\s+/g, " "), author, kind: "block" });
        closed.add(u);
        continue;
      }
    }
    if (run === 0 || u === 0) {
      if (run === 0 && u === 0) continue; // a sense that is only a name is not an authority
      authorities.push({ start: aStart, end: aEnd, author });
      continue;
    }
    // Run-on phrases with an authority ("Laced mutton, a prostitute. [Old slang] -- …", "Globe amaranth (Bot.), a plant…") are not quotations.
    const unitText = text.slice(from, toks[run - 1]!.end);
    if (/(?:^|\s)--\s/.test(unitText) || /^[\p{L}' -]{2,40} \([A-Z][\p{L}. &]{1,20}\),/u.test(unitText)) continue;
    const qEnd = toks[run - 1]!.end;
    closed.add(u);
    quotes.push({ start: from, end: qEnd, authorStart: aStart, authorEnd: aEnd, text: text.slice(from, qEnd).replace(/\s+/g, " "), author, kind: "block" });
  }
  quotes.sort((a, b) => a.start - b.start);
  return { quotes, authorities };
}
