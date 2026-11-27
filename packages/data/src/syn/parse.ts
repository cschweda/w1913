// The "syn" layer (data 0.3): a Syn. section split into its synonym list,
// a short note, the essays on how near-synonyms differ, and run-in derived
// forms. Text is kept as printed (lines joined with spaces for the list and
// headings; essay text keeps its line breaks).
import { findXrefs, type XrefMatch } from "../senses/xrefs.ts";

export interface SynWord {
  /** As printed: "To give up", "lofty". */
  text: string;
  /** The word to look up: "give up", "lofty" ("To " dropped from verbs). */
  lookup: string;
}
export interface SynEssay {
  /** The words the essay compares, from its heading: ["Abandon", "Desert", "Forsake"]. */
  compares: string[];
  /** The essay as printed, heading removed. */
  text: string;
  xrefs: XrefMatch[];
}
export interface SynSection {
  words: SynWord[];
  /** Text after the list: "See Grand." or a short comment; with its cross-references. */
  note: { text: string; xrefs: XrefMatch[] } | null;
  essays: SynEssay[];
  /** Run-in derived forms that follow the section (`Charm"ing*ly, adv.`), kept for Phase 5. */
  derived: string[];
}

const join = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();

/**
 * Rule: a section starts "Syn." followed by "--", "-" or nothing; segments
 * start at a line that begins with "--", or at " -- " followed by an essay
 * heading.
 */
export function synSegments(raw: string): string[] {
  const body = raw.replace(/^Syn\.\s*-{0,2}\s*/, "");
  // Also split where an essay heading starts mid-line after " -- " or " - "
  // ("... kind, -- Obliging, Kind, Complaisant. ...").
  return body
    .split(/\n\s*--\s*|\s--?\s(?=(?:To\s+)?\p{Lu}[\p{L}'-]*,\s*(?:and\s+)?(?:to\s+)?\p{Lu})/u)
    .map((s) => s.trim().replace(/[,;]\s*$/, ""))
    .filter(Boolean);
}

/**
 * Rule: an essay segment opens with a heading of two or more capitalised
 * words separated by commas (and "and"), optionally after "To", ending in a
 * full stop, and then continues with prose: "To Abandon, Desert, Forsake.
 * These words agree ...".
 */
const ESSAY_HEAD = /^(?:To\s+)?((?:\p{Lu}[\p{L}'-]*(?:\s\p{L}[\p{L}'-]*)?)(?:,\s*(?:and\s+)?(?:to\s+)?\p{L}[\p{L}'-]*(?:\s\p{L}[\p{L}'-]*)?){1,12})\.(?:\s+|$)/u;

/** A heading with nothing after it ("Ancient, Antiquated, Obsolete."): its essay is the next segment. */
export function headingOnly(segment: string): string[] | null {
  const t = join(segment);
  const m = ESSAY_HEAD.exec(t);
  if (!m || m[0].trim().length !== t.length) return null;
  return m[1]!.split(/,\s*(?:and\s+)?(?:to\s+)?/).map((w) => w.trim()).filter(Boolean);
}

export function essayHeading(segment: string): { compares: string[]; rest: string } | null {
  const m = ESSAY_HEAD.exec(join(segment));
  if (!m) return null;
  const following = join(segment).slice(m[0].length);
  // A heading is followed by prose, not by a pointer or nothing.
  if (following.length < 40 || /^(?:See|Cf\.)\s/.test(following)) return null;
  const compares = m[1]!.split(/,\s*(?:and\s+)?(?:to\s+)?/).map((w) => w.trim()).filter(Boolean);
  // Keep the essay's own line breaks: cut the same number of characters
  // from the unjoined text by finding the heading's end in it.
  const lastWord = compares[compares.length - 1]!;
  const at = segment.indexOf(`${lastWord}.`);
  const rest = at >= 0 ? segment.slice(at + lastWord.length + 1).trim() : join(segment).slice(m[0].length);
  return { compares, rest };
}

/** Rule: a derived-form segment carries stress marks and a part of speech: `Charm"ing*ly, adv.` */
export function isDerivedForm(segment: string): boolean {
  return /^\p{Lu}[\p{L}]*(?:[*"`][\p{L}]*)+.*?,\s*(?:adv|n|a|v\. ?[ti]|v)\./u.test(join(segment)) && segment.length < 120;
}

/**
 * Rule: the list is the first segment unless it is an essay. Items are
 * separated by ";" (by "," when there is no ";"), and the list ends at the
 * first full stop that closes an item. What follows it in the segment is the
 * note ("See Grand.", or a short comment). A leading "To " marks a verb and
 * is dropped for lookup.
 */
export function parseList(segment: string): { words: SynWord[]; note: string | null } {
  const text = join(segment);
  // The list ends at the first ". " (or the end) that is not inside an
  // abbreviation like "etc." mid-list; lists rarely contain full stops.
  const end = text.search(/\.(\s|$)/);
  const listPart = end >= 0 ? text.slice(0, end) : text;
  const after = end >= 0 ? text.slice(end + 1).trim() : "";
  const sep = listPart.includes(";") ? ";" : ",";
  const items = listPart.split(sep).map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 60);
  // An item that is a pointer ("See the Note under Clerk") belongs to the note.
  const pointers = items.filter((w) => /^(?:See|Cf\.)\s/.test(w));
  const words = items.filter((w) => !pointers.includes(w)).map((w) => ({ text: w, lookup: w.replace(/^to\s+/i, "") }));
  const note = [...pointers.map((p) => `${p}.`), after].filter(Boolean).join(" ");
  return { words, note: note || null };
}

/**
 * Rules, segment by segment:
 * - a derived form is set aside;
 * - an essay (heading + prose) is an essay; a heading alone heads the next segment's essay;
 * - the first segment otherwise is the list; what follows the list in it is
 *   an essay when it opens with a heading, else the note;
 * - a later segment of 150 characters or more is an essay without a heading
 *   (it discusses the list's words); a shorter one joins the note.
 */
export function parseSyn(raw: string | null): SynSection | null {
  if (!raw) return null;
  const segments = synSegments(raw);
  const out: SynSection = { words: [], note: null, essays: [], derived: [] };
  const addNote = (more: string) => {
    const text = out.note ? `${out.note.text} ${more}` : more;
    out.note = { text, xrefs: findXrefs(text) };
  };
  const addEssay = (compares: string[], text: string) => out.essays.push({ compares, text, xrefs: findXrefs(text) });
  let pendingHeading: string[] | null = null;
  segments.forEach((seg, i) => {
    if (isDerivedForm(seg)) { out.derived.push(join(seg)); return; }
    if (pendingHeading) { addEssay(pendingHeading, seg); pendingHeading = null; return; }
    const alone = headingOnly(seg);
    if (alone && i > 0) { pendingHeading = alone; return; }
    const essay = essayHeading(seg);
    if (essay) { addEssay(essay.compares, essay.rest); return; }
    if (i === 0) {
      const { words, note } = parseList(seg);
      out.words = words;
      if (note) {
        const inNote = essayHeading(note);
        if (inNote) addEssay(inNote.compares, inNote.rest);
        else addNote(note);
      }
      return;
    }
    if (join(seg).length >= 150) addEssay([], seg);
    else addNote(join(seg));
  });
  if (pendingHeading) addNote(`${(pendingHeading as string[]).join(", ")}.`);
  return out.words.length || out.essays.length || out.note ? out : null;
}
