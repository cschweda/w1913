// Entry rendering: edition entry (senses layer) -> semantic HTML, done once
// at import (DESIGN.md §3). Text is escaped; the only markup is ours.
// Phase 1 shows quotations and labels as printed, inside the sense text;
// known abbreviations are decoded with <abbr> (shared/abbreviations.ts).
import { abbreviate } from "./abbreviations.ts";


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
}

/** Where a linked entry lives: its page path and the anchor of its section. */
export type Locate = (id: string) => { path: string; anchor: string } | null;

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

/** prose() plus decoded abbreviations for the given context. */
export function richProse(s: string, context: Context): string {
  return abbreviate(prose(s), context);
}

/** A block's text as HTML paragraphs, with its cross-references linked and abbreviations decoded. */
export function blockHtml(b: Block, locate: Locate, tag = "p", cls = "", context: Context = "text"): string {
  const paras = b.text.split(/\n\n/);
  let offset = 0;
  const out: string[] = [];
  for (const para of paras) {
    const start = offset;
    const end = start + para.length;
    offset = end + 2;
    const links = b.xrefs.filter((x) => x.id && x.start >= start && x.end <= end).sort((a, c) => a.start - c.start);
    let html = "";
    let at = start;
    for (const x of links) {
      const where = locate(x.id!);
      if (!where) continue;
      html += richProse(b.text.slice(at, x.start), context);
      const hash = x.sense ? `${where.anchor}-${x.sense}` : where.anchor;
      html += `<a href="${where.path}#${hash}" class="x">${escapeHtml(b.text.slice(x.start, x.end))}</a>`;
      at = x.end;
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

function senseInner(s: Sense, locate: Locate, anchor: string): string {
  let html = s.text ? blockHtml(s, locate, "p", "st") : "";
  if (s.sub.length) {
    html += `<ol class="sub" type="a">${s.sub.map((x) => `<li id="${anchor}-${s.n ?? "u"}${x.letter}" value="${x.letter.charCodeAt(0) - 96}">${blockHtml(x, locate, "p", "st")}</li>`).join("")}</ol>`;
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
export function bodyHtml(e: RenderableEntry, locate: Locate, anchor: string): string {
  const parts: string[] = e.notes.map((n) => noteHtml(n, locate));
  let list: string[] = [];
  const flush = () => {
    if (list.length) parts.push(`<ol class="s">${list.join("")}</ol>`);
    list = [];
  };
  for (const s of e.senses) {
    if (s.n !== null) {
      list.push(`<li id="${anchor}-${s.n}" value="${s.n}">${senseInner(s, locate, anchor)}</li>`);
    } else {
      flush();
      parts.push(`<div class="d">${senseInner(s, locate, anchor)}</div>`);
    }
  }
  flush();
  if (e.syn) {
    const body = e.syn.replace(/^Syn\.\s*/, "").replace(/^\s*--\s*/, "");
    parts.push(`<p class="syn"><span class="cap">Syn.</span>${prose(body)}</p>`);
  }
  return parts.join("");
}
