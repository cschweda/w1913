// Cards (DESIGN.md §4): a deck of cards. ?deck=random draws `deckSize`
// card_ok entries at random; ?slugs=a,b,c returns the cards for those pages
// (the trail deck, which lives in the browser), in that order.
import config from "../../../../../w1913.config.ts";
import type { Card } from "../../../shared/cards";
import { searchDefinitions } from "../../../shared/search";

interface Row { slug: string; anchor: string; headword: string; headword_marked: string | null; pos: string | null; pos_title: string | null; card_json: string }

const toCard = (r: Row): Card => {
  const c = JSON.parse(r.card_json) as Pick<Card, "senses" | "similar" | "quote">;
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
  const n = config.features.deckSize;
  const deck = String(q.deck ?? "random");
  // By label (data 0.4): random pages carrying the label, their first card-worthy entry.
  if (deck.startsWith("label:")) {
    const code = deck.slice(6);
    const rows = db
      .prepare(
        `SELECT ${COLS} FROM entries e WHERE e.ord IN (
           SELECT (SELECT ord FROM entries x WHERE x.slug = pl.slug ORDER BY x.card_ok DESC, x.ord LIMIT 1)
           FROM page_labels pl WHERE pl.code = ? ORDER BY random() LIMIT ?)`,
      )
      .all(code, n) as Row[];
    return rows.sort(() => Math.random() - 0.5).map(toCard);
  }
  // By author (data 0.6): random entries the author is quoted in, each card showing that author's quotation.
  if (deck.startsWith("author:")) {
    const key = deck.slice(7);
    const rows = db
      .prepare(
        `SELECT ${COLS.split(", ").map((c) => `e.${c}`).join(", ")}, q.text AS qtext, q.author AS qauthor
         FROM (SELECT ord, min(length(text)) AS l, text, author FROM quotes WHERE author_key = ? AND length(text) <= 220 GROUP BY slug ORDER BY random() LIMIT ?) q
         JOIN entries e ON e.ord = q.ord`,
      )
      .all(key, n) as (Row & { qtext: string; qauthor: string })[];
    return rows.map((r) => ({ ...toCard(r), quote: { text: r.qtext, author: r.qauthor, key } }));
  }
  // By search: the top results of a definition search, in rank order.
  if (deck.startsWith("q:")) {
    const hits = searchDefinitions(db, deck.slice(2).slice(0, 120), n, 0).hits;
    const one = db.prepare(`SELECT ${COLS} FROM entries WHERE slug = ? ORDER BY card_ok DESC, ord LIMIT 1`);
    return hits.map((h) => one.get(h.slug) as Row | undefined).filter((r): r is Row => !!r).map(toCard);
  }
  const rows = db
    .prepare(`SELECT ${COLS} FROM entries WHERE rowid IN (SELECT rowid FROM entries WHERE card_ok = 1 ORDER BY random() LIMIT ?)`)
    .all(n) as Row[];
  return rows.sort(() => Math.random() - 0.5).map(toCard);
});
