<script setup lang="ts">
// Definition search (DESIGN.md §4, "What's the word for…?"): words in the
// 1913 definitions, stemmed, ranked. Labelled honestly: it matches the words
// the 1913 dictionary used, not meanings.
import config from "../../../../w1913.config";
import { entryPath } from "../../shared/fold";
import { ldScript, webPageLd } from "../../shared/structured";
import type { Results } from "../../shared/search";

const route = useRoute();
const q = computed(() => String(route.query.q ?? "").trim());
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1));
const { data } = await useFetch<Results & { page: number; per: number }>("/_w/search", {
  query: { q, page },
  key: computed(() => `search-${q.value}-${page.value}`),
  immediate: true,
});
const input = ref(q.value);
watch(q, (v) => { input.value = v; });
const pages = computed(() => (data.value ? Math.ceil(data.value.total / data.value.per) : 0));

function submit() {
  const v = input.value.trim();
  if (v) navigateTo({ path: "/search", query: { q: v } });
}
const description = "Search inside the definitions of the 1913 Webster's: find the word for a meaning, in the words the dictionary itself used.";
useSeoMeta({ title: () => (q.value ? `“${q.value}” in definitions` : "Search definitions"), description, ogDescription: description, robots: () => (q.value ? "noindex" : "index") });
useHead({ script: [ldScript(webPageLd({ type: "SearchResultsPage", url: `${config.site.url}/search`, name: "Search definitions · W1913", description, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div class="page">
    <h1 class="title">What's the word for…?</h1>
    <div aria-hidden="true" class="bar" />
    <form role="search" class="sf" @submit.prevent="submit">
      <label for="defq" class="cap">Search inside definitions</label>
      <div class="row">
        <input id="defq" v-model="input" type="search" class="in" placeholder="walk idly, a young salmon, dread of water" autocomplete="off" />
        <button type="submit" class="btn go">Search</button>
      </div>
      <p class="m">
        Matches the words in the 1913 definitions (stemmed, so <i>walking</i> finds <i>walk</i>), not meanings: try
        the dictionary's own phrasing. Put a phrase in "double quotes".
      </p>
    </form>

    <template v-if="q && data">
      <p class="sum" role="status">
        <template v-if="data.total">
          {{ data.total.toLocaleString("en-US") }} {{ data.total === 1 ? "entry" : "entries" }}
          {{ data.broadened ? "contain any of" : "contain" }} “{{ q }}”<span v-if="data.broadened"> (none contain every word)</span>.
          <NuxtLink :to="`/cards?deck=${encodeURIComponent(`q:${q}`)}`" class="x">Make a card deck of these</NuxtLink>
        </template>
        <template v-else>No definition contains “{{ q }}”. Try other words, or fewer.</template>
      </p>
      <ol class="hits" :start="(page - 1) * data.per + 1">
        <li v-for="h in data.hits" :key="h.slug">
          <NuxtLink :to="entryPath(h.slug)" class="hw x">{{ h.headword }}</NuxtLink>
          <span v-if="h.pos" class="pos">{{ h.pos }}</span>
          <!-- Snippet from the edition; escaped in shared/search.ts, matches as <mark>. -->
          <p class="snip" v-html="h.snippet" />
        </li>
      </ol>
      <nav v-if="pages > 1" aria-label="Result pages" class="pager">
        <NuxtLink v-if="page > 1" :to="{ path: '/search', query: { q, page: page - 1 } }" class="t">← Previous</NuxtLink>
        <span class="cap">Page {{ page }} of {{ Math.min(pages, 50) }}</span>
        <NuxtLink v-if="page < Math.min(pages, 50)" :to="{ path: '/search', query: { q, page: page + 1 } }" class="t">Next →</NuxtLink>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 900px; }
.title { margin: 24px 0 0; font-size: clamp(40px, 7vw, 88px); line-height: .95; font-weight: 700; letter-spacing: -.04em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 28px; }
.row { display: flex; gap: 16px; align-items: center; margin-top: 6px; }
.in { flex: 1; min-width: 0; height: 56px; background: transparent; color: var(--fg); border: 0; border-bottom: 2px solid var(--fg); border-radius: 0; font: inherit; font-size: clamp(20px, 3vw, 28px); font-weight: 700; }
.in::placeholder { color: var(--mu); font-weight: 400; }
.go { flex: none; min-height: 56px; background: var(--ac); color: var(--on); border-color: var(--ac); font-weight: 700; font-size: 17px; }
.go:hover { background: transparent; color: var(--ac); }
@media (max-width: 560px) { .row { flex-wrap: wrap; } .in { flex-basis: 100%; } }
.sum { margin: 28px 0 0; font-size: 17px; }
.hits { margin: 16px 0 0; padding-left: 36px; }
.hits li { padding: 12px 0; border-top: 1px solid var(--ln); }
.hits li::marker { color: var(--mu); font-size: 14px; }
.hw { font-size: 22px; font-weight: 700; }
.pos { margin-left: 8px; color: var(--mu); font-size: 15px; }
.snip { margin: 4px 0 0; font-size: 17px; line-height: 1.5; }
@media (max-width: 560px) { .hits { padding-left: 28px; } }
.pager { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
</style>
