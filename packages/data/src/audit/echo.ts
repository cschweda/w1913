// Why a header line fails to echo its headword. Every failure is put in
// exactly one class, so the report can show the damage by kind.
import type { RawEntry } from "../segment/segment.ts";
import { foldForCompare } from "../segment/fold.ts";
import { isLetterEntryLine } from "../segment/headword-line.ts";

export type EchoClass =
  | "echoes"
  | "letter-entry"
  | "headword-line-lost-letters"
  | "header-line-lost-letters"
  | "or-variant-phrase"
  | "other";

/** True when every character of `short` appears in `long`, in order. */
export function isSubsequence(short: string, long: string): boolean {
  let j = 0;
  for (let i = 0; i < long.length && j < short.length; i++) if (long[i] === short[j]) j++;
  return j === short.length;
}

/**
 * Rules, applied in order:
 * - letter-entry: the headword line is a lone capital (B, C, D...), which has no header line.
 * - or-variant-phrase: the header spells phrase variants as "Fuse, or Fuze, plug".
 * - headword-line-lost-letters: the folded headword is a proper subsequence of the
 *   folded header forms ("CAADA" in "Cañada"): the ASCII headword line dropped letters.
 * - header-line-lost-letters: the folded header forms are a proper subsequence of the
 *   folded headword ("Autocious" in "AUTOECIOUS"): the header dropped letters (often œ).
 * - other: anything else (typos, damaged headers); listed for a human to read.
 */
export function classifyEcho(e: RawEntry): EchoClass {
  if (e.echoes) return "echoes";
  if (isLetterEntryLine(e.headwordLine)) return "letter-entry";
  const header = e.headerLine ?? "";
  if (/,\s+or\s/.test(header)) return "or-variant-phrase";
  const forms = foldForCompare(e.header?.marked ?? header);
  const variants = e.variants.map(foldForCompare);
  if (variants.some((v) => v.length < forms.length && isSubsequence(v, forms))) return "headword-line-lost-letters";
  if (variants.some((v) => forms.length > 0 && forms.length < v.length && isSubsequence(forms, v))) return "header-line-lost-letters";
  return "other";
}
