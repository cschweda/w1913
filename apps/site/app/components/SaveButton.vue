<script setup lang="ts">
// Save a word to the browser's saved list (DESIGN.md §4, "Keeping"). A toggle
// button with aria-pressed; a status line says what happened.
const props = defineProps<{ slug: string; headword: string }>();
const { has, toggle, ready } = useSaved();
const on = computed(() => ready.value && has(props.slug));
const status = ref("");
function click() {
  const r = toggle(props.slug, props.headword);
  status.value = r.saved
    ? r.stored ? `Saved ${props.headword}.` : `Saved ${props.headword} for now; this browser is not keeping saved words.`
    : `Removed ${props.headword} from saved words.`;
}
</script>

<template>
  <span class="save">
    <button type="button" class="btn" :aria-pressed="on" :disabled="!ready" @click="click">
      <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z" :fill="on ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
      {{ on ? "Saved" : "Save" }}
    </button>
    <span class="vh" role="status">{{ status }}</span>
  </span>
</template>

<style scoped>
.save { display: inline-flex; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; }
.btn[aria-pressed="true"] { background: var(--fg); color: var(--bg); }
.ic { width: 18px; height: 18px; }
</style>
