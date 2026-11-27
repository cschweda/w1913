// The lookup build (DESIGN.md §4b): one JSON file a program can carry to look
// words up offline. Compact arrays rather than objects, to keep it small.

/** A sense: its printed number (or null), its text without block quotations or phrases, and its lettered sub-senses. */
export type BuildSense = [n: number | null, text: string, sub?: [letter: string, text: string][]];
/** A phrase defined in an entry (edition 0.7): its phrases as printed (several share one definition), the definition, and its anchor on the page. */
export type BuildPhrase = [phrases: string[], definition: string, anchor: string];
/** An entry on a page: its part of speech (or null), senses, and phrases (from edition 0.7; absent when none). */
export type BuildEntry = [pos: string | null, senses: BuildSense[], phrases?: BuildPhrase[]];
/** A page: every homograph of one headword, as on w1913.com/<slug>. */
export type BuildPage = [slug: string, headword: string, entries: BuildEntry[]];

export interface LookupBuild {
  format: "w1913-lookup";
  /** Version of this file format. */
  formatVersion: 1;
  /** The W1913 edition it was made from, and the site version that made it. */
  edition: string;
  siteVersion: string;
  built: string;
  licence: "CC0-1.0";
  source: string;
  /** Base address of entries; a reserved slug lives under /w/. */
  site: string;
  reserved: string[];
  pages: BuildPage[];
  /** Folded headword, variant or listed inflection → page index. Headwords and variants win over inflections; then dictionary order. */
  forms: Record<string, number>;
  /** Where the answer for a stem differs (prefixes and suffixes are never stems): folded form → page index, or -1 for none. */
  stemForms: Record<string, number>;
  /** From edition 0.7: folded phrase ("billoffare") → [page index, anchor]. Absent in older builds. */
  phrases?: Record<string, [page: number, anchor: string]>;
}

/** A shard (DESIGN.md §4b static shards): the forms starting with two letters, and the pages they reach. */
export interface LookupShard {
  format: "w1913-lookup-shard";
  formatVersion: 1;
  edition: string;
  prefix: string;
  site: string;
  reserved: string[];
  pages: Record<string, BuildPage>;
  forms: Record<string, string>;
  stemForms: Record<string, string | null>;
  /** From edition 0.7: folded phrases starting with the prefix → [slug, anchor]. */
  phrases?: Record<string, [slug: string, anchor: string]>;
}
