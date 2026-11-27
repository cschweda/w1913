<script setup lang="ts">
// The entry page (DESIGN.md §4a, docs/ui/entry-phase1.html). The entry comes
// first in the DOM; the rail (on this page, neighbors) follows it and is
// moved to the left on wide screens with CSS only.
import config from "../../../../w1913.config";
import { entryPath, RESERVED, slugify } from "../../shared/fold";

interface Entry {
  id: string; anchor: string; headword: string; headword_marked: string | null; pos: string | null;
  pos_title: string | null; sense_count: number; meta_html: string; body_html: string;
}
interface Page { slug: string; headword: string; entries: Entry[]; neighbors: { slug: string; headword: string; current: boolean }[] }

const props = defineProps<{ slug: string; reservedRoute: boolean }>();

// Canonical addresses: lower-case slugs; reserved words live under /w/.
const canonical = slugify(decodeURIComponent(props.slug));
const isReserved = RESERVED.has(canonical);
if (canonical && (canonical !== props.slug || isReserved !== props.reservedRoute)) {
  await navigateTo(entryPath(canonical), { redirectCode: 301 });
}

const { data, error } = await useFetch<Page>(`/_w/entry/${encodeURIComponent(canonical)}`, { key: `entry-${canonical}` });
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? "Not in this dictionary",
    data: (error.value?.data as { data?: unknown } | undefined)?.data ?? { word: canonical, suggestions: [] },
  });
}
const page = data.value;

/** Visible marked form: stress marks as the printed accents, syllables as middle dots. */
function shownMarked(m: string | null, fallback: string) {
  if (!m) return fallback;
  return m.replace(/\*/g, "·").replace(/"/g, "″").replace(/`/g, "′");
}
const sections = computed(() =>
  page.entries.map((e) => ({
    anchor: e.anchor,
    label: [e.pos ?? "entry", e.sense_count > 1 ? `${e.sense_count} senses` : ""].filter(Boolean).join(" · "),
  })),
);
const firstText = computed(() =>
  (page.entries[0]?.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 155),
);
const url = `${config.site.url}${entryPath(page.slug)}`;
useSeoMeta({
  title: page.headword,
  description: () => `${page.headword}: ${firstText.value}`,
  ogTitle: `${page.headword} · ${config.site.name}`,
  ogDescription: () => firstText.value,
  ogUrl: url,
});
useHead({ link: [{ rel: "canonical", href: url }] });
</script>

<template>
  <div>
    <TrailNav :current="page.slug" :headword="page.headword" />
    <div class="cols">
      <article class="entry" data-lookup>
        <h1 class="hw">{{ page.headword }}</h1>
        <div aria-hidden="true" class="bar" />
        <p v-if="page.entries.length > 1" class="m count">{{ page.entries.length }} entries</p>
        <section v-for="e in page.entries" :id="e.anchor" :key="e.id" class="sec" :aria-labelledby="`${e.anchor}-h`">
          <h2 :id="`${e.anchor}-h`" class="hh">
            <span aria-hidden="true">{{ shownMarked(e.headword_marked, e.headword) }}</span>
            <span class="vh">{{ e.headword }}</span>
            <abbr v-if="e.pos" :title="e.pos_title ?? undefined">{{ e.pos }}</abbr>
          </h2>
          <!-- Rendered at import from the edition (shared/render.ts); all text escaped there. -->
          <div v-html="e.meta_html" />
          <div v-html="e.body_html" />
        </section>
      </article>
      <EntryRail class="side" :sections="sections" :neighbors="page.neighbors" />
    </div>
  </div>
</template>

<style scoped>
.cols { display: flex; flex-wrap: wrap; gap: 48px; margin-top: 28px; }
.entry { flex: 999 1 560px; min-width: 0; max-width: 860px; }
.side { flex: 0 1 220px; }
@media (min-width: 900px) { .side { order: -1; } }
.hw { margin: 0; font-size: clamp(56px, 11vw, 160px); line-height: .9; font-weight: 700; letter-spacing: -.045em; overflow-wrap: anywhere; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 20px; }
.count { margin: 0; }
</style>
