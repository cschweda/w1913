# Evaluation (development only)

This folder reads the tagged v0.50 files (Project Gutenberg #660–670). It is
an answer key for measuring the parser and supplies **no data** to the
edition (DESIGN.md §2). Rules:

- Nothing in `src/` outside this folder may import from it. A test enforces this.
- Its outputs go to `cache/eval/`, which is gitignored: similarity numbers,
  the answer key, the proofreading queue, and the legend summary.
- No text from the tagged files is committed anywhere, including tests.
