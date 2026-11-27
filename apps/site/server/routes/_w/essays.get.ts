// All synonym essays, for /synonyms: title, where each is printed, A to Z.
import config from "../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return useDb()
    .prepare("SELECT id, title, from_slug AS slug, from_headword AS headword, from_anchor AS anchor, sort_key FROM essays ORDER BY sort_key, from_ord")
    .all() as { id: number; title: string; slug: string; headword: string; anchor: string; sort_key: string }[];
});
