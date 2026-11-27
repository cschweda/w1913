// pnpm --filter @w1913/site run db:import
// Deploy contract: read the edition release this site pins (w1913.config.ts,
// edition.version) from cache/editions/, render every entry, and write the read-only SQLite
// database to $W1913_DB_PATH (default cache/db/w1913.sqlite). The file is
// written under a temporary name and renamed, so a failed import never
// leaves a half-built database where the site would open it.
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { BuildEntry, BuildPage, BuildPhrase, BuildSense, LookupBuild } from "../../../packages/lookup/src/format.ts";
import { makeShards } from "../../../packages/lookup/src/shards.ts";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import config from "../../../w1913.config.ts";
import { foldForCompare } from "../shared/fold.ts";
import { posAnchor, posTitle } from "../shared/pos.ts";
import { bodyHtml, essayHtml, metaHtml, phraseAnchor, prose, useLabeler, type CollocMark, type Locate, type QuoteMark, type RenderableEntry } from "../shared/render.ts";
import { makeLabeler, type Label } from "../shared/labels.ts";
import { definitionFrequency, unusualSpans } from "../shared/unusual.ts";
import { cardSenses, isCardOk } from "../shared/cards.ts";
import { entryPath } from "../shared/fold.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const pin = config.edition;
const dir = path.join(repo, config.paths.editions, `w1913-${pin.version}`);
const manifestFile = path.join(dir, "manifest.json");
if (!existsSync(manifestFile)) {
  console.error(`Edition ${pin.version} is not built (${dir}). Run: pnpm --filter @w1913/data run edition`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
if (manifest.version !== pin.version || !["senses", "syn", "labels", "prosody", "forms", "quotes", "collocations"].every((l) => manifest.layers.includes(l)) || !manifest.vocabulary || !manifest.authors) {
  console.error(`Edition ${manifest.version} with layers ${manifest.layers} does not match the pin ${pin.version} (needs senses, syn, labels, prosody, forms, quotes, collocations, a vocabulary and an author table).`);
  process.exit(1);
}
const dbPath = path.resolve(process.env.W1913_DB_PATH ?? path.join(repo, config.paths.devDatabase));
mkdirSync(path.dirname(dbPath), { recursive: true });
const tmp = `${dbPath}.building`;
rmSync(tmp, { force: true });

// The label vocabulary shipped with the edition (data 0.4), and the rule
// that shows label groups as chips while rendering.
const vocabulary = JSON.parse(readFileSync(path.join(dir, manifest.vocabulary.file), "utf8")) as Label[];
useLabeler(makeLabeler(vocabulary));
// Natural-science subjects (data package NATURAL_SCIENCE): an entry whose
// every sense carries one of these is left out of the random deck.
const NATURAL_SCIENCE = new Set(["zoology", "botany", "chemistry", "mineralogy", "anatomy", "physiology", "biology", "geology", "paleontology", "crystallography", "natural-history", "meteorology"]);

const authorTable = JSON.parse(readFileSync(path.join(dir, manifest.authors.file), "utf8")) as { key: string; name: string; kind: string; forms: string[] }[];

type Entry = RenderableEntry & {
  quotes: QuoteMark[];
  collocations: CollocMark[];
  forms: string[]; prosody: { syllables: number; stress: string } | null;
  labels: { entry: string[]; senses: string[][] };
  id: string; ord: number; headword: string; variants: string[]; marked: string | null; pos: string | null; text: string;
};

const t0 = performance.now();
const entries: Entry[] = [];
for await (const line of readline.createInterface({ input: createReadStream(path.join(dir, manifest.jsonl.file)) })) {
  if (line) entries.push(JSON.parse(line));
}

// Pages: one per slug (homographs and case pairs share a page). Anchors are
// the part of speech ("a", "vt"), numbered when a page has two alike.
const slugOf = (e: Entry) => e.id.replace(/-\d+$/, "");
const pages = new Map<string, Entry[]>();
for (const e of entries) {
  const s = slugOf(e);
  const list = pages.get(s);
  if (list) list.push(e); else pages.set(s, [e]);
}
const anchorOf = new Map<string, string>();
for (const list of pages.values()) {
  const seen = new Map<string, number>();
  for (const e of list) {
    const base = posAnchor(e.pos);
    const k = (seen.get(base) ?? 0) + 1;
    seen.set(base, k);
    anchorOf.set(e.id, k === 1 ? base : `${base}${k}`);
  }
}
const byId = new Map(entries.map((e) => [e.id, e]));
const locate: Locate = (id) => {
  const e = byId.get(id);
  return e ? { path: entryPath(slugOf(e)), slug: slugOf(e), anchor: anchorOf.get(id)! } : null;
};

const db = new Database(tmp);
db.pragma("journal_mode = OFF");
db.pragma("synchronous = OFF");
db.exec(`
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE entries (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL, ord INTEGER NOT NULL, homograph_no INTEGER NOT NULL,
    anchor TEXT NOT NULL, headword TEXT NOT NULL, headword_marked TEXT, syllables INTEGER, stress TEXT, pos TEXT, pos_title TEXT,
    letter TEXT NOT NULL, sense_count INTEGER NOT NULL, meta_html TEXT NOT NULL, body_html TEXT NOT NULL,
    text TEXT NOT NULL, summary TEXT NOT NULL, first_sense TEXT NOT NULL,
    card_ok INTEGER NOT NULL, card_json TEXT NOT NULL
  );
  CREATE TABLE syn_listed (slug TEXT NOT NULL, from_slug TEXT NOT NULL, from_headword TEXT NOT NULL, from_ord INTEGER NOT NULL);
  CREATE TABLE essays (id INTEGER PRIMARY KEY, from_slug TEXT NOT NULL, from_headword TEXT NOT NULL, from_anchor TEXT NOT NULL,
    from_ord INTEGER NOT NULL, title TEXT NOT NULL, sort_key TEXT NOT NULL, html TEXT NOT NULL);
  CREATE TABLE essay_pages (essay_id INTEGER NOT NULL, slug TEXT NOT NULL);
  CREATE TABLE authors (key TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, forms TEXT NOT NULL, quotes INTEGER NOT NULL, words INTEGER NOT NULL, known INTEGER NOT NULL);
  CREATE TABLE quotes (id INTEGER PRIMARY KEY, slug TEXT NOT NULL, ord INTEGER NOT NULL, anchor TEXT NOT NULL, sense_n INTEGER, text TEXT NOT NULL, author TEXT NOT NULL, author_key TEXT NOT NULL, ref TEXT, kind TEXT NOT NULL);
  CREATE VIRTUAL TABLE fts_quotes USING fts5(text, author, content = 'quotes', content_rowid = 'id', tokenize = 'porter unicode61 remove_diacritics 2');
  CREATE TABLE labels (code TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, forms TEXT NOT NULL, pages INTEGER NOT NULL, senses INTEGER NOT NULL);
  CREATE TABLE page_labels (code TEXT NOT NULL, slug TEXT NOT NULL, ord INTEGER NOT NULL);
  CREATE VIRTUAL TABLE fts_defs USING fts5(slug UNINDEXED, headword, defs, tokenize = 'porter unicode61 remove_diacritics 2');
  CREATE TABLE pages (slug TEXT PRIMARY KEY, headword TEXT NOT NULL, first_ord INTEGER NOT NULL, rank INTEGER NOT NULL, entries INTEGER NOT NULL);
  CREATE TABLE forms (fold TEXT NOT NULL, form TEXT NOT NULL, slug TEXT NOT NULL, kind TEXT NOT NULL, ord INTEGER NOT NULL);
  CREATE TABLE phrases (fold TEXT NOT NULL, phrase TEXT NOT NULL, slug TEXT NOT NULL, anchor TEXT NOT NULL, ord INTEGER NOT NULL);
  CREATE TABLE backlinks (slug TEXT NOT NULL, from_slug TEXT NOT NULL, from_headword TEXT NOT NULL, from_ord INTEGER NOT NULL);
`);
const insEntry = db.prepare(`INSERT INTO entries VALUES (@id,@slug,@ord,@homograph_no,@anchor,@headword,@headword_marked,@syllables,@stress,@pos,@pos_title,@letter,@sense_count,@meta_html,@body_html,@text,@summary,@first_sense,@card_ok,@card_json)`);
let cardOk = 0;
/** Rule (DESIGN.md §4): every sense carries a natural-science subject label. */
const onlyNaturalScience = (e: Entry) =>
  e.labels.senses.length > 0 && e.labels.senses.every((ls) => ls.some((c) => NATURAL_SCIENCE.has(c)));
/** The card for an entry: its first senses and its synonym words (shared/cards.ts). */
/** A sense's text without its block quotations (data 0.6) or phrases (data 0.7): the definition up to the first of them. */
const defOnly = (e: Entry, i: number, sub: number | null, text: string) => {
  const cut = Math.min(
    text.length,
    ...e.quotes.filter((q) => q.sense === i && q.sub === sub && q.kind === "block").map((q) => q.start),
    ...e.collocations.filter((c) => c.sense === i && c.sub === sub && c.note === null).map((c) => c.at),
  );
  return text.slice(0, cut).trim();
};
/** The card's quotation: the first of at most 220 characters (DESIGN.md §4, quotation on the back). */
const cardQuote = (e: Entry) => {
  for (const q of e.quotes) {
    const s = e.senses[q.sense]!;
    const text = (q.sub === null ? s.text : s.sub[q.sub]!.text).slice(q.start, q.end).replace(/\s+/g, " ").replace(/^["“]|["”]$/g, "").trim();
    if (text.length <= 220) return { text, author: q.author, key: q.authorKey };
  }
  return null;
};
const cardOf = (e: Entry) => ({
  senses: cardSenses(e.senses.flatMap((s, i) => (s.text.trim() ? [defOnly(e, i, null, s.text)] : s.sub.map((x, j) => defOnly(e, i, j, x.text))))),
  quote: cardQuote(e),
  similar: (e.synonyms?.words ?? []).slice(0, 8).map((w) => ({ text: w.text, slug: w.id && byId.get(w.id) ? slugOf(byId.get(w.id)!) : null })),
});

// Unusual words (shared/unusual.ts): frequency over every entry's sense texts,
// and headword lookup by folded spelling (first page in edition order).
const senseTexts = (e: Entry) => e.senses.flatMap((s) => [s.text, ...s.sub.map((x) => x.text)]);
const df = definitionFrequency(entries.map(senseTexts));
const slugByFold = new Map<string, string>();
for (const e of entries) for (const f of [e.headword, ...e.variants].map(foldForCompare)) if (f && !slugByFold.has(f)) slugByFold.set(f, slugOf(e));
let unusualMarked = 0;
const unusualFor = (e: Entry) => {
  const ownStem = foldForCompare(e.headword).slice(0, 5);
  return (text: string) => {
    const spans = unusualSpans(text, { df, slugOf: (f) => slugByFold.get(f) ?? null, ownStem, maxEntries: config.features.unusualMaxEntries, perSense: config.features.unusualPerSense, shortMaxEntries: config.features.unusualShortMaxEntries });
    unusualMarked += spans.length;
    return spans;
  };
};
const firstSenseOf = (e: Entry) => {
  const s = e.senses.find((x) => x.text.trim() || x.sub.length);
  const t = s ? (s.text.trim() ? s.text : s.sub[0]?.text ?? "") : "";
  return t.replace(/\s+/g, " ").trim().slice(0, 260);
};
const insListed = db.prepare(`INSERT INTO syn_listed VALUES (?,?,?,?)`);
const insEssay = db.prepare(`INSERT INTO essays VALUES (?,?,?,?,?,?,?,?)`);
const insEssayPage = db.prepare(`INSERT INTO essay_pages VALUES (?,?)`);

/** The first two senses as plain text, for the compare page. */
const summaryOf = (e: Entry) =>
  e.senses.filter((s) => s.text.trim()).slice(0, 2).map((s, i) => `${s.n ?? i + 1}. ${prose(s.text).replace(/&[a-z#0-9]+;/g, (m) => ({ "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" })[m] ?? m)}`).join("  ").slice(0, 420);
const insPage = db.prepare(`INSERT INTO pages VALUES (?,?,?,?,?)`);
const insForm = db.prepare(`INSERT INTO forms VALUES (?,?,?,?,?)`);
const insPhrase = db.prepare(`INSERT INTO phrases VALUES (?,?,?,?,?)`);
let phraseCount = 0;
/** Each entry's phrase anchors, per run and phrase, as phrasesHtml gave them (for the lookup build). */
const phraseAnchors = new Map<string, string[][]>();
/** The form rows as inserted, for the lookup build (same order as the table). */
const formRows: { fold: string; form: string; slug: string; kind: string; ord: number }[] = [];
const insBack = db.prepare(`INSERT INTO backlinks VALUES (?,?,?,?)`);

// Words that point here (reverse cross-references): one row per pair of
// pages, from the page whose entry links to the page it links to.
const backlinks = new Map<string, Map<string, { headword: string; ord: number }>>();
for (const e of entries) {
  const from = slugOf(e);
  const blocks = [e.etymology, ...e.notes, ...e.senses.flatMap((s) => [s, ...s.sub, ...s.notes])].filter((b) => b !== null);
  for (const b of blocks) {
    for (const x of b.xrefs) {
      const target = x.id ? byId.get(x.id) : undefined;
      if (!target) continue;
      const to = slugOf(target);
      if (to === from) continue;
      let m = backlinks.get(to);
      if (!m) backlinks.set(to, (m = new Map()));
      if (!m.has(from)) m.set(from, { headword: pages.get(from)![0]!.headword, ord: pages.get(from)![0]!.ord });
    }
  }
}

db.transaction(() => {
  for (const e of entries) {
    const slug = slugOf(e);
    const anchor = anchorOf.get(e.id)!;
    insEntry.run({
      id: e.id, slug, ord: e.ord, homograph_no: Number(e.id.match(/-(\d+)$/)![1]), anchor,
      headword: e.headword, headword_marked: e.marked, syllables: e.prosody?.syllables ?? null, stress: e.prosody?.stress ?? null, pos: e.pos, pos_title: e.pos ? posTitle(e.pos) : null,
      letter: (foldForCompare(e.headword)[0] ?? "#").toUpperCase(),
      sense_count: e.senses.filter((s) => s.n !== null).length,
      meta_html: metaHtml(e, locate), body_html: bodyHtml(e, locate, anchor, unusualFor(e), slug), text: e.text, summary: summaryOf(e), first_sense: firstSenseOf(e),
      card_ok: isCardOk(senseTexts(e)) && !onlyNaturalScience(e) ? (cardOk++, 1) : 0, card_json: JSON.stringify(cardOf(e)),
    });
    // Phrases (data 0.7): each with the anchor bodyHtml gave it (phrasesHtml numbers repeats the same way).
    const usedAnchors = new Set<string>();
    const runAnchors: string[][] = [];
    phraseAnchors.set(e.id, runAnchors);
    for (const c of e.collocations) {
      runAnchors.push([]);
      for (const p of c.phrases) {
        let a = phraseAnchor(anchor, p.text);
        for (let k = 2; usedAnchors.has(a); k++) a = `${phraseAnchor(anchor, p.text)}-${k}`;
        usedAnchors.add(a);
        runAnchors.at(-1)!.push(a);
        const text = p.text.replace(/\s+/g, " ");
        insPhrase.run(foldForCompare(text), text, slug, a, e.ord);
        phraseCount++;
      }
    }
    const seen = new Set<string>();
    for (const [form, kind] of [[e.headword, "headword"], ...e.variants.map((v) => [v, "variant"]), ...e.forms.map((v) => [v, "inflection"])] as [string, string][]) {
      const f = foldForCompare(form);
      if (!f || seen.has(f)) continue;
      seen.add(f);
      insForm.run(f, form, slug, kind, e.ord);
      formRows.push({ fold: f, form, slug, kind, ord: e.ord });
    }
  }
  [...pages.entries()]
    .map(([slug, list]) => ({ slug, headword: list[0]!.headword, first: list[0]!.ord, n: list.length }))
    .sort((a, b) => a.first - b.first)
    .forEach((p, rank) => insPage.run(p.slug, p.headword, p.first, rank, p.n));
  for (const [to, froms] of backlinks) for (const [from, v] of froms) insBack.run(to, from, v.headword, v.ord);

  // Labels (data 0.4): per page, the labels on any of its senses; per label,
  // how many pages and senses carry it.
  const insPageLabel = db.prepare("INSERT INTO page_labels VALUES (?,?,?)");
  const labelPages = new Map<string, Set<string>>();
  const labelSenses = new Map<string, number>();
  for (const e of entries) {
    const slug = slugOf(e);
    for (const ls of e.labels.senses) for (const c of ls) labelSenses.set(c, (labelSenses.get(c) ?? 0) + 1);
    for (const c of new Set(e.labels.senses.flat().concat(e.labels.entry))) {
      let set = labelPages.get(c);
      if (!set) labelPages.set(c, (set = new Set()));
      if (!set.has(slug)) { set.add(slug); insPageLabel.run(c, slug, pages.get(slug)![0]!.ord); }
    }
  }
  const insLabel = db.prepare("INSERT INTO labels VALUES (?,?,?,?,?,?)");
  for (const l of vocabulary) insLabel.run(l.code, l.name, l.kind, l.forms.join(" | "), labelPages.get(l.code)?.size ?? 0, labelSenses.get(l.code) ?? 0);

  // Quotations (data 0.6): one row each, with the entry's page and sense
  // anchor; authors with how many quotations and words they have. Authors
  // not in the table keep their printed name (known = 0).
  const insQuote = db.prepare("INSERT INTO quotes (slug, ord, anchor, sense_n, text, author, author_key, ref, kind) VALUES (?,?,?,?,?,?,?,?,?)");
  const authorStats = new Map<string, { name: string; quotes: number; words: Set<string> }>();
  const known = new Map(authorTable.map((a) => [a.key, a]));
  for (const e of entries) {
    const slug = slugOf(e);
    for (const q of e.quotes) {
      const s = e.senses[q.sense]!;
      const text = (q.sub === null ? s.text : s.sub[q.sub]!.text).slice(q.start, q.end).replace(/\s+/g, " ").replace(/^["“]|["”]$/g, "").trim();
      insQuote.run(slug, e.ord, anchorOf.get(e.id)!, s.n, text, q.author, q.authorKey, q.ref, q.kind);
      let st = authorStats.get(q.authorKey);
      if (!st) authorStats.set(q.authorKey, (st = { name: q.authorName, quotes: 0, words: new Set() }));
      st.quotes++;
      st.words.add(slug);
    }
  }
  db.exec("INSERT INTO fts_quotes(fts_quotes) VALUES ('rebuild')");
  const insAuthor = db.prepare("INSERT INTO authors VALUES (?,?,?,?,?,?,?)");
  for (const [key, st] of authorStats) {
    const a = known.get(key);
    insAuthor.run(key, a?.name ?? st.name, a?.kind ?? "person", a?.forms.join(" | ") ?? st.name, st.quotes, st.words.size, a ? 1 : 0);
  }

  // Definition search (FTS5): one row per page, its headword and every sense
  // and sub-sense of its entries, lines joined.
  const insFts = db.prepare("INSERT INTO fts_defs (slug, headword, defs) VALUES (?,?,?)");
  for (const [slug, list] of pages) {
    const defs = list.flatMap((e) => senseTexts(e)).join(" \u2022 ").replace(/\s*\n\s*/g, " ");
    insFts.run(slug, list[0]!.headword, defs);
  }

  // Synonyms (data 0.3). "Listed as a synonym under": for each listed word
  // that resolves to a page, the page whose Syn. list names it. Essays: each
  // stored once, and indexed by the page that prints it and the pages of the
  // words it compares, so it shows on all of them.
  const listed = new Set<string>();
  let essayId = 0;
  for (const e of entries) {
    const s = e.synonyms;
    if (!s) continue;
    const from = slugOf(e);
    const head = pages.get(from)![0]!;
    for (const w of s.words) {
      const target = w.id ? byId.get(w.id) : undefined;
      if (!target) continue;
      const to = slugOf(target);
      const key = `${to}|${from}`;
      if (to === from || listed.has(key)) continue;
      listed.add(key);
      insListed.run(to, from, head.headword, head.ord);
    }
    for (const x of s.essays) {
      essayId++;
      const title = x.compares.length ? x.compares.map((c) => c.text).join(", ") : head.headword;
      insEssay.run(essayId, from, head.headword, anchorOf.get(e.id)!, e.ord, title, (x.compares[0]?.text ?? head.headword).toLowerCase(), essayHtml({ ...x, xrefs: [] }, locate, "h3"));
      const on = new Set([from, ...x.compares.map((c) => (c.id && byId.get(c.id) ? slugOf(byId.get(c.id)!) : null)).filter((v): v is string => !!v)]);
      for (const slug of on) insEssayPage.run(essayId, slug);
    }
  }
  const ins = db.prepare("INSERT INTO meta VALUES (?, ?)");
  ins.run("edition", manifest.version);
  ins.run("layers", manifest.layers.join(","));
  ins.run("source_sha256", manifest.source.sha256);
  ins.run("parser", manifest.parserVersion);
  ins.run("imported", new Date().toISOString());
})();
db.exec(`
  CREATE INDEX entries_slug ON entries (slug, ord);
  CREATE INDEX pages_rank ON pages (rank);
  CREATE INDEX forms_fold ON forms (fold, ord);
  CREATE INDEX phrases_fold ON phrases (fold, ord);
  CREATE INDEX backlinks_slug ON backlinks (slug, from_ord);
  CREATE INDEX syn_listed_slug ON syn_listed (slug, from_ord);
  CREATE INDEX essay_pages_slug ON essay_pages (slug);
  CREATE INDEX essays_sort ON essays (sort_key);
  CREATE INDEX entries_card ON entries (card_ok);
  CREATE INDEX entries_rhythm ON entries (syllables, stress);
  CREATE INDEX page_labels_code ON page_labels (code, ord);
  CREATE INDEX page_labels_slug ON page_labels (slug);
  CREATE INDEX quotes_author ON quotes (author_key, ord);
  CREATE INDEX quotes_slug ON quotes (slug, ord);
  INSERT INTO fts_defs(fts_defs) VALUES ('optimize');
  ANALYZE;
`);
db.close();
renameSync(tmp, dbPath);

// The lookup build (DESIGN.md §4b; packages/lookup): every page with its
// entries' parts of speech and senses (block quotations left out), and the
// form maps that reproduce the site's lookup queries exactly: headwords and
// variants before listed inflections, then dictionary order; for stems,
// prefixes and suffixes ("Com-") never count.
{
  const pageList = [...pages.entries()].sort((a, b) => a[1][0]!.ord - b[1][0]!.ord);
  const pageIndex = new Map(pageList.map(([slug], i) => [slug, i]));
  const clean = (s: string) => s.replace(/\s+/g, " ").replace(/--/g, "\u2014").trim();
  /** Text from `from` to `to` with its block quotations left out. */
  const withoutBlockQuotes = (e: Entry, i: number, sub: number | null, text: string, from = 0, to = text.length) => {
    let out = "";
    let at = from;
    for (const q of e.quotes.filter((x) => x.sense === i && x.sub === sub && x.kind === "block" && x.start >= from && x.authorEnd <= to).sort((a, b) => a.start - b.start)) {
      out += text.slice(at, q.start);
      at = Math.min(to, q.authorEnd + 1);
    }
    return clean(out + text.slice(at, to));
  };
  /** A sense's text up to its phrases (data 0.7), which the entry lists separately. */
  const senseText = (e: Entry, i: number, sub: number | null, text: string) =>
    withoutBlockQuotes(e, i, sub, text, 0, Math.min(text.length, ...e.collocations.filter((c) => c.sense === i && c.sub === sub && c.note === null).map((c) => c.at)));
  const phrasesOf = (e: Entry): BuildPhrase[] =>
    e.collocations.map((c, k) => {
      const src = c.sense === null ? e.notes[c.note!]! : c.note !== null ? e.senses[c.sense]!.notes[c.note]! : c.sub !== null ? e.senses[c.sense]!.sub[c.sub]! : e.senses[c.sense]!;
      const def = c.sense !== null && c.note === null ? withoutBlockQuotes(e, c.sense, c.sub, src.text, c.defStart, c.end) : clean(src.text.slice(c.defStart, c.end));
      return [c.phrases.map((p) => p.text.replace(/\s+/g, " ")), def, phraseAnchors.get(e.id)![k]![0]!];
    });
  const builtPages: BuildPage[] = pageList.map(([slug, list]) => [
    slug,
    list[0]!.headword,
    list.map((e): BuildEntry => {
      const senses = e.senses.map((s, i): BuildSense => {
        const sub = s.sub.map((x, j) => [x.letter, senseText(e, i, j, x.text)] as [string, string]);
        const text = senseText(e, i, null, s.text);
        return sub.length ? [s.n, text, sub] : [s.n, text];
      });
      return e.collocations.length ? [e.pos, senses, phrasesOf(e)] : [e.pos, senses];
    }),
  ]);
  // Phrases (data 0.7): folded phrase → page and anchor; the first in edition order, as the site's phraseOf().
  const phraseMap: Record<string, [number, string]> = {};
  for (const e of entries) {
    e.collocations.forEach((c, k) => c.phrases.forEach((p, j) => {
      const f = foldForCompare(p.text);
      if (f && !(f in phraseMap)) phraseMap[f] = [pageIndex.get(slugOf(e))!, phraseAnchors.get(e.id)![k]![j]!];
    }));
  }
  const order = [...formRows].sort((a, b) => Number(a.kind === "inflection") - Number(b.kind === "inflection") || a.ord - b.ord);
  const forms: Record<string, number> = {};
  const stemFirst: Record<string, number> = {};
  for (const r of order) {
    if (!(r.fold in forms)) forms[r.fold] = pageIndex.get(r.slug)!;
    if (!/^-|-$/.test(r.form) && !(r.fold in stemFirst)) stemFirst[r.fold] = pageIndex.get(r.slug)!;
  }
  const stemForms: Record<string, number> = {};
  for (const [f, i] of Object.entries(forms)) if (stemFirst[f] !== i) stemForms[f] = stemFirst[f] ?? -1;
  const build: LookupBuild = {
    format: "w1913-lookup", formatVersion: 1, edition: manifest.version,
    siteVersion: (JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")) as { version: string }).version,
    built: new Date().toISOString(), licence: "CC0-1.0",
    source: "Webster's Revised Unabridged Dictionary (1913), from Project Gutenberg eBook #29765, via the W1913 edition",
    site: config.site.url, reserved: [...config.reservedWords], pages: builtPages, forms, stemForms, phrases: phraseMap,
  };
  const json = JSON.stringify(build);
  const lookupFile = path.join(path.dirname(dbPath), `w1913-lookup-${manifest.version}.json`);
  writeFileSync(lookupFile, json);
  const gz = gzipSync(json, { level: 9 });
  writeFileSync(`${lookupFile}.gz`, gz);
  // Static shards as files beside it, so the server only ever reads the one a request names.
  const shardDir = path.join(path.dirname(dbPath), `shards-${manifest.version}`);
  rmSync(shardDir, { recursive: true, force: true });
  mkdirSync(shardDir, { recursive: true });
  const shards = makeShards(build);
  for (const [prefix, shard] of shards) writeFileSync(path.join(shardDir, `${prefix}.json`), JSON.stringify(shard));
  writeFileSync(path.join(shardDir, "index.json"), JSON.stringify({ format: "w1913-lookup-shards", formatVersion: 1, edition: manifest.version, site: config.site.url, licence: "CC0-1.0", prefixes: [...shards.keys()].sort(), shard: `${config.site.url}/data/${manifest.version}/<prefix>.json` }));
  console.log(`Lookup build: ${builtPages.length} pages, ${Object.keys(forms).length} forms, ${(json.length / 1e6).toFixed(1)} MB, ${(gz.length / 1e6).toFixed(1)} MB gzipped; ${shards.size} shards`);
}
// A slug that folds two different spellings together would make a page show
// entries that do not match its headword; report it rather than hide it.
console.log(`Imported edition ${manifest.version}: ${entries.length} entries, ${pages.size} pages, ${[...backlinks.values()].reduce((a, m) => a + m.size, 0)} backlinks, ${unusualMarked} unusual words, ${cardOk} card_ok entries, ${phraseCount} phrases, in ${Math.round(performance.now() - t0)} ms`);
console.log(`  ${dbPath}`);
