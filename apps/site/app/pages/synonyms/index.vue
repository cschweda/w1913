<script setup lang="ts">
// /synonyms: every essay on how near-synonyms differ, A to Z (DESIGN.md §4).
import { entryPath } from "../../../shared/fold";

interface Row { id: number; title: string; slug: string; headword: string; anchor: string; sort_key: string }
const { data } = await useFetch<Row[]>("/_w/essays", { key: "essays" });
const rows = computed(() => data.value ?? []);
const groups = computed(() => {
  const m = new Map<string, Row[]>();
  for (const r of rows.value) {
    const k = (r.sort_key.replace(/^to\s+/, "")[0] ?? "#").toUpperCase();
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return [...m.entries()];
});
useSeoMeta({ title: "Synonyms", description: "The 1913 Webster's essays on how near-synonyms differ, collected A to Z." });
</script>

<template>
  <div class="page">
    <SearchBox size="bar" class="lookup" />
    <h1 class="title">Synonyms</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      The dictionary's {{ rows.length }} short essays on how near-synonyms differ: <i>abandon</i> from <i>desert</i>
      and <i>forsake</i>, <i>subtle</i> from <i>sly</i>. Each opens on the entry that prints it.
    </p>
    <nav aria-label="Letters" class="letters">
      <a v-for="[k] in groups" :key="k" :href="`#l-${k}`" class="t">{{ k }}</a>
    </nav>
    <section v-for="[k, list] in groups" :id="`l-${k}`" :key="k" class="grp" :aria-labelledby="`l-${k}-h`">
      <h2 :id="`l-${k}-h`" class="lh">{{ k }}</h2>
      <ul class="es">
        <li v-for="r in list" :key="r.id">
          <NuxtLink :to="`${entryPath(r.slug)}#${r.anchor}-syn`" class="x">{{ r.title }}</NuxtLink>
          <span v-if="!r.title.toLowerCase().startsWith(r.headword.toLowerCase())" class="from"> under {{ r.headword }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 1040px; }
.lookup { margin: 0 0 40px; max-width: 860px; }
.title { margin: 0; font-size: clamp(48px, 9vw, 120px); line-height: .9; font-weight: 700; letter-spacing: -.045em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 24px; }
.lede { max-width: 720px; margin: 0; font-size: 19px; line-height: 1.5; }
.letters { display: flex; flex-wrap: wrap; gap: 0 4px; margin: 32px 0 0; padding: 8px 0; border-top: 1px solid var(--fg); border-bottom: 1px solid var(--ln); font-weight: 700; }
.letters a { min-width: 44px; justify-content: center; }
.grp { margin-top: 32px; }
.lh { margin: 0 0 8px; font-size: 32px; font-weight: 700; color: var(--ac); }
.es { list-style: none; margin: 0; padding: 0; columns: 3 260px; column-gap: 32px; font-size: 17px; line-height: 1.5; }
.es li { break-inside: avoid; padding: 6px 0; }
.from { color: var(--mu); font-size: 14px; }
</style>
