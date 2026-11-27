<script setup lang="ts">
// Dark is the default; the choice is stored by the color-mode module (localStorage).
const mode = useColorMode();
const isDark = computed(() => mode.value === "dark");
function toggle() {
  mode.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <ClientOnly>
    <button type="button" class="btn tbtn" @click="toggle">{{ isDark ? "Light mode" : "Dark mode" }}</button>
    <template #fallback>
      <button type="button" class="btn" disabled>Light mode</button>
    </template>
  </ClientOnly>
</template>

<style scoped>
.tbtn { font-size: 16px; }
</style>
