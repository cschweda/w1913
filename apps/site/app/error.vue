<script setup lang="ts">
import type { NuxtError } from "#app";
import { entryPath } from "../shared/fold";

const props = defineProps<{ error: NuxtError }>();
const info = computed(() => (props.error.data ?? {}) as { word?: string; suggestions?: { form: string; slug: string }[] });
const notFound = computed(() => props.error.statusCode === 404);
const word = computed(() => (info.value.word ?? "").replace(/-/g, " "));
useHead({ title: () => (notFound.value ? `“${word.value}” is not in this dictionary` : "Something went wrong") });
useSeoMeta({ robots: "noindex" });
</script>

<template>
  <NuxtLayout>
    <SearchBox size="bar" class="lookup" />
    <div class="err">
      <h1 class="title">{{ notFound ? "Not in this dictionary" : "Something went wrong" }}</h1>
      <div aria-hidden="true" class="bar" />
      <p v-if="notFound && word" class="lede">The 1913 Webster's has no entry for “{{ word }}”.</p>
      <p v-else-if="!notFound" class="lede">The page could not be shown. Try again in a moment.</p>
      <template v-if="info.suggestions?.length">
        <h2 class="cap">Did you mean</h2>
        <ul>
          <li v-for="s in info.suggestions" :key="s.slug"><NuxtLink :to="entryPath(s.slug)" class="t x">{{ s.form }}</NuxtLink></li>
        </ul>
      </template>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.lookup { margin: 8px 0 28px; }
.err { max-width: 860px; }
.title { margin: 0; font-size: clamp(48px, 8vw, 112px); line-height: .95; font-weight: 700; letter-spacing: -.04em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 20px; }
.lede { font-size: 22px; margin: 0; }
h2 { margin: 32px 0 8px; font-weight: 400; }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0 24px; font-size: 20px; }
</style>
