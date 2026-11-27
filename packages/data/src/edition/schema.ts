// The edition's JSON Lines format: one Entry per line. Release 0.0 carries
// the "segment" layer only; later layers add optional fields (DESIGN.md §3a).
import { z } from "zod";

export const LAYERS = ["segment", "senses", "syn", "labels", "prosody", "quotes"] as const;
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

/** Any edition line: the segment layer alone, or with the senses layer. */
export const EditionEntry = z.union([SensesEntry, SegmentEntry]);
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
    licence: z.literal("CC0-1.0"),
    built: z.string(),
  })
  .strict();
export type Manifest = z.infer<typeof Manifest>;
