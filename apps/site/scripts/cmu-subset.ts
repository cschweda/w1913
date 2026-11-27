// pnpm --filter site run cmu:subset
// Cuts the CMU Pronouncing Dictionary down to the words W1913 has (headwords,
// variants and listed inflections of one word), for "Sounds like" (v0.16.0).
// Reads cache/cmudict/cmudict.dict (fetched by hand from
// github.com/cmusphinx/cmudict, checked against the pinned SHA-256) and the
// pinned edition; writes data/cmudict-w1913.txt, which is committed, with the
// licence notice it requires (data/CMUDICT-LICENSE). Deploys never fetch it.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import config from "../../../w1913.config.ts";
import { parseCmu } from "../shared/sounds.ts";

const PINNED = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../../..");
const src = path.join(repo, "cache/cmudict/cmudict.dict");
const raw = readFileSync(src);
const sha = createHash("sha256").update(raw).digest("hex");
if (sha !== PINNED) { console.error(`cmudict.dict is not the pinned file (sha256 ${sha}).`); process.exit(1); }

const dir = path.join(repo, config.paths.editions, `w1913-${config.edition.version}`);
const words = new Set<string>();
for (const line of readFileSync(path.join(dir, `w1913-${config.edition.version}.jsonl`), "utf8").split("\n")) {
  if (!line) continue;
  const e = JSON.parse(line) as { headword: string; variants: string[]; forms?: string[] };
  for (const f of [e.headword, ...e.variants, ...(e.forms ?? [])]) {
    const w = f.toLowerCase();
    if (/^[a-z']+$/.test(w)) words.add(w);
  }
}
const cmu = parseCmu(raw.toString("utf8"));
const lines: string[] = [];
for (const [w, prons] of [...cmu.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  if (!words.has(w)) continue;
  prons.forEach((p, i) => lines.push(`${w}${i ? `(${i + 1})` : ""} ${p.join(" ")}`));
}
const header = [
  ";;; The words of the CMU Pronouncing Dictionary that W1913 has, made by apps/site/scripts/cmu-subset.ts",
  `;;; from cmudict.dict (github.com/cmusphinx/cmudict, sha256 ${PINNED}).`,
  ";;; Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved. See CMUDICT-LICENSE.",
];
const out = path.join(here, "../data/cmudict-w1913.txt");
writeFileSync(out, [...header, ...lines].join("\n") + "\n");
copyFileSync(path.join(repo, "cache/cmudict/LICENSE"), path.join(here, "../data/CMUDICT-LICENSE"));
console.log(`${lines.length} pronunciations of ${new Set(lines.map((l) => l.split(/[ (]/)[0])).size} words → ${path.relative(repo, out)} (${(Buffer.byteLength(lines.join("\n")) / 1e6).toFixed(2)} MB)`);
