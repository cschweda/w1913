// Definition search and the rhythm filter:
// /_w/search?q=...&syl=2&stress=1&page=N, ?like=lofty for synonyms of a word,
// or ?rhyme=time for its rhymes (v0.17.0).
import config from "../../../../../w1913.config.ts";
import { rhymesOf, searchDefinitions, searchQuotes, synonymsOf } from "../../../shared/search";
import { lookupWord } from "../../utils/lookup";

const int = (v: unknown, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max ? n : null; };

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const q = String(query.q ?? "").slice(0, 120);
  const like = String(query.like ?? "").slice(0, 60).trim();
  const rhyme = String(query.rhyme ?? "").slice(0, 60).trim();
  const rhythm = { syllables: int(query.syl, 12), stress: int(query.stress, 12) };
  const page = Math.max(1, Math.min(50, Number(query.page ?? 1) || 1));
  const per = config.features.resultsPerPage;
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  if (query.in === "quotes") {
    const authorKey = String(query.author ?? "").slice(0, 60);
    const author = authorKey ? (useDb().prepare("SELECT key, name FROM authors WHERE key = ?").get(authorKey) as { key: string; name: string } | undefined) ?? null : null;
    return { ...searchQuotes(useDb(), q, per, (page - 1) * per, author?.key ?? ""), page, per, like: null, author };
  }
  if (rhyme) {
    const found = lookupWord(rhyme);
    if (!found) return { query: rhyme, total: 0, hits: [], broadened: false, page, per, like: null, rhyme: null, kind: null };
    const headword = (useDb().prepare("SELECT headword FROM pages WHERE slug = ?").get(found.slug) as { headword: string }).headword;
    return { ...rhymesOf(useDb(), found.slug, rhythm, per, (page - 1) * per), page, per, like: null, rhyme: { slug: found.slug, headword } };
  }
  if (like) {
    const found = lookupWord(like);
    if (!found) return { query: like, total: 0, hits: [], broadened: false, page, per, like: null };
    const headword = (useDb().prepare("SELECT headword FROM pages WHERE slug = ?").get(found.slug) as { headword: string }).headword;
    return { ...synonymsOf(useDb(), found.slug, rhythm, per, (page - 1) * per), page, per, like: { slug: found.slug, headword } };
  }
  return { ...searchDefinitions(useDb(), q, per, (page - 1) * per, rhythm), page, per, like: null };
});
