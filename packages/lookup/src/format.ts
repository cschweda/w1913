// The lookup build (DESIGN.md §4b): one JSON file a program can carry to look
// words up offline. Compact arrays rather than objects, to keep it small.

/** A sense: its printed number (or null), its text without block quotations, and its lettered sub-senses. */
export type BuildSense = [n: number | null, text: string, sub?: [letter: string, text: string][]];
/** An entry on a page: its part of speech (or null) and senses. */
export type BuildEntry = [pos: string | null, senses: BuildSense[]];
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
}
