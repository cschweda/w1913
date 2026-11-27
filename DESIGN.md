# W1913 — Design Document

**Name:** W1913 (`w1913.com`; the abbreviation the original transcribers used for this dictionary)
**Author:** Christopher Schweda
**Repository:** https://github.com/cschweda/w1913
**Status:** Draft 5.5 — 27 November 2026 (Phase 0 findings; offline use instead of an API; changes are listed in §9)
**Companion documents:** `KICKOFF.md` (Claude Code kickoff prompt) · `docs/ui/` (static interface mockups, §4a)

---

## 1. What this is

A writer's tool built on *Webster's Revised Unabridged Dictionary* (1913, ed. Noah Porter), parsed from Project Gutenberg's public-domain plain-text edition. It is independent of websters1913.com and every other existing site.

Showing definitions is table stakes; three sites already do it. W1913 earns its place by answering the questions a writer actually has at the desk:

| The writer's question | What W1913 does | Data it rests on |
|---|---|---|
| "What does this word really mean?" | A readable entry, opened from anywhere in one step | ~113,400 entries |
| "Is there a better word?" | Thesaurus view with the dictionary's own essays on how near-synonyms differ | 3,254 synonym sections, 624 essays on how near-synonyms differ |
| "What's the word for…?" | Search inside definitions | Every definition |
| "I need a word with this rhythm." | Filter by syllable count and stress pattern | Stress marks on ~99,000 entries |
| "Would my 1890s narrator say this?" | Period check: paste a passage, see which words this dictionary does not contain | ~102,300 distinct headwords |
| "How did the masters use it?" | Search and browse the quotations by author | ~47,000 quotations |
| "Show me something I didn't know I wanted." | Browse obsolete, poetic, dialect, nautical, heraldic words | ~17,000 "Obs." labels; ~270 subject fields |
| "Teach me a word." | Cards: a deck of words, random or drawn from a label, a search, or your own lists. Flip a card for the definition and similar words | Entries with a real definition; labels; synonym lists |
| "What sits next to it, and how did I get here?" | Neighbors: the entries before and after, as on the printed page. Trail: the words visited this session, in order | Edition order; the browser |

Counts for quotations, labels, and subject fields were measured on the tagged edition, which is not a data source (§2). The plain text should hold the same content, but those three figures are expectations until the parser confirms them.

### Goals

1. Every row of the table above works, and works on a phone.
2. Lookup is one step from wherever the writer is: `w1913.com/sublime` in the address bar.
3. A reading experience worthy of the text.
4. WCAG 2.2 AA, semantic HTML throughout.
5. Every word published comes from a source catalogued as public domain.

### Non-goals (v1)

- Accounts or server-side personal data. Saved words live in the browser.
- Modern definitions or any non-1913 content.
- Rhyme search (pronunciation respellings are missing for most entries).
- Native apps.
- Spaced-repetition scheduling for cards.

---

## 2. Source text: plain only, tagged edition for evaluation

Two Gutenberg editions carry the same dictionary. One has a clean licence and little markup; the other has rich markup and a copyright flag that Project Gutenberg has confirmed will stay. Everything W1913 stores and publishes comes from the first. The second is used only to measure how well the parser does.

| | **Canonical text: #29765** | **Evaluation only: #660–670 v0.50** |
|---|---|---|
| What | Plain UTF-8 text, one file, 28.0 MB | Eleven tagged files (`pgw050*.txt`), 41.6 MB |
| Gutenberg's catalogue | "Public domain in the USA" | "Copyrighted" banner (see below) |
| Role | **Every published word comes from here** | An answer key: scores the parser's heuristics. Supplies no data |
| Published? | Yes | Never, in any form |
| Required? | Yes | No. The build never reads it; only the evaluation command does |

**Canonical file:** `https://www.gutenberg.org/ebooks/29765.txt.utf-8`
SHA-256 as fetched 15 Nov 2026: `86fb9c28c32008ea288ca4bcf34f4f0d3d11ccf9e0898294d98b73671497f1d3`
Gutenberg revises this file occasionally (last in July 2025). The checksum is pinned, so a silent upstream change fails the build instead of shifting the data. It is recorded in `packages/data/checksums.json`, which the download step reads; this document only quotes it.

The file has CRLF line endings. The checksum is computed on the file as fetched; the segmenter normalises line endings to LF before anything else, and that is the only transformation applied before parsing.

**Availability.** From 23 to 27 Nov 2026, gutenberg.org answered automated requests for these files with HTTP 503. The download step therefore accepts a copy placed by hand at `cache/sources/29765.txt` (relative to the repository root) and verifies it against the checksum above, and otherwise tries gutenberg.org first and Project Gutenberg's own mirror, `gutenberg.pglaf.org`, second. The mirror served all eleven tagged files on 27 Nov 2026 while gutenberg.org was down; their checksums are recorded in `packages/data/checksums.json`.

**Tagged files** (all under `https://www.gutenberg.org/files/`):
`660/old/pgw050ab.txt` · `661/old/pgw050c.zip` (zip only) · `662/old/pgw050de.txt` · `663/old/pgw050fh.txt` · `664/old/pgw050il.txt` · `665/old/pgw050mo.txt` · `666/old/pgw050pq.txt` · `667/old/pgw050r.txt` · `668/old/pgw050s.txt` · `669/old/pgw050tw.txt` · `670/old/pgw050xz.txt`

### Why this split

- **Licence.** The 1913 text is in the US public domain, and #29765 is catalogued that way. The tagged files carry a "COPYRIGHTED Project Gutenberg eBook" banner, apparently inherited from the 1996 release whose header claimed copyright on the field marks (while stating the entries themselves are public domain). Inside the v0.50 files, the transcriber says it "makes no proprietary claims on this version". These signals conflict, so W1913 does not depend on resolving them.
- **Precedent.** #29765's own readme records that it was made by stripping the tags from the earlier tagged file. Gutenberg has therefore already cleared a tag-stripped derivative of the same work.
- **Project Gutenberg's answer (23 Nov 2026).** Asked about the flag, Gutenberg recommended #29765 and said the status of #660–670 will not be updated: they do not know how those files were compiled, and can only clear a text shown to be a mechanical transcription of a specific printed edition. That is a statement about their clearance process, not a claim that anyone holds rights, but it means no official clearance is coming.
- **Decision.** Nothing derived from the tagged files is stored, served, or released. They are read only by an evaluation command that compares the parser's output with the tagged edition and reports accuracy. This is a judgment about risk, not legal advice.

### What the plain text gives us on its own (measured)

A typical entry:

```
SUBLIME
Sub*lime", a. [Compar. Sublimer; superl. Sublimest.] Etym: [L.
sublimis; sub under + ... cf. F. sublime. Cf. Eliminate.]

1. Lifted up; high in place; exalted aloft; uplifted; lofty.
Sublime on these a tower of steel is reared. Dryden.

Syn.
 -- Exalted; lofty; noble; majestic. See Grand.
```

- **Entry boundary:** a blank line, then a line in capitals. **113,409 entries** (measured in Phase 0; the earlier 113,412 counted three headword lines that wrap onto a second line twice, e.g. `CONSOLATION GAME; …; CONSOLATION` / `RACE`). 4,310 list variants separated by `;` (`ABATIS; ABATTIS`). 102,492 distinct headword-line forms. The 18 alphabet-letter entries (`B`, `Y`) have no header line, and three stray lines between entries (`M.`, `P.`, `X.`) look like volume markers.
- **Header line:** the headword with syllable and stress marks, then part of speech. Marks present in 99,427 entries; a part of speech from a closed vocabulary detected in 109,225. The marks are `*` between syllables, `"` after a primary-stressed syllable, and `` ` `` after a secondary one (`Sub*lime"`, `Ac`e*to*ne"mi*a`); the tagged edition's legend confirms this reading.
- **Damaged pronunciations follow some forms.** About 4,700 header lines carry a pronunciation respelling in parentheses, mostly mangled: `Cor"net*er (kr"nt-r), n.`. It is not part of the headword form; it stays in the entry text and is never used.
- **Umlaut pseudo-variants.** 144 headword lines list a second "spelling" that only writes a printed ö, ü or ä as oe, ue or ae: `ZOOCHEMICAL; ZOOECHEMICAL` over `Zo`ö*chem"ic*al`. These are not variants; the edition leaves them out of `variants`.
- **The headword line is ASCII-folded; the header line is not.** `AEGIS` is followed by `Æ"gis`, `ACTINOZOON` by `Ac"ti*no*zo"ön`, `ACCOUNTABLENESS` by `Ac*count"a*ble ness`. A literal comparison fails on ~1,200 entries; comparison must fold ligatures and diacritics and ignore marks and spaces.
- **`Etym:`** 53,297 · **`Defn:`** 102,760 · **numbered sense lines** 62,811 (62,508 excluding number-only lines) · **lettered sub-senses** 6,830 · **`Note:`** 3,557 · **`Syn.`** 3,273.
- **`Defn:` is not only for single-sense entries.** 10,731 `Defn:` lines follow a numbered line that carries only a label (`2. (Mus.)`, blank line, `Defn: The name of…`). A sense is a numbered line plus any `Defn:` paragraph that follows it.
- **Accented characters are intact** (ö, é, æ and so on, as real UTF-8).
- **Usage and subject labels** appear inline as `[Obs.]`, `(Naut.)`.
- **Quotations run on as wrapped text.** A block quotation is simply the next line of the paragraph (`…lofty.` / `Sublime on these a tower of steel is reared. Dryden.`), and the text is hard-wrapped at about 70 characters, so a line break says nothing; verse line breaks are lost too (`…a thing it is To suffer and be strong. Longfellow.`). Inline quotations are in double quotes (`"The sublime Julian leader." De Quincey.`); 7,878 body lines open one.
- **`"` is also the primary-stress mark, inside entries as well as on header lines.** 2,950 body lines carry marked forms, mostly run-in derivatives (`-- Ag*gres"sive*ly, adv.`), some with the `--` lost. A quotation opens with `"` after a space and before a capital; a stress mark sits inside a word.
- **An author-like name is not always a quotation's author.** Definitions also cite an *authority* with no quotation at all: `Defn: A yardstick. Tennyson.`, `court. Story.`, `latter. Bouvier. Chitty.`. The tagged edition used one tag for both. A line ending in a short capitalised token and a full stop can therefore be the end of a quotation, an authority for the definition, or an ordinary sentence.

What it does **not** mark:

1. Where a quotation starts and ends, and which trailing word is the author.
2. Which words are cross-references.
3. Collocations (they run on as ` -- Sublime Porte. ...`).
4. Original page numbers.

It also contains transcription typos the tagged edition lacks (seen in one sample entry: "fiuid", "Quid" for "fluid", "Foundo" for "Found").

**Untranscribed text is missing.** Greek, Hebrew, and some symbols are absent, usually leaving no trace: `Etym: [Gr. caulis stalk…` has lost its Greek word, `A flat (A)` has lost the flat sign, and a few places keep a stray entity such as `&a;`. The tagged edition's legend says its typists had no Greek font, so the words were never typed; the gaps predate the tag stripping. Phase 0 measured, on paragraphs (the text is hard-wrapped): 4,848 places where a language that used a non-Latin script (overwhelmingly Greek) is followed directly by punctuation or the end of a paragraph, 190 more marked by a double space, 344 `(#)` placeholders, 90 empty brackets where a symbol was, and 7 stray entities. The canonical text cannot restore these, and W1913 will not restore them from another source. The parser detects the likely gaps, counts them in `report.json`, and the site marks each one with a neutral glyph whose text alternative says "untranscribed in the source".

### What the tagged edition knows that the plain text does not mark

Measured on the tagged files: 39,329 block quotations (30,401 with an author directly after) plus ~7,700 inline quotations; ~26,900 collocations with their own definitions; 65,258 underlined cross-references and inflected forms; 1,744 page markers. The first file's front matter contains the transcriber's legend of every field mark.

### Alignment (first tested 15 Nov 2026; measured in Phase 0, 27 Nov 2026)

The two editions are aligned by folded headword and homograph order, then compared word by word (similarity = 2 × longest common subsequence / total words). Phase 0 figures, with the 15 Nov sample (~2,900 entries) in brackets:

- 98,040 headwords found in both (~96,800); for 96,783 of them both editions have the same number of entries (95,162). 273 headwords are only in the plain text, 311 only in the tagged.
- X–Z: 72.7% of paired entries at least 0.99 similar, 93.2% at least 0.90, 98.6% at least 0.80 (72%, 92%, 98%). SU: 95.0%, 98.8%, 99.6%. Median 1.000 in both.
- The tagged X–Z file also carries the "New Words" supplement, which #29765 has merged into the alphabet.

Method for the evaluation command:

1. Pair entries by normalised headword and order within the homograph group.
2. Strip tags from the tagged entry; run a word-level diff against the plain entry.
3. Project each tagged span (quotation, author, cross-reference, collocation) onto the plain text where both ends land on matching words. These projected spans are the answer key.
4. Skip entries below a similarity threshold (start at 0.90); they are not scored.
5. Compare the parser's own detections with the answer key and report precision and recall per structure in `eval.json`.
6. List text differences between the editions as a proofreading queue: a difference is a candidate typo in the plain text, to be corrected only after a human checks it against a page scan.

The answer key and `eval.json` are development artefacts. They are gitignored and never enter the edition.

### Known problems

1. **Plain-text typos**, as above. No bulk "fix from the tagged edition"; reviewed corrections only, kept in a versioned `corrections.json`.
2. **Entry boundary false positives.** A line in capitals inside an entry could be mistaken for a headword. Validate: every block's second line should echo the headword after folding (ligatures, diacritics, marks, spaces). Entries that still fail are listed by name, not silently accepted.
3. **Pronunciation is mostly absent** in both editions. Never depend on it.
4. **Untranscribed characters** (mostly Greek in etymologies) are missing, as above. The gap patterns are detected and counted; nothing is repaired. Before the site shows a gap glyph, the detection rule is checked on a hand-labelled sample, because a bare `[Gr.]` can also mean "the word is Greek".
5. **Quotation and author detection** is a heuristic with three outcomes, not two: a trailing name can close a quotation, cite an authority for the definition, or be ordinary text. An inline quotation's opening `"` must not be confused with a stress mark. Block quotations: text after a definition's closing full stop that ends in a short capitalised token (the author) and a full stop. Inline quotations: a `"…"` span, opened after a space and before a capital, followed by an author token. Authorities: an author token directly after a definition's full stop with no quotation between. Measure before trusting.
6. **Cross-reference detection**: `See X`, `Cf. X`, `Same as X` followed by a capitalised word that is a headword. Cross-references often name a part of speech ("See Sublime, a."); resolve to the right homograph.
7. **Labels**: match a closed vocabulary built by frequency count.
8. **Authors are noisy**: thousands of distinct strings, a few hundred real authors. Normalise the top 300 by hand ("Shak." → Shakespeare).
9. **Listed inflections are sparse.** Inflected lookup needs a rule-based suffix stripper checked against the headword list.
10. **The tagged files have mis-nested tags** and two entry openers (`<p><hw>` and `<p>{ <hw>`). Tolerant tokenizer; never a strict XML/HTML parser.
11. **Umlaut pseudo-variants and damaged pronunciations** on header and headword lines (above). Both are handled in the `segment` layer and counted in `report.json`.
12. **Damaged headers.** Seven entries have headers no rule can read (`OVERTHWART` / `, v. t.`; `ECHAUGUETTE` / `(), n.`). They are the first candidates for `corrections.json`.

### Not used

| Candidate | Why not |
|---|---|
| **#673 / `pgwht04.txt`** (v0.4, 1996) | Explicit copyright claim on the markup; Gutenberg flags its encoding as broken. |
| **Current #660–670 `-0.txt` / `-h.htm`** | Tags flattened; same banner. |
| **GCIDE** | GPL; mixes in WordNet, Century, and volunteer text. |

---

## 3. Architecture

The project is two packages in one pnpm workspace. The data package turns the sources into a versioned, structured edition of the dictionary. The site consumes a released version of that edition and knows nothing about Gutenberg files.

```
 packages/data                                           apps/site
 ─────────────                                           ─────────
 29765.txt ──► segment ──► extract ──► w1913-<ver>.jsonl ──► import ──► w1913.sqlite ──► Nuxt 4 SSR
                              │         + manifest.json                     └── FTS5
                              │         + report.json
                              ▼
 pgw050*.txt ──► tokenize ──► evaluate ──► eval.json   (development only; never shipped)
```

Why split:

- **Frozen input.** The site pins a data version. A parser change cannot silently alter what is live.
- **One home for corrections.** Typo fixes and author normalisation live in the data package.
- **Reusable.** The edition is what a browser extension, an editor plugin, or anyone else would consume.
- **Incremental.** The edition is built up in layers (§3a), one per phase. It is never a prerequisite to finish before the site starts.

### Stack and hosting

- **Nuxt 4**, **Nuxt UI v4**, **pnpm**, TypeScript. `better-sqlite3`, read-only at runtime, **FTS5**. The data package is plain TypeScript run directly by Node 24.
- **One SQLite file on the droplet.** `w1913.sqlite` is the dictionary: built per release, read-only, replaced on every deploy. Nothing at runtime writes to disk: there are no accounts, keys, or server-side personal data (§1, §4b).
- **Hosting:** the Forge-provisioned DigitalOcean droplet `graceful-monet` (NYC1; 4 GB RAM, 2 vCPU, 80 GB disk; Ubuntu 26.04; IPv4 68.183.96.208, IPv6 2604:a880:400:d1:0:5:54e2:b001). It also runs one small PM2 app (`pictures`, pictures.metaincognita.com). Nuxt SSR (node-server preset) under **PM2** behind nginx. Decided against Netlify (27 Nov 2026): the SQLite database is too large for a serverless function bundle.
- **Node:** the droplet's system Node is 22, which the PM2 daemon and the other app use. W1913 runs on Node 24 from nvm for the `forge` user, with `nvm alias default system` so other shells stay on 22; `rebuild.sh` switches itself to the `.nvmrc` version.
- nginx caches entry pages; cache purged on deploy. Rate limiting at nginx (`limit_req`).
- The build reads only the canonical file. A separate `pnpm eval` command reads the tagged files and scores the build; CI does not need them.

### Settings

The main settings live in one file at the repository root, `w1913.config.ts`: the site's name and address, the edition the site pins, ports, deploy settings, interface limits (trail length, neighbors, suggestions), the reserved route words, cache lifetimes, and the colour tokens. Its comments say what each setting does, what changing it means, and which settings must not change. The site, the import step, `pnpm dev` and `rebuild.sh` all read it; PM2 receives its values from `rebuild.sh`.

### Deploying

Deploys are manual: after a push to `main`, run `./rebuild.sh` in the checkout on the droplet. Forge's Quick Deploy stays off for this site.

- **Releases, not in-place builds.** Each deploy builds a complete release (`git archive` of HEAD, install, edition, SQLite import, Nuxt build) in `~/w1913-deploy/releases/<stamp>-<sha>/`. The live site is the `current` symlink. A build failure never touches what is serving.
- **Canary, then switch.** The new release first runs on a spare port (3914) and must answer `/healthz` and the smoke paths (`/`, `/sublime`). Only then is `current` switched and PM2 restarted. W1913 runs as one process in fork mode, because cluster mode would ignore the pinned interpreter and run on the daemon's Node 22, where the Node 24 build of better-sqlite3 cannot load. The restart takes a second or two; nginx serves cached or stale pages through it.
- **Health gate and rollback.** If the live port (3913) fails its check, the symlink goes back to the previous release automatically. `./rebuild.sh --rollback` does the same by hand. The newest five releases are kept.
- **Shared droplet.** PM2 commands always name the `w1913` app, never `all`, so the other app is never touched. Ports 3913 and 3914 listen on 127.0.0.1 only. `ecosystem.config.cjs` pins the interpreter to the Node from `.nvmrc`.
- **Ten-minute limit.** Forge's Deploy button stops a deployment after 10 minutes, so a deploy must finish well inside that: the edition step reuses a cached edition when the source checksum, parser version, and layers are unchanged. A deploy run over SSH has no limit. pnpm is pinned (`packageManager`) to the droplet's version, 12.16.1, so the lockfile always installs there.
- **Contract with the code.** `rebuild.sh` relies on three package scripts (`@w1913/data` `edition`, `@w1913/site` `db:import` and `build`), on `W1913_DB_PATH`, and on a `/healthz` route that answers 200 once the database is open. KICKOFF.md lists them.
- The canonical source is copied to `cache/sources/29765.txt` in the droplet's checkout once, by hand, in case gutenberg.org refuses the server; the edition step verifies its checksum either way.

### URLs

- `w1913.com/sublime` — the entry. Root-level, so the address bar is the search box. Reserved words (`search`, `author`, `label`, `synonyms`, `check`, `cards`, `about`, `data`) are served from `/w/<word>`. Most of them are real words a writer may type, so every reserved page carries a line at the top: "Looking for the word *check*?" linking to `/w/check`.
- Slugs are lower-cased headwords with marks stripped. Homographs and case pairs (august / August) share one page, each as its own section.
- `/sublime#a-3` — sense permalink.

### Data model

```sql
entries(id, slug, headword, headword_marked, homograph_no, pos,
        syllables, stress_pattern,          -- e.g. 2, "01"
        etymology_html, body_html, letter,
        ord,                                -- position in edition order; drives neighbors
        card_ok)                            -- 1 if the entry may appear in a random deck (§4)
alt_headwords(entry_id, form, kind)         -- variant | inflection | collocation
senses(id, entry_id, sense_no, sub_no, def_text, def_html)
labels(id, code, name, kind)                -- subject | usage
sense_labels(sense_id, label_id)
authors(id, abbr, name, quote_count)
quotations(id, entry_id, sense_id, text_html, text_plain, author_id,
           is_verse)
collocations(id, entry_id, phrase, def_html)
synonym_sets(id, entry_id, body_html, is_essay)
synonym_members(set_id, word, entry_id)     -- entry_id NULL if not a headword
xrefs(from_entry_id, to_headword, to_pos, to_entry_id)
fts_defs(headword, def_text)                -- FTS5
fts_quotes(text_plain, author)              -- FTS5
```

These tables are built by the site's import step from the JSONL release. `body_html` is our own semantic HTML, rendered at import from the structured entry. No source markup of any kind is stored or served.

### Data package outputs

- `w1913-<version>.jsonl` and `manifest.json` (§3a)
- `report.json`: counts per field and unresolved cross-references.
- `eval.json` (development only): similarity distribution, precision and recall of each heuristic against the tagged edition, and the proofreading queue.
- Golden tests: ~50 hand-checked entries covering every structural shape.

Source files are fetched by script with pinned SHA-256 checksums (`packages/data/checksums.json`) and never committed.

The proofreading queue and anything else that quotes the tagged edition goes only into `eval.json`, never into `report.json`, which is published with each release.

---

## 3a. The edition: a layered data release

**Format.** JSON Lines: one entry per line, UTF-8, in edition order (the order of the canonical file), with that position stored as `ord`. Edition order is what neighbors show and it differs from a plain alphabetical sort (case pairs, punctuation, multi-word headwords), so it is never re-derived. Diffable, streamable, and trivial to load into SQLite. A `manifest.json` records the version, the layers present, the source checksum, and the entry count.

**Sketch of one entry** (wrapped here for reading; one line in the file):

```json
{"id": "sublime-1", "ord": 97190, "headword": "Sublime", "marked": "Sub*lime\"", "pos": "a.",
 "variants": [], "syllables": 2, "stress": "01",
 "etymology": "L. sublimis; sub under + ...",
 "senses": [{"n": 1, "def": "Lifted up; high in place; exalted aloft; uplifted; lofty.",
             "labels": [],
             "quotes": [{"text": "Sublime on these a tower of steel is reared.",
                         "author": "Dryden"}]}],
 "syn": {"words": ["Exalted", "lofty", "noble", "majestic"], "see": ["Grand"], "essay": null},
 "xrefs": [{"to": "Eliminate"}],
 "text": "Sub*lime\", a. [Compar. Sublimer; ...",
 "layers": ["segment", "senses", "syn", "labels", "prosody", "quotes"]}
```

`text` is the entry's canonical plain text, always present, so a consumer can ignore the tagging entirely. Every field is derived from the canonical text alone.

**Layers and releases.** Each layer is added by one phase and ships as a data release. The site moves to a new data version only when it has a feature that needs it.

| Release | Layer | Adds | Needed by |
|---|---|---|---|
| 0.0 | `segment` | X–Z and SU slices only (Phase 0 spike) | Nothing; a format check |
| 0.1 | `segment` | id, ord, headword, variants, marked header, pos, `text` | Phase 1 |
| 0.2 | `senses` | etymology, definitions, numbered senses, notes, heuristic cross-references | Phase 1 |
| 0.3 | `syn` | synonym words, "see" targets, essays | Phase 2 |
| 0.4 | `labels` | usage and subject labels per sense | Phase 3 |
| 0.5 | `prosody` | syllable count, stress pattern | Phase 4 |
| 0.6 | `quotes` | quotations, authors, collocations, refined cross-references | Phase 5 |
| 1.0 | n/a | First reviewed corrections pass applied | n/a |

Every layer is derived from the canonical plain text.

"Good enough" for a layer is a measured error rate, not perfection. Two measurements exist: a hand-labelled sample (recorded in `report.json`), and, for structures the tagged edition marks, precision and recall against the answer key (recorded in `eval.json`). The long tail of malformed entries is fixed through `corrections.json` over time.

**Licensing (decided).** Code, documentation, and design are MIT (`LICENSE`). The published edition is released under CC0 1.0 (`LICENSE-DATA`). CC0 can only waive rights we hold, so it applies to our own tagging, and every field in the edition is our own work on public-domain text.

**What gets published.** Every release, in full. Each contains public-domain text plus our own tagging, derived from the canonical file alone, so there is no internal-only variant and nothing to strip.

---

## 4. Features, by writer's question

Everything is built from the plain text. Features marked **P** rest on structure the text marks explicitly; features marked **H** rest on heuristics whose accuracy is measured against the tagged edition before they ship.

### "What does this word mean?"

- **Entry page** (P). Numbered senses as an ordered list; etymology and synonyms set apart; all homographs on one page. Quotations as `<blockquote>` with `<cite>` (H).
- **Linked cross-references** (H).
- **Decoded abbreviations** (P): `v. t.`, `Obs.`, `Naut.`, `Shak.` as `<abbr>`.
- **One-step lookup** (P): root URLs; `/` or Cmd/Ctrl-K; autocomplete over headwords and variants; suffix-stripping for inflected forms; "did you mean" on a miss. Collocations in autocomplete ("Sublime Porte") (H).
- **Browser search-engine registration** (P).

### "Is there a better word?"

- **Thesaurus panel** (P): the words from the entry's own `Syn.` list, plus every other entry whose list names this word.
- **The 624 synonym essays** (P), shown in full on each word they discuss and collected at `/synonyms` (shipped in v0.4.0, data 0.3). An essay's heading names the words it compares; 24 essays have no heading and discuss their entry's list.
- **Compare view** (P): two or three words side by side.

### "What's the word for…?"

- **Definition search** (P): FTS5 with stemming. Labelled honestly: it matches the words in 1913 definitions.
- **Later, not v1:** meaning-based search using embeddings.

### "I need a word with this rhythm."

- **Syllable and stress filter** (P), from the header-line marks. Combines with the thesaurus: "synonyms of *lofty*, two syllables, stress on the first."

### "Would my 1890s narrator say this?"

- **Period check** (P) at `/check`: paste a passage; words not found (after suffix stripping) are highlighted. Runs in the browser; the text is never sent to the server. Worded as "not in this dictionary", never "anachronism". The browser loads a static, versioned headword-and-variant list (about 1 MB raw, a few hundred KB compressed, cached long-term), fetched only when `/check` is opened. The suffix stripper is one shared module used by the server and the browser, so both give the same answer.

### "How did the masters use it?"

- **Quotation search and author pages** (H). They ship only when measured precision is acceptable; until then, quotations are simply part of the entry text.

### "Show me something."

- **Label browsing** (P): `/label/obs`, `/label/poetic`, `/label/naut`.
- **Random entry; word of the day** (P).

### "Teach me a word."

More play than tool, but reading a dictionary is how many writers find words, and a deck is a way to do it a few minutes at a time.

- **Cards** (P) at `/cards`: one word at a time from a deck. The front shows the word; flipping shows the part of speech, the first two or three senses, the entry's synonym words, and a link to the full entry. A quotation is added to the back when the `quotes` layer ships.
- **Decks:**
  - *Random*: drawn from entries marked `card_ok`.
  - *By label*: any usage or subject label (`/cards?deck=label:naut`).
  - *By search*: the results of a definition search (`/cards?deck=q:slowly`).
  - *Trail* and *Saved*: the visitor's own lists, built in the browser.
  - *By author* (H): words quoted from one author, once quotation data ships.
- **`card_ok`.** A uniform draw from every headword is mostly variant spellings, bare cross-references, and species names. An entry is `card_ok` when it has at least one definition that is not only a cross-reference and is at least 40 characters long. Once labels exist (data 0.4), entries whose only senses carry natural-science subject labels are excluded from the random deck; they remain available as label decks. The thresholds are starting values; the count of `card_ok` entries goes in `report.json`.
- **Reverse mode:** show the definition first and reveal the word. It practises "what's the word for…".
- **Self-rating:** two buttons on the back, "Knew it" and "New to me". "New to me" adds the word to the saved list. There is no scheduling and no score.
- **Keys:** Space or Enter flips; left and right arrows move through the deck. Every key has an on-screen button.
- A deck is 20 cards. Deck state lives in the browser; the server only returns the entries for a deck.

### "What sits next to it, and how did I get here?"

- **Neighbors** (P): every entry page lists the five headwords before and after it in edition order, with the current one marked. A word with several homographs counts once. This restores what search takes away from a printed dictionary: seeing the words beside the one you came for. Built from the `segment` layer, so it ships in Phase 1.
- **Trail** (P): the words visited in this tab, in order, shown above the entry. Each is a link back, and a button clears the list. Kept in `sessionStorage` (try/catch) and never sent to the server. It holds the 12 most recent words; revisiting a word moves it to the end instead of repeating it. Ships in Phase 1. Saving a trail as a list arrives with "Keeping".
- **On this page** (P): a jump list of the homographs and sections of the current entry, for long entries.
- **Look up by selection** (P): selecting any word on a page offers "Look up". Exact headword and variant matches work in Phase 1; inflected forms follow when the suffix stripper lands in Phase 4. Words in running text are deliberately not individual links: an entry with hundreds of links is unusable with a screen reader. Only cross-references and synonym words are links. The keyboard path to any other word is the search box.

### Keeping

- **Saved words and lists** in `localStorage` (try/catch), export/import as JSON.
- **Copy with citation**, plain text and Markdown.

### Deferred

PWA/offline, pattern search, structured data, page-scan links (the plain text carries no page numbers, so these need another source), browser extension. Offline use and static data have their own section (§4b) and phase (7); there is no API (§4b says why).

## 4b. Offline use and static data (no API)

Programs such as Drafter or a Markdown editor need to look words up. W1913 gives them the data itself rather than an API: the edition is CC0, so there is nothing to meter, and a program that carries the data works offline and sends nothing anywhere.

### What is published

1. **Edition downloads**: every release in full (§3a): JSONL plus `manifest.json`.
2. **A lookup build**: a compact file for programs that only need to look words up (headword, variants, part of speech, sense text; estimated 25–30 MB, roughly a third of that compressed; to be measured). Published with each release.
3. **`@w1913/lookup`**: a small package that reads the lookup build and exposes `lookup(word)`, with the same folding and suffix stripping as the site, so a program and w1913.com give the same answer.
4. **Static shards** at `w1913.com/data/<version>/<prefix>.json` (one per two-letter prefix, about 600 files), for a browser program that may fetch from w1913.com. Plain files, served and cached by nginx; no keys, no accounts, no personal data. The existing nginx rate limit is the only guard they need.

### Drafter

Checked against the Drafter repository (27 Nov 2026):

- **Desktop (Electron)** runs the drafter.dev app from its own files, already bundles an offline spellcheck dictionary, and promises that its only network requests are to GitHub for updates. The W1913 lookup build fits the same pattern: an optional download inside Drafter, from the W1913 GitHub release (a host the desktop app already uses), stored next to its other data and queried locally. Drafter's privacy notes gain one line.
- **The Markdown editor** is web-only, so it works like drafter.dev: it serves the lookup build from its own origin and caches it for offline use.
- **Web (drafter.dev)** allows network requests only to its own origin (`connect-src 'self'`), so it cannot call w1913.com, by design. drafter.dev would serve the lookup build itself and cache it for offline use, like the rest of the app.
- In both, looking a word up sends nothing: no word from a script leaves the writer's device, which an API could not promise.

### Why there is no API (decided 27 Nov 2026)

A read-only API with anonymous and keyed tiers was designed and declined:

- **Nothing to protect.** The data is public domain and downloadable in full, so keys and limits would guard nothing.
- **No user story it serves best.** Lookup from a writing program is better served by bundled data (instant, offline, private); developers are better served by the downloads.
- **The risk is all in the machinery.** Registration means storing email addresses, sending confirmation emails (which a form can be abused to aim at strangers), a bot check, abuse monitoring, and key revocation: personal data and attack surface on a shared droplet, for no gain.
- **It would contradict the programs it was for.** Drafter promises that a script never leaves the device, and its web version cannot reach another origin.

If a program ever needs a query that only the server can answer (definition search from inside another tool), the answer is one anonymous, read-only, rate-limited endpoint with no keys, accounts, or email, decided then.

## 4a. Interface

**Direction: "Grid".** A Swiss-style typographic layout: one grotesque family, a strict left edge, hairline rules, square corners, a single red accent, and a very large headword. It matches `assets/og-image.png`. Dark is the default theme; light is one control away.

**Reference mockups** (static HTML, open in any browser):

- `docs/ui/entry-full.html`: the entry page with every module present (Phases 5–6).
- `docs/ui/entry-phase1.html`: the same page as it ships in Phase 1.
- `docs/ui/cards.html`: the cards page, with a working flip.

They are references for layout, tokens, and semantics, not production code. The site is built with Nuxt UI components themed to the tokens below. The entry text in them is illustrative and was not produced by the parser. The Phase 1 mockup runs quotations on as plain sense text, because quotations are not detected until data 0.6.

### Entry page anatomy

1. **Header:** wordmark, search (combobox, also opened with `/` or Cmd/Ctrl-K), section links, theme toggle. A section link appears only once its route ships.
2. **Trail:** a `<nav>` above the entry.
3. **Three regions:**
   - **Entry** (centre; first in the DOM): the `<h1>`, the red rule, the prosody line, one section per homograph, then Synonyms and Collocations.
   - **Rail** (left on wide screens; below the entry on narrow ones): "On this page", then Neighbors.
   - **Modules** (right): save, copy with citation, and sense permalink; "Quoted here"; "Labels here".

Every module is optional. The page must look complete with none of them, which is how it ships in Phase 1.

### What appears when

| Element | First appears | Until then |
|---|---|---|
| Homograph sections, senses, etymology, cross-reference links | Data 0.2 (Phase 1) | n/a |
| Trail, Neighbors, On this page, look up by selection | Phase 1 | n/a |
| Synonyms section (words, essay pointer, reverse listings, compare) | Data 0.3 (Phase 2) | `Syn.` shown as a plain line in the entry |
| Label chips on senses; "Labels here" | Data 0.4 (Phase 3) | Labels shown inline as the source prints them: `[Poetic]`, `(Chem.)` |
| Prosody line; rhythm filter in Synonyms | Data 0.5 (Phase 4) | Omitted |
| Quotations as `<blockquote>` with linked `<cite>`; "Quoted here"; Collocations section | Data 0.6 (Phase 5) | Quotations and collocations shown as plain entry text |
| Save word, copy with citation | Phase 6 | Omitted |
| Cards: random and trail decks, synonyms on the back, reverse mode | Data 0.3 (Phase 2) | n/a |
| Cards: label and search decks | Data 0.4 (Phase 3) | Deck buttons for labels omitted |
| Cards: quotation on the back; author decks | Data 0.6 (Phase 5) | Omitted |
| Cards: saved deck; "Knew it" / "New to me" | Phase 6 | Omitted |

### Cards page

One card fills the page: a 1px frame in `--fg`, a caption row (deck name, position), and the card face. The front is the headword at entry-page scale with the red bar under it. The back uses a 40px heading, 26px definition text, and the entry page's quotation and link styles. Deck and "show first" controls sit above the card; Previous, the flip button (the page's one accent-filled control), and Next sit below it.

### Tokens

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#0d0d0d` | `#fafafa` | Page ground |
| `--fg` | `#f2f2f2` (17.4:1) | `#111111` (18.1:1) | Text, strong rules |
| `--mu` | `#a3a3a3` (7.7:1) | `#595959` (6.7:1) | Secondary text |
| `--ln` | `#303030` (1.5:1) | `#d0d0d0` (1.5:1) | Decorative hairline rules only |
| `--ac` | `#ff5a47` (6.3:1) | `#c8102e` (5.6:1) | Accent |
| `--on` | `#0d0d0d` (6.3:1 on accent) | `#ffffff` (5.9:1 on accent) | Text on an accent fill |

Ratios are computed against `--bg` unless stated. If the accent is changed to match the og-image red exactly, it must still reach 4.5:1 in both themes. `--ln` is below the 3:1 that WCAG 1.4.11 requires for component boundaries, so it is never the edge of a control: button and chip borders use `--mu` or `--fg`.

### Type

- **Family:** Inter, self-hosted (the og-image face), so every platform renders the same: `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`. One family throughout, quotations included. The mockups load Inter from Google Fonts for convenience; the site never calls a third-party font host.
- **Headword (`<h1>`):** `clamp(72px, 11vw, 160px)`, weight 700, line-height 0.9, tracking -0.045em.
- **Homograph heading (`<h2>`):** 32px, weight 700.
- **Sense text:** 20px / 1.5. **Quotation:** 17px, secondary colour. **Meta lines:** 15px, secondary colour.
- **Caption labels:** 12px, upper case, tracking 0.09em.

### Rules

- Square corners everywhere. Rules are 1px; a section opens with a rule in `--fg`, minor divisions use `--ln`.
- The accent is reserved for: the bar under the headword, sense numbers, underlines on cross-reference links, the primary button, and the focus outline.
- Links in running text are underlined, so they never depend on colour alone.
- Interactive targets are at least 44px tall (inline links in text excepted).
- **Theme:** dark unless the visitor has chosen light; the choice is stored in `localStorage` (try/catch).
- **Narrow screens:** below 900px the page is one column in the order entry, rail, modules. The header wraps; nothing scrolls sideways.
- **Long entries:** sense text stays at 20px; "On this page" carries the navigation.

### Not yet designed

Search results, `/synonyms`, author and label pages, `/check`, and the saved-words page. They follow the same tokens and rules. An exploration of the definition-search screen exists outside the repo and has not been adopted.

---

## 5. Accessibility

Target **WCAG 2.2 AA**, verified with axe, NVDA, and VoiceOver.

- Headings, lists, `<dfn>`, `<blockquote>`, `<cite>`, `<abbr>`; no custom elements.
- One `<h1>` per page; each homograph an `<h2>`.
- Syllable and accent marks are presentational; the accessible name is the plain word.
- Autocomplete follows the ARIA combobox pattern.
- Period-check highlights are conveyed in text, not colour alone, with a summary list.
- Light and dark themes; `prefers-reduced-motion` respected.
- The entry comes before the rail and the modules in the DOM, whatever the visual order.
- The trail, "On this page", and the neighbors list are three separate `<nav>` landmarks, each labelled by its visible caption; the current word carries `aria-current="page"`.
- An untranscribed gap (§2) is a neutral glyph with the text alternative "untranscribed in the source".
- The visual headword in each homograph heading (with syllable and stress marks) is hidden from assistive technology; the plain word is exposed in its place.
- Look up by selection is an enhancement for pointer and touch; every word it reaches is also reachable through the search box.
- A card flip is a disclosure, not a visual trick: the flip button carries `aria-expanded`, the hidden face is removed from the accessibility tree, and the revealed face is announced. No 3D rotation; under `prefers-reduced-motion` there is no transition at all.
- Card shortcuts use only Space, Enter, and arrow keys, act only when focus is not in a form field, and each has a visible button.

---

## 6. Phases

Every phase builds from the public-domain plain text. Phase 5 adds the hardest heuristics, and the evaluation command that scores them.

| Phase | Data work | Data release | What a writer gets | Exit test |
|---|---|---|---|---|
| **0. Spike** | Plain-text segmenter run over the whole file for boundary counts, then studied on two slices: X–Z (~875 entries, the alphabet's tail) and SU (a dense middle slice with synonym paragraphs, quotations, and *sublime*). Character and gap audit; alignment proof on the same slices (skipped if the tagged files cannot be fetched) | 0.0 (X–Z and SU) | Nothing yet | Every header line echoes its headword after folding, or is on a named exception list; alignment numbers reproduce §2, or are recorded as not yet run |
| **1. Readable** | Segment all; header line; `Etym:`, `Defn:`, senses. Site: import step, entry rendering | 0.1, 0.2 | Entry pages, root URLs, autocomplete, heuristic cross-reference links, neighbors, trail, on-this-page list, look up by selection (exact matches) | 50 golden entries pass; axe clean |
| **2. Better word** | `Syn.` words, targets, essays | 0.3 | Thesaurus panel, essays, compare, cards (random and trail decks) | 30 spot-checked sets correct |
| **3. Word for it** | Labels. Site: FTS over definitions | 0.4 | Definition search, label browsing, card decks by label and by search | 20 fixed test queries sensible |
| **4. Rhythm and period** | Stress/syllable fields. Site: suffix stripper, word list | 0.5 | Stress filter, period check, inflected lookup | Stripper tested on 200 forms |
| **5. Masters** | Quotation, author, and collocation heuristics; evaluation command against the tagged edition | 0.6 | Quotation search, author pages, collocation lookup, better links, quotations on cards, author decks | Precision and recall in `eval.json` meet the agreed bar (§8); top 300 authors normalised |
| **6. Keeping and deferred** | Corrections workflow | 1.0 | Lists, citations, saved-word deck and card self-rating, then the deferred set | — |
| **7. Offline use and static data** | Lookup build; static shards; `@w1913/lookup` | any | Word lookup inside Drafter (desktop and web) and the Markdown editor, offline, sending nothing (§4b) | `lookup()` agrees with the site on 200 fixed words; the lookup build's size is measured and recorded |

Data and site advance together, one layer at a time. The edition is never "finished first".

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Licence status of the tagged files | Settled by avoidance: nothing derived from them is stored or published; they only score heuristics |
| Plain-text typos | Edition differences surface candidates; human-reviewed `corrections.json` |
| Heuristics find quotations and cross-references less precisely than tags would | Measured two ways (hand-labelled sample; answer key from the tagged edition); a feature ships only above an agreed precision |
| Tagged files stay unreachable, so there is no answer key | Largely retired: PG's mirror serves them and their checksums are pinned. Otherwise, larger hand-labelled samples; nothing in the build depends on the tagged files |
| Static shards fetched in bulk | They are public-domain files the downloads already offer; nginx caching and `limit_req` keep load down |
| Upstream file changes | Pinned checksum |
| A bad deploy takes the site down, or disturbs the other app on the same droplet | Releases built side by side; canary check before the switch; automatic rollback; PM2 commands scoped to `w1913`; separate ports |
| Project Gutenberg site outages | The download step accepts a file placed by hand and verifies it against the pinned checksum; a verified copy is already held |
| Definition search disappoints | Labelled honestly; embeddings path identified |
| Period check misleads | Wording and stated limits |
| Project stalls in the parser | Useful after Phase 1; every phase shippable |
| Name and trademark | Avoid "Merriam" and look-alike branding. Not legal advice. |
| Dated or offensive 1913 definitions | Stated on the colophon; definitions are not rewritten |

---

## 8. Open questions

1. Whether to register `w1913.dev` / `w1913.app` as well. (`w1913.com` was registered at DNSimple on 24 Nov 2026.)
2. What precision is good enough to ship quotation search? (Proposed starting bar: 95% on the scored sample.)
3. Where is the edition published? (Default: release assets on `cschweda/w1913`; npm is the alternative.)
4. Is meaning-based search worth a model dependency?
5. Should the trail survive closing the tab? (Default: no. It lasts for the tab's session; saved lists are the permanent record.)
6. In what form does the lookup build ship: SQLite or a compact JSON index? (Decide by measuring size and lookup speed in Drafter's Electron and browser builds.)
7. Does the lookup build come with Drafter's installer or as an optional download inside it? (Default: optional download, since it is far larger than the spellcheck dictionary.)

---

## 9. Change log

**Draft 5.5**
- Phase 0 findings folded into §2: 113,409 entries (three wrapped headword lines); damaged pronunciation respellings on ~4,700 header lines; 144 umlaut pseudo-variants; authorities cited without quotations, so a trailing name has three readings; marked forms inside entry bodies; untranscribed-text counts measured on paragraphs (4,848 Greek-type gaps) and their cause corrected (never typed, not lost in tag stripping); alignment re-measured (98,040 shared headwords; X–Z reproduces the earlier sample); PG's mirror serves the tagged files.
- Added §4b, offline use and static data: edition downloads, a compact lookup build, `@w1913/lookup`, and static shards, so Drafter (desktop and web) and the Markdown editor can look words up offline without sending anything. A keyed API was designed and declined; §4b records why. Phase 7 added; the API leaves the deferred list.
- Risks and open questions updated.

**Draft 5.4**
- Checked against the canonical file (checksum verified). §2 corrected and extended: CRLF line endings; headword lines are ASCII-folded while header lines keep æ and ö, so the echo test must fold; `Defn:` also follows numbered sense lines; `Syn.` count is 3,273; the meaning of the stress marks; quotations run on as wrapped text, and `"` is both a stress mark and an inline quotation mark.
- Untranscribed Greek, Hebrew, and symbols were removed upstream. They are detected and marked as gaps, never restored (§2, §5).
- The proofreading queue goes only into `eval.json`; `report.json` is published and never quotes the tagged edition (§3).
- The edition is stored in edition order with an explicit `ord` (§3a). Release 0.0 is listed.
- Phase 0 adds an SU slice beside X–Z, and its exit test folds before comparing (§6).
- Reserved route words link to the word's entry (§3). The period check's word list is described (§4).
- Typeface settled: self-hosted Inter first (§4a); open question 4 removed. `--ln` is decorative only (WCAG 1.4.11). "On this page" and Neighbors are separate landmarks (§5). The mockups were updated to match, and the Phase 1 mockup no longer shows detected quotations.
- Checksums live in `packages/data/checksums.json`.
- Hosting settled: the Forge droplet `graceful-monet`, under PM2 (one fork-mode process on Node 24), not Netlify. `w1913.com` registered. Added §3 "Deploying": `rebuild.sh` builds releases side by side, tests a canary, switches a symlink, and rolls back on a failed health check. `ecosystem.config.cjs` added.

**Draft 5.3**
- Added cards (§1, §4): decks that are random, by label, by search, or from the trail and saved list; reverse mode; self-rating without scheduling. Phased across 2, 3, 5, and 6 (§6).
- Data model: `entries.card_ok`, the filter for the random deck. `cards` joins the reserved words.
- §4a: cards page layout and a third mockup, `docs/ui/cards.html`. §5: two accessibility requirements for cards.
- Non-goals: spaced-repetition scheduling.

**Draft 5.2**
- Added two features to §1 and §4: neighbors and the trail. Both ship in Phase 1. Added the on-this-page list and look up by selection alongside them.
- Added §4a, the interface: direction "Grid", page anatomy, what appears at each data release, tokens, type, and rules. Static mockups are in `docs/ui/`.
- Data model: `entries.ord` (position in edition order) for neighbors.
- §5: four accessibility requirements that follow from the new interface.
- §8: the typeface question is narrowed to self-hosting; added the question of trail persistence.

**Draft 5.1**
- No change of direction. Consistency pass after re-reading the whole document against Draft 5's decision.
- Marked three figures in §1 as measured on the tagged edition and therefore provisional.
- Recorded the gutenberg.org outage and the hand-placed-file path in §2; Phase 0's alignment proof is now explicitly skippable.
- Clarified the two ways a heuristic is measured (`report.json`, `eval.json`); added the risk that the tagged files stay unreachable.
- Dropped the now-uniform "Source" column from the layer table; gave the stack list its own heading.

**Draft 5**
- Project Gutenberg replied (23 Nov 2026): the copyright flag on #660–670 will not change, and #29765 is the edition to use.
- The tagged files no longer supply data. They are an answer key for an evaluation command; nothing derived from them is stored, served, or released.
- Removed: hint-derived fields, `src` markers, page numbers, the `--no-hints` mode, and the internal-only data release.
- Added: `eval.json`, a hand-placed-file path for the download step, and a precision bar as an open question.

**Draft 4**
- Split into two packages: `packages/data` produces a versioned JSON Lines edition; `apps/site` imports a pinned release.
- The edition is built in layers, one per phase, each a data release (§3a). It is a product of the project, not a prerequisite.
- Publication policy: plain-derived layers may be published; hint-derived fields are held until Project Gutenberg answers.

**Draft 3**
- Canonical text is now the public-domain plain edition (#29765); the tagged v0.50 files are optional build-time hints, aligned by word-level diff. Alignment tested: 92% of sampled entries at least 90% similar.
- Phases reordered so Phases 1–4 need no hints.
- Added: `--no-hints` build mode, checksum pin, corrections workflow, P/H marking on every feature.
- Removed: the entity-mapping table (the plain text is already UTF-8).

**Draft 2**
- Fixed segmentation and exit-test errors; corrected headword, synonym, and quotation counts; restated the licence position honestly.
- Reorganised features around writers' questions; added thesaurus, stress filter, period check, quotation search, root URLs.
