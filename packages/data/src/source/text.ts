// Reading the canonical file. Line-ending normalisation is the one change
// made before parsing (DESIGN.md §2); everything else is kept as found.

export interface NormalisedText {
  text: string;
  /** CRLF pairs converted to LF. */
  crlf: number;
  /** Carriage returns not followed by LF: left in place and reported. */
  loneCr: number;
}

/** Rule: every "\r\n" becomes "\n". A lone "\r" is not touched, only counted. */
export function normaliseLineEndings(raw: string): NormalisedText {
  const crlf = raw.match(/\r\n/g)?.length ?? 0;
  const text = raw.replace(/\r\n/g, "\n");
  const loneCr = text.match(/\r/g)?.length ?? 0;
  return { text, crlf, loneCr };
}

export interface GutenbergBody {
  /** Lines between the START and END markers. */
  lines: string[];
  /** 1-based line number, in the normalised file, of lines[0]. */
  firstLineNumber: number;
}

/**
 * Rule: the body is every line after the "*** START OF THE PROJECT GUTENBERG
 * EBOOK" line and before the "*** END OF THE PROJECT GUTENBERG EBOOK" line.
 * Both markers must be present exactly once.
 */
export function gutenbergBody(allLines: readonly string[]): GutenbergBody {
  const start = allLines.findIndex((l) => l.startsWith("*** START OF THE PROJECT GUTENBERG EBOOK"));
  const end = allLines.findIndex((l) => l.startsWith("*** END OF THE PROJECT GUTENBERG EBOOK"));
  if (start < 0 || end < 0 || end < start) throw new Error("Gutenberg START/END markers not found in order");
  if (allLines.findIndex((l, i) => i > start && l.startsWith("*** START OF THE PROJECT GUTENBERG")) >= 0) {
    throw new Error("More than one Gutenberg START marker");
  }
  return { lines: allLines.slice(start + 1, end), firstLineNumber: start + 2 };
}
