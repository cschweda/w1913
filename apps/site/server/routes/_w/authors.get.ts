// All authors with quotations, for /author: known ones (the normalised table)
// by number of quotations, then the rest.
import config from "../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return useDb().prepare("SELECT key, name, kind, quotes, words, known FROM authors ORDER BY known DESC, quotes DESC, name").all();
});
