<script setup lang="ts">
// Look up by selection (DESIGN.md §4): selecting a single word inside an
// entry offers "Look up". Exact headwords and variants only in Phase 1.
// An enhancement for pointer and touch; every word is also reachable from
// the search box.
import { entryPath } from "../../shared/fold";

const shown = ref<{ word: string; slug: string; x: number; y: number } | null>(null);
let seq = 0;

async function check() {
  const sel = window.getSelection();
  const text = sel?.toString().trim() ?? "";
  const mine = ++seq;
  if (!sel || sel.rangeCount === 0 || !/^[\p{L}][\p{L}'’-]{0,40}$/u.test(text)) { shown.value = null; return; }
  const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
  if (!node?.closest("[data-lookup]")) { shown.value = null; return; }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  const { slug } = await $fetch<{ slug: string | null }>("/_w/exists", { query: { w: text } });
  if (mine !== seq) return;
  shown.value = slug ? { word: text, slug, x: rect.left + rect.width / 2, y: rect.bottom } : null;
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") shown.value = null;
}
const route = useRoute();
watch(() => route.fullPath, () => { shown.value = null; });

onMounted(() => {
  document.addEventListener("mouseup", check);
  document.addEventListener("touchend", check);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("mouseup", check);
  document.removeEventListener("touchend", check);
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <NuxtLink
    v-if="shown"
    :to="entryPath(shown.slug)"
    class="pop"
    :style="{ left: `${shown.x}px`, top: `${shown.y + 8}px` }"
    @click="shown = null"
  >Look up “{{ shown.word }}”</NuxtLink>
</template>

<style scoped>
.pop { position: fixed; z-index: 40; transform: translateX(-50%); display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; background: var(--ac); color: var(--on); font-size: 15px; font-weight: 700; white-space: nowrap; }
.pop:hover { color: var(--on); }
</style>
