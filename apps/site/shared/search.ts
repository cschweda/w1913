// Definition search (DESIGN.md §4, "What's the word for…?"): SQLite FTS5 over
// each page's headword and definitions, with Porter stemming. Kept free of
// Nuxt so the exit test can run it against the database directly.
import type Database from "better-sqlite3";

export interface Hit { slug: string; headword: string; pos: string | null; snippet: string; marked: string | null }
export interface Results { query: string; total: number; hits: Hit[]; broadened: boolean }

/**
 * Rhythm (DESIGN.md §4, "I need a word with this rhythm"; data 0.5): a page
 * matches when one of its entries has this many syllables and, if `stress`
 * is set, primary stress on that syllable (1 = first).
 */
export interface Rhythm { syllables?: number | null; stress?: number | null }

/** SQL for the rhythm filter on a page slug column, and its parameters. */
function rhythmSql(col: string, r: Rhythm): { sql: string; args: number[] } {
  if (!r.syllables && !r.stress) return { sql: "", args: [] };
  const conds: string[] = [];
  const args: number[] = [];
  if (r.syllables) { conds.push("x.syllables = ?"); args.push(r.syllables); }
  if (r.stress) { conds.push("substr(x.stress, ?, 1) = '1'"); args.push(r.stress); }
  return { sql: ` AND EXISTS (SELECT 1 FROM entries x WHERE x.slug = ${col} AND ${conds.join(" AND ")})`, args };
}

/**
 * Synonyms of a word (DESIGN.md §4: "synonyms of lofty, two syllables,
 * stress on the first"): the words its entries list as synonyms and the
 * entries that list it, filtered by rhythm, in dictionary order.
 */
export function synonymsOf(db: Database.Database, slug: string, r: Rhythm, limit = 30, offset = 0): Results {
  const f = rhythmSql("s.slug", r);
  const base = `FROM (SELECT slug FROM syn_listed WHERE from_slug = ? UNION SELECT from_slug FROM syn_listed WHERE slug = ?) s JOIN pages p ON p.slug = s.slug WHERE s.slug != ?${f.sql}`;
  const total = (db.prepare(`SELECT count(*) AS n ${base}`).get(slug, slug, slug, ...f.args) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT s.slug, p.headword,
              (SELECT pos FROM entries e WHERE e.slug = s.slug ORDER BY ord LIMIT 1) AS pos,
              (SELECT first_sense FROM entries e WHERE e.slug = s.slug ORDER BY ord LIMIT 1) AS first_sense,
              (SELECT headword_marked FROM entries e WHERE e.slug = s.slug ORDER BY ord LIMIT 1) AS marked
       ${base} ORDER BY p.rank LIMIT ? OFFSET ?`,
    )
    .all(slug, slug, slug, ...f.args, limit, offset) as { slug: string; headword: string; pos: string | null; first_sense: string; marked: string | null }[];
  return { query: slug, total, broadened: false, hits: rows.map((x) => ({ slug: x.slug, headword: x.headword, pos: x.pos, marked: x.marked, snippet: snippetHtml(x.first_sense) })) };
}

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

export function searchDefinitions(db: Database.Database, q: string, limit = 20, offset = 0, rhythm: Rhythm = {}): Results {
  const f = rhythmSql("f.slug", rhythm);
  const run = (mode: "all" | "any") => {
    const fts = toFtsQuery(q, mode);
    if (!fts) return { total: 0, hits: [] as Hit[] };
    const total = (db.prepare(`SELECT count(*) AS n FROM fts_defs f WHERE fts_defs MATCH ?${f.sql}`).get(fts, ...f.args) as { n: number }).n;
    const rows = db
      .prepare(
        `SELECT f.slug, p.headword, (SELECT pos FROM entries e WHERE e.slug = f.slug ORDER BY ord LIMIT 1) AS pos,
                (SELECT headword_marked FROM entries e WHERE e.slug = f.slug ORDER BY ord LIMIT 1) AS marked,
                snippet(fts_defs, 2, '${OPEN}', '${CLOSE}', '…', 18) AS snip
         FROM fts_defs f JOIN pages p ON p.slug = f.slug
         WHERE fts_defs MATCH ?${f.sql} ORDER BY bm25(fts_defs, 0, 8.0, 1.0) LIMIT ? OFFSET ?`,
      )
      .all(fts, ...f.args, limit, offset) as { slug: string; headword: string; pos: string | null; marked: string | null; snip: string }[];
    return { total, hits: rows.map((r) => ({ slug: r.slug, headword: r.headword, pos: r.pos, marked: r.marked, snippet: snippetHtml(r.snip) })) };
  };
  const all = run("all");
  if (all.total > 0 || !q.trim()) return { query: q, ...all, broadened: false };
  return { query: q, ...run("any"), broadened: true };
}
