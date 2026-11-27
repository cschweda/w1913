// Folding for comparison only. Never used to change stored text.

/**
 * Rule: ligatures æ/œ become ae/oe, diacritics are removed (NFKD, then
 * combining marks dropped), everything is lower-cased, and every character
 * that is not a-z or 0-9 is removed. So the headword line "AEGIS" and the
 * header form `Æ"gis` both fold to "aegis", and `Ac*count"a*ble ness` to
 * "accountableness".
 */
export function foldForCompare(s: string): string {
  return s
    .replace(/Æ/g, "AE").replace(/æ/g, "ae").replace(/Œ/g, "OE").replace(/œ/g, "oe")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * URL slug: like foldForCompare, but runs of other characters become one
 * hyphen, so "A per se" -> "a-per-se" and `Jack"-o'-lan`tern` -> "jack-o-lantern".
 */
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

/** Stress and syllable marks in a header form: `*` between syllables, `"` primary, `` ` `` secondary. */
export function stripMarks(form: string): string {
  return form.replace(/[*"`]/g, "");
}
