<script setup lang="ts">
// /saved: the words saved in this browser (DESIGN.md §4, "Keeping"). Nothing
// here is sent anywhere; export and import move the list between browsers.
import config from "../../../../w1913.config";
import { entryPath } from "../../shared/fold";
import { parseSavedFile, toSavedFile } from "../../shared/saved";

const { saved, ready, remove, add, clear } = useSaved();
const status = ref("");
const confirming = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function exportFile() {
  const blob = new Blob([JSON.stringify(toSavedFile(saved.value), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `w1913-saved-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  status.value = `Exported ${saved.value.length} ${saved.value.length === 1 ? "word" : "words"}.`;
}
async function importFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 2_000_000) { status.value = "That file is too large to be a saved-words file."; return; }
  const r = parseSavedFile(await file.text());
  if ("error" in r) { status.value = r.error; return; }
  const before = saved.value.length;
  add(r.words);
  const added = saved.value.length - before;
  status.value = `Imported ${added} new ${added === 1 ? "word" : "words"}${r.skipped ? `; skipped ${r.skipped} that were not saved words` : ""}.`;
  (e.target as HTMLInputElement).value = "";
}
function clearAll() {
  if (!confirming.value) { confirming.value = true; return; }
  const n = saved.value.length;
  clear();
  confirming.value = false;
  status.value = `Removed all ${n} saved words.`;
}
const date = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
useSeoMeta({ title: "Saved words", description: "The words you saved, kept in this browser only.", robots: "noindex" });
</script>

<template>
  <div class="page">
    <h1 class="title">Saved words</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      Words you save from an entry or a card are kept in this browser only: there are no accounts, and nothing is sent anywhere.
      Export them to keep a copy or move them to another browser.
    </p>
    <div class="row">
      <NuxtLink v-if="saved.length" to="/cards?deck=saved" class="btn go">Study them as cards</NuxtLink>
      <button type="button" class="btn" :disabled="!saved.length" @click="exportFile">Export</button>
      <button type="button" class="btn" @click="fileInput?.click()">Import</button>
      <input ref="fileInput" type="file" accept="application/json,.json" class="vh" tabindex="-1" aria-hidden="true" @change="importFile" />
      <button v-if="saved.length" type="button" class="btn" @click="clearAll">{{ confirming ? `Yes, remove all ${saved.length}` : "Remove all" }}</button>
      <button v-if="confirming" type="button" class="btn" @click="confirming = false">Keep them</button>
    </div>
    <p class="sum" role="status" aria-live="polite">{{ status }}</p>
    <p v-if="ready && !saved.length" class="m">No saved words yet. Use <b>Save</b> on any entry, or <b>New to me</b> on a card.</p>
    <ol v-if="saved.length" class="words">
      <li v-for="w in saved" :key="w.slug">
        <NuxtLink :to="entryPath(w.slug)" class="hw x">{{ w.headword }}</NuxtLink>
        <span class="when">saved {{ date(w.saved) }}</span>
        <button type="button" class="rm" :aria-label="`Remove ${w.headword}`" @click="remove(w.slug); status = `Removed ${w.headword}.`">Remove</button>
      </li>
    </ol>
    <p class="m foot">{{ config.site.name }} keeps at most 5,000 saved words; the oldest go first.</p>
  </div>
</template>

<style scoped>
.page { max-width: 820px; }
.title { margin: 24px 0 0; font-size: clamp(44px, 8vw, 104px); line-height: .95; font-weight: 700; letter-spacing: -.045em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 24px 0 20px; }
.lede { margin: 0; font-size: 18px; line-height: 1.55; max-width: 720px; }
.row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
.go { background: var(--ac); color: var(--on); border-color: var(--ac); font-weight: 700; }
.go:hover { background: transparent; color: var(--ac); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.sum { margin: 16px 0 0; min-height: 1.5em; }
.words { margin: 8px 0 0; padding-left: 44px; }
.words li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding: 10px 0; border-top: 1px solid var(--ln); }
.words li::marker { color: var(--mu); font-size: 14px; }
.hw { font-size: 20px; font-weight: 700; }
.when { color: var(--mu); font-size: 14px; }
.rm { margin-left: auto; background: none; border: 0; color: var(--mu); font: inherit; font-size: 14px; text-decoration: underline; cursor: pointer; min-height: 24px; }
.rm:hover { color: var(--ac); }
.foot { margin-top: 24px; }
</style>
