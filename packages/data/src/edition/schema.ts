// The edition's JSON Lines format: one Entry per line. Release 0.0 carries
// the "segment" layer only; later layers add optional fields (DESIGN.md §3a).
import { z } from "zod";

export const LAYERS = ["segment", "senses", "syn", "labels", "prosody", "forms", "quotes"] as const;
export const Layer = z.enum(LAYERS);
export type Layer = z.infer<typeof Layer>;

export const SegmentEntry = z
  .object({
    /** Slug plus homograph number in edition order: "sublime-1". Stable across releases. */
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/),
    /** Position in the canonical file, from 0. Drives neighbors. */
    ord: z.number().int().nonnegative(),
    /** 1-based line number of the headword line in the line-normalised canonical file. */
    line: z.number().int().positive(),
    /** Display headword: the header form without stress marks, keeping æ, ö, ñ. */
    headword: z.string().min(1),
    /** Further spellings from the headword line, displayed the same way. */
    variants: z.array(z.string().min(1)),
    /** The marked form(s) from the header line as printed (`Sub*lime"`), or null when the entry has no header line. */
    marked: z.string().nullable(),
    /** Part of speech as printed ("a.", "v. t. & i."), or null when none was detected. */
    pos: z.string().nullable(),
    /** The entry's canonical plain text, headword line first, exactly as in the source (LF line endings). */
    text: z.string().min(1),
    layers: z.array(Layer).min(1),
  })
  .strict();
export type SegmentEntry = z.infer<typeof SegmentEntry>;

const Xref = z
  .object({
    /** Offsets of the linked word in the block's text. */
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    to: z.string(),
    pos: z.string().nullable(),
    sense: z.number().int().positive().nullable(),
    /** The entry id it resolves to, or null when no headword matches. */
    id: z.string().nullable(),
  })
  .strict();
const Block = z.object({ text: z.string(), xrefs: z.array(Xref) }).strict();
const Sense = z
  .object({
    n: z.number().int().positive().nullable(),
    text: z.string(),
    xrefs: z.array(Xref),
    sub: z.array(z.object({ letter: z.string().regex(/^[a-z]$/), text: z.string(), xrefs: z.array(Xref) }).strict()),
    notes: z.array(Block),
  })
  .strict();

/** Fields the "senses" layer (data 0.2) adds. All text is as printed, lines joined with "\n". */
export const SensesFields = z.object({
  inflections: z.string().nullable(),
  etymology: Block.nullable(),
  headerLabels: z.array(z.string()),
  headerMarks: z.array(z.string()),
  spellings: z.array(z.string()),
  headerRest: z.string().nullable(),
  senses: z.array(Sense),
  notes: z.array(Block),
  syn: z.string().nullable(),
});

export const SensesEntry = SegmentEntry.extend(SensesFields.shape).strict();
export type SensesEntry = z.infer<typeof SensesEntry>;

const Linked = z.object({ text: z.string(), id: z.string().nullable() }).strict();

/** Fields the "syn" layer (data 0.3) adds: the Syn. section, parsed. */
export const SynFields = z.object({
  synonyms: z
    .object({
      /** The synonym list, each word resolved to an entry when one matches ("To give up" looks up "give up"). */
      words: z.array(Linked.extend({ lookup: z.string() }).strict()),
      /** Text after the list: "See Grand." or a short comment. */
      note: Block.nullable(),
      /** Essays on how near-synonyms differ; `compares` is empty for an essay printed without a heading. */
      essays: z.array(z.object({ compares: z.array(Linked), text: z.string(), xrefs: z.array(Xref) }).strict()),
      /** Run-in derived forms that followed the section, as printed (for the quotes layer). */
      derived: z.array(z.string()),
    })
    .strict()
    .nullable(),
});

export const SynEntry = SensesEntry.extend(SynFields.shape).strict();
export type SynEntry = z.infer<typeof SynEntry>;

/** Fields the "labels" layer (data 0.4) adds: label codes from the vocabulary in labels.json. */
export const LabelsFields = z.object({
  labels: z
    .object({
      /** Labels in the header line, which apply to every sense. */
      entry: z.array(z.string()),
      /** For each sense (parallel to `senses`), its labels: the header's plus those in its own text and sub-senses. */
      senses: z.array(z.array(z.string())),
    })
    .strict(),
});
export const LabelsEntry = SynEntry.extend(LabelsFields.shape).strict();
export type LabelsEntry = z.infer<typeof LabelsEntry>;

/** Fields the "prosody" and "forms" layers (data 0.5) add. */
export const ProsodyFields = z.object({
  /** Syllable count and stress pattern (one digit per syllable: 1 primary, 2 secondary, 0 none), or null when the header's marks do not say. */
  prosody: z.object({ syllables: z.number().int().min(1).max(12), stress: z.string().regex(/^[012]{1,12}$/) }).strict().nullable(),
  /** Inflected forms the header line lists ("Went", "Gone", "Going"), as printed. */
  forms: z.array(z.string()),
});
export const ProsodyEntry = LabelsEntry.extend(ProsodyFields.shape).strict();
export type ProsodyEntry = z.infer<typeof ProsodyEntry>;

/** The "quotes" layer (data 0.6): quotations found in senses and sub-senses, with their normalised authors. */
export const QuoteFields = z.object({
  quotes: z.array(
    z
      .object({
        /** Index in `senses`, and of the sub-sense within it (null: the sense's own text). */
        sense: z.number().int(),
        sub: z.number().int().nullable(),
        /** Offsets in that text: the quotation, and its author as printed. */
        start: z.number().int(),
        end: z.number().int(),
        authorStart: z.number().int(),
        authorEnd: z.number().int(),
        kind: z.enum(["block", "inline"]),
        author: z.string(),
        /** The author's key and display name (authors.json), and a Scripture reference when it is one. */
        authorKey: z.string(),
        authorName: z.string(),
        ref: z.string().nullable(),
      })
      .strict(),
  ),
});
export const QuotesEntry = ProsodyEntry.extend(QuoteFields.shape).strict();
export type QuotesEntry = z.infer<typeof QuotesEntry>;

/** Any edition line: the segment layer alone, or with the senses, syn, labels, prosody, forms and quotes layers. */
export const EditionEntry = z.union([QuotesEntry, ProsodyEntry, LabelsEntry, SynEntry, SensesEntry, SegmentEntry]);
export type EditionEntry = z.infer<typeof EditionEntry>;

export const Manifest = z
  .object({
    edition: z.literal("w1913"),
    version: z.string(),
    layers: z.array(Layer),
    /** Which entries the release holds: "all", or the slice names for a spike release. */
    scope: z.union([z.literal("all"), z.array(z.string())]),
    entries: z.number().int().nonnegative(),
    source: z.object({ file: z.literal("29765.txt"), sha256: z.string().regex(/^[0-9a-f]{64}$/) }),
    parserVersion: z.string(),
    jsonl: z.object({ file: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/), bytes: z.number().int() }),
    /** The label vocabulary, from data 0.4: code, name, kind, printed forms. */
    vocabulary: z.object({ file: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).optional(),
    /** Reviewed corrections applied to the source before parsing (packages/data/corrections.json). */
    corrections: z.object({ file: z.string(), count: z.number().int(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).optional(),
    /** The author table, from data 0.6: key, name, kind, printed forms. */
    authors: z.object({ file: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).optional(),
    licence: z.literal("CC0-1.0"),
    built: z.string(),
  })
  .strict();
export type Manifest = z.infer<typeof Manifest>;
