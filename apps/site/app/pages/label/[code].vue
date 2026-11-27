<script setup lang="ts">
// /label/<code>: the words carrying a label, in dictionary order, paginated.
import config from "../../../../../w1913.config";
import { entryPath } from "../../../shared/fold";
import { ldScript, webPageLd } from "../../../shared/structured";

interface Data { label: { code: string; name: string; kind: string; forms: string; pages: number; senses: number }; words: { slug: string; headword: string; pos: string | null; first_sense: string }[]; page: number; per: number }
const route = useRoute();
const code = computed(() => String(route.params.code));
const page = computed(() => Math.max(1, Number(route.query.page ?? 1) || 1));
const { data, error } = await useFetch<Data>(() => `/_w/label/${code.value}`, { query: { page }, key: computed(() => `label-${code.value}-${page.value}`) });
if (error.value) throw createError({ statusCode: 404, statusMessage: "No such label", fatal: false });
const pages = computed(() => (data.value ? Math.ceil(data.value.label.pages / data.value.per) : 1));
const name = computed(() => data.value?.label.name ?? code.value);
const description = computed(() => `${data.value?.label.pages.toLocaleString("en-US")} words marked ${name.value.toLowerCase()} in the 1913 Webster's, in dictionary order.`);
useSeoMeta({ title: () => `${name.value} words`, description, ogDescription: description });
useHead({ script: [ldScript(webPageLd({ type: "CollectionPage", url: `${config.site.url}/label/${code.value}`, name: `${name.value} · W1913`, description: description.value, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div v-if="data" class="page">
    <p class="cap"><NuxtLink to="/label" class="x">Labels</NuxtLink> / {{ data.label.kind === "usage" ? "How words were used" : "Trades and sciences" }}</p>
    <h1 class="title">{{ name }}</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      {{ data.label.pages.toLocaleString("en-US") }} words ({{ data.label.senses.toLocaleString("en-US") }} senses), printed as
      <span v-for="(f, i) in data.label.forms.split(' | ')" :key="f"><span v-if="i">, </span><code>{{ f }}</code></span><span v-if="!data.label.forms.endsWith('.')">.</span>{{ " " }}
      <NuxtLink :to="`/cards?deck=label:${data.label.code}`" class="x">Make a card deck of these</NuxtLink>
    </p>
    <ol class="words" :start="(page - 1) * data.per + 1">
      <li v-for="w in data.words" :key="w.slug">
        <NuxtLink :to="entryPath(w.slug)" class="hw x">{{ w.headword }}</NuxtLink>
        <span v-if="w.pos" class="pos">{{ w.pos }}</span>
        <span class="fs">{{ w.first_sense }}</span>
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
.page { max-width: 1000px; }
.title { margin: 8px 0 0; font-size: clamp(44px, 8vw, 104px); line-height: .95; font-weight: 700; letter-spacing: -.045em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 20px; }
.lede { max-width: 760px; margin: 0; font-size: 17px; line-height: 1.6; }
code { font: inherit; font-weight: 700; }
.words { margin: 24px 0 0; padding-left: 52px; }
.words li { padding: 10px 0; border-top: 1px solid var(--ln); }
.words li::marker { color: var(--mu); font-size: 14px; }
.hw { font-size: 19px; font-weight: 700; }
.pos { margin: 0 10px 0 8px; color: var(--mu); font-size: 14px; }
.fs { color: var(--mu); font-size: 15px; display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 560px) { .words { padding-left: 36px; } }
.pager { display: flex; align-items: center; gap: 24px; margin-top: 24px; }
</style>
