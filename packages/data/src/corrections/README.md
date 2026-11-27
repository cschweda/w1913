# Corrections

`packages/data/corrections.json` holds reviewed fixes to typos in the
canonical source, Project Gutenberg #29765. It is the one home for them
(DESIGN.md §3).

## The rule

A correction goes in only after a person has checked it against a scan of
the printed 1913 page. A difference from the older tagged edition (#660–670)
is a *candidate*, never a correction on its own: `pnpm --filter @w1913/data
run eval:quotes` and the evaluation lists candidates in `cache/eval/`
(gitignored), and nothing is copied from them in bulk.

## Adding one

```json
{
  "line": 747293,
  "find": "Philadephia",
  "replace": "Philadelphia",
  "reason": "Typo in the transcription.",
  "checkedAgainst": "Webster's Revised Unabridged Dictionary (1913), p. 1286, col. 2 (Internet Archive scan websters1913…)",
  "checkedBy": "CS",
  "date": "2026-12-01"
}
```

- `line` is the 1-based line number in the line-normalised `29765.txt`
  (the edition's `line` field gives an entry's headword line).
- `find` must occur **exactly once** on that line, or the build stops and
  says which correction failed. Keep it short but unique.
- `checkedAgainst` must name the printed page; a correction without it is
  refused.

The edition build applies corrections to the source lines before parsing,
so every layer sees the corrected text, and records how many it applied (and
the file's checksum) in each manifest. Changing corrections rebuilds the
editions; ship them as a new edition version, since a version names fixed
content.
