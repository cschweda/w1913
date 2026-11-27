// Definition search: /_w/search?q=...&page=N (DESIGN.md §4).
import config from "../../../../../w1913.config.ts";
import { searchDefinitions } from "../../../shared/search";

export default defineEventHandler((event) => {
  const q = String(getQuery(event).q ?? "").slice(0, 120);
  const page = Math.max(1, Math.min(50, Number(getQuery(event).page ?? 1) || 1));
  const per = config.features.resultsPerPage;
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return { ...searchDefinitions(useDb(), q, per, (page - 1) * per), page, per };
});
