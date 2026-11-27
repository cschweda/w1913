// Unusual-word previews: a word's headword, part of speech and first sense.
import config from "../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  const slug = String(getQuery(event).w ?? "").slice(0, 80);
  const row = useDb()
    .prepare("SELECT slug, headword, pos, pos_title, first_sense FROM entries WHERE slug = ? ORDER BY ord LIMIT 1")
    .get(slug) as { slug: string; headword: string; pos: string | null; pos_title: string | null; first_sense: string } | undefined;
  if (!row) throw createError({ statusCode: 404, statusMessage: "Not in this dictionary" });
  setHeader(event, "cache-control", `public, max-age=${config.cache.suggestSeconds}`);
  return row;
});
