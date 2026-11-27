<script setup lang="ts">
import { entryPath } from "../../shared/fold";

const props = defineProps<{ current: string; headword: string }>();
const { trail, visit, clear } = useTrail();
onMounted(() => visit({ slug: props.current, headword: props.headword }));
watch(() => props.current, (slug) => visit({ slug, headword: props.headword }));
const shown = computed(() => (trail.value.length > 1 ? trail.value : []));
</script>

<template>
  <nav v-if="shown.length" aria-label="Trail" class="trail">
    <span class="cap lead">Trail</span>
    <template v-for="(item, i) in shown" :key="item.slug">
      <span v-if="i > 0" aria-hidden="true">/</span>
      <span v-if="item.slug === current" aria-current="page" class="t here">{{ item.headword }}</span>
      <NuxtLink v-else :to="entryPath(item.slug)" class="t">{{ item.headword }}</NuxtLink>
    </template>
    <button type="button" class="btn btn-quiet clear" @click="clear">Clear trail</button>
  </nav>
</template>

<style scoped>
.trail { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; font-size: 14px; color: var(--mu); }
.lead { margin-right: 12px; }
.here { color: var(--fg); font-weight: 700; }
.clear { margin-left: 12px; }
</style>
