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
  if (r.syllables) { conds.push("coalesce(x.syllables, x.rhyme_syl) = ?"); args.push(r.syllables); }
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

export interface QuoteHit { slug: string; headword: string; anchor: string; sense: number | null; author: string; authorKey: string; authorName: string; ref: string | null; snippet: string }

/**
 * Quotation search (DESIGN.md §4, "How did the masters use it?"; data 0.6):
 * the same query rules as definition search, over the quotations' text,
 * optionally from one author. Ranked by bm25; matches as <mark>.
 */
export function searchQuotes(db: Database.Database, q: string, limit = 20, offset = 0, authorKey = ""): { query: string; total: number; hits: QuoteHit[]; broadened: boolean } {
  const by = authorKey ? " AND q.author_key = ?" : "";
  const args = authorKey ? [authorKey] : [];
  const run = (mode: "all" | "any") => {
    const fts = toFtsQuery(q, mode);
    if (!fts) return { total: 0, hits: [] as QuoteHit[] };
    const base = `FROM fts_quotes f JOIN quotes q ON q.id = f.rowid JOIN pages p ON p.slug = q.slug JOIN authors a ON a.key = q.author_key WHERE fts_quotes MATCH ?${by}`;
    const total = (db.prepare(`SELECT count(*) AS n ${base}`).get(fts, ...args) as { n: number }).n;
    const rows = db
      .prepare(`SELECT q.slug, p.headword, q.anchor, q.sense_n, q.author, q.author_key, a.name AS author_name, q.ref, snippet(fts_quotes, 0, '${OPEN}', '${CLOSE}', '…', 40) AS snip ${base} ORDER BY bm25(fts_quotes) LIMIT ? OFFSET ?`)
      .all(fts, ...args, limit, offset) as { slug: string; headword: string; anchor: string; sense_n: number | null; author: string; author_key: string; author_name: string; ref: string | null; snip: string }[];
    return { total, hits: rows.map((r) => ({ slug: r.slug, headword: r.headword, anchor: r.anchor, sense: r.sense_n, author: r.author, authorKey: r.author_key, authorName: r.author_name, ref: r.ref, snippet: snippetHtml(r.snip) })) };
  };
  const all = run("all");
  if (all.total > 0 || !q.trim()) return { query: q, ...all, broadened: false };
  return { query: q, ...run("any"), broadened: true };
}

/** Rhymes (v0.17.0): by sound (CMU) or, for words CMU lacks, by spelling, which may not rhyme. */
export type RhymeKind = "sound" | "spelling";
export interface RhymeResults extends Results { kind: RhymeKind | null; hits: (Hit & { syllables: number | null })[] }

/**
 * Rule (shared/rhymes.ts): a page's rhymes are the other pages with an entry
 * whose sound key equals one of this page's sound keys; when none of its
 * entries has a sound key, those sharing a spelling key instead. Filtered by
 * rhythm; fewer syllables first, then alphabetical.
 */
export function rhymesOf(db: Database.Database, slug: string, r: Rhythm = {}, limit = 30, offset = 0): RhymeResults {
  const keys = (col: "rhyme_key" | "spell_key") =>
    (db.prepare(`SELECT DISTINCT ${col} AS k FROM entries WHERE slug = ? AND ${col} IS NOT NULL`).all(slug) as { k: string }[]).map((x) => x.k);
  let kind: RhymeKind = "sound";
  let ks = keys("rhyme_key");
  if (!ks.length) { kind = "spelling"; ks = keys("spell_key"); }
  if (!ks.length) return { query: slug, total: 0, hits: [], broadened: false, kind: null };
  const col = kind === "sound" ? "rhyme_key" : "spell_key";
  const f = rhythmSql("m.slug", r);
  const base = `FROM (SELECT slug, MIN(rhyme_syl) AS syllables FROM entries WHERE ${col} IN (${ks.map(() => "?").join(",")}) AND slug != ? GROUP BY slug) m JOIN pages p ON p.slug = m.slug WHERE 1${f.sql}`;
  const total = (db.prepare(`SELECT count(*) AS n ${base}`).get(...ks, slug, ...f.args) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT m.slug, p.headword, m.syllables,
              (SELECT pos FROM entries e WHERE e.slug = m.slug ORDER BY ord LIMIT 1) AS pos,
              (SELECT first_sense FROM entries e WHERE e.slug = m.slug ORDER BY ord LIMIT 1) AS first_sense,
              (SELECT headword_marked FROM entries e WHERE e.slug = m.slug ORDER BY ord LIMIT 1) AS marked
       ${base} ORDER BY coalesce(m.syllables, 99), lower(p.headword) LIMIT ? OFFSET ?`,
    )
    .all(...ks, slug, ...f.args, limit, offset) as { slug: string; headword: string; syllables: number | null; pos: string | null; first_sense: string; marked: string | null }[];
  return { query: slug, total, broadened: false, kind, hits: rows.map((x) => ({ slug: x.slug, headword: x.headword, pos: x.pos, marked: x.marked, syllables: x.syllables, snippet: snippetHtml(x.first_sense) })) };
}

/** One group of rhymes on an entry page: the entries sharing a key, how they sound, and the first words. */
/** `labelled`: the page's entries sound more than one way, so a group says which it is for. */
export interface RhymeGroup { kind: RhymeKind; labelled: boolean; anchors: string[]; pos: string[]; sounds: string | null; total: number; words: { slug: string; headword: string; syllables: number | null }[] }

/**
 * The Rhymes section of a page (v0.17.0): one group per distinct sound key
 * among its entries (*minute*, n., and *minute*, a., sound different), or,
 * when none has one, per spelling key. At most `limit` words in each.
 */
export function rhymeGroups(db: Database.Database, slug: string, limit = 48): RhymeGroup[] {
  const es = db.prepare("SELECT anchor, pos, sounds, rhyme_key, spell_key FROM entries WHERE slug = ? ORDER BY ord").all(slug) as { anchor: string; pos: string | null; sounds: string | null; rhyme_key: string | null; spell_key: string | null }[];
  const kind: RhymeKind = es.some((e) => e.rhyme_key) ? "sound" : "spelling";
  const col = kind === "sound" ? "rhyme_key" : "spell_key";
  const groups = new Map<string, { anchors: string[]; pos: string[]; sounds: string | null }>();
  for (const e of es) {
    const k = e[col];
    if (!k) continue;
    const g = groups.get(k) ?? { anchors: [], pos: [], sounds: e.sounds };
    g.anchors.push(e.anchor);
    if (e.pos && !g.pos.includes(e.pos)) g.pos.push(e.pos);
    groups.set(k, g);
  }
  const count = db.prepare(`SELECT count(DISTINCT slug) AS n FROM entries WHERE ${col} = ? AND slug != ?`);
  const list = db.prepare(
    `SELECT m.slug, p.headword, m.syllables FROM (SELECT slug, MIN(rhyme_syl) AS syllables FROM entries WHERE ${col} = ? AND slug != ? GROUP BY slug) m
     JOIN pages p ON p.slug = m.slug ORDER BY coalesce(m.syllables, 99), lower(p.headword) LIMIT ?`,
  );
  const labelled = groups.size > 1;
  return [...groups.entries()].map(([k, g]) => ({
    kind, labelled, ...g,
    total: (count.get(k, slug) as { n: number }).n,
    words: list.all(k, slug, limit) as { slug: string; headword: string; syllables: number | null }[],
  })).filter((g) => g.total > 0);
}
