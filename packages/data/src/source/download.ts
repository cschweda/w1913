// Fetching and verifying source files. A file already on disk is verified
// and used as is (gutenberg.org often refuses scripts, so the canonical file
// may be placed by hand). A checksum mismatch is always fatal.
import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { sha256Bytes, sha256File } from "./checksum.ts";
import type { ChecksumEntry } from "./checksums-file.ts";

export class ChecksumMismatch extends Error {
  constructor(file: string, expected: string, actual: string) {
    super(`Checksum mismatch for ${file}\n  expected ${expected}\n  actual   ${actual}`);
  }
}

/** Try each URL in turn; return the bytes of the first that answers 200. */
export async function fetchFirst(urls: readonly string[]): Promise<{ url: string; bytes: Uint8Array }> {
  const failures: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (res.ok) return { url, bytes: new Uint8Array(await res.arrayBuffer()) };
      failures.push(`${url} -> HTTP ${res.status}`);
    } catch (err) {
      failures.push(`${url} -> ${(err as Error).message}`);
    }
  }
  throw new Error(`Could not fetch from any source:\n  ${failures.join("\n  ")}`);
}

/** Pull one named member out of a zip archive. */
export function extractFromZip(zip: Uint8Array, member: string): Uint8Array {
  const files = unzipSync(zip);
  const key = Object.keys(files).find((k) => path.basename(k) === member);
  if (!key) throw new Error(`${member} not found in archive (has: ${Object.keys(files).join(", ")})`);
  return files[key]!;
}

export interface EnsureResult {
  file: string;
  sha256: string;
  action: "verified" | "downloaded" | "recorded";
  url?: string;
}

/**
 * Make sure `file` exists and matches `entry.sha256`. When the entry has no
 * checksum yet (a tagged file on first fetch) the observed checksum is
 * returned with action "recorded" for the caller to save.
 */
export async function ensureFile(file: string, entry: ChecksumEntry): Promise<EnsureResult> {
  if (existsSync(file)) {
    const actual = await sha256File(file);
    if (entry.sha256 === null) return { file, sha256: actual, action: "recorded" };
    if (actual !== entry.sha256) throw new ChecksumMismatch(file, entry.sha256, actual);
    return { file, sha256: actual, action: "verified" };
  }
  const { url, bytes: fetched } = await fetchFirst(entry.urls);
  const bytes = entry.extract ? extractFromZip(fetched, entry.extract) : fetched;
  const actual = sha256Bytes(bytes);
  if (entry.sha256 !== null && actual !== entry.sha256) throw new ChecksumMismatch(file, entry.sha256, actual);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.part`;
  await writeFile(tmp, bytes);
  await rename(tmp, file);
  return { file, sha256: actual, action: entry.sha256 === null ? "recorded" : "downloaded", url };
}
