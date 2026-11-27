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
