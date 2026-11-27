// One author's quotations, in dictionary order, paginated: /_w/author/milton?page=N.
import config from "../../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  const key = getRouterParam(event, "key") ?? "";
  const db = useDb();
  const author = db.prepare("SELECT key, name, kind, forms, quotes, words, known FROM authors WHERE key = ?").get(key) as { quotes: number } | undefined;
  if (!author) throw createError({ statusCode: 404, statusMessage: "No such author" });
  const per = config.features.resultsPerPage;
  const page = Math.max(1, Math.min(Math.ceil(author.quotes / per) || 1, Number(getQuery(event).page ?? 1) || 1));
  const quotes = db
    .prepare(
      `SELECT q.slug, q.anchor, q.sense_n, q.text, q.author, q.ref, p.headword FROM quotes q JOIN pages p ON p.slug = q.slug
       WHERE q.author_key = ? ORDER BY q.ord, q.id LIMIT ? OFFSET ?`,
    )
    .all(key, per, (page - 1) * per);
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return { author, quotes, page, per };
});
