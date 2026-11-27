<script setup lang="ts">
// /label: every label, usage then subject, with how many words carry it.
import config from "../../../../../w1913.config";
import { ldScript, webPageLd } from "../../../shared/structured";

interface Row { code: string; name: string; kind: string; forms: string; pages: number; senses: number }
const { data } = await useFetch<Row[]>("/_w/labels", { key: "labels" });
const usage = computed(() => (data.value ?? []).filter((l) => l.kind === "usage"));
const subject = computed(() => (data.value ?? []).filter((l) => l.kind === "subject"));
const description = "Browse the 1913 Webster's by label: obsolete, rare, poetic and colloquial words, and words of nautical, legal, heraldic and 80 more trades and sciences.";
useSeoMeta({ title: "Labels", description, ogDescription: description });
useHead({ script: [ldScript(webPageLd({ type: "CollectionPage", url: `${config.site.url}/label`, name: "Labels · W1913", description, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div class="page">
    <h1 class="title">Labels</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      The 1913 Webster's marks words by how they were used (<i>obsolete</i>, <i>poetic</i>, <i>colloquial</i>) and by the
      trade or science they belong to. Each label opens its words, in dictionary order, and a card deck.
    </p>
    <section v-for="[title, list] in [['How words were used', usage], ['Trades and sciences', subject]] as const" :key="title" class="grp" :aria-label="title">
      <h2 class="cap gh">{{ title }}</h2>
      <ul class="labels">
        <li v-for="l in list" :key="l.code">
          <NuxtLink :to="`/label/${l.code}`" class="x">{{ l.name }}</NuxtLink>
          <span class="n">{{ l.pages.toLocaleString("en-US") }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 1040px; }
.title { margin: 0; font-size: clamp(48px, 9vw, 120px); line-height: .9; font-weight: 700; letter-spacing: -.045em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 24px; }
.lede { max-width: 720px; margin: 0; font-size: 19px; line-height: 1.5; }
.grp { margin-top: 36px; }
.gh { margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid var(--fg); font-weight: 400; }
.labels { list-style: none; margin: 0; padding: 0; columns: 3 220px; column-gap: 32px; font-size: 18px; }
.labels li { break-inside: avoid; display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--ln); }
.n { color: var(--mu); font-size: 15px; font-variant-numeric: tabular-nums; }
</style>
