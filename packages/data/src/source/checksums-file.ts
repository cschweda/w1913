// packages/data/checksums.json: the pinned SHA-256 of every source file.
// The canonical checksum is pinned by hand (DESIGN.md §2). Tagged-file
// checksums are recorded on first fetch; they identify files, they are not
// derived content.
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { checksumsFile } from "../paths.ts";

const Entry = z.object({
  urls: z.array(z.string().url()).min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  extract: z.string().optional(),
});
const Checksums = z.object({
  canonical: z.record(z.string(), Entry),
  tagged: z.record(z.string(), Entry),
});
export type ChecksumEntry = z.infer<typeof Entry>;
export type Checksums = z.infer<typeof Checksums>;

export async function readChecksums(): Promise<Checksums> {
  return Checksums.parse(JSON.parse(await readFile(checksumsFile, "utf8")));
}

export async function writeChecksums(c: Checksums): Promise<void> {
  await writeFile(checksumsFile, JSON.stringify(Checksums.parse(c), null, 2) + "\n");
}
