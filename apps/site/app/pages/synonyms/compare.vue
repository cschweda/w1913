<script setup lang="ts">
// /synonyms/compare?w=abandon,desert,forsake: two or three words side by side.
import { entryPath } from "../../../shared/fold";

interface Word { slug: string; headword: string; found: boolean; entries: { anchor: string; pos: string | null; pos_title: string | null; summary: string }[] }
interface Essay { id: number; slug: string; headword: string; html: string }
const route = useRoute();
const w = computed(() => String(route.query.w ?? ""));
const { data, error } = await useFetch<{ words: Word[]; essays: Essay[] }>("/_w/compare", { query: { w }, key: `compare-${w.value}` });
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 400, statusMessage: error.value.statusMessage ?? "Compare needs two or three words", fatal: false });
const words = computed(() => data.value?.words ?? []);
const title = computed(() => words.value.map((x) => x.headword).join(", "));
useSeoMeta({ title: () => `Compare ${title.value}`, robots: "noindex" });
</script>

<template>
  <div class="page">
    <SearchBox size="bar" class="lookup" />
    <p class="cap"><NuxtLink to="/synonyms" class="x">Synonyms</NuxtLink> / Compare</p>
    <h1 class="title">{{ title }}</h1>
    <div aria-hidden="true" class="bar" />
    <div class="cols" :style="{ '--n': words.length }">
      <section v-for="x in words" :key="x.slug" class="col" :aria-labelledby="`c-${x.slug}`">
        <h2 :id="`c-${x.slug}`" class="ch"><NuxtLink :to="entryPath(x.slug)" class="x">{{ x.headword }}</NuxtLink></h2>
        <p v-if="!x.found" class="m">Not in this dictionary.</p>
        <div v-for="e in x.entries" :key="e.anchor" class="ce">
          <p class="pos"><abbr v-if="e.pos" :title="e.pos_title ?? undefined">{{ e.pos }}</abbr></p>
          <p class="sum">{{ e.summary }}</p>
          <NuxtLink :to="`${entryPath(x.slug)}#${e.anchor}`" class="t more">Full entry →</NuxtLink>
        </div>
      </section>
    </div>
    <section v-if="data?.essays.length" class="essays" aria-labelledby="ess-h">
      <h2 id="ess-h" class="cap eh2">How the dictionary tells them apart</h2>
      <div v-for="e in data.essays" :key="e.id" class="one">
        <!-- Rendered at import (shared/render.ts); text escaped there. -->
        <div v-html="e.html" />
        <p class="m">From the entry <NuxtLink :to="entryPath(e.slug)" class="x">{{ e.headword }}</NuxtLink>.</p>
      </div>
    </section>
    <p v-else class="m none">The dictionary has no essay comparing these words.</p>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.lookup { margin: 0 0 32px; max-width: 860px; }
.title { margin: 8px 0 0; font-size: clamp(36px, 6vw, 80px); line-height: 1; font-weight: 700; letter-spacing: -.04em; overflow-wrap: normal; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 32px; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0; border-top: 1px solid var(--fg); }
.col { padding: 20px 24px 24px 0; border-bottom: 1px solid var(--ln); min-width: 0; }
@media (min-width: 800px) { .col + .col { padding-left: 24px; border-left: 1px solid var(--ln); } }
.ch { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -.02em; }
.ce { margin-top: 16px; }
.pos { margin: 0; font-size: 15px; color: var(--mu); }
.sum { margin: 4px 0 0; font-size: 17px; line-height: 1.5; }
.more { font-size: 14px; }
.essays { margin-top: 48px; }
.eh2 { margin: 0 0 8px; font-weight: 400; }
.one { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--fg); }
.none { margin-top: 32px; }
</style>
