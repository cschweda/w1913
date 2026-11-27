// Counts of the structures DESIGN.md §2 lists, for any set of entries.
import type { RawEntry } from "../segment/segment.ts";
import { classifyEcho, type EchoClass } from "./echo.ts";
import { isUmlautTransliteration } from "../segment/header.ts";

export interface StructureCounts {
  entries: number;
  distinctHeadwords: number;
  variantLines: number;
  /** Headword-line variants that only transliterate an umlaut (ZOOECHEMICAL); left out of the edition. */
  umlautVariants: number;
  wrappedHeadwordLines: number;
  withHeaderLine: number;
  headerWithMarks: number;
  posDetected: number;
  echo: Record<EchoClass, number>;
  etym: number;
  defnLines: number;
  defnAfterNumberedLine: number;
  numberedSenseLines: number;
  letteredSubsenseLines: number;
  note: number;
  syn: number;
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

/** Rule: a numbered sense line starts with digits, a full stop, and a space or end of line ("2. (Mus.)"). */
export const isNumberedLine = (l: string) => /^\d+\.(\s|$)/.test(l);
/** Rule: a lettered sub-sense line starts with "(a) ", "(b) "... */
export const isLetteredLine = (l: string) => /^\([a-z]\)\s/.test(l);

export function countStructures(entries: readonly RawEntry[]): StructureCounts {
  const echo: Record<EchoClass, number> = {
    echoes: 0, "letter-entry": 0, "headword-line-lost-letters": 0,
    "header-line-lost-letters": 0, "or-variant-phrase": 0, other: 0,
  };
  const headwords = new Set<string>();
  const c: StructureCounts = {
    entries: entries.length, distinctHeadwords: 0, variantLines: 0, umlautVariants: 0, wrappedHeadwordLines: 0,
    withHeaderLine: 0, headerWithMarks: 0, posDetected: 0, echo,
    etym: 0, defnLines: 0, defnAfterNumberedLine: 0, numberedSenseLines: 0,
    letteredSubsenseLines: 0, note: 0, syn: 0,
  };
  for (const e of entries) {
    for (const v of e.variants) headwords.add(v);
    if (e.variants.length > 1) c.variantLines++;
    for (const v of e.variants) if (isUmlautTransliteration(v, e.header?.forms ?? [])) c.umlautVariants++;
    if (e.wrapped) c.wrappedHeadwordLines++;
    if (e.headerLine !== null) c.withHeaderLine++;
    if (e.header && /[*"`]/.test(e.header.marked)) c.headerWithMarks++;
    if (e.header?.pos) c.posDetected++;
    echo[classifyEcho(e)]++;
    const text = e.lines.join("\n");
    c.etym += count(text, "Etym:");
    c.note += count(text, "Note:");
    c.syn += count(text, "Syn.");
    let prev = "";
    for (const l of e.lines) {
      if (l.startsWith("Defn:")) {
        c.defnLines++;
        if (isNumberedLine(prev)) c.defnAfterNumberedLine++;
      }
      if (isNumberedLine(l)) c.numberedSenseLines++;
      if (isLetteredLine(l)) c.letteredSubsenseLines++;
      if (l !== "") prev = l;
    }
  }
  c.distinctHeadwords = headwords.size;
  return c;
}
