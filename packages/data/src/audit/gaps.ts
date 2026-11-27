// Traces left where untranscribed text (Greek, Hebrew, symbols) was removed
// upstream. Detection only: nothing is repaired (DESIGN.md §2).

// Language abbreviations whose words were in non-Latin scripts.
const SCRIPT_LANGS = "Gr|Heb|Ar|Skr|Syr|Chald|Copt|Pers?|Russ|Goth|Arm|Turk|Hind|Chin|Jap|Egypt|Assyr|Zend|Pali|Ethiop|Sam";

export interface GapPattern {
  id: string;
  /** What the pattern means, in one line. */
  rule: string;
  regex: RegExp;
}

export const GAP_PATTERNS: readonly GapPattern[] = [
  {
    id: "script-language-then-punctuation",
    rule: `A language that used a non-Latin script (${SCRIPT_LANGS.replace(/\|/g, ", ")}) followed directly by punctuation, a bracket, or the end of its paragraph: its word was removed ("fr. Gr. (Zoöl.)", "[Gr.  house.]")`,
    regex: new RegExp(String.raw`\b(?:${SCRIPT_LANGS})\.(?=\s*(?:[\]\),;:.(]|$))`, "g"),
  },
  {
    id: "script-language-double-space",
    rule: "A non-Latin-script language abbreviation followed by two spaces: the word between them was removed",
    regex: new RegExp(String.raw`\b(?:${SCRIPT_LANGS})\.\s{2,}`, "g"),
  },
  {
    id: "stray-entity",
    rule: 'An SGML-style entity left in the text ("&a;")',
    regex: /&[A-Za-z0-9#]+;/g,
  },
  {
    id: "empty-brackets",
    rule: 'Empty parentheses or brackets ("()", "[ ]"): their content was removed',
    regex: /\(\s*\)|\[\s*\]/g,
  },
  {
    id: "hash-placeholder",
    rule: 'A "(#)" placeholder, used where a pronunciation or symbol could not be transcribed',
    regex: /\(#\)/g,
  },
  {
    id: "tag-remnant",
    rule: 'Leftover markup: "<", ">", or a "-->" comment end',
    regex: /<|>|-->/g,
  },
];

export interface GapCount {
  id: string;
  rule: string;
  count: number;
  /** A few examples, each with the line number in the normalised source where its paragraph starts. */
  examples: { line: number; text: string }[];
}

export interface Paragraph {
  /** 1-based line number of the paragraph's first line. */
  line: number;
  /** The paragraph's lines joined with single spaces (the text is hard-wrapped). */
  text: string;
}

/**
 * Rule: a paragraph is a run of non-blank lines; its lines are joined with a
 * space before matching, because the text is hard-wrapped at about 70
 * characters and "from Gr." at the end of a line may continue on the next.
 */
export function paragraphs(lines: readonly string[], firstLineNumber: number): Paragraph[] {
  const out: Paragraph[] = [];
  let start = -1;
  for (let i = 0; i <= lines.length; i++) {
    const blank = i === lines.length || lines[i] === "";
    if (!blank && start < 0) start = i;
    if (blank && start >= 0) {
      out.push({ line: firstLineNumber + start, text: lines.slice(start, i).join(" ") });
      start = -1;
    }
  }
  return out;
}

export function findGaps(lines: readonly string[], firstLineNumber: number, maxExamples = 5): GapCount[] {
  const paras = paragraphs(lines, firstLineNumber);
  return GAP_PATTERNS.map((p) => {
    let n = 0;
    const examples: { line: number; text: string }[] = [];
    for (const para of paras) {
      const hits = para.text.match(p.regex)?.length ?? 0;
      if (hits === 0) continue;
      n += hits;
      if (examples.length < maxExamples) examples.push({ line: para.line, text: para.text.slice(0, 160) });
    }
    return { id: p.id, rule: p.rule, count: n, examples };
  });
}
