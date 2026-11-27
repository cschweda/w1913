// Two or three words side by side (DESIGN.md §4, "Compare view"): each
// page's entries with their first senses, and the essays that compare them.
import config from "../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  const slugs = [...new Set(String(getQuery(event).w ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 3);
  if (slugs.length < 2) throw createError({ statusCode: 400, statusMessage: "Compare needs two or three words" });
  const db = useDb();
  const words = slugs.map((slug) => {
    const page = db.prepare("SELECT slug, headword FROM pages WHERE slug = ?").get(slug) as { slug: string; headword: string } | undefined;
    if (!page) return { slug, headword: slug, found: false, entries: [] };
    const entries = db
      .prepare("SELECT anchor, pos, pos_title, summary FROM entries WHERE slug = ? ORDER BY ord")
      .all(slug) as { anchor: string; pos: string | null; pos_title: string | null; summary: string }[];
    return { ...page, found: true, entries };
  });
  // Essays that discuss at least two of the words.
  const essays = db
    .prepare(
      `SELECT e.id, e.from_slug AS slug, e.from_headword AS headword, e.html, COUNT(*) AS hits
       FROM essay_pages p JOIN essays e ON e.id = p.essay_id
       WHERE p.slug IN (${slugs.map(() => "?").join(",")})
       GROUP BY e.id HAVING hits >= 2 ORDER BY hits DESC, e.from_ord`,
    )
    .all(...slugs) as { id: number; slug: string; headword: string; html: string }[];
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return { words, essays };
});
