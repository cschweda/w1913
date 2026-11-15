# Claude Code kickoff prompt — W1913

Clone https://github.com/cschweda/w1913, open Claude Code in it, and paste the block below.

```text
You are helping me build "W1913" (w1913.com): a writer's tool built on
Webster's Revised Unabridged Dictionary (1913). It is more than a lookup
site: see the table of writer's questions in DESIGN.md section 1.

The repo is github.com/cschweda/w1913. So far it holds only DESIGN.md,
KICKOFF.md, and assets/og-image.png (the social card for the future site).
Work on a branch named phase-0 and commit as you go with clear messages;
do not push or open a pull request until I ask.

Read DESIGN.md in full before doing anything. It is the source of truth for
scope, sources, data model, and phases. If something in it looks wrong or
underspecified once you see the real data, stop and tell me rather than
working around it.

## The one rule that shapes everything
Two Project Gutenberg editions are involved, and they are not equals.
- CANONICAL: #29765, plain UTF-8 text, catalogued as public domain. Every
  word the site publishes comes from this file and nowhere else.
- HINTS: the tagged v0.50 files (pgw050*.txt, etexts #660-670). Optional,
  build-time only. They may tell the parser WHERE a quotation, author,
  cross-reference, or collocation sits in the canonical text. No character
  of their text and none of their markup may reach the database or the site.
- The build must succeed with hints switched off (--no-hints).

## Stack (fixed)
- Nuxt 4, Nuxt UI v4, TypeScript, pnpm
- SQLite via better-sqlite3, with FTS5. Read-only at runtime.
- Deployed as Nuxt SSR on a DigitalOcean droplet (Laravel Forge). Not Netlify.
- Vitest for tests.

## Repo layout (one pnpm workspace, two packages)
- /packages/data   sources in, versioned edition out: w1913-<ver>.jsonl +
                   manifest.json + report.json (DESIGN.md section 3a).
                   Knows nothing about the site.
- /apps/site       the Nuxt site. Imports a pinned edition release into
                   SQLite. Knows nothing about Gutenberg files.
- /cache           gitignored: downloaded sources, built editions, the DB
- /docs            notes you write for me
Golden tests live beside the code they test.

## What to do now: Phase 0 only
1. Scaffold the repo (pnpm workspace, TypeScript, Vitest, lint).
2. Write packages/data/src/download.ts. Fetch the canonical file and verify it against
   the SHA-256 in DESIGN.md section 2; fail loudly on mismatch. Fetch the
   eleven hint files (letter C is a zip) into /cache/hints; on first run,
   compute their checksums and write packages/data/checksums.json for me
   to commit.
3. Write the plain-text segmenter. An entry begins after a blank line with a
   line in capitals; the next line (the header line) repeats the headword
   with syllable and stress marks, then the part of speech. Headword lines
   may list variants separated by ";". Skip the Gutenberg header and footer.
4. Run it on the X-Z portion only. Print: entry count; distinct headwords;
   how many header lines echo their headword (flag every one that does not);
   counts of "Etym:", "Defn:", "Note:", "Syn.", numbered sense lines.
5. Character audit on X-Z: list every non-ASCII character with frequency,
   and find how untranscribed characters are represented.
6. Alignment proof on X-Z. Write a tolerant tokenizer for the hint files
   (never a strict XML/HTML parser; entries open with "<p><hw>" OR
   "<p>{ <hw>"). Pair entries by normalised headword and homograph order,
   strip tags, and report word-level similarity: median, 10th percentile,
   and the share at or above 0.99 / 0.90 / 0.80. Compare with DESIGN.md
   section 2 and tell me if the numbers differ materially.
7. Read the front matter of pgw050ab.txt (the transcriber's legend of field
   marks) and summarise it in docs/hint-legend.md.
8. Pick 10 X-Z entries of different shapes (single definition, numbered
   senses, a quotation with author, a variant pair, a Syn. paragraph if one
   exists) and write them as golden tests of the segmenter.
9. Emit edition release 0.0: the X-Z entries as JSON Lines with the
   "segment" layer only (id, headword, variants, marked header, pos, text),
   plus manifest.json. Validate every line against a schema you propose.

## Rules
- Phase 0 ends with a report to me. Work only in packages/data. Do not
  start extraction, the full alignment stage, or anything in apps/site
  until I say so.
- The edition grows one layer per phase. Never try to complete the tagging
  before the site exists.
- Every field that could come from either source carries src: "plain" or
  "hint". The build can emit a public edition with all hint fields dropped.
- Never commit source texts or the database.
- Nothing may come from GCIDE or from the v0.4 file (pgwht04.txt).
- Never "fix" the canonical text from the hints. Differences between the
  editions go into report.json as a proofreading queue; corrections are
  applied only from a corrections.json that I have reviewed.
- Never drop or replace a character silently.
- Prefer small, pure functions with tests over clever regexes. Each
  heuristic lives in one named function with a comment stating the rule,
  and tests for a case where it applies and one where it must not.
- Ask before adding any dependency beyond the stack above.

## When you finish Phase 0, tell me
- The numbers from steps 4, 5, and 6, and your proposed JSONL schema.
- Anything about the data that contradicts DESIGN.md.
- What you would change about the Phase 1 plan now that you have seen it.

## Standing rules for later phases
- Ship in the phase order of DESIGN.md section 6. Phases 1-4 use the
  canonical text only; hints arrive in Phase 5.
- Every heuristic in DESIGN.md section 2 is unverified. Before a feature
  depends on one, build a hand-labelled sample with me, measure the error
  rate, and write it to report.json.
- Golden tests run in both build modes, with and without hints.
```
