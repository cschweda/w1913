# @w1913/lookup

Look words up in *Webster's Revised Unabridged Dictionary* (1913) inside your
own program, offline, with the same answers as [w1913.com](https://w1913.com).
No API, no keys, no network: you carry the data, and nothing a writer types
leaves their device.

```ts
import { createLookup } from "@w1913/lookup";

const build = await (await fetch("/w1913-lookup-0.6.json")).json(); // or readFile in Electron/Node
const dictionary = createLookup(build);

dictionary.lookup("goeth");
// { slug: "go", headword: "Go", via: "goeth", url: "https://w1913.com/go",
//   entries: [{ pos: "v. i.", senses: [{ n: 1, text: "To pass from one place to another; …", sub: [] }, …] }, …] }

dictionary.lookup("smartphone"); // null: not in this dictionary
dictionary.suggest("saun");      // [{ headword: "Saunter", slug: "saunter" }, …]
```

## The data

- **The lookup build**, `w1913-lookup-<edition>.json` (22.7 MB; 7.5 MB gzipped, edition 0.6):
  every headword, variant and listed inflection; every entry's part of speech and senses, with
  block quotations left out. Published with each W1913 release. CC0 1.0.
- **Static shards** at `https://w1913.com/data/<edition>/<prefix>.json` (362 files, one per
  two-letter prefix; `index.json` lists them), for a browser program that may fetch from
  w1913.com:

```ts
import { createShardedLookup } from "@w1913/lookup";
const dictionary = createShardedLookup((prefix) => fetch(`https://w1913.com/data/0.6/${prefix}.json`).then((r) => (r.ok ? r.json() : null)));
await dictionary.lookup("walked");
```

## Same answers as the site

The folding (`foldForCompare`) and the suffix stripper (`stems`, `lookupWith`) in this package
are the ones w1913.com itself runs; the site imports them from here. A test checks that
`lookup()` agrees with the site on 200 fixed words, from the whole build and from shards.

A word is found when it is a headword, a variant, or an inflection the dictionary lists
(*went*, *oxen*); otherwise its stems are tried (*walked* → walk, *goeth* → go, *criteria* →
criterion). `via` names the form that led there. Prefixes and suffixes ("Com-") are never stems.

## Licence

Code: MIT. Data: CC0 1.0 (the 1913 text is in the US public domain).
