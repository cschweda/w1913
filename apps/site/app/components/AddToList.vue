<script setup lang="ts">
// Add the word to named lists (DESIGN.md §4, "Keeping"): a disclosure button
// opens a panel of checkboxes, one per list, and a field for a new list.
// Everything stays in this browser.
import { MAX_NAME } from "../../shared/lists";

const props = defineProps<{ slug: string; headword: string }>();
const { sorted, ready, inList, toggle, create } = useLists();
const open = ref(false);
const name = ref("");
const status = ref("");
const panel = ref<HTMLElement | null>(null);
const count = computed(() => sorted.value.filter((l) => inList(l.id, props.slug)).length);
const uid = useId();

function change(id: string, listName: string) {
  const now = toggle(id, props.slug, props.headword);
  status.value = now ? `Added ${props.headword} to ${listName}.` : inList(id, props.slug) ? `${listName} is full.` : `Removed ${props.headword} from ${listName}.`;
}
function make() {
  const r = create(name.value, { slug: props.slug, headword: props.headword });
  if ("error" in r) { status.value = r.error; return; }
  status.value = `Made the list ${name.value.trim()} with ${props.headword} in it.`;
  name.value = "";
}
async function toggleOpen() {
  open.value = !open.value;
  if (open.value) { await nextTick(); panel.value?.querySelector<HTMLElement>("input")?.focus(); }
}
// A click outside the control closes the panel.
const root = ref<HTMLElement | null>(null);
function outside(e: MouseEvent) { if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false; }
onMounted(() => document.addEventListener("click", outside));
onBeforeUnmount(() => document.removeEventListener("click", outside));
function onKey(e: KeyboardEvent) { if (e.key === "Escape" && open.value) { open.value = false; (document.getElementById(`${uid}-btn`) as HTMLElement | null)?.focus(); } }
</script>

<template>
  <span ref="root" class="atl" @keydown="onKey">
    <button :id="`${uid}-btn`" type="button" class="btn" :aria-expanded="open" :aria-controls="`${uid}-panel`" :disabled="!ready" @click="toggleOpen">
      <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 6h11M4 12h11M4 18h7M18 14v8M14 18h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      Lists<span v-if="count" class="n"> ({{ count }})</span>
    </button>
    <div v-show="open" :id="`${uid}-panel`" ref="panel" class="panel">
      <fieldset v-if="sorted.length" class="fs">
        <legend class="cap">Put {{ headword }} in</legend>
        <label v-for="l in sorted" :key="l.id" class="opt">
          <input type="checkbox" :checked="inList(l.id, slug)" @change="change(l.id, l.name)" />
          <span>{{ l.name }} <span class="mu">({{ l.words.length }})</span></span>
        </label>
      </fieldset>
      <form class="new" @submit.prevent="make">
        <label :for="`${uid}-name`" class="cap">{{ sorted.length ? "Or a new list" : "Make a list" }}</label>
        <div class="row">
          <input :id="`${uid}-name`" v-model="name" type="text" :maxlength="MAX_NAME" autocomplete="off" placeholder="e.g. Chapter 3" class="field" />
          <button type="submit" class="btn">Make</button>
        </div>
      </form>
      <NuxtLink to="/saved#lists" class="t x">All lists</NuxtLink>
    </div>
    <span class="vh" role="status">{{ status }}</span>
  </span>
</template>

<style scoped>
.atl { position: relative; display: inline-flex; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; }
.ic { width: 18px; height: 18px; }
.n { font-weight: 400; }
.panel { position: absolute; top: calc(100% + 6px); left: 0; z-index: 20; width: min(320px, 86vw); padding: 14px 16px; background: var(--bg); border: 1px solid var(--fg); box-shadow: 0 8px 24px rgb(0 0 0 / .18); }
.fs { margin: 0 0 12px; padding: 0; border: 0; }
.fs legend { padding: 0 0 6px; }
.opt { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: 16px; cursor: pointer; }
.opt input { width: 18px; height: 18px; accent-color: var(--ac); }
.mu { color: var(--mu); }
.new { display: grid; gap: 6px; }
.row { display: flex; gap: 8px; }
.field { flex: 1; min-width: 0; min-height: 44px; padding: 0 10px; border: 1px solid var(--mu); background: transparent; color: var(--fg); font: inherit; font-size: 16px; }
.field::placeholder { color: var(--mu); }
</style>
