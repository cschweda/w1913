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
const rhyme = computed(() => str(route.query.rhyme));
const inQuotes = computed(() => route.query.in === "quotes");
const authorQ = computed(() => str(route.query.author));
const syl = computed(() => str(route.query.syl));
const stress = computed(() => str(route.query.stress));
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1));
type QuoteHit = { slug: string; headword: string; anchor: string; author: string; authorKey: string; authorName: string; ref: string | null; snippet: string };
const { data } = await useFetch<Results & { page: number; per: number; like: { slug: string; headword: string } | null; rhyme?: { slug: string; headword: string } | null; kind?: "sound" | "spelling" | null; author?: { key: string; name: string } | null }>("/_w/search", {
  query: { q, like, rhyme, syl, stress, page, in: computed(() => (inQuotes.value ? "quotes" : undefined)), author: authorQ },
  key: computed(() => `search-${q.value}-${like.value}-${rhyme.value}-${syl.value}-${stress.value}-${page.value}-${inQuotes.value}-${authorQ.value}`),
});
const quoteHits = computed(() => (inQuotes.value ? (data.value?.hits as unknown as QuoteHit[]) : []));
/** "Words in definitions", "Synonyms of a word", "Rhymes for a word" (the rhythm filter combines with these), or "Words in quotations". */
type Mode = "defs" | "like" | "rhyme" | "quotes";
const modeOf = (): Mode => (inQuotes.value ? "quotes" : rhyme.value ? "rhyme" : like.value ? "like" : "defs");
const mode = ref<Mode>(modeOf());
const input = ref(rhyme.value || like.value || q.value);
const sylIn = ref(syl.value);
const stressIn = ref(stress.value);
watch([q, like, rhyme, syl, stress, inQuotes], () => { mode.value = modeOf(); input.value = rhyme.value || like.value || q.value; sylIn.value = syl.value; stressIn.value = stress.value; });
const pages = computed(() => (data.value ? Math.ceil(data.value.total / data.value.per) : 0));
const active = computed(() => !!(q.value || like.value || rhyme.value));
const ORD = ["first", "second", "third", "fourth", "fifth"];
const rhythmText = computed(() => {
  const parts = [syl.value ? `${syl.value} syllable${syl.value === "1" ? "" : "s"}` : "", stress.value ? `stress on the ${ORD[Number(stress.value) - 1]}` : ""].filter(Boolean);
  return parts.length ? `, ${parts.join(", ")}` : "";
});
/** The query string for this result set on another page, keeping every filter. */
const here = (extra: Record<string, string | number>) => ({ path: "/search", query: { ...(rhyme.value ? { rhyme: rhyme.value } : like.value ? { like: like.value } : { q: q.value }), ...(syl.value ? { syl: syl.value } : {}), ...(stress.value ? { stress: stress.value } : {}), ...(inQuotes.value ? { in: "quotes" } : {}), ...(authorQ.value ? { author: authorQ.value } : {}), ...extra } });
const marked = (m: string | null, fallback: string) => (m ? m.replace(/\*/g, "·").replace(/"/g, "″").replace(/`/g, "′") : fallback);

function submit() {
  const v = input.value.trim();
  if (!v) return;
  if (mode.value === "quotes") return navigateTo({ path: "/search", query: { q: v, in: "quotes", ...(authorQ.value ? { author: authorQ.value } : {}) } });
  navigateTo({ path: "/search", query: { [mode.value === "like" ? "like" : mode.value === "rhyme" ? "rhyme" : "q"]: v, ...(sylIn.value ? { syl: sylIn.value } : {}), ...(stressIn.value ? { stress: stressIn.value } : {}) } });
}
const description = "Search inside the definitions of the 1913 Webster's: find the word for a meaning, in the words the dictionary itself used.";
useSeoMeta({ title: () => (rhyme.value ? `Rhymes for “${rhyme.value}”` : like.value ? `Synonyms of “${like.value}”` : inQuotes.value && q.value ? `“${q.value}” in quotations` : q.value ? `“${q.value}” in definitions` : "Search definitions"), description, ogDescription: description, robots: () => (active.value ? "noindex" : "index") });
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
        <label><input v-model="mode" type="radio" value="rhyme" /> Rhymes for a word</label>
        <label><input v-model="mode" type="radio" value="quotes" /> Words in quotations</label>
      </fieldset>
      <label for="defq" class="cap">{{ mode === "like" ? "Synonyms of" : mode === "rhyme" ? "Rhymes for" : mode === "quotes" ? "Search the quotations" : "Search inside definitions" }}</label>
      <div class="row">
        <input id="defq" v-model="input" type="search" class="in" :placeholder="mode === 'like' ? 'lofty, sad, walk' : mode === 'rhyme' ? 'time, night, sea' : mode === 'quotes' ? 'sea, moonlight, &quot;to be or not&quot;' : 'walk idly, a young salmon, dread of water'" autocomplete="off" />
        <button type="submit" class="btn go">Search</button>
      </div>
      <p v-if="mode === 'quotes' && data?.author" class="m">Only quotations from <NuxtLink :to="`/author/${data.author.key}`" class="x">{{ data.author.name }}</NuxtLink>. <NuxtLink :to="{ path: '/search', query: { q, in: 'quotes' } }" class="x">Search every author</NuxtLink></p>
      <fieldset v-if="mode !== 'quotes'" class="rhythm">
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
        <template v-else-if="mode === 'rhyme'">Words in this dictionary that rhyme in modern American pronunciation (the <NuxtLink to="/about#sounds" class="x">CMU</NuxtLink> pronouncing dictionary). For a word it lacks, words spelled alike from the stressed vowel on, which may not rhyme.</template>
        <template v-else-if="mode === 'quotes'">The 41,000 quotations the dictionary uses to show words in use, from Shakespeare, Milton, the Bible and 2,000 more. A few quotations are not recognised as such and are not searched.</template>
        <template v-else>Matches the words in the 1913 definitions (stemmed, so <i>walking</i> finds <i>walk</i>), not meanings: try the dictionary's own phrasing. Put a phrase in "double quotes".</template>
        <template v-if="mode !== 'quotes'">Rhythm comes from the dictionary's stress marks.</template>
      </p>
    </form>

    <template v-if="active && data">
      <p class="sum" role="status">
        <template v-if="inQuotes">
          <template v-if="data.total">{{ data.total.toLocaleString("en-US") }} {{ data.total === 1 ? "quotation" : "quotations" }} {{ data.broadened ? "contain any of" : "contain" }} “{{ q }}”<span v-if="data.broadened"> (none contain every word)</span>.</template>
          <template v-else>No quotation contains “{{ q }}”.</template>
        </template>
        <template v-else-if="rhyme">
          <template v-if="data.rhyme && data.kind === 'spelling'">{{ data.total.toLocaleString("en-US") }} {{ data.total === 1 ? "word" : "words" }} spelled like <NuxtLink :to="entryPath(data.rhyme.slug)" class="x">{{ data.rhyme.headword }}</NuxtLink> from its stressed vowel{{ rhythmText }}. <b>By spelling: these may not rhyme.</b></template>
          <template v-else-if="data.rhyme">{{ data.total.toLocaleString("en-US") }} {{ data.total === 1 ? "rhyme" : "rhymes" }} for <NuxtLink :to="entryPath(data.rhyme.slug)" class="x">{{ data.rhyme.headword }}</NuxtLink>{{ rhythmText }}.</template>
          <template v-else>“{{ rhyme }}” is not in this dictionary.</template>
        </template>
        <template v-else-if="like">
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
      <ol v-if="inQuotes" class="hits" :start="(page - 1) * data.per + 1">
        <li v-for="(h, i) in quoteHits" :key="i">
          <!-- Snippet from the edition; escaped in shared/search.ts, matches as <mark>. -->
          <blockquote class="hq"><p v-html="h.snippet" /><footer class="qa"><cite><NuxtLink :to="`/author/${h.authorKey}`" class="x">{{ h.ref ?? h.authorName }}</NuxtLink></cite>, under <NuxtLink :to="`${entryPath(h.slug)}#${h.anchor}`" class="x">{{ h.headword }}</NuxtLink></footer></blockquote>
        </li>
      </ol>
      <ol v-else class="hits" :start="(page - 1) * data.per + 1">
        <li v-for="h in data.hits" :key="h.slug">
          <!-- A wrapping row: Vue drops the whitespace between these, so plain inline text could not break (WCAG 1.4.10). -->
          <div class="hl">
            <NuxtLink :to="entryPath(h.slug)" class="hw x">{{ h.headword }}</NuxtLink>
            <span v-if="h.marked && h.marked !== h.headword" class="rh" aria-hidden="true">{{ marked(h.marked, h.headword) }}</span>
            <span v-if="h.pos" class="pos">{{ h.pos }}</span>
          </div>
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
.hq { margin: 0; font-size: 18px; line-height: 1.5; }
.hq p { margin: 0; }
.qa { margin-top: 4px; font-size: 15px; color: var(--mu); }
.qa::before { content: "\2014\00a0"; }
.hl { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }
.rh { color: var(--mu); font-size: 16px; overflow-wrap: anywhere; }
.hits { margin: 16px 0 0; padding-left: 36px; }
.hits li { padding: 12px 0; border-top: 1px solid var(--ln); }
.hits li::marker { color: var(--mu); font-size: 14px; }
.hw { font-size: 22px; font-weight: 700; }
.pos { color: var(--mu); font-size: 15px; }
.snip { margin: 4px 0 0; font-size: 17px; line-height: 1.5; }
@media (max-width: 560px) { .hits { padding-left: 28px; } }
.pager { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
</style>
