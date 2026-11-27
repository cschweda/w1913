// Entry rendering: edition entry (senses layer) -> semantic HTML, done once
// at import (DESIGN.md §3). Text is escaped; the only markup is ours.
// Phase 1 shows quotations and labels as printed, inside the sense text;
// known abbreviations are decoded with <abbr> (shared/abbreviations.ts).
import { abbreviate } from "./abbreviations.ts";
import { entryPath } from "./fold.ts";
import type { UnusualSpan } from "./unusual.ts";
import type { Labeler } from "./labels.ts";

/** The label rule in use while rendering (set by the import; none by default). */
let labeler: Labeler | null = null;
export function useLabeler(l: Labeler | null) { labeler = l; }

/** A label group as chips: one small link per label, named in full (data 0.4). */
function chipsHtml(codes: string[]): string {
  return codes
    .map((c) => {
      const l = labeler?.label(c);
      return l ? `<a href="/label/${c}" class="chip">${escapeHtml(l.name)}</a>` : "";
    })
    .join("");
}


export interface Xref { start: number; end: number; to: string; id: string | null; sense: number | null }
export interface Block { text: string; xrefs: Xref[] }
export interface Sense extends Block { n: number | null; sub: (Block & { letter: string })[]; notes: Block[] }
export interface RenderableEntry {
  inflections: string | null;
  etymology: Block | null;
  headerLabels: string[];
  headerMarks: string[];
  spellings: string[];
  headerRest: string | null;
  senses: Sense[];
  notes: Block[];
  syn: string | null;
  /** The parsed Syn. section (data 0.3); without it the raw Syn. line is shown. */
  synonyms?: Synonyms | null;
  /** Quotations found in senses and sub-senses (data 0.6); without them quotations stay plain text. */
  quotes?: QuoteMark[];
}

/** A quotation in a sense (index `sense`) or sub-sense (`sub`), with offsets in that text (data 0.6). */
export interface QuoteMark {
  sense: number; sub: number | null; start: number; end: number; authorStart: number; authorEnd: number;
  kind: "block" | "inline"; author: string; authorKey: string; authorName: string; ref: string | null;
}

/** An author as a link to their page; a full name the reader may not know is added for screen readers. */
export function citeHtml(q: QuoteMark, printed: string): string {
  const full = q.ref ?? q.authorName;
  const extra = full && full.replace(/\W/g, "").toLowerCase() !== printed.replace(/\W/g, "").toLowerCase() ? `<span class="vh"> (${escapeHtml(full)})</span>` : "";
  return `<cite><a href="/author/${q.authorKey}" class="x">${escapeHtml(printed)}${extra}</a></cite>`;
}

export interface Linked { text: string; id: string | null }
export interface Essay { compares: Linked[]; text: string; xrefs: Xref[] }
export interface Synonyms { words: (Linked & { lookup: string })[]; note: Block | null; essays: Essay[]; derived: string[] }

/** Where a linked entry lives: its page path, its slug, and the anchor of its section. */
export type Locate = (id: string) => { path: string; slug: string; anchor: string } | null;

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);

/**
 * Rule: within a paragraph, the hard-wrapped lines join with a space; the
 * printed dash "--" shows as an em dash, keeping the spaces around it
 * ("eminent; — said of persons"). Display only: the edition text is unchanged.
 */
export function prose(s: string): string {
  return escapeHtml(s.replace(/\n/g, " ")).replace(/--/g, "—");
}

type Context = "etymology" | "inflections" | "text";

/**
 * prose() plus decoded abbreviations for the given context. In running text,
 * a bracketed or parenthesised group made only of known labels ("[Poetic]",
 * "(Naut.)") is shown as label chips in its place (DESIGN.md §4a, data 0.4);
 * other groups stay as printed.
 */
export function richProse(s: string, context: Context): string {
  if (context !== "text" || !labeler) return abbreviate(prose(s), context);
  let out = "";
  let at = 0;
  for (const m of s.matchAll(/\([^()]{1,60}\)|\[[^[\]]{1,60}\]/g)) {
    const codes = labeler.group(m[0]);
    if (!codes) continue;
    out += abbreviate(prose(s.slice(at, m.index)), context) + chipsHtml(codes);
    at = m.index + m[0].length;
  }
  return out + abbreviate(prose(s.slice(at)), context);
}

/** A block's text as HTML paragraphs, with its cross-references linked and abbreviations decoded. */
export function blockHtml(b: Block, locate: Locate, tag = "p", cls = "", context: Context = "text", unusual: UnusualSpan[] = [], extra: { start: number; end: number; html: string }[] = []): string {
  const paras = b.text.split(/\n\n/);
  let offset = 0;
  const out: string[] = [];
  for (const para of paras) {
    const start = offset;
    const end = start + para.length;
    offset = end + 2;
    // Cross-references and unusual words, in order; an unusual word that
    // overlaps a cross-reference is dropped (the cross-reference wins).
    type Mark = { start: number; end: number; html: () => string };
    const marks: Mark[] = [];
    for (const x of b.xrefs) {
      if (!x.id || x.start < start || x.end > end) continue;
      const where = locate(x.id);
      if (!where) continue;
      const hash = x.sense ? `${where.anchor}-${x.sense}` : where.anchor;
      marks.push({ start: x.start, end: x.end, html: () => `<a href="${where.path}#${hash}" class="x">${escapeHtml(b.text.slice(x.start, x.end))}</a>` });
    }
    for (const x of extra) if (x.start >= start && x.end <= end) marks.push({ start: x.start, end: x.end, html: () => x.html });
    for (const u of unusual) {
      if (u.start < start || u.end > end || marks.some((m) => u.start < m.end && m.start < u.end)) continue;
      marks.push({ start: u.start, end: u.end, html: () => `<a href="${entryPath(u.slug)}" class="rare" data-preview="${u.slug}">${escapeHtml(b.text.slice(u.start, u.end))}</a>` });
    }
    marks.sort((a, c) => a.start - c.start);
    let html = "";
    let at = start;
    for (const m of marks) {
      html += richProse(b.text.slice(at, m.start), context);
      html += m.html();
      at = m.end;
    }
    html += richProse(b.text.slice(at, end), context);
    out.push(`<${tag}${cls ? ` class="${cls}"` : ""}>${html}</${tag}>`);
  }
  return out.join("");
}

/** The meta lines under a homograph heading: labels, inflections, spellings, etymology. */
export function metaHtml(e: RenderableEntry, locate: Locate): string {
  const lines: string[] = [];
  const first = [...e.headerLabels, ...e.headerMarks, e.headerRest ?? ""].filter(Boolean).join(" ");
  if (first) lines.push(`<p class="m">${richProse(first, "text")}</p>`);
  if (e.inflections) lines.push(`<p class="m">${richProse(e.inflections, "inflections")}</p>`);
  for (const s of e.spellings) lines.push(`<p class="m">${prose(s)}</p>`);
  if (e.etymology) lines.push(blockHtml(e.etymology, locate, "p", "m ety", "etymology"));
  return lines.join("");
}

/** Finds unusual words in a sense's text (shared/unusual.ts); none by default. */
export type UnusualFinder = (text: string) => UnusualSpan[];
const NONE: UnusualFinder = () => [];

/** A block's text from `from` to `to`, with its cross-references and unusual spans moved to match. */
function sliceBlock(b: Block, spans: UnusualSpan[], from: number, to: number): [Block, UnusualSpan[]] {
  const inside = <T extends { start: number; end: number }>(x: T) => x.start >= from && x.end <= to;
  const shift = <T extends { start: number; end: number }>(x: T): T => ({ ...x, start: x.start - from, end: x.end - from });
  return [{ text: b.text.slice(from, to), xrefs: b.xrefs.filter(inside).map(shift) }, spans.filter(inside).map(shift)];
}

/**
 * A sense's (or sub-sense's) text with its quotations (data 0.6): each block
 * quotation as a <blockquote> with its author in a linked <cite>, the text
 * around it as paragraphs; an inline quotation keeps its quote marks and
 * gets a linked <cite> for its author. Without quotations, blockHtml().
 */
function quotedHtml(b: Block, quotes: QuoteMark[], locate: Locate, spans: UnusualSpan[]): string {
  const blocks = quotes.filter((q) => q.kind === "block").sort((a, c) => a.start - c.start);
  const inlines = quotes.filter((q) => q.kind === "inline");
  const cites = (from: number, to: number) =>
    inlines.filter((q) => q.authorStart >= from && q.authorEnd <= to).map((q) => ({ start: q.authorStart - from, end: q.authorEnd - from, html: citeHtml(q, b.text.slice(q.authorStart, q.authorEnd)) }));
  const part = (from: number, to: number) => {
    const t = b.text.slice(from, to);
    const lead = t.length - t.trimStart().length;
    const trail = t.length - t.trimEnd().length;
    if (!t.trim()) return "";
    const [sb, ss] = sliceBlock(b, spans, from + lead, to - trail);
    return blockHtml(sb, locate, "p", "st", "text", ss, cites(from + lead, to - trail));
  };
  let html = "";
  let at = 0;
  for (const q of blocks) {
    html += part(at, q.start);
    const [qb, qs] = sliceBlock(b, spans, q.start, q.end);
    // The printed author ends with a full stop just after authorEnd; it is part of the citation.
    const printed = b.text.slice(q.authorStart, q.authorEnd).replace(/\s+/g, " ");
    html += `<blockquote class="qt">${blockHtml({ text: qb.text.replace(/\n(?!\n)/g, " "), xrefs: qb.xrefs }, locate, "p", "", "text", qs, cites(q.start, q.end))}<footer class="qa">${citeHtml(q, printed)}</footer></blockquote>`;
    at = Math.min(b.text.length, q.authorEnd + 1);
  }
  return html + part(at, b.text.length);
}

function senseInner(s: Sense, locate: Locate, anchor: string, unusual: UnusualFinder, quotes: QuoteMark[] = []): string {
  const own = quotes.filter((q) => q.sub === null);
  let html = s.text ? (own.length ? quotedHtml(s, own, locate, unusual(s.text)) : blockHtml(s, locate, "p", "st", "text", unusual(s.text))) : "";
  if (s.sub.length) {
    html += `<ol class="sub" type="a">${s.sub
      .map((x, j) => {
        const qs = quotes.filter((q) => q.sub === j);
        const inner = qs.length ? quotedHtml(x, qs, locate, unusual(x.text)) : blockHtml(x, locate, "p", "st", "text", unusual(x.text));
        return `<li id="${anchor}-${s.n ?? "u"}${x.letter}" value="${x.letter.charCodeAt(0) - 96}">${inner}</li>`;
      })
      .join("")}</ol>`;
  }
  for (const n of s.notes) html += noteHtml(n, locate);
  return html;
}

function noteHtml(n: Block, locate: Locate): string {
  return `<div class="note"><span class="cap">Note</span>${blockHtml(n, locate, "p", "")}</div>`;
}

/**
 * The body under a homograph heading. Rule: consecutive numbered senses form
 * an ordered list whose items keep their printed numbers; an unnumbered
 * sense is a paragraph of its own. Entry-level notes come first, the Syn.
 * paragraph last, shown as a plain line until data 0.3 (DESIGN.md §4a).
 */
export function bodyHtml(e: RenderableEntry, locate: Locate, anchor: string, unusual: UnusualFinder = NONE, slug = ""): string {
  const parts: string[] = e.notes.map((n) => noteHtml(n, locate));
  let list: string[] = [];
  const flush = () => {
    if (list.length) parts.push(`<ol class="s">${list.join("")}</ol>`);
    list = [];
  };
  e.senses.forEach((s, i) => {
    const qs = (e.quotes ?? []).filter((q) => q.sense === i);
    if (s.n !== null) {
      list.push(`<li id="${anchor}-${s.n}" value="${s.n}">${senseInner(s, locate, anchor, unusual, qs)}</li>`);
    } else {
      flush();
      parts.push(`<div class="d">${senseInner(s, locate, anchor, unusual, qs)}</div>`);
    }
  });
  flush();
  if (e.synonyms) parts.push(synonymsHtml(e.synonyms, locate, anchor, slug));
  else if (e.syn) {
    const body = e.syn.replace(/^Syn\.\s*/, "").replace(/^\s*--\s*/, "");
    parts.push(`<p class="syn"><span class="cap">Syn.</span>${prose(body)}</p>`);
  }
  return parts.join("");
}

/** A word that links to its entry when it resolved, plain text otherwise. */
function linkedHtml(w: Linked, locate: Locate): string {
  const where = w.id ? locate(w.id) : null;
  return where ? `<a href="${where.path}#${where.anchor}" class="x">${escapeHtml(w.text)}</a>` : `<span>${escapeHtml(w.text)}</span>`;
}

/** The compare page for an essay's words: those that resolved, at most three. */
export function compareHref(compares: Linked[], locate: Locate): string | null {
  const slugs = [...new Set(compares.map((c) => (c.id ? locate(c.id)?.slug : undefined)).filter((s): s is string => !!s))].slice(0, 3);
  return slugs.length >= 2 ? `/synonyms/compare?w=${slugs.join(",")}` : null;
}

/**
 * One essay: its heading (the words it compares, each linked) and its text,
 * paragraphs as printed. Used on the entry that prints it, on the pages of
 * the words it compares, and on /synonyms.
 */
export function essayHtml(x: Essay, locate: Locate, headingTag = "h4"): string {
  const head = x.compares.length
    ? x.compares.map((c) => linkedHtml(c, locate)).join('<span class="sep" aria-hidden="true"> · </span>')
    : "On these words";
  const cmp = compareHref(x.compares, locate);
  return (
    `<div class="essay"><${headingTag} class="eh">${head}</${headingTag}>` +
    blockHtml({ text: x.text.replace(/\n(?!\n)/g, " "), xrefs: [] }, locate, "p", "et") +
    (cmp ? `<p class="cmp"><a href="${cmp}" class="t">Compare side by side →</a></p>` : "") +
    `</div>`
  );
}

/**
 * The Synonyms block of an entry (DESIGN.md §4, "Is there a better word?"):
 * the list with each word linked, the note with its links, then the essays.
 */
export function synonymsHtml(s: Synonyms, locate: Locate, anchor: string, slug = ""): string {
  let html = `<section class="syns" id="${anchor}-syn" aria-labelledby="${anchor}-syn-h"><h3 id="${anchor}-syn-h" class="cap sh">Synonyms</h3>`;
  if (s.words.length) html += `<ul class="sw">${s.words.map((w) => `<li>${linkedHtml(w, locate)}</li>`).join("")}</ul>`;
  if (s.words.length > 2 && slug) html += `<p class="cmp"><a href="/search?like=${encodeURIComponent(slug)}" class="t">Filter these by rhythm →</a></p>`;
  if (s.note) html += blockHtml(s.note, locate, "p", "snote");
  for (const x of s.essays) html += essayHtml({ ...x, xrefs: [] }, locate);
  return html + "</section>";
}
