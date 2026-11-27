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

[Unreleased]: https://github.com/cschweda/w1913/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/cschweda/w1913/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/cschweda/w1913/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/cschweda/w1913/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/cschweda/w1913/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/cschweda/w1913/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/cschweda/w1913/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/cschweda/w1913/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cschweda/w1913/releases/tag/v0.1.0
