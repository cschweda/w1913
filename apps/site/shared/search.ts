// Definition search (DESIGN.md §4, "What's the word for…?"): SQLite FTS5 over
// each page's headword and definitions, with Porter stemming. Kept free of
// Nuxt so the exit test can run it against the database directly.
import type Database from "better-sqlite3";

export interface Hit { slug: string; headword: string; pos: string | null; snippet: string }
export interface Results { query: string; total: number; hits: Hit[]; broadened: boolean }

/** Function words left out of unquoted queries (kept inside "quoted phrases"). */
export const STOPWORDS = new Set("a an the of to in on at by for from with and or as is be it its that this which who one one's his her their s".split(" "));

/**
 * Rule: the query's words (letters, digits, apostrophes) are each quoted, so
 * no FTS syntax can be injected, and all must match (AND). A phrase in double
 * quotes stays a phrase. When nothing matches every word, any word may match
 * (OR), and the results say so. Function words (STOPWORDS) outside quotes
 * are dropped, unless the query is nothing but function words. Ranked by bm25 with the headword weighted 8
 * to 1 against the definitions.
 */
export function toFtsQuery(q: string, mode: "all" | "any"): string | null {
  const phrases = [...q.matchAll(/"([^"]+)"/g)].map((m) => m[1]!.match(/[\p{L}\p{N}']+/gu)?.join(" ")).filter(Boolean) as string[];
  const words = q.replace(/"[^"]*"/g, " ").match(/[\p{L}\p{N}']+/gu) ?? [];
  const content = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const rest = content.length || phrases.length ? content : words;
  const parts = [...phrases.map((p) => `"${p}"`), ...rest.map((w) => `"${w.replace(/'/g, "")}"`)].filter((p) => p !== '""');
  if (!parts.length) return null;
  return parts.join(mode === "all" ? " AND " : " OR ");
}

const OPEN = "\u0001";
const CLOSE = "\u0002";
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** A snippet with its matches as <mark>, everything else escaped. */
export function snippetHtml(raw: string): string {
  return raw
    .replace(/[&<>"']/g, (c) => ESC[c]!)
    .replace(/--/g, "—")
    .replaceAll(OPEN, "<mark>")
    .replaceAll(CLOSE, "</mark>");
}

export function searchDefinitions(db: Database.Database, q: string, limit = 20, offset = 0): Results {
  const run = (mode: "all" | "any") => {
    const fts = toFtsQuery(q, mode);
    if (!fts) return { total: 0, hits: [] as Hit[] };
    const total = (db.prepare("SELECT count(*) AS n FROM fts_defs WHERE fts_defs MATCH ?").get(fts) as { n: number }).n;
    const rows = db
      .prepare(
        `SELECT f.slug, p.headword, (SELECT pos FROM entries e WHERE e.slug = f.slug ORDER BY ord LIMIT 1) AS pos,
                snippet(fts_defs, 2, '${OPEN}', '${CLOSE}', '…', 18) AS snip
         FROM fts_defs f JOIN pages p ON p.slug = f.slug
         WHERE fts_defs MATCH ? ORDER BY bm25(fts_defs, 0, 8.0, 1.0) LIMIT ? OFFSET ?`,
      )
      .all(fts, limit, offset) as { slug: string; headword: string; pos: string | null; snip: string }[];
    return { total, hits: rows.map((r) => ({ slug: r.slug, headword: r.headword, pos: r.pos, snippet: snippetHtml(r.snip) })) };
  };
  const all = run("all");
  if (all.total > 0 || !q.trim()) return { query: q, ...all, broadened: false };
  return { query: q, ...run("any"), broadened: true };
}
