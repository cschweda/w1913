<script setup lang="ts">
import config from "../../../w1913.config";

// "Sublime · W1913"; the home page sets its own full title.
useHead({ titleTemplate: (t?: string) => (t && t !== config.site.title ? `${t} · ${config.site.name}` : config.site.title) });
</script>

<template>
  <UApp :tooltip="{ delayDuration: 300 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
