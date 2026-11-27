<script setup lang="ts">
// Definition search (DESIGN.md §4, "What's the word for…?"): words in the
// 1913 definitions, stemmed, ranked. Labelled honestly: it matches the words
// the 1913 dictionary used, not meanings.
import config from "../../../../w1913.config";
import { entryPath } from "../../shared/fold";
import { ldScript, webPageLd } from "../../shared/structured";
import type { Results } from "../../shared/search";

const route = useRoute();
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const q = computed(() => str(route.query.q));
const like = computed(() => str(route.query.like));
const syl = computed(() => str(route.query.syl));
const stress = computed(() => str(route.query.stress));
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1));
const { data } = await useFetch<Results & { page: number; per: number; like: { slug: string; headword: string } | null }>("/_w/search", {
  query: { q, like, syl, stress, page },
  key: computed(() => `search-${q.value}-${like.value}-${syl.value}-${stress.value}-${page.value}`),
});
/** "Words in definitions" or "Synonyms of a word" (DESIGN.md §4, the rhythm filter combines with both). */
const mode = ref<"defs" | "like">(like.value ? "like" : "defs");
const input = ref(like.value || q.value);
const sylIn = ref(syl.value);
const stressIn = ref(stress.value);
watch([q, like, syl, stress], () => { mode.value = like.value ? "like" : "defs"; input.value = like.value || q.value; sylIn.value = syl.value; stressIn.value = stress.value; });
const pages = computed(() => (data.value ? Math.ceil(data.value.total / data.value.per) : 0));
const active = computed(() => !!(q.value || like.value));
const ORD = ["first", "second", "third", "fourth", "fifth"];
const rhythmText = computed(() => {
  const parts = [syl.value ? `${syl.value} syllable${syl.value === "1" ? "" : "s"}` : "", stress.value ? `stress on the ${ORD[Number(stress.value) - 1]}` : ""].filter(Boolean);
  return parts.length ? `, ${parts.join(", ")}` : "";
});
/** The query string for this result set on another page, keeping every filter. */
const here = (extra: Record<string, string | number>) => ({ path: "/search", query: { ...(like.value ? { like: like.value } : { q: q.value }), ...(syl.value ? { syl: syl.value } : {}), ...(stress.value ? { stress: stress.value } : {}), ...extra } });
const marked = (m: string | null, fallback: string) => (m ? m.replace(/\*/g, "·").replace(/"/g, "″").replace(/`/g, "′") : fallback);

function submit() {
  const v = input.value.trim();
  if (!v) return;
  navigateTo({ path: "/search", query: { [mode.value === "like" ? "like" : "q"]: v, ...(sylIn.value ? { syl: sylIn.value } : {}), ...(stressIn.value ? { stress: stressIn.value } : {}) } });
}
const description = "Search inside the definitions of the 1913 Webster's: find the word for a meaning, in the words the dictionary itself used.";
useSeoMeta({ title: () => (like.value ? `Synonyms of “${like.value}”` : q.value ? `“${q.value}” in definitions` : "Search definitions"), description, ogDescription: description, robots: () => (active.value ? "noindex" : "index") });
useHead({ script: [ldScript(webPageLd({ type: "SearchResultsPage", url: `${config.site.url}/search`, name: "Search definitions · W1913", description, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div class="page">
    <h1 class="title">What's the word for…?</h1>
    <div aria-hidden="true" class="bar" />
    <form role="search" class="sf" @submit.prevent="submit">
      <fieldset class="modes">
        <legend class="vh">Search for</legend>
        <label><input v-model="mode" type="radio" value="defs" /> Words in definitions</label>
        <label><input v-model="mode" type="radio" value="like" /> Synonyms of a word</label>
      </fieldset>
      <label for="defq" class="cap">{{ mode === "like" ? "Synonyms of" : "Search inside definitions" }}</label>
      <div class="row">
        <input id="defq" v-model="input" type="search" class="in" :placeholder="mode === 'like' ? 'lofty, sad, walk' : 'walk idly, a young salmon, dread of water'" autocomplete="off" />
        <button type="submit" class="btn go">Search</button>
      </div>
      <fieldset class="rhythm">
        <legend class="cap">Rhythm</legend>
        <label>Syllables
          <select v-model="sylIn" class="sel"><option value="">any</option><option v-for="n in 6" :key="n" :value="String(n)">{{ n }}</option></select>
        </label>
        <label>Stress on the
          <select v-model="stressIn" class="sel"><option value="">any</option><option v-for="(o, i) in ORD.slice(0, 4)" :key="o" :value="String(i + 1)">{{ o }}</option></select>
          syllable
        </label>
      </fieldset>
      <p class="m">
        <template v-if="mode === 'like'">The words the dictionary lists as synonyms of this one, and the entries that list it.</template>
        <template v-else>Matches the words in the 1913 definitions (stemmed, so <i>walking</i> finds <i>walk</i>), not meanings: try the dictionary's own phrasing. Put a phrase in "double quotes".</template>
        Rhythm comes from the dictionary's stress marks.
      </p>
    </form>

    <template v-if="active && data">
      <p class="sum" role="status">
        <template v-if="like">
          <template v-if="data.like">{{ data.total.toLocaleString("en-US") }} {{ data.total === 1 ? "synonym" : "synonyms" }} of <NuxtLink :to="entryPath(data.like.slug)" class="x">{{ data.like.headword }}</NuxtLink>{{ rhythmText }}.</template>
          <template v-else>“{{ like }}” is not in this dictionary.</template>
        </template>
        <template v-else-if="data.total">
          {{ data.total.toLocaleString("en-US") }} {{ data.total === 1 ? "entry" : "entries" }}
          {{ data.broadened ? "contain any of" : "contain" }} “{{ q }}”{{ rhythmText }}<span v-if="data.broadened"> (none contain every word)</span>.
          <NuxtLink v-if="!rhythmText" :to="`/cards?deck=${encodeURIComponent(`q:${q}`)}`" class="x">Make a card deck of these</NuxtLink>
        </template>
        <template v-else>No definition contains “{{ q }}”{{ rhythmText }}. Try other words, fewer, or another rhythm.</template>
      </p>
      <ol class="hits" :start="(page - 1) * data.per + 1">
        <li v-for="h in data.hits" :key="h.slug">
          <NuxtLink :to="entryPath(h.slug)" class="hw x">{{ h.headword }}</NuxtLink>
          <span v-if="h.marked && h.marked !== h.headword" class="rh" aria-hidden="true">{{ marked(h.marked, h.headword) }}</span>
          <span v-if="h.pos" class="pos">{{ h.pos }}</span>
          <!-- Snippet from the edition; escaped in shared/search.ts, matches as <mark>. -->
          <p class="snip" v-html="h.snippet" />
        </li>
      </ol>
      <nav v-if="pages > 1" aria-label="Result pages" class="pager">
        <NuxtLink v-if="page > 1" :to="here({ page: page - 1 })" class="t">← Previous</NuxtLink>
        <span class="cap">Page {{ page }} of {{ Math.min(pages, 50) }}</span>
        <NuxtLink v-if="page < Math.min(pages, 50)" :to="here({ page: page + 1 })" class="t">Next →</NuxtLink>
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
.modes { display: flex; flex-wrap: wrap; gap: 8px 24px; border: 0; padding: 0; margin: 0 0 18px; font-size: 17px; }
.modes label, .rhythm label { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; }
.modes input { accent-color: var(--ac); width: 18px; height: 18px; }
.rhythm { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 28px; border: 0; padding: 0; margin: 18px 0 0; font-size: 16px; }
.rhythm legend { float: left; margin-right: 8px; }
.sel { background: var(--bg); color: var(--fg); border: 1px solid var(--mu); padding: 4px 8px; font: inherit; min-height: 32px; }
.rh { margin-left: 10px; color: var(--mu); font-size: 16px; }
.hits { margin: 16px 0 0; padding-left: 36px; }
.hits li { padding: 12px 0; border-top: 1px solid var(--ln); }
.hits li::marker { color: var(--mu); font-size: 14px; }
.hw { font-size: 22px; font-weight: 700; }
.pos { margin-left: 8px; color: var(--mu); font-size: 15px; }
.snip { margin: 4px 0 0; font-size: 17px; line-height: 1.5; }
@media (max-width: 560px) { .hits { padding-left: 28px; } }
.pager { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
</style>
