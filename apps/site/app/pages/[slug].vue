<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <EntryView :key="String(route.params.slug)" :slug="String(route.params.slug)" :reserved-route="false" />
</template>
