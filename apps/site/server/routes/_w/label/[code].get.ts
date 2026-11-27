// One label's pages, in edition order, paginated: /_w/label/naut?page=N.
import config from "../../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  const code = getRouterParam(event, "code") ?? "";
  const db = useDb();
  const label = db.prepare("SELECT code, name, kind, forms, pages, senses FROM labels WHERE code = ?").get(code) as { pages: number } | undefined;
  if (!label) throw createError({ statusCode: 404, statusMessage: "No such label" });
  const per = config.features.resultsPerPage * 2;
  const page = Math.max(1, Math.min(Math.ceil(label.pages / per) || 1, Number(getQuery(event).page ?? 1) || 1));
  const words = db
    .prepare(
      `SELECT pl.slug, p.headword, (SELECT pos FROM entries e WHERE e.slug = pl.slug ORDER BY ord LIMIT 1) AS pos,
              (SELECT first_sense FROM entries e WHERE e.slug = pl.slug ORDER BY ord LIMIT 1) AS first_sense
       FROM page_labels pl JOIN pages p ON p.slug = pl.slug WHERE pl.code = ? ORDER BY pl.ord LIMIT ? OFFSET ?`,
    )
    .all(code, per, (page - 1) * per);
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return { label, words, page, per };
});
