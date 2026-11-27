import { readFile } from "node:fs/promises";
import { canonicalFile } from "../paths.ts";
import { gutenbergBody, normaliseLineEndings, type GutenbergBody, type NormalisedText } from "./text.ts";

export interface Canonical extends GutenbergBody {
  normalised: Omit<NormalisedText, "text">;
}

/** Read the canonical file (already verified by the caller) and return its body lines. */
export async function loadCanonical(file = canonicalFile): Promise<Canonical> {
  const { text, crlf, loneCr } = normaliseLineEndings(await readFile(file, "utf8"));
  const body = gutenbergBody(text.split("\n"));
  return { ...body, normalised: { crlf, loneCr } };
}
