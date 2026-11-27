<script setup lang="ts">
import config from "../../../../w1913.config";

const version = useRuntimeConfig().public.version as string;
const repo = config.site.repo;
</script>

<template>
  <div class="site">
    <a href="#main" class="skip">Skip to the entry</a>
    <SiteHeader />
    <main id="main" tabindex="-1" class="pad main">
      <slot />
    </main>
    <footer class="pad foot">
      <p class="ver">
        <a :href="`${repo}/blob/main/CHANGELOG.md`" class="x">W1913 v{{ version }}</a>
      </p>
      <p>
        Webster's Revised Unabridged Dictionary (1913), from Project Gutenberg eBook #29765. The text is in the public
        domain; this edition is <NuxtLink to="/about" class="x">CC0</NuxtLink>. A 1913 dictionary: senses, spellings,
        and attitudes may have changed since.
      </p>
    </footer>
    <SelectionLookup />
  </div>
</template>

<style scoped>
.site { min-height: 100vh; display: flex; flex-direction: column; }
.main { flex: 1; width: 100%; max-width: 1440px; margin: 0 auto; box-sizing: border-box; padding-top: 20px; padding-bottom: 72px; outline: none; }
.foot { border-top: 1px solid var(--ln); padding-top: 20px; padding-bottom: 32px; font-size: 13px; line-height: 1.5; color: var(--mu); }
.foot p { max-width: 860px; margin: 0; }
.foot .ver { margin-bottom: 8px; }
.skip { position: absolute; left: 8px; top: -60px; z-index: 50; padding: 10px 14px; background: var(--fg); color: var(--bg); }
.skip:focus { top: 8px; }
</style>
