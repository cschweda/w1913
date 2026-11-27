// All labels with their counts, for /label.
import config from "../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return useDb().prepare("SELECT code, name, kind, forms, pages, senses FROM labels WHERE pages > 0 ORDER BY kind DESC, pages DESC").all();
});
