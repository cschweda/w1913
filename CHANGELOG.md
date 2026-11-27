# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## How versions work

- **W1913** (site and code) has one version, in the root `package.json`, following
  [Semantic Versioning](https://semver.org/). Every deploy-worthy merge to `main` gets a new
  version and a section below; each version is tagged in git (`v0.2.0`). The site reports its
  version and commit at `/healthz` and in its footer, and `rebuild.sh` checks both on every deploy.
  A test fails if `package.json` names a version this file has no section for.
- **Edition data** (`w1913-<version>.jsonl`, DESIGN.md §3a) has its own releases (0.0, 0.1, … 1.0),
  one per layer. They are noted here as **Data** under the W1913 version that first ships them.

Design history (Drafts 2–5.5) is kept in DESIGN.md §9.

## [Unreleased]

## [0.13.0] - 2026-11-27

Phrases: the collocations planned for Phase 5 ("Bill of fare", "Apple of discord", "To play
possum"), found, shown and looked up.

### Added

- **Phrases list on entries.** The 1913 printed phrases with their own definitions in bold after
  the senses; the plain text runs them on into the last sense (*bill*'s sense 6 was 4,500
  characters). Each entry now ends its senses where its phrases begin and lists them in a
  **Phrases** section (`<dl>`, each phrase a `<dfn>` with its own anchor), labels as chips,
  quotations and links kept. 24,628 phrases on 7,931 entries.
- **Phrase lookup.** `/bill-of-fare` goes to *Bill of fare* under *bill*; typing a phrase with a
  space ("apple of") offers phrases in the lookup box after the headwords.
- Cards use the definition without its phrases.
- **`pnpm --filter @w1913/data run eval:colloc`** measures the heuristic against the tagged
  edition's `<col>` markup (development only, as before). **96.7% precision, 89.2% recall**
  (23,487 of 26,341 key phrases), above the 95% bar used for quotations.

### Data

- **Edition 0.7**: the `collocations` layer. For each run of phrases: the text that holds it
  (sense, sub-sense or note), its offsets, its phrases, and the word a "See under …" definition
  points to. Parser 0.6.0. The site is pinned to 0.7; shards move to `/data/0.7/`.

## [0.12.0] - 2026-11-27

Phase 7, "Can my own tools use it?": offline lookup and static data, with no API (DESIGN.md §4b).

### Added

- **`@w1913/lookup`** (`packages/lookup`): `createLookup(build).lookup(word)` and `suggest()`,
  plus `createShardedLookup()` for shards. No dependencies; compiles to plain ESM for npm
  (`pnpm --filter @w1913/lookup build`). The folding and the suffix stripper moved here, and the
  site imports them, so the two cannot drift apart.
- **The lookup build**, `w1913-lookup-<edition>.json`, written by `db:import` next to the
  database from the same rows: every page, its entries' parts of speech and senses (block
  quotations left out), and the form maps that reproduce the site's lookup rules.
  **22.7 MB, 7.5 MB gzipped** for edition 0.6. JSON rather than SQLite (DESIGN.md §8 question 6).
- **Static shards** at `/data/<edition>/<prefix>.json` (362) and `/data/<edition>/index.json`,
  cached for a year, open to any origin. CC0. `db:import` writes them as files beside the
  database (24 MB) and the server reads one per request, so its memory stays flat.
- **Phase 7 exit test:** `lookup()` agrees with the site on 200 fixed words (headwords,
  variants, diacritics, inflections, archaic and learned forms, reserved words, misses), from the
  whole build and from shards.
- **`scripts/release-assets.sh`** prepares a release's downloads (the edition tarball, the lookup
  build, SHA-256 sums) and prints the `gh release create` command; it publishes nothing itself.

## [0.11.0] - 2026-11-27

Phase 6, "Keeping", and three smaller items.

### Added

- **Saved words:** a Save toggle on every entry; `/saved` (linked in the footer) lists them with
  remove, remove all (confirmed in place), export and import as a JSON file. Kept in the browser
  only (`localStorage`), never sent anywhere; at most 5,000 words. Import skips and counts
  anything that is not a saved word.
- **Cards:** a Saved deck, and "Knew it" / "New to me" on the back of every card ("New to me"
  saves the word). No score, no scheduling.
- **Copy with citation** on every entry: the sense in the address (`#a-4`) or the first sense,
  labels as printed ("[Poetic]"), quotations left out, then "— Webster's Revised Unabridged
  Dictionary (1913)" and the sense's address.
- **Labels here:** every label on the page's senses as chips under the headword.
- **Corrections workflow:** `packages/data/corrections.json` (empty for now) with its rules in
  `packages/data/src/corrections/README.md`. A correction fixes one typo on one source line, must
  match exactly once, and must name the printed page it was checked against; the build applies
  corrections before parsing and records them in each manifest.

### Changed

- **The browser bundle is split** into Vue, Nuxt UI and other-library chunks (largest 363 kB,
  was 502 kB), so a release that changes only the site's code leaves the libraries cached.
- **PM2 shows the real version** (it showed 0.0.0): the build writes it into the server's
  `package.json`.
- `saved` is a reserved route word.

## [0.10.0] - 2026-11-27

Phase 5, "How did the masters use it?". Data 0.6 (parser 0.5.0) adds the `quotes` layer.

### Added

- **Data 0.6, `quotes` layer:** quotations in senses and sub-senses with their authors, block
  (a line after the definition, ending in an author) and inline ("…" then an author); an author
  on a line of its own closes the quotation before it; a bare name after a definition is an
  authority, not a quotation. Measured against the answer key from the tagged edition
  (`pnpm --filter @w1913/data run eval:quotes`): **97.7% precision** for a quotation with its
  correct author, 87.3% recall, above the 95% bar in DESIGN.md §8. 41,454 quotations.
- **Author table** (`authors.json` in the edition): the 300 most frequent printed forms, as 254
  authors and works plus The Bible (every Scripture reference, by book). Typos merged
  (*Macualay*, *Miltom*); ambiguous surnames kept as printed. 89.4% of quotations resolve.
- **Entries:** block quotations as `<blockquote>` with a linked `<cite>`; inline quotations link
  their author. Short forms stay visible ("Shak."), the full name is read to screen readers.
- **Authors** at `/author` and `/author/<key>`: each author's quotations in dictionary order,
  linked to the sense they illustrate; a card deck and a quotation search for each.
- **Quotation search:** "Words in quotations" on `/search`, optionally for one author.
- **Cards:** a short quotation on the back (when the word is shown first), and author decks
  (`/cards?deck=author:milton`). Card definitions no longer run on into their quotations.
- Authors in the navbar and `/llms.txt`.

## [0.9.0] - 2026-11-27

Phase 4, "I need a word with this rhythm" and "Would my 1890s narrator say this?". Data 0.5
(parser 0.4.0) adds the `prosody` and `forms` layers.

### Added

- **Data 0.5:** `prosody` (syllable count and stress pattern, one digit per syllable, for
  109,178 entries; the rule moved from the site into the data package so both share it) and
  `forms` (the inflections the header lines list, 14,750 forms: *Went*, *Gone*, *Oxen*,
  *Better*). Commentary after the forms ("These words, though used as…") is never read as forms.
- **Suffix stripper** (`shared/inflect.ts`), one module for the server and the browser: plurals,
  past tenses and participles with restored -e or undoubled consonants, comparatives, adverbs,
  the archaic forms the 1913's quotations use (*goeth*, *knowest*, *lov'd*), and learned plurals
  (*criteria*, *larvae*, *appendices*). Prefixes and suffixes ("Com-") are never stems. Tested on
  220 forms, every one found (the Phase 4 exit test asks for 200).
- **Inflected lookup:** `/walked` opens *walk* with "walked is a form of Walk"; the lookup box,
  Look up by selection and `/w/go` all use it.
- **Rhythm filter** on `/search`: syllables and stressed syllable, over definition search or
  "synonyms of a word". Results show the marked form (*Haugh″ty*). Synonym sections link to it.
- **Period check** at `/check`: paste a passage to see which words are not in this dictionary.
  Runs in the browser on a 350 KB word list fetched once; the passage is never sent anywhere.
  "Skip names" is on by default; the page says what a mark does and does not mean.
- Check in the navbar; rhythm and the period check in `/llms.txt`.

### Changed

- **More words in definitions are linked for a preview** (you asked for *yaffle* in *Yockel*):
  in a short definition (six words or fewer, like "The yaffle."), every word the meaning rests on
  is linked when at most 40 entries' definitions use it (`features.unusualShortMaxEntries`), so
  *yaffle*, *chaise*, *burdock* and *caprice* are linked but *rough*, *talk* and *plant* are not.
  Elsewhere the rarity rule now skips inflections of other headwords (*strutting*). 34,605 words
  are linked, up from 16,238. The Key explains the dashed underline accordingly.

## [0.8.0] - 2026-11-27

Phase 3, "What's the word for…?". Data 0.4 (parser 0.3.0) adds the `labels` layer.

### Added

- **Data 0.4, `labels` layer:** a closed vocabulary of 99 labels (17 usage, 82 subject), built
  by counting every bracketed and parenthesised group used 20 or more times, with spelling
  variants merged (`Zoöl.`, `Zoöl`, `Zool.`). A group counts as labels only when it is made
  entirely of known forms (`[Obs. or Prov. Eng.]`, `(Bot. & Zoöl.)`). Each entry has its header
  labels and, per sense, the labels that apply; the edition ships `labels.json`. 60,554 of 157,690
  senses carry a label.
- **Definition search** at `/search`: SQLite FTS5 with Porter stemming, ranked by bm25 with the
  headword weighted. Every word is quoted, so no query syntax reaches SQLite; function words
  are dropped outside "quoted phrases"; if no entry has every word, any word may match, and the
  page says so. Matches as highlights, pages of 30, and a link to make a card deck of the results.
- **Labels:** `/label` lists every label with its word count; `/label/<code>` lists its words in
  dictionary order with each first sense. In entries, printed label groups are chips linking there.
- **Card decks by label and by search** (`/cards?deck=label:poetic`, `/cards?deck=q:walk idly`),
  with Poetic, Nautical and Obsolete as buttons.
- Search and Labels in the navbar; both in `/llms.txt`.
- The Phase 3 exit test: 20 fixed queries, each must find its word in the top results.

### Changed

- The random card deck leaves out entries whose every sense is a natural-science term
  (zoology, botany, chemistry, and nine more), as DESIGN.md asked: 68,572 entries are card-worthy.
- On narrow screens the navbar puts the theme toggle beside the logo and the sections below.
- The database is about 207 MB (was 162 MB), mostly the search index.

## [0.7.2] - 2026-11-27

### Changed

- The home page's lookup field shows a very faint "Enter word here" while it is empty, so a
  first-time visitor sees where to type.

## [0.7.1] - 2026-11-27

### Added

- About: what the 1913 Webster's is (its descent from Webster's 1828 dictionary through the
  Merriam revisions and Porter's 1890 *International*, and why this version is the free one), why
  writers like it (definitions written to be read, literary quotations, 600+ synonym essays), and
  what it isn't (not the historical OED, not a modern dictionary: no words after about 1910, dated
  science and attitudes, pronunciations and Greek mostly lost in this transcription).

### Fixed

- About: a garbled phrase in "The text" ("where they were" → "where they are missing"), and a
  sweeping opening claim softened.

## [0.7.0] - 2026-11-27

### Added

- **Cards** at `/cards` (DESIGN.md §4, Phase 2): one word at a time from a deck of 20. Decks:
  **Random** (drawn from the 79,594 `card_ok` entries: a real definition of 40+ characters, not
  only a cross-reference) and **Trail** (the words visited in this tab). **Show first**: the word,
  or the definition (reverse mode: "What's the word?"). The back shows the marked headword, part of
  speech, up to three senses, similar words (the entry's synonyms, linked), and a link to the full
  entry. Space or Enter flips and the arrow keys move, never while focus is in a field or on a
  control; every key has a button. The flip is a disclosure (`aria-expanded`), the hidden face is
  not rendered, and the revealed face is announced; no 3D, no motion. A note says cards are drawn
  from a 1913 dictionary and shown as printed. "Cards" in the header; `features.deckSize` in
  `w1913.config.ts`.

### Changed

- The home heading reads "Look up any word in the 1913 Webster's Dictionary".

## [0.6.2] - 2026-11-27

### Fixed

- The home page offered "petrichor" as an example, which was coined in 1964 and is not in the
  1913 dictionary, so its link led to "Not in this dictionary". Replaced with "amanuensis", and a
  test now checks every example word against the pinned edition.

## [0.6.1] - 2026-11-27

### Changed

- The home page says what it is for: a heading, "Look up any word in the 1913 Webster's" (also
  the field's label), a red **Look up** button beside the field, and a one-line instruction under
  it. Entry pages get the Look up button too.
- A larger header: the logo badge 48 px (was 36), the wordmark 32 px (was 24), larger navigation
  links and theme button, more room around them.
- README screenshots updated (the home page; an entry with unusual words).

## [0.6.0] - 2026-11-27

### Added

- **Unusual-word previews.** A word in a definition is marked with a dashed underline when it is
  a headword itself and appears in at most 3 entries' definitions (16,238 words; about 9% of
  senses), at most 2 per sense, the rarest first, never the entry's own word family. Measured from
  the edition alone, with no outside word lists. Pointing at it (after 250 ms) or tabbing to it
  shows a card with the word, its part of speech, and its first sense; Esc closes it, it stays
  open while the pointer is on it, and it describes the link for screen readers (WCAG 1.4.13). On
  touch screens the word simply opens its entry. The page's key explains the dashed underline.
- The threshold, the number per sense, and the hover delay are settings in `w1913.config.ts`
  (`features.unusualMaxEntries`, `unusualPerSense`, `previewDelayMs`).

## [0.5.0] - 2026-11-27

### Added

- **Say it**: a button under each headword that speaks the word with the device's own voice
  (Web Speech API), preferring a local English voice, slightly slowed. Nothing is fetched or sent;
  it works offline, says "your device's voice" beside it, and is hidden where speech is
  unavailable. The 1913 text has no reliable pronunciations, so this is the device's reading.
- Structured data on every page (schema.org JSON-LD): the site as a `WebSite` with a
  `SearchAction` (`/w/go?q=`); each entry as a `DefinedTerm` in a `DefinedTermSet` based on the
  1913 `Book` (ed. Noah Porter, G. & C. Merriam Co.); About as `AboutPage`; `/synonyms` as
  `CollectionPage`; with `datePublished` (launch day) and `dateModified` (the release's build date).
- `/llms.txt` (llmstxt.org): what W1913 is, its source and licence, and its main pages.
- `<meta name="author">` and a publisher in the structured data (`site.author` in
  `w1913.config.ts`).

### Fixed

- Every page has exactly one canonical link (the home page and others had none), an
  `og:description`, a `twitter:description`, `og:type` and `og:url`. The default description is
  145 characters (it was 79); About and Synonyms have their own.

## [0.4.0] - 2026-11-27

### Added

- **Synonyms (Phase 2).** **Data 0.3** adds the `syn` layer: each Syn. section parsed into its
  list (19,412 words, resolved to entries where they match), a note ("See Grand."), the essays on
  how near-synonyms differ (624: 600 with a heading of compared words, 24 without), and run-in
  derived forms set aside for the quotes layer. Parser version 0.2.0.
- On every entry, a Synonyms block: the list with each word linked, the note, and the essays,
  each headed by the words it compares and linking to a side-by-side comparison.
- On every page: essays printed under other entries that compare this word, and "Listed as a
  synonym under" (18,317 links reaching 6,426 pages).
- `/synonyms`: all 624 essays, A to Z. `/synonyms/compare?w=a,b,c`: two or three words side by
  side, with their first senses and the essays that compare them. "Synonyms" in the header.

### Changed

- Headwords never break inside a word: the size is fitted to the longest word in the headword
  (container query units), so *Amenorrhoeal* shrinks to fit a phone instead of splitting.
- Checked for WCAG 2.1/2.2 AA: no axe violations on any page type at desktop and mobile, and no
  horizontal scrolling on any page type at 320, 390, 768, 1024 and 1440 px (reflow, 1.4.10).

## [0.3.2] - 2026-11-27

### Changed

- The About page and the footer link "Project Gutenberg eBook #29765" to its page at
  gutenberg.org (`site.source` in `w1913.config.ts`).

## [0.3.1] - 2026-11-27

### Added

- Footer links: the version (to this changelog), About, the source on GitHub, and the
  Metaincognita Workshop (`site.workshop` in `w1913.config.ts`).

### Changed

- README rewritten for the live site: what it does today, what comes next, screenshots (home,
  an entry, light theme, phone) in `docs/images/`, versions and deploying. A test keeps its
  version badge in step with `package.json`.

## [0.3.0] - 2026-11-27

### Added

- **Deploys verify the version.** `/healthz` reports the W1913 version, the commit, and the
  edition. `rebuild.sh` requires the new version and commit at the canary, at the live port, and
  through nginx at the public address (`site.url`), with the smoke paths checked publicly too, and
  ends with `Deployed W1913 v0.3.0 (<commit>)`. The footer shows the version.
- Versioning: one version in the root `package.json`, a CHANGELOG section per version, git tags.
- A logo in the header: the accent square with a W, from the social card, beside the wordmark.
- A **Clear** button to the right of the search field, shown once something is typed; it empties
  the field and the suggestions and puts the cursor back.

### Changed

- The home page opens with the search field empty (no placeholder word) and the cursor in it.

## [0.2.0] - 2026-11-27

### Added

- On every entry: **syllables and stress** read from the printed marks (sub · **lime**, "2
  syllables, stress on the second"); **decoded abbreviations** (languages in etymologies, labels
  in brackets, grammatical words in inflections) as `<abbr>`, with an "Abbreviations on this page"
  key; and **Words that point here**, the 37,218 reversed cross-references.

## [0.1.2] - 2026-11-27

### Changed

- The search is front and centre: a full-page search on the home page with a three-step guide to
  the ways in, and a large search field at the top of the entry column on every page (no longer in
  the header).

### Fixed

- Inter cut to the Latin range the dictionary uses: 352 KB → 106 KB (italic 388 KB → 116 KB),
  with a test that every character in the edition is covered. Mobile Lighthouse 100 in 10 of 10
  live runs (one in five had dropped to 81).

## [0.1.1] - 2026-11-27

### Added

- `docs/nginx-site.conf`: a record of the live nginx config for the Forge site, with what each
  part is for.

### Fixed

- No layout shift when the font loads (`font-display: optional` plus a size-matched fallback);
  fonts cached for a year under versioned names, other public files for a day. Lighthouse
  performance 91 → 100.

## [0.1.0] - 2026-11-27

First public release: w1913.com.

### Added

- **Phase 1** (`apps/site`, Nuxt 4 + Nuxt UI v4): entry pages at root URLs (`w1913.com/sublime`;
  route words under `/w/`), all homographs on one page, numbered senses with sub-senses, notes,
  inflections, spellings and etymology, linked cross-references, neighbors, the trail, the
  on-this-page list, look up by selection (exact matches), autocomplete with `/` and Cmd/Ctrl-K,
  "did you mean" on a miss, browser search-engine registration, dark and light themes,
  self-hosted Inter. WCAG 2.2 AA: no axe violations on any page type.
  - `db:import`: renders every entry to semantic HTML once and writes the read-only SQLite
    database (96 MB, about 1 s).
  - `/healthz` for the deploy's health checks.
- **Data 0.1** (`segment`, all 113,409 entries) and **Data 0.2** (`senses`): etymology,
  inflections, spelling notes, labels, numbered senses, lettered sub-senses, notes, the Syn.
  paragraph, and cross-references (96.4% resolve to an entry). 50 golden entries, hand-checked.
- `w1913.config.ts`: one file at the root for the main settings, with comments on what to change
  and what not to.
- DESIGN.md Draft 5.5: Phase 0 findings folded into §2; §4b, offline use and static data for
  Drafter and the Markdown editor, with the reasons a keyed API was declined; Phase 7.
- **Phase 0** (`packages/data`): pnpm workspace scaffold (pnpm 12.16.1, Node 24 running TypeScript
  directly, Vitest, ESLint).
  - `download`: verifies the canonical file against its pinned SHA-256, fetches the tagged files
    for evaluation from gutenberg.org or PG's mirror, and records their checksums in
    `checksums.json`.
  - Segmenter: lossless split of #29765 into 113,409 entries, with header parsing (display
    headword, variants, part of speech), umlaut pseudo-variant detection, and 12 golden entries.
  - `phase0`: structure counts, header-echo classes, character audit, and untranscribed-gap audit.
  - `edition`: release 0.0 (X–Z and SU, `segment` layer), validated against a zod schema, cached
    by source checksum and parser version.
  - `eval` (development only): tolerant tokenizer for the tagged edition and the alignment proof.
  - `docs/phase-0-notes.md`: what the data turned out to be.
  - `pnpm dev` (`scripts/dev.sh`): clears build caches, rebuilds the edition, starts Nuxt on port
    3913. Never touches `cache/sources/` or `cache/tagged/`.
- **Data 0.0** (not published): 2,532 entries, `segment` layer only, a format check.
- The design (DESIGN.md), the Claude Code kickoff prompt (KICKOFF.md), static interface mockups in
  `docs/ui/`, the social card, README, LICENSE (MIT, code and docs), LICENSE-DATA (CC0 1.0,
  edition data), `.nvmrc` (Node 24), `.gitignore`.
- `rebuild.sh` and `ecosystem.config.cjs`: manual deploys to the droplet under PM2, with
  side-by-side releases, a canary check, and automatic rollback.

### Fixed

- Header parsing: the part of speech is no longer found inside an etymology ("Been. Etym: [... p.
  p. ...]"), variants separated by spaces are split, a form ends at ". " when there is no part of
  speech, and a long header form no longer replaces the headword. Parser version 0.1.1.

[Unreleased]: https://github.com/cschweda/w1913/compare/v0.12.0...HEAD
[0.12.0]: https://github.com/cschweda/w1913/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/cschweda/w1913/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/cschweda/w1913/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/cschweda/w1913/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/cschweda/w1913/compare/v0.7.2...v0.8.0
[0.7.2]: https://github.com/cschweda/w1913/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/cschweda/w1913/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/cschweda/w1913/compare/v0.6.2...v0.7.0
[0.6.2]: https://github.com/cschweda/w1913/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/cschweda/w1913/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/cschweda/w1913/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/cschweda/w1913/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/cschweda/w1913/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/cschweda/w1913/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/cschweda/w1913/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/cschweda/w1913/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/cschweda/w1913/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/cschweda/w1913/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/cschweda/w1913/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cschweda/w1913/releases/tag/v0.1.0
