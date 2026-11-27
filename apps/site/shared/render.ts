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
export function blockHtml(b: Block, locate: Locate, tag = "p", cls = "", context: Context = "text", unusual: UnusualSpan[] = []): string {
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

function senseInner(s: Sense, locate: Locate, anchor: string, unusual: UnusualFinder): string {
  let html = s.text ? blockHtml(s, locate, "p", "st", "text", unusual(s.text)) : "";
  if (s.sub.length) {
    html += `<ol class="sub" type="a">${s.sub.map((x) => `<li id="${anchor}-${s.n ?? "u"}${x.letter}" value="${x.letter.charCodeAt(0) - 96}">${blockHtml(x, locate, "p", "st", "text", unusual(x.text))}</li>`).join("")}</ol>`;
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
  for (const s of e.senses) {
    if (s.n !== null) {
      list.push(`<li id="${anchor}-${s.n}" value="${s.n}">${senseInner(s, locate, anchor, unusual)}</li>`);
    } else {
      flush();
      parts.push(`<div class="d">${senseInner(s, locate, anchor, unusual)}</div>`);
    }
  }
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
