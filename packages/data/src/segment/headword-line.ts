// Recognising the line in capitals that opens an entry.

const HEADWORD_CHARS = /^[A-Z0-9][A-Z0-9 ;'\-.,&()]*$/;

/**
 * Rule: a headword line consists only of capitals A-Z, digits, spaces, and
 * ; ' - . , & ( ), contains at least one letter, contains no run of two or
 * more spaces (that excludes the Morse code table in the entry for "Morse"),
 * and does not start with a sense number such as "5. (C" or "1. T".
 * The caller also requires the previous line to be blank.
 */
export function looksLikeHeadwordLine(line: string): boolean {
  if (!HEADWORD_CHARS.test(line)) return false;
  if (!/[A-Z]/.test(line)) return false;
  if (line.includes("  ")) return false;
  if (/^\d+\.\s/.test(line)) return false;
  return true;
}

/** Rule: a lone capital letter is the headword of an alphabet-letter entry ("B", "C"), whose body follows a blank line. */
export function isLetterEntryLine(line: string): boolean {
  return /^[A-Z]$/.test(line);
}

/** Rule: variants on a headword line are separated by ";" ("ABATIS; ABATTIS"). */
export function splitVariants(headwordLine: string): string[] {
  return headwordLine.split(";").map((v) => v.trim()).filter((v) => v.length > 0);
}
