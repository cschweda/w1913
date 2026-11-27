<script setup lang="ts">
// /author/<key>: one author's quotations in dictionary order, each under the word it illustrates.
import config from "../../../../../w1913.config";
import { entryPath } from "../../../shared/fold";
import { ldScript, webPageLd } from "../../../shared/structured";

interface Data {
  author: { key: string; name: string; kind: string; forms: string; quotes: number; words: number; known: number };
  quotes: { slug: string; anchor: string; sense_n: number | null; text: string; author: string; ref: string | null; headword: string }[];
  page: number; per: number;
}
const route = useRoute();
const key = computed(() => String(route.params.key));
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1));
const { data, error } = await useFetch<Data>(() => `/_w/author/${key.value}`, { query: { page }, key: computed(() => `author-${key.value}-${page.value}`) });
if (error.value) throw createError({ statusCode: 404, statusMessage: "No such author", fatal: false });
const pages = computed(() => (data.value ? Math.ceil(data.value.author.quotes / data.value.per) : 1));
const name = computed(() => data.value?.author.name ?? key.value);
const description = computed(() => `${data.value?.author.quotes.toLocaleString("en-US")} quotations from ${name.value} in the 1913 Webster's, each under the word it shows in use.`);
useSeoMeta({ title: () => `${name.value}: quotations`, description, ogDescription: description });
useHead({ script: [ldScript(webPageLd({ type: "CollectionPage", url: `${config.site.url}/author/${key.value}`, name: `${name.value} · W1913`, description: description.value, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div v-if="data" class="page">
    <p class="cap"><NuxtLink to="/author" class="x">Authors</NuxtLink></p>
    <h1 class="title">{{ name }}</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      {{ data.author.quotes.toLocaleString("en-US") }} {{ data.author.quotes === 1 ? "quotation" : "quotations" }} under
      {{ data.author.words.toLocaleString("en-US") }} {{ data.author.words === 1 ? "word" : "words" }}<template v-if="data.author.known && data.author.kind !== 'scripture'">, cited as
      <span v-for="(f, i) in data.author.forms.split(' | ')" :key="f"><span v-if="i">, </span><b>{{ f }}</b></span></template>.
      <NuxtLink :to="`/cards?deck=author:${data.author.key}`" class="x">Make a card deck of these words</NuxtLink>.
      <NuxtLink :to="{ path: '/search', query: { in: 'quotes', author: data.author.key } }" class="x">Search these quotations</NuxtLink>.
    </p>
    <ol class="quotes" :start="(page - 1) * data.per + 1">
      <li v-for="(q, i) in data.quotes" :key="i">
        <NuxtLink :to="`${entryPath(q.slug)}#${q.anchor}${q.sense_n ? `-${q.sense_n}` : ''}`" class="hw x">{{ q.headword }}</NuxtLink>
        <blockquote class="qt"><p>{{ q.text }}</p><footer v-if="q.ref || !data.author.known" class="qa">{{ q.ref ?? q.author }}</footer></blockquote>
      </li>
    </ol>
    <nav v-if="pages > 1" aria-label="Pages" class="pager">
      <NuxtLink v-if="page > 1" :to="{ query: { page: page - 1 } }" class="t">← Previous</NuxtLink>
      <span class="cap">Page {{ page }} of {{ pages }}</span>
      <NuxtLink v-if="page < pages" :to="{ query: { page: page + 1 } }" class="t">Next →</NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.page { max-width: 900px; }
.title { margin: 8px 0 0; font-size: clamp(40px, 7vw, 96px); line-height: .95; font-weight: 700; letter-spacing: -.045em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 20px; }
.lede { margin: 0; font-size: 17px; line-height: 1.6; }
.quotes { margin: 24px 0 0; padding-left: 52px; }
.quotes li { padding: 14px 0; border-top: 1px solid var(--ln); }
.quotes li::marker { color: var(--mu); font-size: 14px; }
.hw { font-size: 20px; font-weight: 700; }
.qt { margin: 6px 0 0; font-size: 18px; line-height: 1.55; }
.qt p { margin: 0; }
.qa { margin-top: 2px; font-size: 15px; color: var(--mu); }
.qa::before { content: "\2014\00a0"; }
@media (max-width: 560px) { .quotes { padding-left: 36px; } }
.pager { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
</style>
