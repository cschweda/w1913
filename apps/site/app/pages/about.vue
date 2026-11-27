<script setup lang="ts">
import config from "../../../../w1913.config";

useSeoMeta({ title: "About", description: "What W1913 is, where its text comes from, and its licence." });
</script>

<template>
  <article class="about">
    <h1 class="title">About</h1>
    <div aria-hidden="true" class="bar" />
    <p>
      W1913 is a writer's tool built on <i>Webster's Revised Unabridged Dictionary</i> (1913, ed. Noah Porter), the
      last great American dictionary before modern lexicography trimmed its quotations and its essays on how
      near-synonyms differ.
    </p>
    <h2>The text</h2>
    <p>
      Every word comes from Project Gutenberg eBook #29765, which Project Gutenberg catalogues as public domain in the
      USA. Its Greek and some symbols were never transcribed; where they were, the dictionary shows the gap rather than
      guessing. Typos are corrected only after a person checks them against the printed page.
    </p>
    <h2>Licence</h2>
    <p>
      The text is in the public domain. Our structured edition of it is dedicated to the public domain under CC0 1.0,
      and the code is MIT-licensed. Source: <a :href="config.site.repo" class="x">{{ config.site.repo.replace("https://", "") }}</a>.
    </p>
    <h2>A dictionary of its time</h2>
    <p>
      Definitions are shown as printed in 1913. Some are dated, and some reflect the attitudes of their time; they
      are not rewritten.
    </p>
    <h2>Privacy</h2>
    <p>No accounts and no tracking cookies. The words you look up are not logged. Your trail and theme stay in your browser.</p>
  </article>
</template>

<style scoped>
.about { max-width: 720px; margin-top: 28px; font-size: 19px; line-height: 1.55; }
.title { margin: 0; font-size: clamp(56px, 9vw, 120px); line-height: .9; font-weight: 700; letter-spacing: -.045em; }
.bar { width: 96px; height: 8px; background: var(--ac); margin: 28px 0 24px; }
h2 { margin: 40px 0 0; padding-top: 16px; border-top: 1px solid var(--fg); font-size: 24px; }
p { margin: 12px 0 0; }
</style>
