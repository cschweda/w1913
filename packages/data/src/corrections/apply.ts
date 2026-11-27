// Reviewed corrections to the canonical source (DESIGN.md §2, Known
// problems 1; §3 "One home for corrections"). See README.md here.
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const Correction = z
  .object({
    line: z.number().int().positive(),
    find: z.string().min(1),
    replace: z.string(),
    reason: z.string().min(1),
    /** The printed page it was checked against: required (a correction is never made from another edition alone). */
    checkedAgainst: z.string().min(8),
    checkedBy: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
export type Correction = z.infer<typeof Correction>;
export const CorrectionsFile = z.object({ about: z.string(), corrections: z.array(Correction) }).strict();

export const correctionsPath = path.join(import.meta.dirname, "../../corrections.json");

export function loadCorrections(file = correctionsPath): { list: Correction[]; raw: string } {
  const raw = readFileSync(file, "utf8");
  return { list: CorrectionsFile.parse(JSON.parse(raw)).corrections, raw };
}

/**
 * Rule: each correction replaces its `find` text on its line, which must
 * occur there exactly once; otherwise the build stops and names the
 * correction. Two corrections may share a line; they apply in file order.
 * Returns new lines; the input is not changed.
 */
export function applyCorrections(lines: readonly string[], firstLineNumber: number, list: readonly Correction[]): string[] {
  const out = [...lines];
  list.forEach((c, i) => {
    const at = c.line - firstLineNumber;
    const line = out[at];
    const where = `Correction ${i + 1} (line ${c.line}, "${c.find}")`;
    if (line === undefined) throw new Error(`${where}: there is no such line.`);
    const n = line.split(c.find).length - 1;
    if (n !== 1) throw new Error(`${where}: found ${n} times on that line; it must occur exactly once.`);
    out[at] = line.replace(c.find, () => c.replace);
  });
  return out;
}
