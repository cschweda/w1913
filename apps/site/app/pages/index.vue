<script setup lang="ts">
// The home page is the search: front and centre, with a three-part guide to
// the ways in (DESIGN.md §4, "One-step lookup").
import config from "../../../../w1913.config";

useSeoMeta({ title: config.site.title, ogTitle: config.site.title, ogUrl: `${config.site.url}/` });
const examples = config.site.examples;
const host = config.site.url.replace(/^https?:\/\//, "");
</script>

<template>
  <div class="home">
    <SearchBox size="hero" autofocus />
    <div aria-hidden="true" class="bar" />

    <ol class="ways" aria-label="Ways to look up a word">
      <li>
        <span class="num">1</span>
        <span class="what">Type a word in the box</span>
        <span class="how">Suggestions appear as you type; Enter opens the closest.</span>
      </li>
      <li>
        <span class="num">2</span>
        <span class="what">Or use the address bar</span>
        <span class="how url">{{ host }}/<b>sublime</b></span>
      </li>
      <li>
        <span class="num">3</span>
        <span class="what">Press <kbd>/</kbd> anywhere</span>
        <span class="how">to come back to the search, from any page.</span>
      </li>
    </ol>

    <p class="try"><span class="cap">Try</span>
      <template v-for="(w, i) in examples" :key="w"><span v-if="i" aria-hidden="true"> · </span><NuxtLink :to="`/${w}`" class="x">{{ w }}</NuxtLink></template>
    </p>

    <p class="lede">
      <i>Webster's Revised Unabridged Dictionary</i> (1913): 113,409 entries with their quotations, etymologies, and
      essays on how near-synonyms differ, read the way a writer reads it.
    </p>
  </div>
</template>

<style scoped>
.home { max-width: 1040px; margin-top: clamp(24px, 6vh, 72px); }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 40px; }
.ways { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); border-top: 1px solid var(--fg); }
.ways li { display: grid; grid-template-rows: auto auto 1fr; gap: 6px; padding: 20px 24px 24px 0; border-bottom: 1px solid var(--ln); }
.num { font-size: 56px; font-weight: 700; line-height: 1; color: var(--ac); letter-spacing: -.04em; }
.what { font-size: 20px; font-weight: 700; }
.how { font-size: 16px; line-height: 1.45; color: var(--mu); }
.url { font-size: 20px; color: var(--fg); }
.url b { color: var(--ac); }
kbd { font: inherit; font-weight: 700; padding: 0 8px; border: 1px solid var(--fg); }
.try { margin: 32px 0 0; font-size: 20px; }
.try .cap { margin-right: 16px; }
.lede { margin: 40px 0 0; max-width: 720px; font-size: 18px; line-height: 1.5; color: var(--mu); }
@media (min-width: 900px) { .ways li + li { padding-left: 24px; border-left: 1px solid var(--ln); } }
</style>
