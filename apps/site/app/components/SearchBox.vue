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

async function clear() {
  seq++;
  clearTimeout(timer);
  term.value = "";
  items.value = [];
  selected.value = undefined;
  await nextTick();
  // The combobox keeps its own copy of the text; empty the element too and
  // tell it, so the field shows what the state says.
  const el = document.getElementById("lookup") as HTMLInputElement | null;
  if (el && el.value) {
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  focusInput();
}

function focusInput() {
  const el = document.getElementById("lookup");
  el?.focus();
}
defineShortcuts({ "/": focusInput, meta_k: focusInput });
onMounted(() => {
  if (props.autofocus) focusInput();
});

// Sizes are set in the scoped CSS below (Nuxt UI's own size classes would
// otherwise win); these only clear its default chrome.
const inputClass = "px-0 rounded-none border-b-2 border-[var(--fg)] text-[var(--fg)] placeholder:text-[var(--mu)]";
const itemClass = computed(() => (props.size === "hero" ? "rounded-none text-xl py-2" : "rounded-none text-lg"));
</script>

<template>
  <form role="search" :class="['box', size === 'hero' ? 'is-hero' : 'is-bar']" @submit.prevent="freeText(term)">
    <h1 v-if="size === 'hero'" class="ask"><label for="lookup">Look up any word in the 1913 Webster's</label></h1>
    <label v-else for="lookup" class="cap lbl">Look up a word</label>
    <div class="row">
    <UInputMenu
      id="lookup"
      v-model="selected"
      v-model:search-term="term"
      :items="items"
      :loading="loading"
      ignore-filter
      :create-item="items.length ? false : { position: 'bottom', when: 'always' }"
      variant="none"
      :placeholder="size === 'hero' ? '' : 'another word'"
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
    <button type="submit" class="btn go">Look up</button>
    <button v-if="term" type="button" class="btn clear" @click="clear">Clear<span class="vh"> the search</span></button>
    </div>
    <p v-if="size === 'hero'" class="hint big">Type a word and press <kbd>Enter</kbd>, or pick one of the suggestions as you type.</p>
    <p v-else class="hint" aria-hidden="true">Press <kbd>/</kbd> or <kbd>Ctrl K</kbd> to look up from anywhere</p>
  </form>
</template>

<style scoped>
.box { margin: 0; }
.lbl { display: block; margin-bottom: 4px; }
.row { display: flex; align-items: center; gap: 16px; }
.field { display: flex; width: 100%; flex: 1; min-width: 0; }
.clear { flex: none; }
.go { flex: none; background: var(--ac); color: var(--on); border-color: var(--ac); font-weight: 700; }
.go:hover { background: transparent; color: var(--ac); }
.is-hero .clear, .is-hero .go { min-height: 60px; padding: 0 26px; font-size: 20px; }
.ask { margin: 0 0 8px; font-size: clamp(24px, 3.4vw, 40px); font-weight: 700; letter-spacing: -.02em; line-height: 1.15; }
.hint.big { margin-top: 14px; font-size: 17px; }
@media (max-width: 560px) { .row { flex-wrap: wrap; } .field { flex-basis: 100%; } }
.box :deep(input) { width: 100%; }
.is-bar { max-width: 860px; }
.is-hero :deep(input) { height: auto; padding-top: 4px; padding-bottom: 8px; font-size: clamp(40px, 8vw, 104px); font-weight: 700; letter-spacing: -.045em; line-height: 1.05; }
.is-bar :deep(input) { height: 56px; font-size: clamp(22px, 3vw, 30px); font-weight: 700; letter-spacing: -.02em; }
.box :deep(input::placeholder) { font-weight: 400; color: var(--mu); opacity: 1; }
.hint { margin: 8px 0 0; font-size: 13px; color: var(--mu); }
kbd { font: inherit; font-weight: 700; color: var(--fg); padding: 0 6px; border: 1px solid var(--mu); }
</style>
