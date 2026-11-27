<script setup lang="ts">
import { entryPath } from "../../shared/fold";

defineProps<{
  sections: { anchor: string; label: string }[];
  neighbors: { slug: string; headword: string; current: boolean }[];
}>();
</script>

<template>
  <div class="rail">
    <nav v-if="sections.length > 1" aria-labelledby="otp-h" class="block">
      <h2 id="otp-h" class="cap head">On this page</h2>
      <ul>
        <li v-for="s in sections" :key="s.anchor"><a :href="`#${s.anchor}`" class="t">{{ s.label }}</a></li>
      </ul>
    </nav>
    <nav aria-labelledby="nb-h" class="block">
      <h2 id="nb-h" class="cap head">Neighbors</h2>
      <ul class="nb">
        <li v-for="n in neighbors" :key="n.slug">
          <span v-if="n.current" aria-current="page" class="t here">{{ n.headword }}</span>
          <NuxtLink v-else :to="entryPath(n.slug)" class="t">{{ n.headword }}</NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
.rail { font-size: 15px; }
.block { margin-bottom: 32px; }
.head { margin: 0; padding-bottom: 12px; border-bottom: 1px solid var(--ln); font-weight: 400; }
ul { list-style: none; margin: 0; padding: 0; }
.nb { color: var(--mu); }
.here { color: var(--fg); font-weight: 700; }
</style>
