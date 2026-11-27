import config from "../../../w1913.config.ts";

// Folding and slugs, matching packages/data (the edition's own rules), so
// lookups on the site agree with the edition. Kept here so the site needs
// nothing from the data package at runtime.

export function foldForCompare(s: string): string {
  return s
    .replace(/Æ/g, "AE").replace(/æ/g, "ae").replace(/Œ/g, "OE").replace(/œ/g, "oe")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function slugify(s: string): string {
  return s
    .replace(/Æ/g, "AE").replace(/æ/g, "ae").replace(/Œ/g, "OE").replace(/œ/g, "oe")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[*"`]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Route words served by the site itself; an entry with one of these slugs lives at /w/<slug> (w1913.config.ts, DESIGN.md §3). */
export const RESERVED: ReadonlySet<string> = new Set(config.reservedWords);

export function entryPath(slug: string): string {
  return RESERVED.has(slug) ? `/w/${slug}` : `/${slug}`;
}
