// Named lists (DESIGN.md §4, "Keeping"): in localStorage, never sent anywhere.
// Shared state, so every "Add to list" control and /saved agree.
import { addToList, byName, createList, mergeLists, readLists, removeFromList, renameList, type NamedList } from "../../shared/lists.ts";

export type { NamedList };
const KEY = "w1913-lists";

function read(): NamedList[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? readLists(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}
function write(lists: NamedList[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
    return true;
  } catch {
    return false; // Storage unavailable (private mode, quota): lists last for this page only.
  }
}

export function useLists() {
  const lists = useState<NamedList[]>("lists", () => []);
  const ready = useState("lists-ready", () => false);
  onMounted(() => {
    if (ready.value) return;
    lists.value = read();
    ready.value = true;
    window.addEventListener("storage", (e) => { if (e.key === KEY) lists.value = read(); });
  });
  const set = (next: NamedList[]) => { lists.value = next; return write(next); };
  return {
    lists,
    ready,
    sorted: computed(() => byName(lists.value)),
    find: (id: string) => lists.value.find((l) => l.id === id) ?? null,
    inList: (id: string, slug: string) => !!lists.value.find((l) => l.id === id)?.words.some((w) => w.slug === slug),
    /** Creates a list (optionally with a first word); returns its id, or an error to show. */
    create(name: string, first?: { slug: string; headword: string }): { id: string; stored: boolean } | { error: string } {
      const r = createList(lists.value, name);
      if ("error" in r) return r;
      const next = first ? addToList(r.lists, r.id, first.slug, first.headword).lists : r.lists;
      return { id: r.id, stored: set(next) };
    },
    rename(id: string, name: string): { error: string } | null {
      const r = renameList(lists.value, id, name);
      if ("error" in r) return r;
      set(r.lists);
      return null;
    },
    /** Adds or removes a word; returns whether it is now in the list (false also when the list is full). */
    toggle(id: string, slug: string, headword: string): boolean {
      const l = lists.value.find((x) => x.id === id);
      if (!l) return false;
      if (l.words.some((w) => w.slug === slug)) { set(removeFromList(lists.value, id, slug)); return false; }
      const r = addToList(lists.value, id, slug, headword);
      set(r.lists);
      return r.added;
    },
    remove(id: string, slug: string) { set(removeFromList(lists.value, id, slug)); },
    deleteList(id: string) { set(lists.value.filter((l) => l.id !== id)); },
    merge(incoming: NamedList[]) {
      const r = mergeLists(lists.value, incoming);
      set(r.lists);
      return r;
    },
  };
}
