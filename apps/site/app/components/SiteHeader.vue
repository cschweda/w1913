<template>
  <header class="pad hdr">
    <!-- The badge is a drawing (no text), so the link's name is its visible word plus "home" (WCAG 2.5.3). -->
    <NuxtLink to="/" class="t mark">
      <svg class="badge" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true" focusable="false">
        <rect width="36" height="36" fill="currentColor" />
        <path d="M6.5 10h4.1l2.6 11.6L16.1 10h3.8l2.9 11.6L25.4 10h4.1l-4.6 16h-4l-2.9-11-2.9 11h-4z" fill="var(--on)" />
      </svg>
      <span class="word">w1913<span class="vh">, home</span></span>
    </NuxtLink>
    <nav aria-label="Sections" class="sections">
      <NuxtLink to="/synonyms" class="t" active-class="on">Synonyms</NuxtLink>
      <NuxtLink to="/about" class="t" active-class="on">About</NuxtLink>
    </nav>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.hdr { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 32px; padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--ln); }
/* The logo: the accent square from the social card, with the wordmark. */
.mark { gap: 10px; margin-right: auto; }
.badge { width: 36px; height: 36px; color: var(--ac); flex: none; }
.word { font-size: 24px; font-weight: 700; letter-spacing: -.03em; }
.mark:hover .word { color: var(--ac); }
.sections { display: flex; flex-wrap: wrap; gap: 0 28px; font-size: 14px; }
.sections .on { font-weight: 700; box-shadow: inset 0 -2px 0 var(--ac); }
</style>
