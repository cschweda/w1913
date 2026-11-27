// Every path the data package reads or writes. All of cache/ is gitignored.
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const cacheDir = path.join(repoRoot, "cache");
export const sourcesDir = path.join(cacheDir, "sources");
export const canonicalFile = path.join(sourcesDir, "29765.txt");
export const taggedDir = path.join(cacheDir, "tagged");
export const editionsDir = path.join(cacheDir, "editions");
export const phase0Dir = path.join(cacheDir, "phase0");
export const evalDir = path.join(cacheDir, "eval");
export const checksumsFile = path.join(repoRoot, "packages/data/checksums.json");
