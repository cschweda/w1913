// Phase 7 exit test (DESIGN.md §6): @w1913/lookup agrees with the site on
// 200 fixed words, from the whole lookup build and from static shards. The
// "site" side runs the site's own queries on its database (server/utils/lookup.ts).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import config from "../../../w1913.config.ts";
import { createLookup, createShardedLookup } from "../../../packages/lookup/src/lookup.ts";
import { makeShards } from "../../../packages/lookup/src/shards.ts";
import type { LookupBuild } from "../../../packages/lookup/src/format.ts";
import { foldForCompare, slugify } from "./fold.ts";
import { lookupWith } from "./inflect.ts";

const WORDS = `
sublime saunter amanuensis susurrus gossamer lambent yaffle yockel lofty dismay
Sublime SAUNTER Amanuensis aerial Æsthetic aesthetic naïve naive Œsophagus esophagus
sea-salmon oxen went
gone going goes was been being be better best good
children child mice geese teeth feet men women brethren kine
walked walking walks stopped stopping loved loving hoped hopped running
ran sang sung singing made making berries cities ladies flies
tried cried carried happier happiest happily easier bigger hotter thinner
faster quickly slowly softly boxes foxes churches wishes heroes potatoes
echoes kings king's horses horse's wolves knives leaves sauntered sauntering
dismayed loftier loftiest whispered whispering murmured trembled trembling wandered rambling
strolled forsook forsaken deserted abandoned goeth doeth maketh loveth giveth
taketh cometh seemeth knowest lovest thinkest sayest believest lov'd call'd
fill'd kill'd liv'd mov'd seeketh sleepeth speaketh heareth dwelleth dwelt
spake spoken wrote written took taken gave given saw seen
knew known thought brought bought sought taught caught fought stood
understood held told sold felt kept slept wept crept meant
criteria larvae formulae nebulae radii fungi stimuli termini oases crises
theses axes indices vertices appendices matrices stamina genera phenomena cherubim
search check cards about label author synonyms data saved w
smartphone petrichor radio television qqqzzz blorptastic xenophobia
`.trim().split(/\s+/);

const db = path.join(import.meta.dirname, "../../..", config.paths.devDatabase);
const buildFile = path.join(path.dirname(db), `w1913-lookup-${config.edition.version}.json`);
const ready = existsSync(db) && existsSync(buildFile);

describe.skipIf(!ready)("Phase 7 exit test: lookup() agrees with the site on 200 words", () => {
  const conn = ready ? new Database(db, { readonly: true }) : null;
  const q = conn?.prepare("SELECT slug FROM forms WHERE fold = ? ORDER BY (kind = 'inflection'), ord LIMIT 1");
  const qs = conn?.prepare("SELECT slug FROM forms WHERE fold = ? AND form NOT LIKE '%-' AND form NOT LIKE '-%' ORDER BY (kind = 'inflection'), ord LIMIT 1");
  const one = (st: Database.Statement | undefined) => (w: string) => {
    const f = foldForCompare(w);
    return f ? ((st!.get(f) as { slug: string } | undefined)?.slug ?? null) : null;
  };
  const site = (w: string) => lookupWith(w, one(q), foldForCompare, one(qs));
  const build = ready ? (JSON.parse(readFileSync(buildFile, "utf8")) as LookupBuild) : null;
  const lk = build ? createLookup(build) : null;

  it("uses exactly 200 words", () => expect(WORDS).toHaveLength(200));

  it("gives the same entry, and the same 'form of', for every word from the whole build", () => {
    const differ = WORDS.filter((w) => {
      const a = site(w);
      const b = lk!.lookup(w);
      return (a?.slug ?? null) !== (b?.slug ?? null) || (a?.via ?? null) !== (b?.via ?? null);
    });
    expect(differ).toEqual([]);
  });

  it("gives the same answers from static shards", async () => {
    const shards = makeShards(build!);
    const sl = createShardedLookup(async (p) => shards.get(p) ?? null);
    const differ: string[] = [];
    for (const w of WORDS) if ((await sl.lookup(w))?.slug !== (lk!.lookup(w)?.slug)) differ.push(w);
    expect(differ).toEqual([]);
  });

  it("returns the entry's senses and its address", () => {
    // "walked" is an inflection the dictionary lists, so it matches directly; "goeth" goes through the stripper.
    expect(lk!.lookup("walked")).toMatchObject({ slug: "walk", headword: "Walk", via: null, url: "https://w1913.com/walk" });
    expect(lk!.lookup("walked")!.entries[0]!.senses[0]!.text).toMatch(/^To move along on foot/);
    expect(lk!.lookup("goeth")).toMatchObject({ slug: "go", via: "goeth" });
    expect(lk!.lookup("search")!.url).toBe("https://w1913.com/w/search");
    // Block quotations are left out of sense text; the definition stays.
    expect(lk!.lookup("sublime")!.entries[0]!.senses[0]!.text).toBe("Lifted up; high in place; exalted aloft; uplifted; lofty.");
  });

  // Phrases (edition 0.7): the same page and anchor as the site's /bill-of-fare
  // (server/utils/lookup.ts phraseOf, tried before stems when no page has that slug).
  const PHRASES = ["bill of fare", "Bill of Exchange", "love apple", "apple of discord", "to play possum", "act of God", "base hit",
    "fiat money", "black grouse", "chain shot", "point lace", "spherical excess", "in favor of", "to curry favor", "cast iron",
    "sea-salmon", "walked", "bill of nothing", "apple of my eye", "great bear"];
  const qp = conn?.prepare("SELECT slug, anchor FROM phrases WHERE fold = ? ORDER BY ord, rowid LIMIT 1");
  const qpage = conn?.prepare("SELECT 1 FROM pages WHERE slug = ?");
  const sitePhrase = (w: string) => {
    const slug = slugify(w);
    if (!slug.includes("-") || qpage!.get(slug)) return null;
    return (qp!.get(foldForCompare(w)) as { slug: string; anchor: string } | undefined) ?? null;
  };
  it("finds the same phrases, with the same anchors, from the build and from shards", async () => {
    const shards = makeShards(build!);
    const sl = createShardedLookup(async (p) => shards.get(p) ?? null);
    const found = PHRASES.filter((w) => sitePhrase(w));
    expect(found.length).toBeGreaterThanOrEqual(14);
    const differ: string[] = [];
    for (const w of PHRASES) {
      const a = sitePhrase(w);
      const b = lk!.lookup(w);
      const c = await sl.lookup(w);
      const key = (r: typeof b) => (r?.phrase ? `${r.slug}#${r.phrase.anchor}` : null);
      if ((a ? `${a.slug}#${a.anchor}` : null) !== key(b) || key(b) !== key(c)) differ.push(w);
    }
    expect(differ).toEqual([]);
    expect(lk!.lookup("bill of fare")!.phrase!.definition).toMatch(/^a written or printed enumeration of the dishes/);
    // A sense ends where its phrases begin.
    expect(lk!.lookup("bill")!.entries.at(-1)!.senses.at(-1)!.text).not.toMatch(/Bill of costs/);
  });
});
