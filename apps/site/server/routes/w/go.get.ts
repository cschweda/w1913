// /w/go?q=word: the browser search-engine entry point (public/opensearch.xml).
// An exact headword goes straight to its page; anything else to the closest page.
import { entryPath, slugify } from "../../../shared/fold.ts";
import { lookupWord, suggest } from "../../utils/lookup";

export default defineEventHandler((event) => {
  const q = String(getQuery(event).q ?? "").trim().slice(0, 60);
  if (!q) return sendRedirect(event, "/", 302);
  const slug = lookupWord(q)?.slug ?? suggest(q, 1)[0]?.slug ?? slugify(q);
  return sendRedirect(event, entryPath(slug || "a"), 302);
});
