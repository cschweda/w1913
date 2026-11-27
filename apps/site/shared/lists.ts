// Named lists (DESIGN.md §4, "Keeping"): "chapter 3", "sea words". Like saved
// words, kept in the browser only and moved by export and import. Pure
// functions, so the rules are tested; app/composables/useLists.ts stores them.
import { isSavedWord, type SavedWord } from "./saved.ts";

export interface ListWord { slug: string; headword: string; added: string }
export interface NamedList { id: string; name: string; created: string; words: ListWord[] }

export const MAX_LISTS = 100;
export const MAX_LIST_WORDS = 2000;
export const MAX_NAME = 60;

/** Rule: a name is trimmed, inner spaces collapsed, at most MAX_NAME characters; empty is no name. */
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
const sameName = (a: string, b: string) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();

const asWord = (w: ListWord): SavedWord => ({ slug: w.slug, headword: w.headword, saved: w.added });
export function isListWord(x: unknown): x is ListWord {
  const w = x as ListWord;
  return !!w && isSavedWord({ slug: w.slug, headword: w.headword, saved: w.added });
}
/** Rule: a list has an id of letters, digits and hyphens, a name, a date, and words (bad words are dropped by cleanList). */
export function isNamedList(x: unknown): x is NamedList {
  const l = x as NamedList;
  return !!l && typeof l.id === "string" && /^[a-z0-9-]{1,40}$/.test(l.id) && typeof l.name === "string" && !!cleanName(l.name) && typeof l.created === "string" && !Number.isNaN(Date.parse(l.created)) && Array.isArray(l.words);
}
function cleanList(l: NamedList): NamedList {
  const seen = new Set<string>();
  const words = l.words.filter(isListWord).filter((w) => !seen.has(w.slug) && seen.add(w.slug)).slice(0, MAX_LIST_WORDS);
  return { id: l.id, name: cleanName(l.name), created: new Date(l.created).toISOString(), words: words.map((w) => ({ slug: w.slug, headword: w.headword, added: new Date(w.added).toISOString() })) };
}

/** Rule: ids are "l-" and the creation time in base 36, with a counter when two are made in the same millisecond. */
export function newId(lists: NamedList[], now = new Date()): string {
  const base = `l-${now.getTime().toString(36)}`;
  let id = base;
  for (let k = 2; lists.some((l) => l.id === id); k++) id = `${base}-${k}`;
  return id;
}

/** Creates a list; refuses an empty name, a name already used (any case), or more than MAX_LISTS. */
export function createList(lists: NamedList[], name: string, now = new Date()): { lists: NamedList[]; id: string } | { error: string } {
  const n = cleanName(name);
  if (!n) return { error: "A list needs a name." };
  if (lists.some((l) => sameName(l.name, n))) return { error: `There is already a list called "${n}".` };
  if (lists.length >= MAX_LISTS) return { error: `You can keep at most ${MAX_LISTS} lists.` };
  const id = newId(lists, now);
  return { lists: [...lists, { id, name: n, created: now.toISOString(), words: [] }], id };
}

export function renameList(lists: NamedList[], id: string, name: string): { lists: NamedList[] } | { error: string } {
  const n = cleanName(name);
  if (!n) return { error: "A list needs a name." };
  if (lists.some((l) => l.id !== id && sameName(l.name, n))) return { error: `There is already a list called "${n}".` };
  return { lists: lists.map((l) => (l.id === id ? { ...l, name: n } : l)) };
}

/** Rule: adding a word already in the list changes nothing; a full list refuses it. Newest first. */
export function addToList(lists: NamedList[], id: string, slug: string, headword: string, now = new Date()): { lists: NamedList[]; added: boolean } {
  let added = false;
  const out = lists.map((l) => {
    if (l.id !== id || l.words.some((w) => w.slug === slug) || l.words.length >= MAX_LIST_WORDS) return l;
    added = true;
    return { ...l, words: [{ slug, headword, added: now.toISOString() }, ...l.words] };
  });
  return { lists: out, added };
}

export const removeFromList = (lists: NamedList[], id: string, slug: string): NamedList[] =>
  lists.map((l) => (l.id === id ? { ...l, words: l.words.filter((w) => w.slug !== slug) } : l));

/** Lists sorted by name, for menus. */
export const byName = (lists: NamedList[]) => [...lists].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

/**
 * Rule: importing merges by name (any case): a list with a known name gains
 * the words it lacks; a new name becomes a new list (a fresh id if its id is
 * taken). Lists beyond MAX_LISTS are skipped.
 */
export function mergeLists(mine: NamedList[], incoming: NamedList[], now = new Date()): { lists: NamedList[]; newLists: number; newWords: number; skipped: number } {
  let lists = [...mine];
  let newLists = 0, newWords = 0, skipped = 0;
  for (const raw of incoming) {
    const l = cleanList(raw);
    const had = lists.find((x) => sameName(x.name, l.name));
    if (had) {
      const have = new Set(had.words.map((w) => w.slug));
      const extra = l.words.filter((w) => !have.has(w.slug));
      const words = [...had.words, ...extra].slice(0, MAX_LIST_WORDS);
      newWords += words.length - had.words.length;
      lists = lists.map((x) => (x === had ? { ...x, words } : x));
    } else if (lists.length < MAX_LISTS) {
      const id = lists.some((x) => x.id === l.id) ? newId(lists, now) : l.id;
      lists.push({ ...l, id });
      newLists++;
      newWords += l.words.length;
    } else skipped++;
  }
  return { lists, newLists, newWords, skipped };
}

/** Rule: stored lists are read leniently: bad lists are dropped, bad words inside a list skipped. */
export function readLists(data: unknown): NamedList[] {
  return Array.isArray(data) ? data.filter(isNamedList).map(cleanList).slice(0, MAX_LISTS) : [];
}

export { asWord };
