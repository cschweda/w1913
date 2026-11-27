// Saved words (DESIGN.md §4, "Keeping"): in localStorage, never sent anywhere.
// Shared state, so every Save button and the /saved page agree.
import { mergeSaved, isSavedWord, type SavedWord } from "../../shared/saved.ts";

export type { SavedWord };
const KEY = "w1913-saved";

function read(): SavedWord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(list) ? list.filter(isSavedWord) : [];
  } catch {
    return [];
  }
}
function write(words: SavedWord[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(words));
    return true;
  } catch {
    return false; // Storage unavailable (private mode, quota): saving lasts for this page only.
  }
}

export function useSaved() {
  const saved = useState<SavedWord[]>("saved", () => []);
  const ready = useState("saved-ready", () => false);
  onMounted(() => {
    if (ready.value) return;
    saved.value = read();
    ready.value = true;
    // Another tab saved or removed a word.
    window.addEventListener("storage", (e) => { if (e.key === KEY) saved.value = read(); });
  });
  const has = (slug: string) => saved.value.some((w) => w.slug === slug);
  return {
    saved,
    ready,
    has,
    /** Saves or removes a word; returns whether it is now saved, and whether the browser kept it. */
    toggle(slug: string, headword: string): { saved: boolean; stored: boolean } {
      const now = has(slug);
      saved.value = now ? saved.value.filter((w) => w.slug !== slug) : mergeSaved(saved.value, [{ slug, headword, saved: new Date().toISOString() }]);
      return { saved: !now, stored: write(saved.value) };
    },
    add(words: SavedWord[]) {
      saved.value = mergeSaved(saved.value, words);
      write(saved.value);
    },
    remove(slug: string) {
      saved.value = saved.value.filter((w) => w.slug !== slug);
      write(saved.value);
    },
    clear() {
      saved.value = [];
      write([]);
    },
  };
}
