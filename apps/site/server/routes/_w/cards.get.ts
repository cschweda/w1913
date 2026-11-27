// Cards (DESIGN.md §4): a deck of cards. ?deck=random draws `deckSize`
// card_ok entries at random; ?slugs=a,b,c returns the cards for those pages
// (the trail deck, which lives in the browser), in that order.
import config from "../../../../../w1913.config.ts";
import type { Card } from "../../../shared/cards";

interface Row { slug: string; anchor: string; headword: string; headword_marked: string | null; pos: string | null; pos_title: string | null; card_json: string }

const toCard = (r: Row): Card => {
  const c = JSON.parse(r.card_json) as Pick<Card, "senses" | "similar">;
  return { slug: r.slug, anchor: r.anchor, headword: r.headword, marked: r.headword_marked, pos: r.pos, posTitle: r.pos_title, ...c };
};
const COLS = "slug, anchor, headword, headword_marked, pos, pos_title, card_json";

export default defineEventHandler((event) => {
  const q = getQuery(event);
  const db = useDb();
  setHeader(event, "cache-control", "no-store");
  if (q.slugs) {
    const slugs = String(q.slugs).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, config.features.deckSize);
    const one = db.prepare(`SELECT ${COLS} FROM entries WHERE slug = ? ORDER BY card_ok DESC, ord LIMIT 1`);
    return slugs.map((s) => one.get(s) as Row | undefined).filter((r): r is Row => !!r).map(toCard);
  }
  const rows = db
    .prepare(`SELECT ${COLS} FROM entries WHERE rowid IN (SELECT rowid FROM entries WHERE card_ok = 1 ORDER BY random() LIMIT ?)`)
    .all(config.features.deckSize) as Row[];
  return rows.sort(() => Math.random() - 0.5).map(toCard);
});
