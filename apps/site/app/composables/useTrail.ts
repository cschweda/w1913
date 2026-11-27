// The trail (DESIGN.md §4): words visited in this tab, oldest first, at most
// 12, a revisit moving the word to the end. Kept in sessionStorage; never
// sent anywhere.
import { addToTrail, type TrailItem } from "../../shared/trail.ts";

export type { TrailItem };
const KEY = "w1913-trail";

function read(): TrailItem[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrailItem[]).filter((x) => x && typeof x.slug === "string") : [];
  } catch {
    return [];
  }
}
function write(items: TrailItem[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage may be unavailable (private mode, quota); the trail just lives in memory.
  }
}

export function useTrail() {
  const trail = useState<TrailItem[]>("trail", () => []);
  onMounted(() => { trail.value = read(); });
  return {
    trail,
    visit(item: TrailItem) {
      trail.value = addToTrail(read(), item);
      write(trail.value);
    },
    clear() {
      trail.value = [];
      write([]);
    },
  };
}
