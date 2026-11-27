// pnpm --filter @w1913/data run eval:colloc
// Precision and recall of the collocation heuristic (src/collocations)
// against the answer key from the tagged edition: every <col>…</col>.
// Development only; writes cache/eval/colloc.json and colloc-errors.json (gitignored).
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { editionsDir, evalDir, taggedDir } from "../paths.ts";
import { loadCanonical } from "../source/load.ts";
import { segment } from "../segment/segment.ts";
import { TAGGED } from "../source/tagged-files.ts";
import { stripTags, tokenizeTagged, type TaggedEntry } from "./tagged.ts";
import { pairEntries } from "./align.ts";
import { similarity, words } from "./similarity.ts";
import { findCollocations } from "../collocations/parse.ts";

const MIN_SIM = 0.9;
const version = process.argv[2] ?? "0.6";

const tagged: TaggedEntry[] = [];
for (const spec of TAGGED) {
  const file = path.join(taggedDir, spec.name);
  if (existsSync(file)) tagged.push(...tokenizeTagged(spec.name, (await readFile(file)).toString("latin1")));
}
if (!tagged.length) { console.log("No tagged files in cache/tagged; skipping."); process.exit(0); }

const canonical = await loadCanonical();
const { entries } = segment(canonical.lines, canonical.firstLineNumber);
const pairing = pairEntries(entries, tagged);
type B = { text: string };
type Ed = { line: number; headword: string; senses: (B & { sub: B[]; notes: B[] })[]; notes: B[]; synonyms?: { derived: string[] } | null; syn: string | null };
const byLine = new Map<number, Ed>();
for (const l of readFileSync(path.join(editionsDir, `w1913-${version}`, `w1913-${version}.jsonl`), "utf8").split("\n")) {
  if (!l) continue;
  const e = JSON.parse(l) as Ed;
  byLine.set(e.line, e);
}

const fold = (s: string) => s.replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/Æ/g, "Ae").replace(/Œ/g, "Oe").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const keyCols = (raw: string) => [...raw.matchAll(/<col>([\s\S]*?)<\/col>/g)].map((m) => stripTags(m[1]!).replace(/\s+/g, " ").trim()).filter(Boolean);

let scored = 0, key = 0, found = 0, correct = 0;
const missWhere = { inText: 0, inSyn: 0, absent: 0 };
const falsePos: unknown[] = [];
const falseNeg: unknown[] = [];
for (const p of pairing.pairs) {
  const ed = byLine.get(p.plain.line);
  if (!ed) continue;
  if (similarity(words(p.plain.lines.slice(1).join(" ")), words(p.tagged.text)) < MIN_SIM) continue;
  scored++;
  const k = keyCols(p.tagged.raw);
  const texts = [...ed.senses.flatMap((s) => [s.text, ...s.sub.map((x) => x.text), ...s.notes.map((x) => x.text)]), ...ed.notes.map((x) => x.text)].filter(Boolean);
  const f = texts.flatMap((t) => findCollocations(t, ed.headword).flatMap((c) => c.phrases.map((x) => x.text)));
  key += k.length; found += f.length;
  const left = k.map(fold);
  for (const x of f) {
    const i = left.indexOf(fold(x));
    if (i >= 0) { left[i] = "\0"; correct++; } else falsePos.push({ headword: ed.headword, found: x, key: k.slice(0, 6) });
  }
  const all = fold(texts.join(" "));
  const syn = fold((ed.syn ?? "") + (ed.synonyms?.derived ?? []).join(" "));
  k.forEach((x, i) => {
    if (left[i] === "\0") return;
    const fx = fold(x);
    const where = all.includes(fx) ? "inText" : syn.includes(fx) ? "inSyn" : "absent";
    missWhere[where]++;
    if (where !== "absent") falseNeg.push({ headword: ed.headword, key: x, where });
  });
}
const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : null);
const report = { edition: version, measured: new Date().toISOString(), entriesScored: scored, key, found, correct, precision: pct(correct, found), recall: pct(correct, key), misses: missWhere };
await mkdir(evalDir, { recursive: true });
await writeFile(path.join(evalDir, "colloc.json"), JSON.stringify(report, null, 2) + "\n");
await writeFile(path.join(evalDir, "colloc-errors.json"), JSON.stringify({ falsePos: falsePos.slice(0, 4000), falseNeg: falseNeg.slice(0, 4000) }, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
