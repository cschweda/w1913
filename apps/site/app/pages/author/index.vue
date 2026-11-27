<script setup lang="ts">
// /author: the authors the 1913 quotes, most quoted first (DESIGN.md §4, "How did the masters use it?").
import config from "../../../../../w1913.config";
import { ldScript, webPageLd } from "../../../shared/structured";

interface Row { key: string; name: string; kind: string; quotes: number; words: number; known: number }
const { data } = await useFetch<Row[]>("/_w/authors", { key: "authors" });
const known = computed(() => (data.value ?? []).filter((a) => a.known));
const others = computed(() => (data.value ?? []).filter((a) => !a.known && a.quotes >= 3));
const total = computed(() => (data.value ?? []).reduce((n, a) => n + a.quotes, 0));
const description = "The writers the 1913 Webster's quotes to show words in use: Shakespeare, Milton, Dryden, the Bible and hundreds more, each with their quotations.";
useSeoMeta({ title: "Authors", description, ogDescription: description });
useHead({ script: [ldScript(webPageLd({ type: "CollectionPage", url: `${config.site.url}/author`, name: "Authors · W1913", description, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div class="page">
    <p class="cap reserved">Looking for the word <i>author</i>? <NuxtLink to="/w/author" class="x">See its entry</NuxtLink>.</p>
    <h1 class="title">How did the masters use it?</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      The 1913 Webster's shows words in use with {{ total.toLocaleString("en-US") }} quotations. Here are the writers it quotes, most quoted first;
      each opens their quotations, and a card deck of the words they are quoted under.
      <NuxtLink :to="{ path: '/search', query: { in: 'quotes' } }" class="x">Search the quotations</NuxtLink>.
    </p>
    <section class="grp" aria-labelledby="known-h">
      <h2 id="known-h" class="cap gh">Most quoted</h2>
      <ul class="authors">
        <li v-for="a in known" :key="a.key">
          <NuxtLink :to="`/author/${a.key}`" class="x">{{ a.name }}</NuxtLink>
          <span class="n">{{ a.quotes.toLocaleString("en-US") }}</span>
        </li>
      </ul>
    </section>
    <section class="grp" aria-labelledby="other-h">
      <h2 id="other-h" class="cap gh">Also quoted, as printed</h2>
      <p class="m">Names the dictionary gives in a short form we have not expanded, quoted three times or more.</p>
      <ul class="authors">
        <li v-for="a in others" :key="a.key">
          <NuxtLink :to="`/author/${a.key}`" class="x">{{ a.name }}</NuxtLink>
          <span class="n">{{ a.quotes.toLocaleString("en-US") }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 1040px; }
.reserved { margin: 24px 0 0; }
.title { margin: 8px 0 0; font-size: clamp(36px, 6vw, 80px); line-height: 1; font-weight: 700; letter-spacing: -.04em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 20px; }
.lede { max-width: 760px; margin: 0; font-size: 19px; line-height: 1.5; }
.grp { margin-top: 36px; }
.gh { margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid var(--fg); font-weight: 400; }
.authors { list-style: none; margin: 0; padding: 0; columns: 3 240px; column-gap: 32px; font-size: 17px; }
.authors li { break-inside: avoid; display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--ln); }
.n { color: var(--mu); font-size: 15px; font-variant-numeric: tabular-nums; }
</style>
