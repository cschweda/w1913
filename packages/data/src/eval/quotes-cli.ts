// pnpm --filter @w1913/data run eval:quotes
// Phase 5: precision and recall of the quotation, author and authority
// heuristics (src/quotes) against the answer key from the tagged edition.
// Development only; writes cache/eval/eval.json and cache/eval/quotes-errors.json (gitignored).
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { editionsDir, evalDir, taggedDir } from "../paths.ts";
import { loadCanonical } from "../source/load.ts";
import { segment } from "../segment/segment.ts";
import { TAGGED } from "../source/tagged-files.ts";
import { tokenizeTagged, type TaggedEntry } from "./tagged.ts";
import { pairEntries } from "./align.ts";
import { similarity, words } from "./similarity.ts";
import { keyOf, type KeyQuote } from "./quotes-key.ts";
import { findQuotes, type Quote } from "../quotes/parse.ts";

const MIN_SIM = 0.9;
const TEXT_SIM = 0.8;
const version = process.argv[2] ?? "0.5";

const tagged: TaggedEntry[] = [];
for (const spec of TAGGED) {
  const file = path.join(taggedDir, spec.name);
  if (existsSync(file)) tagged.push(...tokenizeTagged(spec.name, (await readFile(file)).toString("latin1")));
}
if (!tagged.length) { console.log("No tagged files in cache/tagged; skipping."); process.exit(0); }

const canonical = await loadCanonical();
const { entries } = segment(canonical.lines, canonical.firstLineNumber);
const pairing = pairEntries(entries, tagged);
type Ed = { line: number; headword: string; senses: { text: string; sub: { text: string }[]; notes: { text: string }[] }[]; notes: { text: string }[] };
const byLine = new Map<number, Ed>();
for (const l of readFileSync(path.join(editionsDir, `w1913-${version}`, `w1913-${version}.jsonl`), "utf8").split("\n")) {
  if (!l) continue;
  const e = JSON.parse(l) as Ed;
  byLine.set(e.line, e);
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const sameAuthor = (a: string, b: string) => fold(a) === fold(b);
let entriesScored = 0, keyQ = 0, foundQ = 0, matchedQ = 0, matchedText = 0, keyA = 0, foundA = 0, matchedA = 0;
const byKind = { block: { key: 0, found: 0, matched: 0 }, inline: { key: 0, found: 0, matched: 0 } };
const falsePos: unknown[] = [];
const falseNeg: unknown[] = [];
for (const p of pairing.pairs) {
  const ed = byLine.get(p.plain.line);
  if (!ed) continue;
  if (similarity(words(p.plain.lines.slice(1).join(" ")), words(p.tagged.text)) < MIN_SIM) continue;
  entriesScored++;
  const key = keyOf(p.tagged.raw);
  const texts = ed.senses.flatMap((s) => [s.text, ...s.sub.map((x) => x.text)]).filter(Boolean);
  const found: Quote[] = [];
  const auth: string[] = [];
  for (const t of texts) { const f = findQuotes(t); found.push(...f.quotes); auth.push(...f.authorities.map((a) => a.author)); }
  keyQ += key.quotes.length; foundQ += found.length;
  for (const k of key.quotes) byKind[k.kind].key++;
  for (const f of found) byKind[f.kind].found++;
  const used = new Set<KeyQuote>();
  for (const f of found) {
    const fw = words(f.text);
    const hit = key.quotes.find((k) => !used.has(k) && similarity(fw, words(k.text)) >= TEXT_SIM);
    if (hit) {
      used.add(hit); matchedText++;
      if (sameAuthor(hit.author, f.author)) { matchedQ++; byKind[f.kind].matched++; continue; }
      falsePos.push({ headword: ed.headword, why: "author", found: f.author, key: hit.author });
    } else falsePos.push({ headword: ed.headword, why: "no such quotation", kind: f.kind, text: f.text.slice(0, 90), author: f.author });
  }
  for (const k of key.quotes) if (!used.has(k)) falseNeg.push({ headword: ed.headword, kind: k.kind, text: k.text.slice(0, 90), author: k.author });
  keyA += key.authorities.length; foundA += auth.length;
  const usedA = new Set<number>();
  for (const a of auth) { const i = key.authorities.findIndex((k, j) => !usedA.has(j) && sameAuthor(k, a)); if (i >= 0) { usedA.add(i); matchedA++; } }
}
const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : null);
const report = {
  edition: version, measured: new Date().toISOString(), entriesScored, minSimilarity: MIN_SIM, textSimilarity: TEXT_SIM,
  quotations: { key: keyQ, found: foundQ, correct: matchedQ, precision: pct(matchedQ, foundQ), recall: pct(matchedQ, keyQ), textOnlyPrecision: pct(matchedText, foundQ) },
  block: { ...byKind.block, precision: pct(byKind.block.matched, byKind.block.found), recall: pct(byKind.block.matched, byKind.block.key) },
  inline: { ...byKind.inline, precision: pct(byKind.inline.matched, byKind.inline.found), recall: pct(byKind.inline.matched, byKind.inline.key) },
  authorities: { key: keyA, found: foundA, correct: matchedA, precision: pct(matchedA, foundA), recall: pct(matchedA, keyA) },
};
await mkdir(evalDir, { recursive: true });
await writeFile(path.join(evalDir, "eval.json"), JSON.stringify(report, null, 2) + "\n");
await writeFile(path.join(evalDir, "quotes-errors.json"), JSON.stringify({ falsePos: falsePos.slice(0, 3000), falseNeg: falseNeg.slice(0, 3000) }, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
