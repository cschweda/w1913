<script setup lang="ts">
// Entries whose slug is a route word (about, check, cards...) live here.
const route = useRoute();
</script>

<template>
  <EntryView :key="String(route.params.slug)" :slug="String(route.params.slug)" :reserved-route="true" />
</template>
