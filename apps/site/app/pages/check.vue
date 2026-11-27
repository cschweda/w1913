<script setup lang="ts">
// /check: the period check (DESIGN.md §4). The passage stays in this browser:
// only the word list is fetched, once, and then cached.
import config from "../../../../w1913.config";
import { checkPassage, type Check } from "../../shared/check";
import { ldScript, webPageLd } from "../../shared/structured";

const text = ref("");
const skipNames = ref(true);
const result = ref<Check | null>(null);
const status = ref("");
let words: Set<string> | null = null;

async function run() {
  if (!text.value.trim()) return;
  if (!words) {
    status.value = "Loading the word list…";
    const list = await $fetch<string>("/_w/words", { query: { v: config.edition.version }, responseType: "text" });
    words = new Set(list.split("\n"));
  }
  const r = checkPassage(text.value.slice(0, 20000), (f) => words!.has(f), skipNames.value);
  result.value = r;
  status.value = r.missing.length
    ? `${r.missing.length} of ${r.words} words ${r.missing.length === 1 ? "is" : "are"} not in this dictionary.`
    : `All ${r.words} words are in this dictionary.`;
}
function clear() { text.value = ""; result.value = null; status.value = ""; }

const description = "Paste a passage and see which of its words the 1913 Webster's does not contain. Runs in your browser; your text is never sent anywhere.";
useSeoMeta({ title: "Period check", description, ogDescription: description });
useHead({ script: [ldScript(webPageLd({ type: "WebPage", url: `${config.site.url}/check`, name: "Period check · W1913", description, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <div class="page">
    <p class="cap reserved">Looking for the word <i>check</i>? <NuxtLink to="/w/check" class="x">See its entry</NuxtLink>.</p>
    <h1 class="title">Would my 1890s narrator say this?</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      Paste a passage to see which of its words are not in the 1913 Webster's. It runs in your browser: your text is never sent anywhere.
    </p>
    <form class="cf" @submit.prevent="run">
      <label for="passage" class="cap">Your passage</label>
      <textarea id="passage" v-model="text" class="ta" rows="9" maxlength="20000" placeholder="Paste or type a passage…" />
      <div class="row">
        <button type="submit" class="btn go" :disabled="!text.trim()">Check</button>
        <button type="button" class="btn" :disabled="!text" @click="clear">Clear</button>
        <label class="opt"><input v-model="skipNames" type="checkbox" /> Skip names (capitalised words inside a sentence)</label>
      </div>
    </form>
    <p class="sum" role="status" aria-live="polite">{{ status }}</p>
    <template v-if="result">
      <section v-if="result.missing.length" aria-labelledby="miss-h" class="miss">
        <h2 id="miss-h" class="cap">Not in this dictionary</h2>
        <ul>
          <li v-for="m in result.missing" :key="m.word">
            {{ m.word }}<span v-if="m.count > 1" class="n"> ×{{ m.count }}</span>
          </li>
        </ul>
      </section>
      <section aria-labelledby="pass-h" class="pass">
        <h2 id="pass-h" class="cap">Your passage, marked</h2>
        <p class="ptext"><template v-for="(t, i) in result.tokens" :key="i"><mark v-if="t.missing" class="mk">{{ t.text }}<span class="vh"> (not in this dictionary)</span></mark><template v-else>{{ t.text }}</template></template></p>
      </section>
    </template>
    <section class="limits" aria-labelledby="lim-h">
      <h2 id="lim-h" class="cap">What this does and does not tell you</h2>
      <ul>
        <li>A marked word is <b>not in this dictionary</b>. That is not the same as "not used in 1913": the dictionary left out many names, slang words, technical terms and rare forms, and some words in it were already old.</li>
        <li>An unmarked word was in the language by 1913, but perhaps not in the sense you mean. Open its entry to see what it meant then.</li>
        <li>Inflected forms are matched by rule (<i>walked</i> to <i>walk</i>, <i>goeth</i> to <i>go</i>) and by the forms the dictionary lists (<i>went</i>, <i>oxen</i>). A rule can occasionally find a word that only looks like a form of another.</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 900px; }
.reserved { margin: 24px 0 0; }
.title { margin: 8px 0 0; font-size: clamp(36px, 6vw, 76px); line-height: 1; font-weight: 700; letter-spacing: -.04em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 20px; }
.lede { margin: 0 0 24px; font-size: 19px; line-height: 1.5; max-width: 760px; }
.ta { display: block; width: 100%; margin-top: 6px; padding: 12px 14px; background: transparent; color: var(--fg); border: 1px solid var(--fg); border-radius: 0; font: inherit; font-size: 18px; line-height: 1.55; resize: vertical; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; margin-top: 14px; }
.go { background: var(--ac); color: var(--on); border-color: var(--ac); font-weight: 700; }
.go:hover:not(:disabled) { background: transparent; color: var(--ac); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.opt { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; min-height: 32px; }
.opt input { accent-color: var(--ac); width: 18px; height: 18px; }
.sum { margin: 24px 0 0; font-size: 18px; min-height: 1.5em; }
.miss ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 19px; font-weight: 700; }
.n { color: var(--mu); font-weight: 400; font-size: 15px; }
.miss, .pass, .limits { margin-top: 28px; }
.ptext { margin: 8px 0 0; font-size: 18px; line-height: 1.7; white-space: pre-wrap; border-left: 4px solid var(--ln); padding-left: 16px; }
.mk { background: color-mix(in srgb, var(--ac) 32%, transparent); color: var(--fg); text-decoration: underline wavy var(--ac); text-underline-offset: 4px; }
.limits ul { margin: 8px 0 0; padding-left: 20px; font-size: 16px; line-height: 1.55; color: var(--mu); }
.limits li { margin: 6px 0; }
.limits b { color: var(--fg); }
</style>
