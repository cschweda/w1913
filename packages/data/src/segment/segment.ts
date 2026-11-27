// Splitting the body of #29765 into entries. Lossless: every line of the
// body belongs to the prelude or to exactly one entry.
import { headerEchoes, parseHeader, type Header } from "./header.ts";
import { isLetterEntryLine, looksLikeHeadwordLine, splitVariants } from "./headword-line.ts";

export interface RawEntry {
  /** Position in edition order, from 0. */
  ord: number;
  /** 1-based line number of the headword line in the normalised source file. */
  line: number;
  /** The headword line as printed (joined with a space if it wrapped). */
  headwordLine: string;
  variants: string[];
  /** The line after the headword line, or null (alphabet-letter entries have none). */
  headerLine: string | null;
  header: Header | null;
  /** Whether the header line echoes a variant after folding. */
  echoes: boolean;
  /** Whether the headword line wrapped onto a second line. */
  wrapped: boolean;
  /** Every line of the entry, headword line first, trailing blank lines removed. */
  lines: string[];
  /** Blank lines removed from the end of `lines` (kept for the lossless check). */
  trailingBlank: number;
}

export interface Segmentation {
  prelude: string[];
  entries: RawEntry[];
}

/**
 * Rule: an entry starts at a line that follows a blank line (or opens the
 * body) and looks like a headword line, provided the next line is not blank;
 * a lone capital letter (an alphabet-letter entry) may be followed by a blank
 * line. Everything up to the next entry start belongs to the entry, including
 * stray lines between entries ("M.", "P.", "X."), which are reported by the
 * audit rather than dropped.
 */
export function isEntryStart(lines: readonly string[], i: number): boolean {
  const line = lines[i]!;
  if (i > 0 && lines[i - 1] !== "") return false;
  if (!looksLikeHeadwordLine(line)) return false;
  const next = lines[i + 1];
  if (next === undefined) return false;
  return next !== "" || isLetterEntryLine(line);
}

/**
 * Rule: a headword line wraps when the line after it also looks like a
 * headword line and the line after that is not blank ("CONSOLATION GAME; ...;
 * CONSOLATION" / "RACE"). The two are joined with a space.
 */
export function wrapsOntoNext(lines: readonly string[], i: number): boolean {
  const next = lines[i + 1];
  const after = lines[i + 2];
  return next !== undefined && next !== "" && looksLikeHeadwordLine(next) && after !== undefined && after !== "";
}

export function segment(body: readonly string[], firstLineNumber = 1): Segmentation {
  const starts: number[] = [];
  for (let i = 0; i < body.length; i++) if (isEntryStart(body, i)) starts.push(i);

  const prelude = body.slice(0, starts[0] ?? body.length);
  const entries: RawEntry[] = starts.map((start, ord) => {
    const end = starts[ord + 1] ?? body.length;
    let lines = body.slice(start, end);
    let trailingBlank = 0;
    while (lines.length > 1 && lines[lines.length - 1] === "") {
      lines = lines.slice(0, -1);
      trailingBlank++;
    }
    const wrapped = wrapsOntoNext(body, start) && start + 1 < end;
    const headwordLine = wrapped ? `${body[start]} ${body[start + 1]}` : body[start]!;
    const headerIndex = wrapped ? 2 : 1;
    const candidate = lines[headerIndex];
    const headerLine = candidate !== undefined && candidate !== "" ? candidate : null;
    const variants = splitVariants(headwordLine);
    return {
      ord,
      line: firstLineNumber + start,
      headwordLine,
      variants,
      headerLine,
      header: headerLine === null ? null : parseHeader(headerLine),
      echoes: headerLine !== null && headerEchoes(headerLine, variants),
      wrapped,
      lines,
      trailingBlank,
    };
  });
  return { prelude, entries };
}

/** Rebuild the body from a segmentation. Used to prove the split is lossless. */
export function reassemble(seg: Segmentation): string[] {
  const out = [...seg.prelude];
  for (const e of seg.entries) {
    out.push(...e.lines);
    for (let k = 0; k < e.trailingBlank; k++) out.push("");
  }
  return out;
}
