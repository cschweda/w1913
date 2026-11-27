# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

The project has two version lines:

- **Site and code**: versioned with [Semantic Versioning](https://semver.org/), under the headings below.
- **Edition data**: `w1913-<version>.jsonl` releases (0.0, 0.1, … 1.0), one per layer, as listed in DESIGN.md §3a. Each data release gets its own entry here, marked **Data**.

Design history (Drafts 2–5.4) is kept in DESIGN.md §9.

## [Unreleased]

### Added

- On every entry: **syllables and stress** read from the printed marks (sub · **lime**, "2 syllables, stress on the second"); **decoded abbreviations** (languages in etymologies, labels in brackets, grammatical words in inflections) as `<abbr>` with an "Abbreviations on this page" key; and **Words that point here**, the 37,218 reversed cross-references.
- The search is front and centre: a full-page search on the home page with a three-step guide to the ways in, and a large search field at the top of the entry column on every page (no longer in the header).
- **Phase 1** (`apps/site`, Nuxt 4 + Nuxt UI v4): entry pages at root URLs (`w1913.com/sublime`; route words under `/w/`), all homographs on one page, numbered senses with sub-senses, notes, inflections, spellings and etymology, linked cross-references, neighbors, the trail, the on-this-page list, look up by selection (exact matches), autocomplete with `/` and Cmd/Ctrl-K, "did you mean" on a miss, browser search-engine registration, dark and light themes, self-hosted Inter. WCAG 2.2 AA: no axe violations on any page type.
  - `db:import`: renders every entry to semantic HTML once and writes the read-only SQLite database (96 MB, about 1 s).
  - `/healthz` for the deploy's health checks.
- **Data 0.1** (`segment`, all 113,409 entries) and **Data 0.2** (`senses`): etymology, inflections, spelling notes, labels, numbered senses, lettered sub-senses, notes, the Syn. paragraph, and cross-references (96.4% resolve to an entry). 50 golden entries, hand-checked.
- `w1913.config.ts`: one file at the root for the main settings, with comments on what to change and what not to.
- `docs/nginx-site.conf`: a record of the live nginx config for the Forge site, with what each part is for.

### Fixed

- Inter cut to the Latin range the dictionary uses: 352 KB → 106 KB (italic 388 KB → 116 KB), with a test that every character in the edition is covered.
- No layout shift when the font loads (`font-display: optional` plus a size-matched fallback); fonts cached for a year under versioned names, other public files for a day. Lighthouse performance 91 → 100.
- Header parsing: the part of speech is no longer found inside an etymology ("Been. Etym: [... p. p. ...]"), variants separated by spaces are split, a form ends at ". " when there is no part of speech, and a long header form no longer replaces the headword. Parser version 0.1.1.

- **Phase 0** (`packages/data`): pnpm workspace scaffold (pnpm 12.16.1, Node 24 running TypeScript directly, Vitest, ESLint).
  - `download`: verifies the canonical file against its pinned SHA-256, fetches the tagged files for evaluation from gutenberg.org or PG's mirror, and records their checksums in `checksums.json`.
  - Segmenter: lossless split of #29765 into 113,409 entries, with header parsing (display headword, variants, part of speech), umlaut pseudo-variant detection, and 12 golden entries.
  - `phase0`: structure counts, header-echo classes, character audit, and untranscribed-gap audit for the whole file and the X–Z and SU slices.
  - `edition`: release 0.0 (X–Z and SU, `segment` layer), validated against a zod schema, cached by source checksum and parser version.
  - `eval` (development only): tolerant tokenizer for the tagged edition and the alignment proof.
  - `docs/phase-0-notes.md`: what the data turned out to be.
  - `pnpm dev` (`scripts/dev.sh`): clears build caches, rebuilds the edition, and (from Phase 1) starts Nuxt on port 3913. Never touches `cache/sources/` or `cache/tagged/`.
- DESIGN.md Draft 5.5: Phase 0 findings folded into §2; §4b, offline use and static data for Drafter and the Markdown editor, with the reasons a keyed API was declined; Phase 7.
- **Data 0.0** (not published): 2,532 entries, `segment` layer only, a format check.
- DESIGN.md Draft 5.4: the design document, checked against the canonical Project Gutenberg file (#29765).
- KICKOFF.md: the Claude Code prompt for Phase 0.
- Static interface mockups in `docs/ui/`: the entry page (Phase 1 and complete) and the cards page.
- Social card, `assets/og-image.png`.
- README, LICENSE (MIT, code and docs), LICENSE-DATA (CC0 1.0, edition data), `.nvmrc` (Node 24), `.gitignore`.
- `rebuild.sh` and `ecosystem.config.cjs`: manual deploys to the droplet under PM2, with side-by-side releases, a canary check, and automatic rollback.
