<script setup lang="ts">
import config from "../../../../w1913.config";

import { ldScript, webPageLd } from "../../shared/structured";

const aboutDescription = "What W1913 is: the 1913 Webster's from Project Gutenberg eBook #29765, its gaps, its public-domain licence, and its privacy.";
useSeoMeta({ title: "About", description: aboutDescription, ogDescription: aboutDescription, twitterDescription: aboutDescription });
useHead({ script: [ldScript(webPageLd({ type: "AboutPage", url: `${config.site.url}/about`, name: "About W1913", description: aboutDescription, modified: useRuntimeConfig().public.buildDate as string }), "ld-page")] });
</script>

<template>
  <article class="about">
    <h1 class="title">About</h1>
    <div aria-hidden="true" class="bar" />
    <p>
      W1913 is a writer's tool built on <i>Webster's Revised Unabridged Dictionary</i> (1913, ed. Noah Porter): a
      dictionary from before modern lexicography trimmed its quotations and its essays on how near-synonyms differ.
    </p>

    <h2>What the 1913 Webster's is</h2>
    <p>
      It descends from Noah Webster's <i>American Dictionary of the English Language</i> of 1828, which the Merriam
      brothers bought and kept revising after Webster's death. The edition known as "Webster's 1913" is largely the
      text of the 1890 <i>Webster's International Dictionary</i>, edited by Noah Porter, a former president of Yale,
      with a supplement of newer words. Merriam had already replaced it with the larger <i>New International</i> of
      1909, but this is the version that is out of copyright, and so the one that was typed into a computer and
      shared freely.
    </p>

    <h2>Why writers like it</h2>
    <p>
      Its definitions are written to be read, not just consulted. Where a modern dictionary says what a word means,
      the 1913 Webster's often shows how it feels: <NuxtLink to="/sublime" class="x">sublime</NuxtLink> is "lifted
      up; high in place; exalted aloft". It quotes Shakespeare, Milton, Dryden, and the Bible to show words in use,
      and it carries more than six hundred short essays on how near-synonyms differ, such as
      <NuxtLink to="/synonyms/compare?w=abandon,desert,forsake" class="x">abandon, desert, and forsake</NuxtLink>.
      Its vocabulary reaches back into the poetic, the obsolete, and the trades. James Somers's 2014 essay "You're
      probably using the wrong dictionary" made the case for it to a new generation of writers.
    </p>

    <h2>What it isn't</h2>
    <p>
      It is not the <i>Oxford English Dictionary</i>. The OED is a historical dictionary: it traces each sense of a
      word from its first recorded use with dated quotations, and it is far larger and still being revised. Nor is
      it a modern dictionary. It has no words coined after about 1910 (no <i>petrichor</i>, no <i>radio</i> in its
      modern sense), its science and medicine are a century out of date, its usage notes describe the English of
      its time, and some definitions reflect that time's attitudes. In this transcription its pronunciations and its
      Greek are mostly lost. Use it for the texture and history of a word; check a current dictionary for what a
      word means today.
    </p>

    <h2>The text</h2>
    <p>
      Every word comes from <a :href="config.site.source.url" class="x">{{ config.site.source.name }}</a>, which Project Gutenberg catalogues as public domain in the
      USA. Its Greek and some symbols were never transcribed; where they are missing, the dictionary shows the gap rather than
      guessing. Typos are corrected only after a person checks them against the printed page.
    </p>
    <h2 id="sounds">Sounds like</h2>
    <p>
      The one thing not from the 1913: the plain "sounds like" spelling under some headwords (<i>sublime</i>: suh-BLYME, the
      stressed syllable in capitals). The Gutenberg text keeps each word's syllables and stress but lost its vowel marks, so it
      cannot say how a vowel sounds. These spellings come from the
      <a href="https://github.com/cmusphinx/cmudict" class="x">CMU Pronouncing Dictionary</a> (Carnegie Mellon University,
      BSD-style licence), and give modern American pronunciation, not the 1913's. A word gets one only when CMU has it and agrees
      with the 1913 on its syllables and stress; most of the 1913's rarer words have none.
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
