// lookup(word) over a lookup build or static shards, with the same folding
// and suffix stripping as w1913.com (DESIGN.md §4b).
import { foldForCompare, slugify } from "./fold.ts";
import { lookupWith, stems } from "./inflect.ts";
import type { BuildPage, LookupBuild, LookupShard } from "./format.ts";

export interface Sense { n: number | null; text: string; sub: { letter: string; text: string }[] }
/** A phrase defined in an entry: its phrases as printed, its definition, and the anchor (of its first phrase, or of the one asked for) on w1913.com. */
export interface Phrase { phrases: string[]; definition: string; anchor: string; url: string }
export interface Entry { pos: string | null; senses: Sense[]; phrases: Phrase[] }
export interface Result {
  slug: string;
  headword: string;
  /** The entry's address on w1913.com. */
  url: string;
  /** The word as given, when it was matched as an inflected form ("walked" for walk); null for a direct match. */
  via: string | null;
  /** The phrase asked for, when the word was one defined inside the entry ("bill of fare" under bill); null otherwise. */
  phrase: Phrase | null;
  entries: Entry[];
}

function toResult(page: BuildPage, via: string | null, site: string, reserved: ReadonlySet<string>, match: { fold: string; anchor: string } | null = null): Result {
  const [slug, headword, entries] = page;
  const url = `${site}/${reserved.has(slug) ? `w/${slug}` : slug}`;
  const out = entries.map(([pos, senses, phrases]) => ({
    pos,
    senses: senses.map(([n, text, sub]) => ({ n, text, sub: (sub ?? []).map(([letter, t]) => ({ letter, text: t })) })),
    phrases: (phrases ?? []).map(([ps, definition, a]) => ({ phrases: ps, definition, anchor: a, url: `${url}#${a}` })),
  }));
  // The run holding the phrase asked for, pointed at that phrase's own anchor ("Love apple" in "Apple of love, or Love apple").
  const run = match ? out.flatMap((e) => e.phrases).find((p) => p.phrases.some((x) => foldForCompare(x) === match.fold)) : undefined;
  const phrase = run && match ? { ...run, anchor: match.anchor, url: `${url}#${match.anchor}` } : null;
  return { slug, headword, url, via, phrase, entries: out };
}

/**
 * Rule (as on w1913.com/bill-of-fare): a word of several parts that is not a
 * page of its own, but is a phrase defined inside an entry, is that phrase;
 * this comes before inflections and stems.
 */
const asPhrase = (word: string, isPage: (slug: string) => boolean) => {
  const slug = slugify(word);
  return slug.includes("-") && !isPage(slug) ? foldForCompare(word) : null;
};

/**
 * Look words up in a whole lookup build (loaded once, then instant and
 * offline). `lookup` returns null for a word the dictionary does not have.
 */
export function createLookup(build: LookupBuild) {
  if (build.format !== "w1913-lookup" || build.formatVersion !== 1) throw new Error("Not a W1913 lookup build (format 1).");
  const reserved = new Set(build.reserved);
  const exact = (w: string) => {
    const i = build.forms[foldForCompare(w)];
    return i === undefined ? null : build.pages[i]![0];
  };
  const stemExact = (w: string) => {
    const f = foldForCompare(w);
    const i = f in build.stemForms ? build.stemForms[f]! : build.forms[f];
    return i === undefined || i < 0 ? null : build.pages[i]![0];
  };
  const bySlug = new Map(build.pages.map((p) => [p[0], p]));
  return {
    edition: build.edition,
    lookup(word: string): Result | null {
      const pf = asPhrase(word, (s) => bySlug.has(s));
      const hit = pf ? build.phrases?.[pf] : undefined;
      if (hit) return toResult(build.pages[hit[0]]!, null, build.site, reserved, { fold: pf!, anchor: hit[1] });
      const r = lookupWith(word, exact, foldForCompare, stemExact);
      return r ? toResult(bySlug.get(r.slug)!, r.via, build.site, reserved) : null;
    },
    /** Headwords starting with a prefix (folded), in dictionary order, at most `limit`. */
    suggest(prefix: string, limit = 8): { headword: string; slug: string }[] {
      const f = foldForCompare(prefix);
      if (!f) return [];
      const out: { headword: string; slug: string }[] = [];
      for (const p of build.pages) {
        if (foldForCompare(p[1]).startsWith(f)) out.push({ headword: p[1], slug: p[0] });
        if (out.length >= limit) break;
      }
      return out;
    },
  };
}

/** The shard a folded word lives in: its first two letters (or one, for a one-letter word). */
export const shardPrefix = (fold: string) => fold.slice(0, 2);

/**
 * Look words up from static shards (w1913.com/data/<edition>/<prefix>.json),
 * fetching only the shards a word needs, through `fetchShard`, which the
 * program supplies (and may cache). A word and its stems share their first
 * two letters, so one shard almost always answers.
 */
export function createShardedLookup(fetchShard: (prefix: string) => Promise<LookupShard | null>) {
  const shards = new Map<string, Promise<LookupShard | null>>();
  const shard = (prefix: string) => {
    let s = shards.get(prefix);
    if (!s) shards.set(prefix, (s = fetchShard(prefix).catch(() => null)));
    return s;
  };
  return {
    async lookup(word: string): Promise<Result | null> {
      const f = foldForCompare(word);
      if (!f) return null;
      const prefixes = [...new Set([f, ...stems(word.toLowerCase()).map(foldForCompare)].filter(Boolean).map(shardPrefix))];
      const loaded = (await Promise.all(prefixes.map(shard))).filter((s): s is LookupShard => !!s);
      if (!loaded.length) return null;
      const pages = new Map<string, BuildPage>();
      for (const s of loaded) for (const [k, p] of Object.entries(s.pages)) pages.set(k, p);
      const own = loaded.find((x) => x.prefix === shardPrefix(f));
      // Every page's slug is a form, so a page "exists" when its folded slug is in the shard's forms as itself.
      const pf = asPhrase(word, (s) => own?.forms[foldForCompare(s)] === s);
      const hit = pf ? own?.phrases?.[pf] : undefined;
      if (hit && pages.has(hit[0])) return toResult(pages.get(hit[0])!, null, loaded[0]!.site, new Set(loaded[0]!.reserved), { fold: pf!, anchor: hit[1] });
      const find = (w: string, stem: boolean) => {
        const g = foldForCompare(w);
        const s = loaded.find((x) => x.prefix === shardPrefix(g));
        if (!s) return null;
        if (stem && g in s.stemForms) return s.stemForms[g] ?? null;
        return s.forms[g] ?? null;
      };
      const r = lookupWith(word, (w) => find(w, false), foldForCompare, (w) => find(w, true));
      const page = r && pages.get(r.slug);
      return page ? toResult(page, r.via, loaded[0]!.site, new Set(loaded[0]!.reserved)) : null;
    },
    /** Headwords starting with a prefix of at least two letters (folded), alphabetically, at most `limit`; one shard. */
    async suggest(prefix: string, limit = 8): Promise<{ headword: string; slug: string }[]> {
      const f = foldForCompare(prefix);
      if (f.length < 2) return [];
      const s = await shard(shardPrefix(f));
      if (!s) return [];
      return Object.values(s.pages)
        .filter((p) => foldForCompare(p[1]).startsWith(f))
        .map((p) => ({ headword: p[1], slug: p[0], k: foldForCompare(p[1]) }))
        .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.slug < b.slug ? -1 : 1))
        .slice(0, limit)
        .map(({ headword, slug }) => ({ headword, slug }));
    },
  };
}
