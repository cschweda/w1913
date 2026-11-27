<template>
  <header class="pad hdr">
    <NuxtLink to="/" class="t mark" aria-label="W1913, home">w1913</NuxtLink>
    <nav aria-label="Sections" class="sections">
      <NuxtLink to="/about" class="t" active-class="on">About</NuxtLink>
    </nav>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.hdr { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 32px; padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--ln); }
.mark { font-size: 22px; font-weight: 700; letter-spacing: -.02em; margin-right: auto; }
.sections { display: flex; flex-wrap: wrap; gap: 0 28px; font-size: 14px; }
.sections .on { font-weight: 700; box-shadow: inset 0 -2px 0 var(--ac); }
</style>
