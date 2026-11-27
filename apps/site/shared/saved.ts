// Saved words (DESIGN.md §4, "Keeping"): kept in the browser only, exported
// and imported as a small JSON file. Pure functions, so the rules are tested.

export interface SavedWord { slug: string; headword: string; saved: string }
export interface SavedFile { format: "w1913-saved"; version: 1; exported: string; words: SavedWord[] }

/** At most this many saved words; the oldest beyond it are dropped. */
export const MAX_SAVED = 5000;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rule: a saved word has a slug in the site's slug form, a headword of at most 80 characters, and a date. */
export function isSavedWord(x: unknown): x is SavedWord {
  const w = x as SavedWord;
  return !!w && typeof w.slug === "string" && SLUG.test(w.slug) && w.slug.length <= 80 && typeof w.headword === "string" && w.headword.length > 0 && w.headword.length <= 80 && typeof w.saved === "string" && !Number.isNaN(Date.parse(w.saved));
}

/** Rule: merging keeps one entry per slug (the earlier save wins), newest first, at most MAX_SAVED. */
export function mergeSaved(a: SavedWord[], b: SavedWord[]): SavedWord[] {
  const by = new Map<string, SavedWord>();
  for (const w of [...a, ...b]) {
    const had = by.get(w.slug);
    if (!had || Date.parse(w.saved) < Date.parse(had.saved)) by.set(w.slug, w);
  }
  return [...by.values()].sort((x, y) => Date.parse(y.saved) - Date.parse(x.saved)).slice(0, MAX_SAVED);
}

export function toSavedFile(words: SavedWord[], now = new Date()): SavedFile {
  return { format: "w1913-saved", version: 1, exported: now.toISOString(), words };
}

/**
 * Rule: an import is a W1913 saved-words file (or a bare array of words);
 * entries that are not valid saved words are skipped and counted.
 */
export function parseSavedFile(text: string): { words: SavedWord[]; skipped: number } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "That file is not JSON." };
  }
  const list = Array.isArray(data) ? data : (data as SavedFile)?.format === "w1913-saved" ? (data as SavedFile).words : null;
  if (!Array.isArray(list)) return { error: "That is not a W1913 saved-words file." };
  const words = list.filter(isSavedWord).map((w) => ({ slug: w.slug, headword: w.headword, saved: new Date(w.saved).toISOString() }));
  return { words, skipped: list.length - words.length };
}
