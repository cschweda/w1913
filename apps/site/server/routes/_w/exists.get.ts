// Look up by selection: is this exact word (or variant) a headword?
import config from "../../../../../w1913.config.ts";
import { lookupWord } from "../../utils/lookup";

export default defineEventHandler((event) => {
  const w = String(getQuery(event).w ?? "").slice(0, 60);
  setHeader(event, "cache-control", `public, max-age=${config.cache.suggestSeconds}`);
  return { slug: lookupWord(w)?.slug ?? null };
});
