#!/usr/bin/env node
// The `w1913` command: look words up in the 1913 Webster's from a terminal,
// through w1913.com's static shards or offline from a lookup build. The help
// text, HELP.txt, is the command's documentation (`npx w1913 --help`).

import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parseArgs } from "node:util";
import { createLookup, createShardedLookup, type Result } from "./lookup.ts";
import type { LookupBuild, LookupShard } from "./format.ts";

// The help is HELP.txt, shipped in the package (one source for `--help` and the README).
const HELP = readFileSync(new URL("../HELP.txt", import.meta.url), "utf8").trimEnd();

const version = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;

function fail(message: string): never {
  process.stderr.write(`w1913: ${message}\nTry: npx w1913 --help\n`);
  process.exit(2);
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const bold = (s: string) => (color ? `\x1b[1m${s}\x1b[22m` : s);
const dim = (s: string) => (color ? `\x1b[2m${s}\x1b[22m` : s);
const width = Math.min(process.stdout.columns || 80, 100);

/** Wrap text to the terminal: the label (a sense number) starts the first line, later lines are indented. */
function wrap(text: string, indent: number, label = ""): string {
  const lines: string[] = [];
  let line = label.padEnd(indent);
  let empty = true;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!empty && line.length + 1 + word.length > width) {
      lines.push(line);
      line = " ".repeat(indent);
      empty = true;
    }
    line += (empty ? "" : " ") + word;
    empty = false;
  }
  lines.push(line);
  return lines.join("\n");
}

function print(r: Result, senses: number) {
  const out: string[] = [];
  out.push(`${bold(r.headword)}${r.via ? dim(`  (from “${r.via}”)`) : ""}`);
  if (r.phrase) {
    out.push("", bold(r.phrase.phrases.join(", or ")), wrap(r.phrase.definition, 2), "", dim(r.phrase.url));
    process.stdout.write(out.join("\n") + "\n");
    return;
  }
  for (const e of r.entries) {
    out.push("");
    if (e.pos) out.push(dim(e.pos));
    for (const s of e.senses.slice(0, senses)) {
      out.push(wrap(s.text, 4, s.n === null ? "" : ` ${s.n}.`));
      for (const sub of s.sub) out.push(wrap(sub.text, 8, `    (${sub.letter})`));
    }
    if (e.senses.length > senses) out.push(dim(`    … ${e.senses.length - senses} more`));
    if (e.phrases.length) out.push(dim(wrap(`Phrases: ${e.phrases.flatMap((p) => p.phrases).join("; ")}`, 4, "    ")));
  }
  out.push("", dim(r.url));
  process.stdout.write(out.join("\n") + "\n");
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        suggest: { type: "boolean", short: "s" },
        json: { type: "boolean", short: "j" },
        senses: { type: "string", short: "n" },
        limit: { type: "string", short: "l" },
        build: { type: "string", short: "b" },
        edition: { type: "string", short: "e" },
        site: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (e) {
    fail((e as Error).message);
  }
  const { values: o, positionals } = parsed;
  if (o.help) return void process.stdout.write(HELP + "\n");
  if (o.version) return void process.stdout.write(version + "\n");
  const query = positionals.join(" ").trim();
  if (!query) {
    process.stdout.write(HELP + "\n");
    process.exit(2);
  }
  const count = (v: string | undefined, name: string, d: number) => {
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) fail(`--${name} takes a whole number of 1 or more.`);
    return n;
  };
  const senses = count(o.senses, "senses", Infinity);
  const limit = count(o.limit, "limit", 20);

  let lookup: (w: string) => Promise<Result | null>;
  let suggest: (p: string, n: number) => Promise<{ headword: string; slug: string }[]>;
  if (o.build) {
    let build: LookupBuild;
    try {
      const raw = readFileSync(o.build);
      build = JSON.parse((o.build.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8")) as LookupBuild;
    } catch (e) {
      fail(`could not read the lookup build ${o.build}: ${(e as Error).message}`);
    }
    let d;
    try {
      d = createLookup(build);
    } catch (e) {
      fail((e as Error).message);
    }
    lookup = async (w) => d.lookup(w);
    suggest = async (p, n) => d.suggest(p, n);
  } else {
    const site = (o.site ?? "https://w1913.com").replace(/\/+$/, "");
    let edition = o.edition;
    if (!edition) {
      try {
        const r = await fetch(`${site}/healthz`, { signal: AbortSignal.timeout(15000) });
        edition = ((await r.json()) as { edition?: string }).edition;
      } catch {
        /* reported below */
      }
      if (!edition) fail(`could not reach ${site} to find its edition (use --build to work offline).`);
    }
    let reached = false;
    const fetchShard = async (prefix: string) => {
      const r = await fetch(`${site}/data/${edition}/${encodeURIComponent(prefix)}.json`, { signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return (reached = true), null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      reached = true;
      return (await r.json()) as LookupShard;
    };
    const d = createShardedLookup(fetchShard);
    lookup = async (w) => {
      const r = await d.lookup(w);
      if (!r && !reached) fail(`could not load the data from ${site}/data/${edition}/ (use --build to work offline).`);
      return r;
    };
    suggest = async (p, n) => {
      const r = await d.suggest(p, n);
      if (!r.length && !reached) fail(`could not load the data from ${site}/data/${edition}/ (use --build to work offline).`);
      return r;
    };
  }

  if (o.suggest) {
    const list = await suggest(query, limit);
    if (o.json) process.stdout.write(JSON.stringify(list, null, 2) + "\n");
    else if (list.length) process.stdout.write(list.map((s) => s.headword).join("\n") + "\n");
    else process.stderr.write(`No headwords start with “${query}”.\n`);
    process.exit(list.length ? 0 : 1);
  }
  const r = await lookup(query);
  if (o.json) process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  else if (r) print(r, senses);
  else process.stderr.write(`“${query}” is not in the 1913 Webster's. Try: npx w1913 --suggest ${query.slice(0, 4)}\n`);
  process.exit(r ? 0 : 1);
}

void main();
