<script setup lang="ts">
// The site header. Wide screens show the sections in a row; below 760px they
// fold behind a Menu button (a disclosure: aria-expanded, Escape closes it
// and returns focus, choosing a page or clicking outside closes it).
const open = ref(false);
const route = useRoute();
watch(() => route.fullPath, () => { open.value = false; });
const root = ref<HTMLElement | null>(null);
const btn = ref<HTMLButtonElement | null>(null);
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) { open.value = false; btn.value?.focus(); }
}
function outside(e: MouseEvent) { if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false; }
onMounted(() => { document.addEventListener("click", outside); document.addEventListener("keydown", onKey); });
onBeforeUnmount(() => { document.removeEventListener("click", outside); document.removeEventListener("keydown", onKey); });
</script>

<template>
  <header ref="root" class="pad hdr">
    <!-- The badge is a drawing (no text), so the link's name is its visible word plus "home" (WCAG 2.5.3). -->
    <NuxtLink to="/" class="t mark">
      <svg class="badge" viewBox="0 0 36 36" width="48" height="48" aria-hidden="true" focusable="false">
        <rect width="36" height="36" fill="currentColor" />
        <path d="M6.5 10h4.1l2.6 11.6L16.1 10h3.8l2.9 11.6L25.4 10h4.1l-4.6 16h-4l-2.9-11-2.9 11h-4z" fill="var(--on)" />
      </svg>
      <span class="word">w1913<span class="vh">, home</span></span>
    </NuxtLink>
    <button ref="btn" type="button" class="menu" :aria-expanded="open" aria-controls="site-sections" @click="open = !open">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="mi">
        <path v-if="!open" d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path v-else d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      Menu
    </button>
    <nav id="site-sections" aria-label="Sections" :class="['sections', { open }]">
      <NuxtLink to="/search" class="t" active-class="on">Search</NuxtLink>
      <NuxtLink to="/label" class="t" active-class="on">Labels</NuxtLink>
      <NuxtLink to="/author" class="t" active-class="on">Authors</NuxtLink>
      <NuxtLink to="/check" class="t" active-class="on">Check</NuxtLink>
      <NuxtLink to="/cards" class="t" active-class="on">Cards</NuxtLink>
      <NuxtLink to="/synonyms" class="t" active-class="on">Synonyms</NuxtLink>
      <NuxtLink to="/saved" class="t" active-class="on">Saved</NuxtLink>
      <NuxtLink to="/about" class="t" active-class="on">About</NuxtLink>
      <!-- On narrow screens the theme switch lives in the menu (only one of the two is ever displayed). -->
      <span class="theme-in"><ThemeToggle /></span>
    </nav>
    <span class="theme"><ThemeToggle /></span>
  </header>
</template>

<style scoped>
.hdr { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 36px; padding-top: 22px; padding-bottom: 22px; border-bottom: 1px solid var(--ln); }
/* The logo: the accent square from the social card, with the wordmark. */
.mark { gap: 14px; margin-right: auto; }
.badge { width: 48px; height: 48px; color: var(--ac); flex: none; }
.word { font-size: 32px; font-weight: 700; letter-spacing: -.035em; }
.mark:hover .word { color: var(--ac); }
.sections { display: flex; flex-wrap: wrap; gap: 0 28px; font-size: 17px; }
.sections .on { font-weight: 700; box-shadow: inset 0 -2px 0 var(--ac); }
.menu { display: none; align-items: center; gap: 8px; min-height: 44px; min-width: 44px; padding: 0 14px; background: transparent; color: var(--fg); border: 1px solid var(--fg); font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.menu:hover { color: var(--ac); border-color: var(--ac); }
.mi { width: 20px; height: 20px; }
.theme-in { display: none; }
/* Narrow screens: logo, theme toggle and Menu share one row; the sections open below as a full-width list. */
@media (max-width: 760px) {
  .hdr { gap: 12px; }
  .theme { display: none; }
  .theme-in { display: inline-flex; align-self: flex-start; margin: 14px 0 6px; }
  .menu { display: inline-flex; }
  .sections { display: none; order: 4; width: 100%; flex-direction: column; gap: 0; font-size: 18px; border-top: 1px solid var(--ln); }
  .sections.open { display: flex; }
  .sections .t { padding: 2px 0; border-bottom: 1px solid var(--ln); }
  .sections .on { box-shadow: inset 4px 0 0 var(--ac); padding-left: 14px; }
}
@media (max-width: 400px) {
  .badge { width: 40px; height: 40px; }
  .word { font-size: 28px; }
}
</style>
