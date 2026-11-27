// Autocomplete over headwords and variants.
import config from "../../../../../w1913.config.ts";
import { suggest } from "../../utils/lookup";

export default defineEventHandler((event) => {
  const q = String(getQuery(event).q ?? "").slice(0, 60);
  setHeader(event, "cache-control", `public, max-age=${config.cache.suggestSeconds}`);
  return suggest(q);
});
