// /llms.txt (llmstxt.org): a short description of W1913 for language models,
// with links to the pages and data worth reading. Built from w1913.config.ts.
import config from "../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  const s = config.site;
  setHeader(event, "content-type", "text/plain; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=86400");
  return `# ${s.name}

> ${s.description} Every word comes from ${s.source.name} (${s.source.url}), which Project Gutenberg catalogues as public domain in the USA. W1913's structured edition is dedicated to the public domain (CC0 1.0).

Each entry lives at ${s.url}/<word> (for example ${s.url}/sublime). Route words such as "about", "check", "cards" and "synonyms" have their entries at ${s.url}/w/<word>. Definitions are shown as printed in 1913 and are not modernised; some Greek and symbols were never transcribed in the source.

## Pages

- [Home and search](${s.url}/): look up any word
- [Example entry: sublime](${s.url}/sublime): senses, etymology, syllables and stress, synonyms, and words that point to it
- [Synonyms](${s.url}/synonyms): the dictionary's 624 essays on how near-synonyms differ, A to Z
- [Compare words](${s.url}/synonyms/compare?w=abandon,desert,forsake): two or three words side by side
- [Cards](${s.url}/cards): a word at a time, at random or from the words you visited
- [About](${s.url}/about): sources, licence, and privacy

## Data and source

- [Source code and design](${s.repo}): MIT-licensed; DESIGN.md explains the data model
- [Changelog](${s.repo}/blob/main/CHANGELOG.md): every version
- [The source text](${s.source.url}): ${s.source.name}

## Optional

- [Search](${s.url}/w/go?q=sublime): /w/go?q=<word> goes straight to the closest entry
- [Health and version](${s.url}/healthz): the running version, commit, and edition
- [Maker](${s.author.url}): ${s.author.name}, ${s.workshop.name}
`;
});
