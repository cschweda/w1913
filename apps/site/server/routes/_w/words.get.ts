// The period check's word list (DESIGN.md §4): every headword, variant and
// listed inflection, folded, one per line, without prefixes and suffixes.
// Built once per process, gzipped once, cached long-term by the browser
// (the URL carries the edition version, so a new edition is a new URL).
import { gzipSync } from "node:zlib";
import config from "../../../../../w1913.config.ts";

let cached: { text: string; gz: Buffer } | null = null;

export default defineEventHandler((event) => {
  if (!cached) {
    const rows = useDb().prepare("SELECT DISTINCT fold FROM forms WHERE form NOT LIKE '%-' AND form NOT LIKE '-%' ORDER BY fold").all() as { fold: string }[];
    const text = rows.map((r) => r.fold).join("\n");
    cached = { text, gz: gzipSync(text, { level: 9 }) };
  }
  setHeader(event, "content-type", "text/plain; charset=utf-8");
  setHeader(event, "cache-control", getQuery(event).v === config.edition.version ? "public, max-age=31536000, immutable" : "no-cache");
  setHeader(event, "vary", "accept-encoding");
  if (/\bgzip\b/.test(getHeader(event, "accept-encoding") ?? "")) {
    setHeader(event, "content-encoding", "gzip");
    return cached.gz;
  }
  return cached.text;
});
