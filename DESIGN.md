# W1913 — Design Document

**Name:** W1913 (`w1913.com`; the abbreviation the original transcribers used for this dictionary)
**Author:** Christopher Schweda
**Repository:** https://github.com/cschweda/w1913
**Status:** Draft 4 — 15 November 2026 (data and site split into two packages; changes are listed in §9)
**Companion document:** `KICKOFF.md` (Claude Code kickoff prompt)

---

## 1. What this is

A writer's tool built on *Webster's Revised Unabridged Dictionary* (1913, ed. Noah Porter), parsed from Project Gutenberg's public-domain plain-text edition. It is independent of websters1913.com and every other existing site.

Showing definitions is table stakes; three sites already do it. W1913 earns its place by answering the questions a writer actually has at the desk:

| The writer's question | What W1913 does | Data it rests on |
|---|---|---|
| "What does this word really mean?" | A readable entry, opened from anywhere in one step | ~113,400 entries |
| "Is there a better word?" | Thesaurus view with the dictionary's own essays on how near-synonyms differ | ~3,250 synonym paragraphs, ~560 of them discursive |
| "What's the word for…?" | Search inside definitions | Every definition |
| "I need a word with this rhythm." | Filter by syllable count and stress pattern | Stress marks on ~99,000 entries |
| "Would my 1890s narrator say this?" | Period check: paste a passage, see which words this dictionary does not contain | ~102,300 distinct headwords |
| "How did the masters use it?" | Search and browse the quotations by author | ~47,000 quotations |
| "Show me something I didn't know I wanted." | Browse obsolete, poetic, dialect, nautical, heraldic words | ~17,000 "Obs." labels; ~270 subject fields |

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

---

## 2. Source text: plain-first, hints optional

Two Gutenberg editions carry the same dictionary. One has a clean licence and little markup; the other has rich markup and an unclear licence. Draft 3 uses each for what it is good at.

| | **Canonical text: #29765** | **Optional hints: #660–670 v0.50** |
|---|---|---|
| What | Plain UTF-8 text, one file, 28.0 MB | Eleven tagged files (`pgw050*.txt`), 41.6 MB |
| Gutenberg's catalogue | "Public domain in the USA" | "Copyrighted" banner (see below) |
| Role | **Every published word comes from here** | Build-time only: tells the parser where structures begin and end |
| Published? | Yes | Never, in any form |
| Required? | Yes | No. The build must succeed without it |

**Canonical file:** `https://www.gutenberg.org/ebooks/29765.txt.utf-8`
SHA-256 as fetched 15 Nov 2026: `86fb9c28c32008ea288ca4bcf34f4f0d3d11ccf9e0898294d98b73671497f1d3`
Gutenberg revises this file occasionally (last in July 2025). The checksum is pinned, so a silent upstream change fails the build instead of shifting the data.

**Hint files** (all under `https://www.gutenberg.org/files/`):
`660/old/pgw050ab.txt` · `661/old/pgw050c.zip` (zip only) · `662/old/pgw050de.txt` · `663/old/pgw050fh.txt` · `664/old/pgw050il.txt` · `665/old/pgw050mo.txt` · `666/old/pgw050pq.txt` · `667/old/pgw050r.txt` · `668/old/pgw050s.txt` · `669/old/pgw050tw.txt` · `670/old/pgw050xz.txt`

### Why this split

- **Licence.** The 1913 text is in the US public domain, and #29765 is catalogued that way. The tagged files carry a "COPYRIGHTED Project Gutenberg eBook" banner, apparently inherited from the 1996 release whose header claimed copyright on the field marks (while stating the entries themselves are public domain). Inside the v0.50 files, the transcriber says it "makes no proprietary claims on this version". These signals conflict, so W1913 does not depend on resolving them.
- **Precedent.** #29765's own readme records that it was made by stripping the tags from the earlier tagged file. Gutenberg has therefore already cleared a tag-stripped derivative of the same work.
- **Residual risk.** Using the tagged files as a guide is still a use of them. Whether "this span is a quotation" is protectable is a legal question this document does not answer. **Action before launch:** email Project Gutenberg to ask about v0.50's status. If the answer is bad, switch hints off; nothing published changes source. This is not legal advice.

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

- **Entry boundary:** a blank line, then a line in capitals. 113,412 such lines; 4,310 list variants separated by `;` (`ABATIS; ABATTIS`). ~102,300 distinct headwords.
- **Header line:** the headword with syllable and stress marks, then part of speech. Marks present in 99,368 entries; a part-of-speech abbreviation detected in 108,493.
- **`Etym:`** 53,297 · **`Defn:`** 102,760 (single-sense entries; multi-sense entries use numbered lines instead) · **numbered sense lines** 62,508 · **lettered sub-senses** 6,830 · **`Note:`** 3,557 · **`Syn.`** ~3,250.
- **Accented characters are intact** (ö, é, æ and so on, as real UTF-8).
- **Usage and subject labels** appear inline as `[Obs.]`, `(Naut.)`.

What it does **not** mark:

1. Where a quotation starts and ends, and which trailing word is the author.
2. Which words are cross-references.
3. Collocations (they run on as ` -- Sublime Porte. ...`).
4. Original page numbers.

It also contains transcription typos the tagged edition lacks (seen in one sample entry: "fiuid", "Quid" for "fluid", "Foundo" for "Found").

### What the hints add

Measured on the tagged files: 39,329 block quotations (30,401 with an author directly after) plus ~7,700 inline quotations; ~26,900 collocations with their own definitions; 65,258 underlined cross-references and inflected forms; 1,744 page markers. The first file's front matter contains the transcriber's legend of every field mark.

### Alignment (tested 15 Nov 2026)

The two editions were aligned by headword and homograph order, then compared word by word on a sample of ~2,900 entries:

- ~96,800 headwords found in both; for 95,162 of them both editions have the same number of entries.
- 72% of sampled entries are word-for-word identical; 92% are at least 90% similar; 98% at least 80%.

Method for the build:

1. Pair entries by normalised headword and order within the homograph group.
2. Strip tags from the hint entry; run a word-level diff against the plain entry.
3. Carry each tag span across to the plain text where both ends land on matching words.
4. Below a similarity threshold (start at 0.90), ignore the hints for that entry and fall back to plain-only heuristics.
5. Record every difference in `report.json`. The list doubles as a proofreading queue: a difference is a candidate typo, to be corrected only after a human checks it against a page scan.

### Known problems

1. **Plain-text typos**, as above. No bulk "fix from hints"; reviewed corrections only, kept in a versioned `corrections.json`.
2. **Entry boundary false positives.** A line in capitals inside an entry could be mistaken for a headword. Validate: every block's second line should echo the headword.
3. **Pronunciation is mostly absent** in both editions. Never depend on it.
4. **Untranscribed characters** (mostly Greek and other scripts in etymologies). Audit how the plain text renders them in Phase 0; show a neutral glyph with a text alternative.
5. **Quotation and author detection without hints** is a heuristic: lines after a definition that end in a short capitalised token and a full stop. Measure before trusting.
6. **Cross-reference detection without hints**: `See X`, `Cf. X`, `Same as X` followed by a capitalised word that is a headword. Cross-references often name a part of speech ("See Sublime, a."); resolve to the right homograph.
7. **Labels**: match a closed vocabulary built by frequency count.
8. **Authors are noisy**: thousands of distinct strings, a few hundred real authors. Normalise the top 300 by hand ("Shak." → Shakespeare).
9. **Listed inflections are sparse.** Inflected lookup needs a rule-based suffix stripper checked against the headword list.
10. **Hint files have mis-nested tags** and two entry openers (`<p><hw>` and `<p>{ <hw>`). Tolerant tokenizer; never a strict XML/HTML parser.

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
 packages/data                                              apps/site
 ─────────────                                              ─────────
 29765.txt (canonical) ──► segment ──► extract ──┐
                                          ▲      ├──► w1913-<ver>.jsonl ──► import ──► w1913.sqlite ──► Nuxt 4 SSR
 pgw050*.txt (optional) ──► tokenize ──► align ──┘        + manifest.json                  └── FTS5
                                          │
                                          └──► report.json
```

Why split:

- **Frozen input.** The site pins a data version. A parser change cannot silently alter what is live.
- **One home for corrections.** Typo fixes and author normalisation live in the data package.
- **Reusable.** The edition is what a browser extension, an editor plugin, or anyone else would consume.
- **Incremental.** The edition is built up in layers (§3a), one per phase. It is never a prerequisite to finish before the site starts.

- **Nuxt 4**, **Nuxt UI v4**, **pnpm**, TypeScript. `better-sqlite3`, read-only at runtime, **FTS5**.
- **Hosting:** Chris's DigitalOcean droplet via Laravel Forge; Nuxt SSR (Node preset) behind nginx. 2 GB RAM recommended; 1 GB works with swap or an off-box build.
- nginx caches entry pages; cache purged on deploy. Rate limiting at nginx (`limit_req`).
- `--no-hints` build flag. CI runs both modes; the no-hints build must pass.

### URLs

- `w1913.com/sublime` — the entry. Root-level, so the address bar is the search box. Reserved words (`search`, `author`, `label`, `synonyms`, `check`, `about`, `api`) are served from `/w/<word>`.
- Slugs are lower-cased headwords with marks stripped. Homographs and case pairs (august / August) share one page, each as its own section.
- `/sublime#a-3` — sense permalink.

### Data model

```sql
entries(id, slug, headword, headword_marked, homograph_no, pos,
        syllables, stress_pattern,          -- e.g. 2, "01"
        etymology_html, body_html, page_no, -- page_no NULL without hints
        hint_similarity, letter)            -- NULL if hints unused
alt_headwords(entry_id, form, kind)         -- variant | inflection | collocation
senses(id, entry_id, sense_no, sub_no, def_text, def_html)
labels(id, code, name, kind)                -- subject | usage
sense_labels(sense_id, label_id)
authors(id, abbr, name, quote_count)
quotations(id, entry_id, sense_id, text_html, text_plain, author_id,
           is_verse, source)                -- source: hint | heuristic
collocations(id, entry_id, phrase, def_html)
synonym_sets(id, entry_id, body_html, is_essay)
synonym_members(set_id, word, entry_id)     -- entry_id NULL if not a headword
xrefs(from_entry_id, to_headword, to_pos, to_entry_id, source)
fts_defs(headword, def_text)                -- FTS5
fts_quotes(text_plain, author)              -- FTS5
```

These tables are built by the site's import step from the JSONL release. `body_html` is our own semantic HTML, rendered at import from the structured entry. No source markup of any kind is stored or served.

### Data package outputs

- `w1913-<version>.jsonl` and `manifest.json` (§3a)
- `report.json`: counts per field; entries with and without hints; similarity distribution; edition differences (the proofreading queue); unresolved cross-references; measured error rate of each heuristic.
- Golden tests: ~50 hand-checked entries covering every structural shape, each asserted in both build modes.

Source files are fetched by script with pinned SHA-256 checksums and never committed.

---

## 3a. The edition: a layered data release

**Format.** JSON Lines: one entry per line, UTF-8, sorted by headword then homograph number. Diffable, streamable, and trivial to load into SQLite. A `manifest.json` records the version, the layers present, source checksums, entry count, and build mode (hints on or off).

**Sketch of one entry** (wrapped here for reading; one line in the file):

```json
{"id": "sublime-1", "headword": "Sublime", "marked": "Sub*lime\"", "pos": "a.",
 "variants": [], "syllables": 2, "stress": "01",
 "etymology": "L. sublimis; sub under + ...",
 "senses": [{"n": 1, "def": "Lifted up; high in place; exalted aloft; uplifted; lofty.",
             "labels": [],
             "quotes": [{"text": "Sublime on these a tower of steel is reared.",
                         "author": "Dryden", "src": "hint"}]}],
 "syn": {"words": ["Exalted", "lofty", "noble", "majestic"], "see": ["Grand"], "essay": null},
 "xrefs": [{"to": "Eliminate", "src": "plain"}],
 "text": "Sub*lime\", a. [Compar. Sublimer; ...",
 "layers": ["segment", "senses", "syn", "prosody", "hints"]}
```

`text` is the entry's canonical plain text, always present, so a consumer can ignore the tagging entirely. Every field that can come from either source carries `src`: `plain` or `hint`.

**Layers and releases.** Each layer is added by one phase and ships as a data release. The site moves to a new data version only when it has a feature that needs it.

| Release | Layer | Adds | Source | Needed by |
|---|---|---|---|---|
| 0.1 | `segment` | id, headword, variants, marked header, pos, `text` | plain | Phase 1 |
| 0.2 | `senses` | etymology, definitions, numbered senses, notes, heuristic cross-references | plain | Phase 1 |
| 0.3 | `syn` | synonym words, "see" targets, essays | plain | Phase 2 |
| 0.4 | `labels` | usage and subject labels per sense | plain | Phase 3 |
| 0.5 | `prosody` | syllable count, stress pattern | plain | Phase 4 |
| 0.6 | `hints` | quotations, authors, precise cross-references, collocations, page numbers | hint | Phase 5 |
| 1.0 | — | First reviewed corrections pass applied | — | — |

"Good enough" for a layer is a measured error rate on a hand-labelled sample, recorded in `report.json`. It is not perfection; the long tail of malformed entries is fixed through `corrections.json` over time.

**Licensing (decided).** Code, documentation, and design are MIT (`LICENSE`). The published edition is released under CC0 1.0 (`LICENSE-DATA`). CC0 can only waive rights we hold, so it applies to our own tagging; that is one more reason hint-derived fields stay out of the published file.

**What gets published.**

- Releases built from the plain text alone (0.1 to 0.5, and any release built with `--no-hints`) can be published openly. They contain public-domain text plus our own tagging.
- The `hints` layer is different. A published file whose quotation and cross-reference marks were carried over from the tagged edition is close to republishing that edition's markup in another syntax. **Hint-derived fields are not published as data until Project Gutenberg has answered** (§8). The public file is produced by dropping every field with `src: "hint"`; the site may still use the full file internally.
- This is the risk as understood here, not legal advice.

---

## 4. Features, by writer's question

Each feature is marked **P** (works from the plain text alone) or **H** (better with hints; degrades to a heuristic without them).

### "What does this word mean?"

- **Entry page** (P). Numbered senses as an ordered list; etymology and synonyms set apart; all homographs on one page. Quotations as `<blockquote>` with `<cite>` (H).
- **Linked cross-references** (H; heuristic links without hints).
- **Decoded abbreviations** (P): `v. t.`, `Obs.`, `Naut.`, `Shak.` as `<abbr>`.
- **One-step lookup** (P): root URLs; `/` or Cmd/Ctrl-K; autocomplete over headwords and variants; suffix-stripping for inflected forms; "did you mean" on a miss. Collocations in autocomplete ("Sublime Porte") (H).
- **Browser search-engine registration** (P).

### "Is there a better word?"

- **Thesaurus panel** (P): the words from the entry's own `Syn.` list, plus every other entry whose list names this word.
- **The ~560 synonym essays** (P), shown in full on each word they discuss and collected at `/synonyms`.
- **Compare view** (P): two or three words side by side.

### "What's the word for…?"

- **Definition search** (P): FTS5 with stemming. Labelled honestly: it matches the words in 1913 definitions.
- **Later, not v1:** meaning-based search using embeddings.

### "I need a word with this rhythm."

- **Syllable and stress filter** (P), from the header-line marks. Combines with the thesaurus: "synonyms of *lofty*, two syllables, stress on the first."

### "Would my 1890s narrator say this?"

- **Period check** (P) at `/check`: paste a passage; words not found (after suffix stripping) are highlighted. Runs in the browser; the text is never sent to the server. Worded as "not in this dictionary", never "anachronism".

### "How did the masters use it?"

- **Quotation search and author pages** (H). Without hints these run on heuristic quotation detection and ship only if its measured precision is acceptable.

### "Show me something."

- **Label browsing** (P): `/label/obs`, `/label/poetic`, `/label/naut`.
- **Random entry; word of the day** (P).

### Keeping

- **Saved words and lists** in `localStorage` (try/catch), export/import as JSON.
- **Copy with citation**, plain text and Markdown.

### Deferred

Public documented API, PWA/offline, pattern search, structured data, page-scan links (H: needs page numbers), browser extension.

---

## 5. Accessibility

Target **WCAG 2.2 AA**, verified with axe, NVDA, and VoiceOver.

- Headings, lists, `<dfn>`, `<blockquote>`, `<cite>`, `<abbr>`; no custom elements.
- One `<h1>` per page; each homograph an `<h2>`.
- Syllable and accent marks are presentational; the accessible name is the plain word.
- Autocomplete follows the ARIA combobox pattern.
- Period-check highlights are conveyed in text, not colour alone, with a summary list.
- Light and dark themes; `prefers-reduced-motion` respected.

---

## 6. Phases

Phases 1–4 need only the public-domain plain text. Hints arrive in Phase 5, after the site is already useful, and can be removed without undoing anything before it.

| Phase | Data work | Data release | What a writer gets | Exit test |
|---|---|---|---|---|
| **0. Spike** | Plain-text segmenter on X–Z; character audit; alignment proof on the same slice | 0.0 (X–Z only) | Nothing yet | Every block's header line echoes its headword; alignment numbers reproduce §2 |
| **1. Readable** | Segment all; header line; `Etym:`, `Defn:`, senses. Site: import step, entry rendering | 0.1, 0.2 | Entry pages, root URLs, autocomplete, heuristic cross-reference links | 50 golden entries pass; axe clean |
| **2. Better word** | `Syn.` words, targets, essays | 0.3 | Thesaurus panel, essays, compare | 30 spot-checked sets correct |
| **3. Word for it** | Labels. Site: FTS over definitions | 0.4 | Definition search, label browsing | 20 fixed test queries sensible |
| **4. Rhythm and period** | Stress/syllable fields. Site: suffix stripper, word list | 0.5 | Stress filter, period check, inflected lookup | Stripper tested on 200 forms |
| **5. Hints** | Tokenize tagged files; align; carry over quotations, authors, cross-references, collocations, page numbers | 0.6 (internal until cleared) | Quotation search, author pages, precise links, collocation lookup | No-hints build still passes; hint coverage and similarity reported |
| **6. Keeping and deferred** | Corrections workflow | 1.0 | Lists, citations, then the deferred set | — |

Data and site advance together, one layer at a time. The edition is never "finished first".

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Licence status of the tagged files | Text comes only from #29765; hints optional and unpublished; ask Gutenberg before launch |
| Plain-text typos | Edition differences surface candidates; human-reviewed `corrections.json` |
| Alignment adds complexity | Deferred to Phase 5; threshold fallback; both build modes tested |
| Heuristics unverified | Each gets a hand-labelled sample and a measured error rate before a feature ships on it |
| Upstream file changes | Pinned checksum |
| Definition search disappoints | Labelled honestly; embeddings path identified |
| Period check misleads | Wording and stated limits |
| Project stalls in the parser | Useful after Phase 1; every phase shippable |
| Name and trademark | Avoid "Merriam" and look-alike branding. Not legal advice. |
| Dated or offensive 1913 definitions | Stated on the colophon; definitions are not rewritten |

---

## 8. Open questions

1. Register `w1913.com` (and `.dev` / `.app` if wanted); all three were unregistered on 15 Nov 2026.
2. Email Project Gutenberg about v0.50 before starting Phase 5.
3. Where is the edition published? (Default: release assets on `cschweda/w1913`; npm is the alternative.)
4. Body typeface, and whether to self-host fonts.
5. Is meaning-based search worth a model dependency?

---

## 9. Change log

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
