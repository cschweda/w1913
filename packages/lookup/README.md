# w1913

Look words up in *Webster's Revised Unabridged Dictionary* (1913) from a terminal
(`npx w1913 saunter`) or inside your own program, offline if you like, with the
same answers as [w1913.com](https://w1913.com).
No API, no keys, no network: you carry the data, and nothing a writer types
leaves their device.

## From the command line

No install needed:

```sh
npx w1913 saunter                 # the entry for Saunter
npx w1913 walked                  # inflections find their word (walked → Walk)
npx w1913 bill of fare            # a phrase defined inside an entry
npx w1913 --suggest saun          # headwords starting with "saun"
npx w1913 --json goeth            # JSON, for scripts
npx w1913 -n 2 walk               # at most two senses per entry
npx w1913 --build w1913-lookup-0.7.json.gz subtle   # offline
```

```text
$ npx w1913 saunter
Saunter

v. i.
    To wander or walk about idly and in a leisurely or lazy manner; to lounge;
    to stroll; to loiter.

n.
    A sauntering, or a sauntering place.

https://w1913.com/saunter
```

Every option (`npx w1913 --help` prints this; it is the package's `HELP.txt`):

```text
w1913: look words up in Webster's Revised Unabridged Dictionary (1913).

Usage:
  npx w1913 <word or phrase>            look a word up and print its definitions
  npx w1913 --suggest <letters>         list headwords that start with the letters (two or more)
  npx w1913 --help | --version

Examples:
  npx w1913 saunter                     the entry for Saunter
  npx w1913 walked                      inflections find their word (walked → Walk)
  npx w1913 bill of fare                a phrase defined inside an entry (under Bill)
  npx w1913 --suggest saun              Saunter, Saunterer, …
  npx w1913 --json goeth                the whole result as JSON, for scripts
  npx w1913 --build w1913-lookup-0.7.json.gz subtle
                                        offline, from a downloaded lookup build

Options:
  -s, --suggest          List headwords starting with the given letters instead of
                         looking a word up (at most --limit of them).
  -j, --json             Print the result as JSON (the library's Result object, or the
                         suggestions), for other programs.
  -n, --senses <n>       Show at most n senses of each entry (default: all).
  -l, --limit <n>        How many suggestions --suggest lists (default: 20).
  -b, --build <file>     Look up offline in a lookup build (w1913-lookup-<edition>.json,
                         or the .json.gz from https://github.com/cschweda/w1913/releases).
                         Nothing is sent anywhere.
  -e, --edition <v>      The edition of w1913.com's shards to use (default: the one the
                         site serves now). Ignored with --build.
      --site <url>       Where the shards live (default: https://w1913.com).
  -h, --help             Show this help.
  -v, --version          Show the package version.

Without --build, each lookup fetches one or two small files (a few hundred KB) from
w1913.com/data/<edition>/; the word itself is never sent, only its first two letters.

Exit status: 0 when the word (or a suggestion) was found, 1 when it was not, 2 on a
usage error or when the data could not be loaded.

Code: MIT. Data: CC0 1.0 (the 1913 text is in the US public domain).
More: https://w1913.com/about · https://www.npmjs.com/package/w1913
```

## In your own program

```sh
npm install w1913
```

```ts
import { createLookup } from "w1913";

const build = await (await fetch("/w1913-lookup-0.7.json")).json(); // or readFile in Electron/Node
const dictionary = createLookup(build);

dictionary.lookup("goeth");
// { slug: "go", headword: "Go", via: "goeth", url: "https://w1913.com/go",
//   entries: [{ pos: "v. i.", senses: [{ n: 1, text: "To pass from one place to another; …", sub: [] }, …] }, …] }

dictionary.lookup("bill of fare");
// { slug: "bill", headword: "Bill", via: null, url: "https://w1913.com/bill",
//   phrase: { phrases: ["Bill of fare"], definition: "a written or printed enumeration of the dishes …",
//             anchor: "n4-p-bill-of-fare", url: "https://w1913.com/bill#n4-p-bill-of-fare" }, entries: [ … ] }

dictionary.lookup("smartphone"); // null: not in this dictionary
dictionary.suggest("saun");      // [{ headword: "Saunter", slug: "saunter" }, …]
```

## The data

- **The lookup build**, `w1913-lookup-<edition>.json` (24.8 MB; 8.1 MB gzipped, edition 0.7):
  every headword, variant and listed inflection; every entry's part of speech and senses, with
  block quotations left out; and, from edition 0.7, the phrases defined inside entries (24,628,
  such as *Bill of fare*), each with its definition and its anchor on w1913.com. A word of several
  parts that is not a page of its own but is such a phrase comes back with `phrase` set; every
  entry lists its `phrases`. Older builds simply have none. Published with each W1913 release that changes the data, on the
  [releases page](https://github.com/cschweda/w1913/releases). CC0 1.0.
- **Static shards** at `https://w1913.com/data/<edition>/<prefix>.json` (380 files, one per
  two-letter prefix; `index.json` lists them), for a browser program that may fetch from
  w1913.com:

```ts
import { createShardedLookup } from "w1913";
const dictionary = createShardedLookup((prefix) => fetch(`https://w1913.com/data/0.7/${prefix}.json`).then((r) => (r.ok ? r.json() : null)));
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
