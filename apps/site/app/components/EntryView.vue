<script setup lang="ts">
// The entry page (DESIGN.md §4a, docs/ui/entry-phase1.html). The entry comes
// first in the DOM; the rail (on this page, neighbors) follows it and is
// moved to the left on wide screens with CSS only.
import config from "../../../../w1913.config";
import { entryPath, RESERVED, slugify } from "../../shared/fold";
import { abbreviationsIn } from "../../shared/abbreviations";
import { prosodyOf } from "../../shared/prosody";
import { definedTermLd, ldScript } from "../../shared/structured";

interface Entry {
  id: string; anchor: string; headword: string; headword_marked: string | null; pos: string | null;
  pos_title: string | null; sense_count: number; meta_html: string; body_html: string;
}
interface Page {
  slug: string; headword: string; entries: Entry[];
  neighbors: { slug: string; headword: string; current: boolean }[];
  backlinks: { slug: string; headword: string }[];
  listedUnder: { slug: string; headword: string }[];
  essaysElsewhere: { id: number; slug: string; headword: string; anchor: string; html: string }[];
}

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
/**
 * Rule: a headword never breaks inside a word. Lines may break at spaces and
 * hyphens, so the size is fitted to the longest run without them; CSS takes
 * the smaller of the design size and the size at which that run fits the
 * entry column (DESIGN.md §4a type scale).
 */
const longestRun = (s: string) => Math.max(1, ...s.split(/[\s-]+/).map((w) => [...w].length));
const fit = (s: string) => ({ "--n": String(longestRun(s)) });

const prosody = computed(() => Object.fromEntries(page.entries.map((e) => [e.id, prosodyOf(e.headword_marked)])));

// The key: every abbreviation decoded on this page, parts of speech included.
const hasUnusual = computed(() => page.entries.some((e) => e.body_html.includes('class="rare"')));
const abbreviations = computed(() => {
  const html = page.entries
    .map((e) => `${e.pos && e.pos_title ? `<abbr title="${e.pos_title}">${e.pos}</abbr>` : ""}${e.meta_html}${e.body_html}`)
    .join("");
  return abbreviationsIn(html);
});

// Many pages are pointed to by hundreds of entries; show the first ones.
const BACKLINKS_SHOWN = 60;
const showAllBacklinks = ref(false);
const backlinksShown = computed(() => (showAllBacklinks.value ? page.backlinks : page.backlinks.slice(0, BACKLINKS_SHOWN)));

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
const description = computed(() => `${page.headword}: ${firstText.value}`);
useSeoMeta({ twitterDescription: () => firstText.value, twitterTitle: `${page.headword} · ${config.site.name}` });
useHead({
  link: [{ rel: "canonical", href: url, key: "canonical" }],
  script: [ldScript(definedTermLd({ url, headword: page.headword, description: description.value, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")],
});
</script>

<template>
  <div>
    <TrailNav :current="page.slug" :headword="page.headword" />
    <div class="cols">
      <article class="entry" data-lookup>
        <SearchBox size="bar" class="lookup" />
        <h1 class="hw" :style="fit(page.headword)">{{ page.headword }}</h1>
        <div aria-hidden="true" class="bar" />
        <SayIt :word="page.headword" />
        <p v-if="page.entries.length > 1" class="m count">{{ page.entries.length }} entries</p>
        <section v-for="e in page.entries" :id="e.anchor" :key="e.id" class="sec" :aria-labelledby="`${e.anchor}-h`">
          <h2 :id="`${e.anchor}-h`" class="hh" :style="fit(shownMarked(e.headword_marked, e.headword))">
            <span aria-hidden="true">{{ shownMarked(e.headword_marked, e.headword) }}</span>
            <span class="vh">{{ e.headword }}</span>
            <abbr v-if="e.pos" :title="e.pos_title ?? undefined">{{ e.pos }}</abbr>
          </h2>
          <p v-if="prosody[e.id]" class="pros">
            <span aria-hidden="true" class="syls">
              <template v-for="(s, i) in prosody[e.id]!.syllables" :key="i"><span v-if="i" class="dot">·</span><span :class="['syl', `s${s.stress}`]">{{ s.text }}</span></template>
            </span>
            <span class="pros-text">{{ prosody[e.id]!.summary }}</span>
          </p>
          <!-- Rendered at import from the edition (shared/render.ts); all text escaped there. -->
          <div v-html="e.meta_html" />
          <div v-html="e.body_html" />
        </section>

        <section v-if="page.essaysElsewhere.length" class="sec more" aria-labelledby="else-h">
          <h2 id="else-h" class="hh small">Essays that discuss {{ page.headword }}</h2>
          <p class="m">Printed under other entries, on how near-synonyms differ.</p>
          <div v-for="x in page.essaysElsewhere" :key="x.id" class="elsewhere">
            <!-- Rendered at import (shared/render.ts); text escaped there. -->
            <div v-html="x.html" />
            <p class="m">From the entry <NuxtLink :to="`${entryPath(x.slug)}#${x.anchor}-syn`" class="x">{{ x.headword }}</NuxtLink>.</p>
          </div>
        </section>

        <section v-if="page.listedUnder.length" class="sec more" aria-labelledby="under-h">
          <h2 id="under-h" class="hh small">Listed as a synonym under <span class="n">{{ page.listedUnder.length }}</span></h2>
          <p class="m">Entries whose synonym lists name {{ page.headword }}.</p>
          <ul class="back">
            <li v-for="b in page.listedUnder" :key="b.slug"><NuxtLink :to="entryPath(b.slug)" class="x">{{ b.headword }}</NuxtLink></li>
          </ul>
        </section>

        <section v-if="page.backlinks.length" class="sec more" aria-labelledby="back-h">
          <h2 id="back-h" class="hh small">Words that point here <span class="n">{{ page.backlinks.length }}</span></h2>
          <p class="m">Entries that say “See {{ page.headword }}”, “Cf. {{ page.headword }}”, or “Same as {{ page.headword }}”.</p>
          <ul class="back">
            <li v-for="b in backlinksShown" :key="b.slug"><NuxtLink :to="entryPath(b.slug)" class="x">{{ b.headword }}</NuxtLink></li>
          </ul>
          <button v-if="page.backlinks.length > BACKLINKS_SHOWN && !showAllBacklinks" type="button" class="btn btn-quiet all" @click="showAllBacklinks = true">
            Show all {{ page.backlinks.length }}
          </button>
        </section>

        <section v-if="abbreviations.length || hasUnusual" class="sec more" aria-labelledby="abbr-h">
          <h2 id="abbr-h" class="hh small">Key</h2>
          <p v-if="hasUnusual" class="m keyline">
            <span class="rare-sample" aria-hidden="true">word</span> A dashed underline marks a word that is rare in the
            dictionary's own definitions: point at it, or tab to it, for its first sense.
          </p>
          <dl class="key">
            <div v-for="a in abbreviations" :key="a.abbr"><dt>{{ a.abbr }}</dt><dd>{{ a.meaning }}</dd></div>
          </dl>
        </section>
      </article>
      <EntryRail class="side" :sections="sections" :neighbors="page.neighbors" />
    </div>
  </div>
</template>

<style scoped>
.lookup { margin: 0 0 40px; }
.cols { display: flex; flex-wrap: wrap; gap: 48px; margin-top: 28px; }
.entry { flex: 999 1 560px; min-width: 0; max-width: 860px; }
.side { flex: 0 1 220px; }
@media (min-width: 900px) { .side { order: -1; } }
.entry { container-type: inline-size; }
/* 0.62em is a safe average width for Inter Bold with this tracking (wide
   letters like m and w included); see the rule above fit(). */
.hw { margin: 0; font-size: min(clamp(56px, 11vw, 160px), calc(100cqi / (var(--n, 8) * 0.62))); line-height: .95; font-weight: 700; letter-spacing: -.045em; overflow-wrap: normal; hyphens: none; }
.hh { font-size: min(32px, calc(100cqi / (var(--n, 8) * 0.6))); overflow-wrap: normal; hyphens: none; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 20px; }
.count { margin: 0; }
.pros { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; margin: 10px 0 0; }
.syls { font-size: 20px; letter-spacing: .01em; }
.dot { margin: 0 6px; color: var(--mu); }
.syl.s0 { color: var(--mu); }
.syl.s1 { color: var(--fg); font-weight: 700; box-shadow: inset 0 -3px 0 var(--ac); }
.syl.s2 { color: var(--fg); font-weight: 500; box-shadow: inset 0 -1px 0 var(--mu); }
.pros-text { font-size: 14px; color: var(--mu); }
.more { margin-top: 56px; }
.small { font-size: 22px; }
.n { font-size: 15px; font-weight: 400; color: var(--mu); margin-left: 8px; }
.back { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 20px; font-size: 18px; line-height: 1.8; }
.all { margin-top: 16px; }
.keyline { display: flex; gap: 12px; align-items: baseline; }
.rare-sample { color: var(--fg); border-bottom: 1px dashed var(--ac); }
.key { margin: 16px 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px 24px; font-size: 15px; }
.key div { display: flex; gap: 10px; }
.key dt { font-weight: 700; min-width: 56px; }
.key dd { margin: 0; color: var(--mu); }
.elsewhere { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--ln); }
</style>
