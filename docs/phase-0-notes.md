# Phase 0 notes

What the canonical text (#29765) turned out to be, measured on 27 Nov 2026
with `pnpm --filter @w1913/data run phase0` (whole file, plus the X–Z and SU
slices) and `run eval` (alignment with the tagged edition). Every example is
quoted from #29765, the public-domain canonical file. Line numbers are in the
line-normalised file.

## Segmentation

**Rule** (`segment/segment.ts`, `segment/headword-line.ts`): an entry starts
at a line that follows a blank line and consists only of capitals, digits,
spaces and `; ' - . , & ( )`, has no run of two spaces, does not begin with a
sense number, and is followed by a non-blank line. A lone capital (`B`, `Y`)
may be followed by a blank line: the alphabet-letter entries have no header.

- 113,409 entries. DESIGN.md's 113,412 counted three headword lines that wrap
  onto a second line (`CONSOLATION GAME; …; CONSOLATION` / `RACE`) twice.
- Segmentation is **lossless**: reassembling the entries reproduces the body
  exactly. A test proves it on every run of the golden suite.
- Rejected look-alikes: the Morse code table (runs of spaces), sense lines in
  capitals (`5. (R.C.CH.)`, `1. T`).
- Three stray lines sit between entries: `M.` (505990), `P.` (596967),
  `X.` (967280). They look like volume markers. They stay inside the
  preceding entry's text and are listed in the report.
- CRLF line endings: 974,256 converted; no lone CR.

## Header lines

- The headword line is ASCII-folded; the header line keeps æ, ö, ñ:
  `AEGIS` / `Æ"gis, n.`. After folding (ligatures, diacritics, marks, spaces),
  113,339 header lines echo their headword. The 70 that do not:

  | Class | Count | Example |
  |---|---|---|
  | Alphabet-letter entry (no header line) | 18 | `Y` |
  | Headword line lost letters | 21 | `CAADA` / `Ca*ña"da`, `DOS--DOS` / `Dos`-à-dos"` |
  | Header line lost letters (usually œ) | 14 | `AUTOECIOUS` / `Au*to"cious` |
  | Phrase variants with "or" | 10 | `FUSE PLUG; FUZE PLUG` / `Fuse, or Fuze, plug .` |
  | Other (typos, damaged headers) | 7 | `OVERTHWART` / `, v. t.`; `ECHAUGUETTE` / `(), n.` |

- **Display headword**: the printed header form without marks, so the edition
  shows *Zuñian* and *Zoöchemical*, not ZUIAN and ZOOCHEMICAL. When the header
  lost letters, the headword line wins (`Autoecious`).
- **Pronunciation respellings** follow some forms in parentheses:
  `Cor"net*er (kr"nt-r), n.`. They are not part of the form; mis-reading them
  was the first bug the alignment caught (4,700 entries failed to pair).
- **Umlaut pseudo-variants**: 144 headword-line "variants" only spell a
  printed ö/ü/ä as oe/ue/ae: `ZOOCHEMICAL; ZOOECHEMICAL` over
  `Zo`ö*chem"ic*al`. They are left out of `variants` (64 of them in X–Z).
- **Part of speech** from a closed vocabulary (`n.`, `a.`, `v. t.`, `v. i.`,
  `adv.`, `n. pl.`, `v. t. & i.`, …), found on 109,225 header lines.
  Sometimes the comma before it is missing (`A*chæ"an, A*cha"ian a.`).

## Counts (whole file · X–Z · SU)

| | Whole | X–Z | SU | DESIGN.md §2 |
|---|---|---|---|---|
| Entries | 113,409 | 866 | 1,666 | 113,412 |
| Distinct headword-line forms | 102,492 | 901 | 1,548 | ~102,300 |
| Headword lines with variants | 4,310 | 97 | 48 | 4,310 |
| Header lines with marks | 99,427 | 684 | 1,617 | 99,368 |
| Part of speech detected | 109,225 | 832 | 1,643 | 108,493 |
| `Etym:` | 53,297 | 391 | 650 | 53,297 |
| `Defn:` lines | 102,760 | 818 | 1,528 | 102,760 |
| … after a numbered line | 10,731 | 28 | 124 | — |
| Numbered sense lines | 62,811 | 169 | 793 | 62,508 |
| Lettered sub-sense lines | 6,830 | 73 | 89 | 6,830 |
| `Note:` | 3,557 | 42 | 24 | 3,557 |
| `Syn.` | 3,273 | 3 | 69 | 3,273 |

Numbered lines differ from §2 because this count includes number-only lines
(`2.` followed by a label on the next line).

## Untranscribed text

Detection only; nothing is repaired. Patterns run on paragraphs, not lines,
because the text is hard-wrapped (`from Gr.` at a line end may continue with
`Acantha.]` on the next line).

| Trace | Whole file | X–Z | SU |
|---|---|---|---|
| Non-Latin-script language then punctuation or paragraph end (`fr. Gr. (Zoöl.)`) | 4,848 | 75 | 6 |
| Same, with a double space where the word was (`[Gr.  house.]`) | 190 | 1 | 0 |
| `(#)` placeholder | 344 | 7 | 0 |
| Empty brackets (`[]` where a symbol was) | 90 | 0 | 0 |
| Stray entities (`&a;`, `&breve;`) | 7 | 0 | 0 |
| Markup remnants (`>--`, `-->`) | 6 | 0 | 0 |

Greek is overwhelmingly the loss (4,939 raw hits before paragraph joining,
against 107 Gothic, 42 Arabic, 35 Sanskrit). Some etymologies lost their
closing bracket with the Greek word. The tagged edition's own legend says
Greek was never typed, so these gaps were not created by tag stripping.

43 distinct non-ASCII characters occur; the commonest are ö (11,555, mostly
*Zoöl.* and *coördinate*), é, æ, ë, è, ä. X–Z also has a few Greek
**transliterations** using `` ` `` as an accent (`xanqo`s`), which collides
with the secondary-stress mark; it occurs only inside etymologies.

## Quotations (step 6: observations, no heuristic yet)

- **Block quotations** run on as the next line(s) of the sense paragraph,
  ending with the author and a full stop:
  `1. Lifted up; high in place; exalted aloft; uplifted; lofty.` /
  `Sublime on these a tower of steel is reared. Dryden.`
  Verse line breaks are lost: `Know how sublime a thing it is To suffer and be
  strong. Longfellow.` (a capital mid-line is the only trace).
- **Inline quotations** are in straight double quotes after the definition:
  `eminent; -- said of persons. "The sublime Julian leader." De Quincey.`
  7,878 body lines open a quotation this way.
- **`"` is also the primary-stress mark**, and marked forms are not confined
  to header lines: 2,950 body lines carry them, mostly run-in derivatives
  (`-- Ag*gres"sive*ly, adv.`), some with the `--` lost
  (`Defn: Tending to aggravate. Ag*gres"sive*ly, adv.`). A quote opens with
  `"` after a space and before a capital; a stress mark sits inside a word.
- **An author-like token is not always a quotation author.** Definitions cite
  authorities with no quotation at all: `Defn: A yardstick. Tennyson.`,
  `court. Story.`, `latter. Bouvier. Chitty.`, `U. S. Disp.`. The tagged
  legend confirms one tag (`<au>`) was used for both. A line ending in
  "Capitalised token." is therefore ambiguous between three things: the end of
  a quotation, an authority for the definition, and an ordinary sentence.
- Author strings vary in shape: `Shak.`, `De Quincey.`, `Sir W. Raleigh.`,
  `R. L. Stevenson.`, and several in a row (`Bouvier. Chitty.`).

## Alignment with the tagged edition (development only)

114,717 tagged entries against 113,409 plain. Pairing by folded headword
and homograph order:

| | Measured | DESIGN.md §2 |
|---|---|---|
| Headwords in both | 98,040 | ~96,800 |
| …with the same number of entries | 96,783 | 95,162 |
| Headwords only in the plain text / only tagged | 273 / 311 | — |

Word-level similarity of paired entries (2 × LCS / total words):

| | Paired | Median | 10th pct | ≥ 0.99 | ≥ 0.90 | ≥ 0.80 |
|---|---|---|---|---|---|---|
| X–Z | 862 / 866 | 1.000 | 0.923 | 72.7% | 93.2% | 98.6% |
| SU | 1,665 / 1,666 | 1.000 | 1.000 | 95.0% | 98.8% | 99.6% |
| DESIGN.md §2 sample (~2,900) | | | | 72% | 92% | 98% |

X–Z reproduces §2. SU is markedly cleaner. The tagged X–Z file also carries
the "New Words" supplement, which #29765 has merged into the alphabet.

## Timing

| Step | Time (M-series Mac) |
|---|---|
| Load, normalise, and segment the whole file | 0.3–0.4 s |
| `edition` 0.0, cold | 0.48 s |
| `edition` 0.0, warm (cache reused) | 12 ms |
| Whole-dictionary segment layer, validated (45.6 MB) | 0.6 s |
| Alignment of all 113k entries + slice similarity | 1.0 s |
| `db:import` | not yet written (Phase 1) |
