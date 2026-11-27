<script setup lang="ts">
import config from "../../../../w1913.config";

useSeoMeta({ title: config.site.title, ogTitle: config.site.title, ogUrl: `${config.site.url}/` });
const examples = config.site.examples;
</script>

<template>
  <div class="home">
    <h1 class="big">w1913</h1>
    <div aria-hidden="true" class="bar" />
    <p class="lede">
      <i>Webster's Revised Unabridged Dictionary</i> (1913), read the way a writer reads it. Type any word in the
      address bar: <span class="url">w1913.com/sublime</span>.
    </p>
    <p class="m">Try:
      <template v-for="(w, i) in examples" :key="w"><span v-if="i">, </span><NuxtLink :to="`/${w}`" class="x">{{ w }}</NuxtLink></template>.
    </p>
  </div>
</template>

<style scoped>
.home { max-width: 860px; margin-top: 48px; }
.big { margin: 0; font-size: clamp(72px, 14vw, 200px); line-height: .9; font-weight: 700; letter-spacing: -.05em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 24px; }
.lede { font-size: 24px; line-height: 1.4; margin: 0; }
.url { font-weight: 700; }
</style>
