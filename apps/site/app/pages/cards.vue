<script setup lang="ts">
// Cards (DESIGN.md §4 "Teach me a word", §4a "Cards page", §5): one word at
// a time from a deck. Decks: Random (card_ok entries) and Trail (the words
// visited in this tab). "Show first": the word, or the definition (reverse
// mode). The flip is a disclosure: the button carries aria-expanded, the
// hidden face is not rendered, and the revealed face is announced. Space or
// Enter flips and the arrow keys move, never while focus is in a form field
// or on another control, and every key has a button. No 3D, no motion under
// prefers-reduced-motion. Deck state lives in the browser.
import config from "../../../../w1913.config";
import type { Card } from "../../shared/cards";
import { entryPath } from "../../shared/fold";
import { ldScript, webPageLd } from "../../shared/structured";

/** "random", "trail", "label:<code>" or "q:<query>" (DESIGN.md §4 deck kinds). */
type DeckName = string;
const route = useRoute();
const deckName = ref<DeckName>(typeof route.query.deck === "string" && route.query.deck ? route.query.deck : "random");
const showFirst = ref<"word" | "definition">(route.query.show === "definition" ? "definition" : "word");
const cards = ref<Card[]>([]);
const index = ref(0);
const flipped = ref(false);
const loading = ref(true);
const { trail } = useTrail();
const { data: labelList } = await useFetch<{ code: string; name: string }[]>("/_w/labels", { key: "labels-for-cards" });
const labelName = (code: string) => labelList.value?.find((l) => l.code === code)?.name ?? code;
/** Three label decks offered as buttons, as in the mockup; any other label is reached from its label page. */
const QUICK = ["poetic", "nautical", "obs"];
/** An author deck's title: the author's name, fetched with the deck's first page. */
const { data: authorInfo } = await useFetch<{ author: { name: string } } | null>(() => (deckName.value.startsWith("author:") ? `/_w/author/${deckName.value.slice(7)}` : "/_w/author/none"), { key: computed(() => `deck-author-${deckName.value}`), default: () => null, server: false });
const authorName = computed(() => authorInfo.value?.author?.name ?? null);

const card = computed(() => cards.value[index.value] ?? null);
const deckLabel = computed(() => {
  const d = deckName.value;
  if (d === "random") return "Random deck";
  if (d === "trail") return "Trail deck";
  if (d.startsWith("label:")) return `${labelName(d.slice(6))} deck`;
  if (d.startsWith("q:")) return `Search deck: “${d.slice(2)}”`;
  if (d.startsWith("author:")) return `${authorName.value ?? d.slice(7)} deck`;
  return "Deck";
});

async function deal() {
  loading.value = true;
  flipped.value = false;
  index.value = 0;
  try {
    if (deckName.value === "trail") {
      const slugs = trail.value.map((t) => t.slug).slice(-config.features.deckSize);
      cards.value = slugs.length ? await $fetch<Card[]>("/_w/cards", { query: { slugs: slugs.join(",") } }) : [];
    } else {
      cards.value = await $fetch<Card[]>("/_w/cards", { query: { deck: deckName.value } });
    }
  } finally {
    loading.value = false;
  }
}

function choose(name: DeckName) {
  deckName.value = name;
  navigateTo({ query: { ...route.query, deck: name === "random" ? undefined : name } }, { replace: true });
  deal();
}
function setShow(v: "word" | "definition") {
  showFirst.value = v;
  flipped.value = false;
  navigateTo({ query: { ...route.query, show: v === "word" ? undefined : v } }, { replace: true });
}
const flip = () => { if (card.value) flipped.value = !flipped.value; };
const prev = () => { if (index.value > 0) { index.value--; flipped.value = false; } };
const next = () => { if (index.value < cards.value.length - 1) { index.value++; flipped.value = false; } };

/** Keys act only when focus is on the page itself, not in a field or on a control (which handle their own keys). */
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.closest("input, textarea, select, button, a, [contenteditable=true], [role=combobox], [role=listbox]"))) return;
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
}
onMounted(() => { deal(); document.addEventListener("keydown", onKey); });
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));

const longestRun = (s: string) => Math.max(1, ...s.split(/[\s-]+/).map((w) => [...w].length));
const shownMarked = (m: string | null, fallback: string) => (m ? m.replace(/\*/g, "·").replace(/"/g, "″").replace(/`/g, "′") : fallback);

const description = "Cards from the 1913 Webster's: a word at a time, at random or from your trail. Flip for the definition and similar words.";
useSeoMeta({ title: "Cards", description, ogDescription: description, twitterDescription: description });
useHead({ script: [ldScript(webPageLd({ url: `${config.site.url}/cards`, name: "Cards · W1913", description, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div class="page">
    <h1 class="cap title">Cards</h1>
    <div class="controls">
      <div role="group" aria-label="Deck" class="grp">
        <span class="cap lab" aria-hidden="true">Deck</span>
        <button type="button" :class="['btn', { on: deckName === 'random' }]" :aria-pressed="deckName === 'random'" @click="choose('random')">Random</button>
        <button v-for="c in QUICK" :key="c" type="button" :class="['btn', { on: deckName === `label:${c}` }]" :aria-pressed="deckName === `label:${c}`" @click="choose(`label:${c}`)">{{ labelName(c) }}</button>
        <button type="button" :class="['btn', { on: deckName === 'trail' }]" :aria-pressed="deckName === 'trail'" @click="choose('trail')">Trail</button>
        <NuxtLink to="/label" class="t x all">All labels</NuxtLink>
        <button type="button" class="btn btn-quiet" @click="deal">New deck</button>
      </div>
      <div role="group" aria-label="Show first" class="grp">
        <span class="cap lab" aria-hidden="true">Show first</span>
        <button type="button" :class="['btn', { on: showFirst === 'word' }]" :aria-pressed="showFirst === 'word'" @click="setShow('word')">Word</button>
        <button type="button" :class="['btn', { on: showFirst === 'definition' }]" :aria-pressed="showFirst === 'definition'" @click="setShow('definition')">Definition</button>
      </div>
    </div>

    <section class="card" aria-labelledby="card-cap">
      <div id="card-cap" class="cap cardcap">
        <span>{{ deckLabel }}</span>
        <span v-if="cards.length">Card {{ index + 1 }} of {{ cards.length }}</span>
      </div>

      <div id="card-face" class="face" aria-live="polite">
        <p v-if="loading" class="m empty">Dealing…</p>
        <div v-else-if="!card" class="empty">
          <p v-if="deckName === 'trail'" class="m">Your trail is empty. Look up a few words, then come back for a deck of them.</p>
          <p v-else class="m">No cards in this deck.</p>
          <NuxtLink to="/" class="t x">Look up a word</NuxtLink>
        </div>

        <!-- The face showing the word: the front in word-first mode, the back in reverse mode. -->
        <div v-else-if="(showFirst === 'word') !== flipped" class="front">
          <h2 class="big" :style="{ '--n': String(longestRun(card.headword)) }">{{ card.headword }}</h2>
          <div aria-hidden="true" class="bar" />
          <p v-if="!flipped" class="m">Say what it means, then flip the card.</p>
          <p v-else class="m"><NuxtLink :to="`${entryPath(card.slug)}#${card.anchor}`" class="x">Open the full entry</NuxtLink></p>
        </div>

        <!-- The face showing the definition. -->
        <div v-else class="back">
          <h2 v-if="showFirst === 'word'" class="bh">
            <span aria-hidden="true">{{ shownMarked(card.marked, card.headword) }}</span><span class="vh">{{ card.headword }}</span>
            <abbr v-if="card.pos" :title="card.posTitle ?? undefined">{{ card.pos }}</abbr>
          </h2>
          <h2 v-else class="bh"><span class="cap">What's the word?</span> <abbr v-if="card.pos" :title="card.posTitle ?? undefined">{{ card.pos }}</abbr></h2>
          <ol class="senses">
            <li v-for="(s, i) in card.senses" :key="i">{{ s }}</li>
          </ol>
          <!-- The quotation usually contains the word, so it is shown only when the word is already on the card. -->
          <blockquote v-if="showFirst === 'word' && card.quote" class="cq">
            <p>{{ card.quote.text }}</p>
            <footer class="qa"><cite><NuxtLink :to="`/author/${card.quote.key}`" class="x">{{ card.quote.author }}</NuxtLink></cite></footer>
          </blockquote>
          <div v-if="showFirst === 'word' && card.similar.length" class="sim">
            <span class="cap">Similar</span>
            <template v-for="w in card.similar" :key="w.text">
              <NuxtLink v-if="w.slug" :to="entryPath(w.slug)" class="t">{{ w.text }}</NuxtLink>
              <span v-else class="t mu">{{ w.text }}</span>
            </template>
          </div>
          <p v-if="showFirst === 'word'" class="m"><NuxtLink :to="`${entryPath(card.slug)}#${card.anchor}`" class="x">Open the full entry</NuxtLink></p>
          <p v-else class="m">Think of the word, then flip the card.</p>
        </div>
      </div>
    </section>

    <div class="nav">
      <button type="button" class="btn big-btn" :disabled="index === 0 || !card" @click="prev">Previous</button>
      <button type="button" class="btn big-btn flip" :disabled="!card" :aria-expanded="flipped" aria-controls="card-face" @click="flip">
        {{ flipped ? (showFirst === "word" ? "Show word" : "Show definition") : showFirst === "word" ? "Show definition" : "Show word" }}
      </button>
      <button type="button" class="btn big-btn" :disabled="!card || index >= cards.length - 1" @click="next">Next</button>
    </div>
    <p class="m keys">Space or Enter flips the card. Left and right arrows move through the deck.</p>
    <p class="m caveat">Cards are drawn from a 1913 dictionary and shown as printed: some definitions are dated, and some reflect the attitudes of their time.</p>
  </div>
</template>

<style scoped>
.page { max-width: 1120px; }
.title { margin: 0; font-weight: 400; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 40px; margin-top: 12px; }
.grp { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lab { margin-right: 8px; }
.all { margin-left: 8px; font-size: 14px; }
.btn.on { background: var(--fg); color: var(--bg); }
.card { display: flex; flex-direction: column; min-height: min(560px, 70vh); margin-top: 24px; border: 1px solid var(--fg); }
.cardcap { display: flex; justify-content: space-between; gap: 16px; padding: 16px 24px; border-bottom: 1px solid var(--ln); }
.face { flex: 1; display: flex; flex-direction: column; container-type: inline-size; }
.empty { padding: 40px clamp(20px, 4vw, 56px); }
.front { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 40px clamp(20px, 4vw, 56px); }
.big { margin: 0; font-size: min(clamp(56px, 12vw, 176px), calc(100cqi / (var(--n, 8) * 0.66))); line-height: .95; font-weight: 700; letter-spacing: -.045em; overflow-wrap: normal; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 16px; }
.back { flex: 1; display: flex; flex-direction: column; gap: 20px; padding: 32px clamp(20px, 4vw, 56px) 40px; }
.bh { margin: 0; font-size: 40px; font-weight: 700; letter-spacing: -.03em; overflow-wrap: anywhere; }
.bh abbr { font-size: 18px; font-weight: 400; color: var(--mu); margin-left: 8px; text-decoration: none; }
.senses { margin: 0; padding-left: 28px; font-size: clamp(20px, 2.6vw, 26px); line-height: 1.35; letter-spacing: -.01em; list-style: decimal; }
.senses li + li { margin-top: 12px; }
.cq { margin: 20px 0 0; padding-left: 16px; border-left: 2px solid var(--ln); font-size: 18px; line-height: 1.5; color: var(--mu); }
.cq p { margin: 0; }
.senses li::marker { color: var(--ac); font-size: 16px; font-weight: 700; }
.sim { display: flex; flex-wrap: wrap; align-items: center; gap: 0 20px; padding-top: 12px; border-top: 1px solid var(--ln); font-size: 20px; }
.sim .cap { margin-right: 8px; }
.sim a { border-bottom: 1px solid var(--ac); }
.mu { color: var(--mu); }
.nav { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 16px; }
.big-btn { min-height: 56px; }
.flip { flex: 1 1 240px; background: var(--ac); color: var(--on); border-color: var(--ac); font-size: 16px; font-weight: 700; }
.flip:hover { background: transparent; color: var(--ac); }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.keys { margin-top: 16px; font-size: 13px; }
.caveat { margin-top: 8px; font-size: 13px; }
</style>
