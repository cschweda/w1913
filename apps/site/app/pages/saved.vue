<script setup lang="ts">
// /saved: the words saved in this browser and the named lists (DESIGN.md §4,
// "Keeping"); /saved?list=<id> shows one list. Nothing here is sent anywhere;
// export and import move words and lists between browsers.
import config from "../../../../w1913.config";
import { entryPath } from "../../shared/fold";
import { parseSavedFile, toSavedFile } from "../../shared/saved";
import { MAX_NAME } from "../../shared/lists";

const { saved, ready, remove, add, clear } = useSaved();
const { lists, sorted, ready: listsReady, find, create, rename, deleteList, remove: removeFromList, merge } = useLists();
const route = useRoute();
const listId = computed(() => (typeof route.query.list === "string" ? route.query.list : ""));
const current = computed(() => (listId.value ? find(listId.value) : null));
const newName = ref("");
const renaming = ref("");
const deleting = ref(false);
function makeList() {
  const r = create(newName.value);
  if ("error" in r) { status.value = r.error; return; }
  status.value = `Made the list ${newName.value.trim()}.`;
  newName.value = "";
}
async function startRename() {
  renaming.value = current.value?.name ?? "";
  await nextTick();
  (document.getElementById("rename") as HTMLInputElement | null)?.select();
}
function saveRename() {
  if (!current.value) return;
  const err = rename(current.value.id, renaming.value);
  if (err) { status.value = err.error; return; }
  status.value = `Renamed to ${current.value.name}.`;
  renaming.value = "";
}
function removeList() {
  if (!current.value) return;
  if (!deleting.value) { deleting.value = true; return; }
  const n = current.value.name;
  deleteList(current.value.id);
  deleting.value = false;
  status.value = `Deleted the list ${n}.`;
  navigateTo("/saved#lists");
}
watch(listId, () => { deleting.value = false; renaming.value = ""; });
const status = ref("");
const confirming = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function exportFile() {
  const blob = new Blob([JSON.stringify(toSavedFile(saved.value, new Date(), lists.value), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `w1913-saved-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  status.value = `Exported ${saved.value.length} saved ${saved.value.length === 1 ? "word" : "words"} and ${lists.value.length} ${lists.value.length === 1 ? "list" : "lists"}.`;
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
  const m = merge(r.lists);
  const listNote = r.lists.length ? `; ${m.newLists} new ${m.newLists === 1 ? "list" : "lists"} and ${m.newWords} ${m.newWords === 1 ? "word" : "words"} added to lists` : "";
  status.value = `Imported ${added} new saved ${added === 1 ? "word" : "words"}${listNote}${r.skipped ? `; skipped ${r.skipped} that were not saved words` : ""}.`;
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
useSeoMeta({ title: () => current.value ? `${current.value.name} · Lists` : "Saved words", description: "The words you saved and your lists, kept in this browser only.", robots: "noindex" });
</script>

<template>
  <div v-if="listId" class="page">
    <p class="crumb"><NuxtLink to="/saved#lists" class="t x">← Saved words and lists</NuxtLink></p>
    <template v-if="current">
      <h1 class="title">{{ current.name }}</h1>
      <div aria-hidden="true" class="bar" />
      <p class="lede">A list kept in this browser only. {{ current.words.length }} {{ current.words.length === 1 ? "word" : "words" }}; add more with <b>Lists</b> on any entry.</p>
      <div class="row">
        <NuxtLink v-if="current.words.length" :to="`/cards?deck=list:${current.id}`" class="btn go">Study them as cards</NuxtLink>
        <form v-if="renaming" class="inline" @submit.prevent="saveRename">
          <label for="rename" class="vh">New name for {{ current.name }}</label>
          <input id="rename" v-model="renaming" type="text" :maxlength="MAX_NAME" class="field" autocomplete="off" />
          <button type="submit" class="btn">Rename</button>
          <button type="button" class="btn" @click="renaming = ''">Cancel</button>
        </form>
        <button v-else type="button" class="btn" @click="startRename">Rename</button>
        <button type="button" class="btn" @click="removeList">{{ deleting ? `Yes, delete ${current.name}` : "Delete list" }}</button>
        <button v-if="deleting" type="button" class="btn" @click="deleting = false">Keep it</button>
      </div>
      <p class="sum" role="status" aria-live="polite">{{ status }}</p>
      <p v-if="!current.words.length" class="m">No words in this list yet.</p>
      <ol v-else class="words">
        <li v-for="w in current.words" :key="w.slug">
          <NuxtLink :to="entryPath(w.slug)" class="hw x">{{ w.headword }}</NuxtLink>
          <span class="when">added {{ date(w.added) }}</span>
          <button type="button" class="rm" :aria-label="`Remove ${w.headword} from ${current.name}`" @click="removeFromList(current.id, w.slug); status = `Removed ${w.headword}.`">Remove</button>
        </li>
      </ol>
    </template>
    <template v-else-if="listsReady">
      <h1 class="title">No such list</h1>
      <div aria-hidden="true" class="bar" />
      <p class="lede">That list is not in this browser. Lists are kept in the browser that made them; export them there and import them here.</p>
      <p class="sum" role="status" aria-live="polite">{{ status }}</p>
    </template>
  </div>
  <div v-else class="page">
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
    <section id="lists" class="lists" aria-labelledby="lists-h">
      <h2 id="lists-h" class="sh2">Lists</h2>
      <p class="m">Lists gather words by purpose: a chapter, a poem, a subject. Add a word from <b>Lists</b> on its entry.</p>
      <ul v-if="sorted.length" class="ll">
        <li v-for="l in sorted" :key="l.id">
          <NuxtLink :to="`/saved?list=${l.id}`" class="hw x">{{ l.name }}</NuxtLink>
          <span class="when">{{ l.words.length }} {{ l.words.length === 1 ? "word" : "words" }}</span>
        </li>
      </ul>
      <form class="inline mk" @submit.prevent="makeList">
        <label for="new-list" class="cap">New list</label>
        <input id="new-list" v-model="newName" type="text" :maxlength="MAX_NAME" class="field" autocomplete="off" placeholder="e.g. Sea words" />
        <button type="submit" class="btn">Make</button>
      </form>
    </section>
    <p class="m foot">{{ config.site.name }} keeps at most 5,000 saved words (the oldest go first), and up to 100 lists of 2,000 words each. Export saves both.</p>
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
.crumb { margin: 16px 0 0; }
.lists { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--fg); }
.sh2 { margin: 0 0 8px; font-size: 28px; font-weight: 700; letter-spacing: -.02em; }
.ll { list-style: none; margin: 12px 0 0; padding: 0; }
.ll li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding: 10px 0; border-top: 1px solid var(--ln); }
.inline { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mk { margin-top: 16px; }
.field { min-height: 44px; min-width: 220px; padding: 0 10px; border: 1px solid var(--mu); background: transparent; color: var(--fg); font: inherit; font-size: 16px; }
.field::placeholder { color: var(--mu); }
</style>
