<script setup lang="ts">
// One-step lookup (DESIGN.md §4): a combobox over headwords and variants.
// "/" or Cmd/Ctrl-K focuses it. Enter on free text goes to the closest page.
import config from "../../../../w1913.config";
import { entryPath } from "../../shared/fold";

interface Item { label: string; slug: string }

// "hero" fills the home page; "bar" heads the main column of every other page.
const props = withDefaults(defineProps<{ size?: "hero" | "bar"; autofocus?: boolean }>(), { size: "bar", autofocus: false });
const selected = ref<Item | undefined>(undefined);

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
  selected.value = undefined;
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
onMounted(() => {
  if (props.autofocus && window.matchMedia("(pointer: fine)").matches) focusInput();
});

// Sizes are set in the scoped CSS below (Nuxt UI's own size classes would
// otherwise win); these only clear its default chrome.
const inputClass = "px-0 rounded-none border-b-2 border-[var(--fg)] text-[var(--fg)] placeholder:text-[var(--mu)]";
const itemClass = computed(() => (props.size === "hero" ? "rounded-none text-xl py-2" : "rounded-none text-lg"));
</script>

<template>
  <form role="search" :class="['box', size === 'hero' ? 'is-hero' : 'is-bar']" @submit.prevent="freeText(term)">
    <label for="lookup" class="cap lbl">Look up a word</label>
    <UInputMenu
      id="lookup"
      v-model="selected"
      v-model:search-term="term"
      :items="items"
      :loading="loading"
      ignore-filter
      :create-item="items.length ? false : { position: 'bottom', when: 'always' }"
      variant="none"
      :placeholder="size === 'hero' ? 'sublime' : 'another word'"
      class="field"
      :ui="{ root: 'w-full', base: inputClass, content: 'rounded-none border border-[var(--fg)] bg-[var(--bg)]', item: itemClass }"
      :reset-search-term-on-blur="false"
      :trailing="false"
      autocomplete="off"
      @update:model-value="(v: Item | undefined) => go(v)"
      @create="freeText"
    >
      <template #empty>
        <span class="cap">Type a word</span>
      </template>
    </UInputMenu>
    <p v-if="size === 'bar'" class="hint" aria-hidden="true">Press <kbd>/</kbd> or <kbd>Ctrl K</kbd> to look up from anywhere</p>
  </form>
</template>

<style scoped>
.box { margin: 0; }
.lbl { display: block; margin-bottom: 4px; }
.field { display: flex; width: 100%; }
.box :deep(input) { width: 100%; }
.is-bar { max-width: 860px; }
.is-hero :deep(input) { height: auto; padding-top: 4px; padding-bottom: 8px; font-size: clamp(40px, 8vw, 104px); font-weight: 700; letter-spacing: -.045em; line-height: 1.05; }
.is-bar :deep(input) { height: 56px; font-size: clamp(22px, 3vw, 30px); font-weight: 700; letter-spacing: -.02em; }
.box :deep(input::placeholder) { font-weight: 400; color: var(--mu); opacity: 1; }
.hint { margin: 8px 0 0; font-size: 13px; color: var(--mu); }
kbd { font: inherit; font-weight: 700; color: var(--fg); padding: 0 6px; border: 1px solid var(--mu); }
</style>
