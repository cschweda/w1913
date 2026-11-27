// One page's worth of entries (all homographs of a slug) plus its neighbors.
import config from "../../../../../../w1913.config.ts";
import { didYouMean } from "../../../utils/lookup";

interface Row {
  id: string; anchor: string; headword: string; headword_marked: string | null; pos: string | null;
  pos_title: string | null; sense_count: number; meta_html: string; body_html: string;
}

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, "slug") ?? "";
  const db = useDb();
  const page = db.prepare("SELECT slug, headword, rank FROM pages WHERE slug = ?").get(slug) as { slug: string; headword: string; rank: number } | undefined;
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: "Not in this dictionary", data: { word: slug, suggestions: didYouMean(slug.replace(/-/g, " ")) } });
  }
  const entries = db
    .prepare("SELECT id, anchor, headword, headword_marked, pos, pos_title, sense_count, meta_html, body_html FROM entries WHERE slug = ? ORDER BY ord")
    .all(slug) as Row[];
  // Neighbors (DESIGN.md §4): pages before and after in edition order; homographs count once.
  const n = config.features.neighbors;
  const near = db
    .prepare("SELECT slug, headword, rank FROM pages WHERE rank BETWEEN ? AND ? ORDER BY rank")
    .all(page.rank - n, page.rank + n) as { slug: string; headword: string; rank: number }[];
  // Words that point here: pages whose entries cross-refer to this one, in edition order.
  const backlinks = db
    .prepare("SELECT from_slug AS slug, from_headword AS headword FROM backlinks WHERE slug = ? ORDER BY from_ord")
    .all(slug) as { slug: string; headword: string }[];
  setHeader(event, "cache-control", `public, max-age=${config.cache.entrySeconds}`);
  return {
    slug: page.slug,
    headword: page.headword,
    entries,
    neighbors: near.map((n) => ({ slug: n.slug, headword: n.headword, current: n.rank === page.rank })),
    backlinks,
  };
});
