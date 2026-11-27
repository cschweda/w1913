<script setup lang="ts">
// Copy with citation (DESIGN.md §4a modules): the sense in the address bar's
// #anchor (or the first sense), with the dictionary and its address.
import config from "../../../../w1913.config";

const props = defineProps<{ headword: string; slug: string; path: string }>();
const status = ref("");

/** Rule: the sense is the element the URL's hash names, if it is a sense; otherwise the first sense on the page. */
function citation(): string {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = (id && document.getElementById(id)?.closest("li[id], .sec")) || document.querySelector(".entry .sec");
  const sec = target?.closest(".sec") ?? target;
  const li = target?.matches("li[id]") ? target : sec?.querySelector("ol.s > li[id]");
  const pos = sec?.querySelector(".hh abbr")?.textContent?.trim() ?? "";
  const n = li?.getAttribute("value");
  // The definition's own paragraphs (not its quotations), with label chips as the dictionary prints them: "[Poetic]".
  const plain = (el: Element) => {
    const c = el.cloneNode(true) as Element;
    c.querySelectorAll("a.chip").forEach((a) => a.replaceWith(`[${a.textContent}]`));
    c.querySelectorAll(".vh").forEach((x) => x.remove());
    return c.textContent?.replace(/\s+/g, " ").trim() ?? "";
  };
  const paras = li ? [...li.children].filter((c) => c.matches("p.st")) : [sec?.querySelector("p.st")].filter((x): x is Element => !!x);
  const own = paras.map(plain).join(" ");
  const anchor = li?.id ?? sec?.id ?? "";
  const url = `${config.site.url}${props.path}${anchor ? `#${anchor}` : ""}`;
  return `${props.headword}${pos ? `, ${pos}` : ""}${n ? ` ${n}.` : ""} ${own}\n— Webster's Revised Unabridged Dictionary (1913), ${url}`;
}
async function copy() {
  const text = citation();
  try {
    await navigator.clipboard.writeText(text);
    status.value = "Copied the definition with its citation.";
  } catch {
    status.value = "Could not copy; select the text instead.";
  }
}
</script>

<template>
  <span class="cite">
    <button type="button" class="btn" @click="copy">
      <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 11h5v8H3v-6c0-4 2-6 5-7M15 11h5v8h-6v-6c0-4 2-6 5-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
      Copy with citation
    </button>
    <span class="vh" role="status">{{ status }}</span>
  </span>
</template>

<style scoped>
.cite { display: inline-flex; }
.btn { display: inline-flex; align-items: center; gap: 8px; }
.ic { width: 18px; height: 18px; }
</style>
