<script setup lang="ts">
// Defaults for every page: title pattern, canonical address, description,
// social preview tags, and structured data. A page that knows better (an
// entry, the compare page) replaces them under the same keys.
import config from "../../../w1913.config";
import { ldScript, webPageLd, websiteLd } from "../shared/structured";

const route = useRoute();
const buildDate = useRuntimeConfig().public.buildDate as string;
const canonical = computed(() => `${config.site.url}${route.path === "/" ? "/" : route.path.replace(/\/$/, "")}`);

// "Sublime · W1913"; the home page sets its own full title.
useHead({
  titleTemplate: (t?: string) => (t && t !== config.site.title ? `${t} · ${config.site.name}` : config.site.title),
  link: [{ rel: "canonical", href: canonical, key: "canonical" }],
  script: [
    ldScript(websiteLd(), "ld-website"),
    ldScript(webPageLd({ url: canonical.value, name: config.site.title, description: config.site.description, modified: buildDate }), "ld-page"),
  ],
});
useSeoMeta({
  description: config.site.description,
  ogDescription: config.site.description,
  twitterDescription: config.site.description,
  ogType: "website",
  ogUrl: canonical,
  ogLocale: "en_US",
});
</script>

<template>
  <UApp :tooltip="{ delayDuration: 300 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
