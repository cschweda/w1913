<script setup lang="ts">
// One-step lookup (DESIGN.md §4): a combobox over headwords and variants.
// "/" or Cmd/Ctrl-K focuses it. Enter on free text goes to the closest page.
import config from "../../../../w1913.config";
import { entryPath } from "../../shared/fold";

interface Item { label: string; slug: string }

const term = ref("");
const items = ref<Item[]>([]);
const loading = ref(false);
let seq = 0;

let timer: ReturnType<typeof setTimeout> | undefined;
watch(term, (q) => {
  clearTimeout(timer);
  timer = setTimeout(() => fetchSuggestions(q), config.features.suggestDelayMs);
});

async function fetchSuggestions(q: string) {
  const mine = ++seq;
  if (!q.trim()) { items.value = []; return; }
  loading.value = true;
  try {
    const rows = await $fetch<{ form: string; slug: string }[]>("/_w/suggest", { query: { q } });
    if (mine === seq) items.value = rows.map((r) => ({ label: r.form, slug: r.slug }));
  } finally {
    if (mine === seq) loading.value = false;
  }
}

async function go(item: Item | undefined) {
  if (!item) return;
  term.value = "";
  items.value = [];
  await navigateTo(entryPath(item.slug));
}

async function freeText(q: string) {
  const text = q.trim();
  if (!text) return;
  term.value = "";
  items.value = [];
  await navigateTo({ path: "/w/go", query: { q: text } }, { external: false });
}

function focusInput() {
  const el = document.getElementById("lookup");
  el?.focus();
}
defineShortcuts({ "/": focusInput, meta_k: focusInput });
</script>

<template>
  <form role="search" class="box" @submit.prevent="freeText(term)">
    <label for="lookup" class="cap">Look up</label>
    <UInputMenu
      id="lookup"
      v-model:search-term="term"
      :items="items"
      :loading="loading"
      ignore-filter
      :create-item="items.length ? false : { position: 'bottom', when: 'always' }"
      variant="none"
      placeholder="a word"
      class="field"
      :ui="{ base: 'h-11 px-0 text-base text-[var(--fg)] placeholder:text-[var(--mu)] border-b border-[var(--fg)] rounded-none', content: 'rounded-none border border-[var(--fg)] bg-[var(--bg)]', item: 'rounded-none' }"
      :reset-search-term-on-blur="false"
      :trailing="false"
      aria-label="Look up a word"
      @update:model-value="(v: Item | undefined) => go(v)"
      @create="freeText"
    >
      <template #empty>
        <span class="cap">Type a word</span>
      </template>
    </UInputMenu>
    <span class="hint" aria-hidden="true">/ or Ctrl K</span>
  </form>
</template>

<style scoped>
.box { display: flex; align-items: center; gap: 12px; margin: 0; }
.field { flex: 1; min-width: 0; }
.hint { font-size: 12px; color: var(--mu); white-space: nowrap; }
</style>
