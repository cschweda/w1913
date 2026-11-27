<script setup lang="ts">
// Unusual-word previews: pointing at, or tabbing to, a word with a dashed
// underline (a.rare, marked at import) shows its first sense. WCAG 1.4.13:
// the card can be dismissed (Esc), hovered (it stays while the pointer is on
// it), and persists until the pointer or focus leaves. The card describes the
// link (aria-describedby). On touch screens the link simply opens the entry.
import config from "../../../../w1913.config";

interface Preview { slug: string; headword: string; pos: string | null; pos_title: string | null; first_sense: string }

const card = ref<(Preview & { x: number; y: number; above: boolean }) | null>(null);
const cache = new Map<string, Preview | null>();
let anchor: HTMLAnchorElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const ID = "unusual-preview";

async function load(slug: string): Promise<Preview | null> {
  if (cache.has(slug)) return cache.get(slug)!;
  try {
    const p = await $fetch<Preview>("/_w/preview", { query: { w: slug } });
    cache.set(slug, p);
    return p;
  } catch {
    cache.set(slug, null);
    return null;
  }
}

async function open(a: HTMLAnchorElement) {
  clearTimeout(hideTimer);
  if (anchor && anchor !== a) close();
  anchor = a;
  const p = await load(a.dataset.preview ?? "");
  if (!p || anchor !== a) return;
  const r = a.getBoundingClientRect();
  const above = r.bottom + 180 > window.innerHeight && r.top > 200;
  card.value = { ...p, x: Math.min(Math.max(12, r.left), window.innerWidth - 332), y: above ? r.top - 8 : r.bottom + 8, above };
  a.setAttribute("aria-describedby", ID);
}

function close() {
  clearTimeout(showTimer);
  anchor?.removeAttribute("aria-describedby");
  anchor = null;
  card.value = null;
}
const closeSoon = () => { clearTimeout(hideTimer); hideTimer = setTimeout(close, 150); };
/** The pointer moved onto the card: keep it open (WCAG 1.4.13, hoverable). */
const keepOpen = () => clearTimeout(hideTimer);

const rareFrom = (t: EventTarget | null) => (t instanceof Element ? (t.closest("a.rare") as HTMLAnchorElement | null) : null);
function onOver(e: MouseEvent) {
  const a = rareFrom(e.target);
  if (!a) return;
  clearTimeout(showTimer);
  showTimer = setTimeout(() => open(a), config.features.previewDelayMs);
}
function onOut(e: MouseEvent) {
  if (rareFrom(e.target)) { clearTimeout(showTimer); closeSoon(); }
}
function onFocus(e: FocusEvent) { const a = rareFrom(e.target); if (a) open(a); }
function onBlur(e: FocusEvent) { if (rareFrom(e.target)) closeSoon(); }
function onKey(e: KeyboardEvent) { if (e.key === "Escape" && card.value) close(); }

const route = useRoute();
watch(() => route.fullPath, close);
onMounted(() => {
  // Hover previews only where there is a real pointer; touch taps navigate.
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
  }
  document.addEventListener("focusin", onFocus);
  document.addEventListener("focusout", onBlur);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("mouseover", onOver);
  document.removeEventListener("mouseout", onOut);
  document.removeEventListener("focusin", onFocus);
  document.removeEventListener("focusout", onBlur);
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div
    v-if="card"
    :id="ID"
    role="tooltip"
    :class="['card', { above: card.above }]"
    :style="{ left: `${card.x}px`, top: `${card.y}px` }"
    @mouseenter="keepOpen"
    @mouseleave="closeSoon"
  >
    <p class="ch">{{ card.headword }} <abbr v-if="card.pos" :title="card.pos_title ?? undefined">{{ card.pos }}</abbr></p>
    <p class="cs">{{ card.first_sense }}</p>
    <p class="cap ck">Enter or click opens the entry · Esc closes</p>
  </div>
</template>

<style scoped>
.card { position: fixed; z-index: 45; width: min(320px, calc(100vw - 24px)); padding: 14px 16px; background: var(--bg); color: var(--fg); border: 1px solid var(--fg); border-top: 4px solid var(--ac); box-shadow: 0 8px 24px rgba(0, 0, 0, .35); }
.card.above { transform: translateY(-100%); }
.ch { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
.ch abbr { font-size: 14px; font-weight: 400; color: var(--mu); margin-left: 4px; text-decoration: none; }
.cs { margin: 6px 0 0; font-size: 15px; line-height: 1.5; }
.ck { margin: 10px 0 0; font-size: 11px; }
</style>
