// Folding and slugs: the same rules as the edition (packages/data) and the
// site (apps/site imports these), so a word finds the same entry everywhere.

/** Rule: Æ/Œ spelled out, diacritics removed, lower case, letters and digits only. */
export function foldForCompare(s: string): string {
  return s
    .replace(/Æ/g, "AE").replace(/æ/g, "ae").replace(/Œ/g, "OE").replace(/œ/g, "oe")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Rule: like folding, but runs of other characters become one hyphen ("Sea salmon" → sea-salmon). */
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
