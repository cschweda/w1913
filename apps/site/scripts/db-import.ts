// pnpm --filter @w1913/site run db:import
// Deploy contract: read the edition release this site pins (w1913.config.ts,
// edition.version) from cache/editions/, render every entry, and write the read-only SQLite
// database to $W1913_DB_PATH (default cache/db/w1913.sqlite). The file is
// written under a temporary name and renamed, so a failed import never
// leaves a half-built database where the site would open it.
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import config from "../../../w1913.config.ts";
import { foldForCompare } from "../shared/fold.ts";
import { posAnchor, posTitle } from "../shared/pos.ts";
import { bodyHtml, metaHtml, type Locate, type RenderableEntry } from "../shared/render.ts";
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
if (manifest.version !== pin.version || !manifest.layers.includes("senses")) {
  console.error(`Edition ${manifest.version} with layers ${manifest.layers} does not match the pin ${pin.version} (needs senses).`);
  process.exit(1);
}
const dbPath = path.resolve(process.env.W1913_DB_PATH ?? path.join(repo, config.paths.devDatabase));
mkdirSync(path.dirname(dbPath), { recursive: true });
const tmp = `${dbPath}.building`;
rmSync(tmp, { force: true });

type Entry = RenderableEntry & {
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
  return e ? { path: entryPath(slugOf(e)), anchor: anchorOf.get(id)! } : null;
};

const db = new Database(tmp);
db.pragma("journal_mode = OFF");
db.pragma("synchronous = OFF");
db.exec(`
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE entries (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL, ord INTEGER NOT NULL, homograph_no INTEGER NOT NULL,
    anchor TEXT NOT NULL, headword TEXT NOT NULL, headword_marked TEXT, pos TEXT, pos_title TEXT,
    letter TEXT NOT NULL, sense_count INTEGER NOT NULL, meta_html TEXT NOT NULL, body_html TEXT NOT NULL,
    text TEXT NOT NULL
  );
  CREATE TABLE pages (slug TEXT PRIMARY KEY, headword TEXT NOT NULL, first_ord INTEGER NOT NULL, rank INTEGER NOT NULL, entries INTEGER NOT NULL);
  CREATE TABLE forms (fold TEXT NOT NULL, form TEXT NOT NULL, slug TEXT NOT NULL, kind TEXT NOT NULL, ord INTEGER NOT NULL);
  CREATE TABLE backlinks (slug TEXT NOT NULL, from_slug TEXT NOT NULL, from_headword TEXT NOT NULL, from_ord INTEGER NOT NULL);
`);
const insEntry = db.prepare(`INSERT INTO entries VALUES (@id,@slug,@ord,@homograph_no,@anchor,@headword,@headword_marked,@pos,@pos_title,@letter,@sense_count,@meta_html,@body_html,@text)`);
const insPage = db.prepare(`INSERT INTO pages VALUES (?,?,?,?,?)`);
const insForm = db.prepare(`INSERT INTO forms VALUES (?,?,?,?,?)`);
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
      headword: e.headword, headword_marked: e.marked, pos: e.pos, pos_title: e.pos ? posTitle(e.pos) : null,
      letter: (foldForCompare(e.headword)[0] ?? "#").toUpperCase(),
      sense_count: e.senses.filter((s) => s.n !== null).length,
      meta_html: metaHtml(e, locate), body_html: bodyHtml(e, locate, anchor), text: e.text,
    });
    const seen = new Set<string>();
    for (const [form, kind] of [[e.headword, "headword"], ...e.variants.map((v) => [v, "variant"])] as [string, string][]) {
      const f = foldForCompare(form);
      if (!f || seen.has(f)) continue;
      seen.add(f);
      insForm.run(f, form, slug, kind, e.ord);
    }
  }
  [...pages.entries()]
    .map(([slug, list]) => ({ slug, headword: list[0]!.headword, first: list[0]!.ord, n: list.length }))
    .sort((a, b) => a.first - b.first)
    .forEach((p, rank) => insPage.run(p.slug, p.headword, p.first, rank, p.n));
  for (const [to, froms] of backlinks) for (const [from, v] of froms) insBack.run(to, from, v.headword, v.ord);
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
  CREATE INDEX backlinks_slug ON backlinks (slug, from_ord);
  ANALYZE;
`);
db.close();
renameSync(tmp, dbPath);
// A slug that folds two different spellings together would make a page show
// entries that do not match its headword; report it rather than hide it.
console.log(`Imported edition ${manifest.version}: ${entries.length} entries, ${pages.size} pages, ${[...backlinks.values()].reduce((a, m) => a + m.size, 0)} backlinks, in ${Math.round(performance.now() - t0)} ms`);
console.log(`  ${dbPath}`);
