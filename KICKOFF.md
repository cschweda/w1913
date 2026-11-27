# Claude Code kickoff prompt — W1913

Open Claude Code in a clone of https://github.com/cschweda/w1913 and paste
the block below. Before you do, copy the canonical source into the clone at
`cache/sources/29765.txt` (it is gitignored, so a fresh clone does not have
it).

```text
You are helping me build "W1913" (w1913.com): a writer's tool built on
Webster's Revised Unabridged Dictionary (1913). It is more than a lookup
site: see the table of writer's questions in DESIGN.md section 1.

Read DESIGN.md (Draft 5.4) in full before doing anything. It is the source
of truth for scope, sources, data model, and phases. If something in it
looks wrong or underspecified once you see the real data, stop and tell me
rather than working around it.

## Where things stand
main holds DESIGN.md, KICKOFF.md, README.md, CHANGELOG.md, LICENSE (MIT),
LICENSE-DATA (CC0), .nvmrc (Node 24), .gitignore, rebuild.sh and
ecosystem.config.cjs (the droplet deploy, DESIGN.md section 3 "Deploying"),
assets/og-image.png, and docs/ui/ (static interface mockups).
cache/sources/29765.txt is the canonical source, placed by hand, gitignored.

## Step 0
1. Run `git status --ignored` and confirm that cache/ is ignored. The
   source text must never enter git history.
2. Create a branch named phase-0 from main and do all work there. Commit as
   you go with clear messages. Do not push, merge, or open a pull request
   until I ask. Every push to main is a release I deploy by hand.

## The one rule that shapes everything
Two Project Gutenberg editions are involved, and they are not equals.
- CANONICAL: #29765, plain UTF-8 text, catalogued as public domain. Every
  word the site publishes comes from this file and nowhere else.
- ANSWER KEY: the tagged v0.50 files (pgw050*.txt, etexts #660-670).
  Project Gutenberg has confirmed their "Copyrighted" flag will stay, so
  they supply NO data. They are read only by a separate evaluation command
  that scores the parser's heuristics. Nothing derived from them, including
  their text, excerpts, summaries, or proofreading queues, may enter the
  edition, report.json, the database, the site, or the git history.
- The build reads the canonical file and nothing else.

## Stack (fixed)
- Node 24 (.nvmrc), pnpm, TypeScript (strict)
- Nuxt 4, Nuxt UI v4 (apps/site, later phases)
- SQLite via better-sqlite3, with FTS5. Read-only at runtime.
- Deployed as Nuxt SSR on a DigitalOcean droplet (Laravel Forge). Not Netlify.
- Vitest for tests.

Pre-approved dev dependencies for Phase 0: eslint, typescript-eslint, tsx,
@types/node, zod (the JSONL schema), fflate (the zipped C file). Ask before
adding anything else.

## Repo layout (one pnpm workspace, two packages)
- /packages/data   sources in, versioned edition out: w1913-<ver>.jsonl +
                   manifest.json + report.json (DESIGN.md section 3a).
                   Knows nothing about the site.
- /apps/site       the Nuxt site (not until Phase 1). Imports a pinned
                   edition release into SQLite. Knows nothing about
                   Gutenberg files.
- cache/           gitignored: sources, tagged files, built editions, the
                   DB, evaluation outputs
- docs/            notes you write for me
- docs/ui/         static interface mockups (DESIGN.md section 4a). Reference
                   only; do not edit them or copy their sample entry text.
All paths are relative to the repository root. Golden tests live beside the
code they test.

## What to do now: Phase 0 only
1. Scaffold the workspace at the root (pnpm-workspace.yaml, root
   package.json with "engines": {"node": ">=24"} and
   "packageManager": "pnpm@12.16.1", tsconfig, Vitest, ESLint), then
   create packages/data. pnpm 12.16.1 is what the droplet runs; if your
   pnpm is a different major version, stop and tell me rather than
   committing a lockfile it wrote. Apart from this scaffold and the
   CHANGELOG, work only in packages/data.
2. Write packages/data/src/download.ts. packages/data/checksums.json holds
   the pinned SHA-256 for #29765 (copy it from DESIGN.md section 2). Verify
   cache/sources/29765.txt against it if present; otherwise fetch
   https://www.gutenberg.org/ebooks/29765.txt.utf-8 and verify. Fail loudly
   on a mismatch. Fetch the eleven tagged files (letter C is a zip) into
   cache/tagged/. If they cannot be fetched (gutenberg.org often returns
   503 to scripts), skip step 7 and say so. Record their checksums in
   checksums.json on first fetch.
3. Write the plain-text segmenter, with these facts from DESIGN.md
   section 2:
   - The file has CRLF line endings. Normalise to LF first; that is the
     only change made before parsing.
   - Skip the Gutenberg header and footer (the "*** START" / "*** END"
     lines).
   - An entry begins after a blank line with a line in capitals; the next
     line (the header line) repeats the headword with syllable and stress
     marks (* " `), then the part of speech. Headword lines may list
     variants separated by ";".
   - The headword line is ASCII-folded (AEGIS) while the header line is not
     (Æ"gis). Compare after folding ligatures and diacritics and removing
     marks and spaces.
   - Record each entry's position in the file as `ord`.
4. Run the segmenter over the whole file for boundary counts only, then in
   detail on two slices: X-Z, and SU (every headword starting with "SU").
   For each, print: entry count; distinct headwords; how many header lines
   echo their headword after folding (list every one that does not);
   counts of "Etym:", "Defn:", "Note:", "Syn.", numbered sense lines, and
   "Defn:" lines that follow a numbered line. Compare the whole-file counts
   with DESIGN.md section 2.
5. Character and gap audit on both slices: every non-ASCII character with
   its frequency, and the patterns left where untranscribed text was
   removed upstream (e.g. "Gr." followed directly by punctuation, stray
   "&...;" entities). Count the gaps across the whole file. Repair nothing.
6. Look at how quotations appear in both slices: block quotations run on as
   wrapped lines; inline ones use double quotes, which is also the stress
   mark. Do not build the quotation heuristic yet. Write what you see in
   docs/phase-0-notes.md with entry examples from the canonical file only.
7. Alignment proof on both slices. Put it in its own module,
   packages/data/src/eval/, which the build never imports. Write a tolerant
   tokenizer for the tagged files (never a strict XML/HTML parser; entries
   open with "<p><hw>" OR "<p>{ <hw>"). Pair entries by normalised headword
   and homograph order, strip tags, and report word-level similarity:
   median, 10th percentile, and the share at or above 0.99 / 0.90 / 0.80.
   Compare with DESIGN.md section 2 and tell me if the numbers differ
   materially. Outputs go to cache/eval/ (gitignored).
8. Read the front matter of pgw050ab.txt (the transcriber's legend of field
   marks). Summarise it in cache/eval/tagged-legend.md (gitignored, not
   docs/), and give me the summary in your report.
9. Pick 12 entries of different shapes from the two slices and write them
   as golden tests of the segmenter: a single definition; numbered senses;
   a "Defn:" under a numbered sense; a block quotation with author; an
   inline "..." quotation; a variant pair; a headword with Æ or ö; a Syn.
   paragraph; an etymology with an untranscribed gap. Fixtures are copied
   from the canonical file only.
10. Emit edition release 0.0: the X-Z and SU entries as JSON Lines in
    edition order with the "segment" layer only (id, ord, headword,
    variants, marked header, pos, text), plus manifest.json. Define the
    schema in zod and validate every line against it. Output goes to
    cache/editions/.
11. Add a "Phase 0" entry to CHANGELOG.md under Unreleased.

## Rules
- Phase 0 ends with a report to me. Do not start extraction, the full
  alignment stage, or anything in apps/site until I say so.
- The edition grows one layer per phase. Never try to complete the tagging
  before the site exists.
- Evaluation code lives in its own module that the build never imports.
  Its outputs (the answer key, eval.json, the proofreading queue, the
  legend summary) are gitignored.
- Never commit source texts, tagged files, editions, or the database.
- Nothing may come from GCIDE or from the v0.4 file (pgwht04.txt).
- Never "fix" the canonical text from the tagged edition. Differences
  between the editions go into eval.json as a proofreading queue, never
  report.json. Corrections are applied only from a corrections.json that I
  have reviewed.
- Never drop or replace a character silently. Line-ending normalisation is
  the one stated exception.
- Prefer small, pure functions with tests over clever regexes. Each
  heuristic lives in one named function with a comment stating the rule,
  and tests for a case where it applies and one where it must not.
- Commit messages carry no AI co-author trailer.

## When you finish Phase 0, tell me
- The numbers from steps 4, 5, and 7, and your proposed JSONL schema.
- The tagged-edition legend summary (step 8).
- Anything about the data that contradicts DESIGN.md.
- What you would change about the Phase 1 plan now that you have seen it.

## Deploy contract (from Phase 1)
rebuild.sh on the droplet depends on these. Build them with apps/site and
keep them working:
- Package names @w1913/data and @w1913/site.
- `pnpm --filter @w1913/data run edition`: verifies cache/sources/29765.txt
  against checksums.json (downloading only if missing) and builds the
  edition version the site pins.
- `pnpm --filter @w1913/site run db:import`: writes the SQLite database to
  the path in W1913_DB_PATH.
- `pnpm --filter @w1913/site run build`: Nuxt build, node-server preset.
- At runtime the site reads W1913_DB_PATH, HOST, and PORT, opens the
  database read-only, and serves GET /healthz: 200 once the database is
  open, 503 otherwise. `/` and `/sublime` must answer 200.
- Local development runs through `pnpm dev` (scripts/dev.sh): it clears
  build caches, rebuilds the edition, runs db:import into
  cache/db/w1913.sqlite, and starts `nuxt dev` on port 3913. Keep the site
  working with that script; never make it touch cache/sources/ or
  cache/tagged/.
- pnpm-lock.yaml is committed, written by pnpm 12.16.1 (the version in
  "packageManager" and on the droplet). The deploy uses --frozen-lockfile,
  which fails on a lockfile from another major version.
- The whole deploy must finish in well under 10 minutes on the droplet
  (2 vCPU), because Forge's Deploy button kills anything longer. So
  `edition` is incremental: it keys its output in cache/editions/ by the
  source checksum, the parser version, and the layers requested, and
  when a matching edition already exists it verifies the file and returns
  without re-parsing. A parser change bumps the parser version. Report
  the timing of a cold and a warm `edition` run, and of `db:import`.

## Standing rules for later phases
- Do not edit rebuild.sh or ecosystem.config.cjs without telling me why;
  they run on a production droplet shared with another app.
- Ship in the phase order of DESIGN.md section 6.
- Build the site interface from DESIGN.md section 4a and the mockups in
  docs/ui. Rebuild them with Nuxt UI components themed to the section 4a
  tokens; the mockups are references, not code to paste. Phase 1 matches
  docs/ui/entry-phase1.html, where quotations run on as plain sense text.
- Self-host Inter; the site makes no third-party font requests.
- Every heuristic in DESIGN.md section 2 is unverified. Before a feature
  depends on one, build a hand-labelled sample with me, measure the error
  rate, and write it to report.json.
- A feature built on a heuristic ships only after its precision and recall
  against the answer key are in eval.json and I have approved them.
- Keep README.md and CHANGELOG.md current. The og:image stays the first
  thing in the README, with badges directly under it.
```
