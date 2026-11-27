// Building an edition release, with a cache: a release whose inputs (source
// checksum, parser version, layers, scope) are unchanged is verified and
// reused instead of rebuilt, so deploys stay well inside Forge's 10 minutes.
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalFile, editionsDir } from "../paths.ts";
import { sha256Bytes, sha256File } from "../source/checksum.ts";
import { loadCanonical } from "../source/load.ts";
import { applyCorrections, loadCorrections } from "../corrections/apply.ts";
import { slice, type SliceName } from "../audit/slices.ts";
import { segment } from "../segment/segment.ts";
import { EditionEntry, Manifest, type Layer } from "./schema.ts";
import { toSegmentEntries } from "./segment-layer.ts";
import { makeResolver, toCollocationsEntry, toQuotesEntry, toProsodyEntry, toLabelsEntry, toSensesEntry, toSynEntry } from "./senses-layer.ts";
import { LABELS } from "../labels/vocabulary.ts";
import { AUTHORS, BIBLE } from "../quotes/authors.ts";

/** Bump whenever a parser change can alter the edition's content. */
export const PARSER_VERSION = "0.6.1";

export interface ReleaseSpec {
  version: string;
  layers: Layer[];
  scope: "all" | SliceName[];
}

export const SPIKE_RELEASE: ReleaseSpec = { version: "0.0", layers: ["segment"], scope: ["X-Z", "SU"] };

/** Every release the data package can build, oldest first (DESIGN.md §3a). */
export const RELEASES: readonly ReleaseSpec[] = [
  SPIKE_RELEASE,
  { version: "0.1", layers: ["segment"], scope: "all" },
  { version: "0.2", layers: ["segment", "senses"], scope: "all" },
  { version: "0.3", layers: ["segment", "senses", "syn"], scope: "all" },
  { version: "0.4", layers: ["segment", "senses", "syn", "labels"], scope: "all" },
  { version: "0.5", layers: ["segment", "senses", "syn", "labels", "prosody", "forms"], scope: "all" },
  { version: "0.6", layers: ["segment", "senses", "syn", "labels", "prosody", "forms", "quotes"], scope: "all" },
  { version: "0.7", layers: ["segment", "senses", "syn", "labels", "prosody", "forms", "quotes", "collocations"], scope: "all" },
];

export interface BuildResult {
  dir: string;
  manifest: Manifest;
  reused: boolean;
  ms: number;
}

function releaseDir(spec: ReleaseSpec): string {
  return path.join(editionsDir, `w1913-${spec.version}`);
}

async function reusable(dir: string, spec: ReleaseSpec, sourceSha: string, correctionsSha: string): Promise<Manifest | null> {
  const file = path.join(dir, "manifest.json");
  if (!existsSync(file)) return null;
  const m = Manifest.safeParse(JSON.parse(await readFile(file, "utf8")));
  if (!m.success) return null;
  const same =
    m.data.source.sha256 === sourceSha &&
    (m.data.corrections?.sha256 ?? "") === correctionsSha &&
    m.data.parserVersion === PARSER_VERSION &&
    JSON.stringify(m.data.layers) === JSON.stringify(spec.layers) &&
    JSON.stringify(m.data.scope) === JSON.stringify(spec.scope);
  if (!same) return null;
  const jsonl = path.join(dir, m.data.jsonl.file);
  if (!existsSync(jsonl) || (await sha256File(jsonl)) !== m.data.jsonl.sha256) return null;
  return m.data;
}

export async function buildRelease(spec: ReleaseSpec, opts: { force?: boolean } = {}): Promise<BuildResult> {
  const t0 = performance.now();
  const sourceSha = await sha256File(canonicalFile);
  const corrections = loadCorrections();
  const correctionsSha = sha256Bytes(corrections.raw);
  const dir = releaseDir(spec);
  if (!opts.force) {
    const m = await reusable(dir, spec, sourceSha, correctionsSha);
    if (m) return { dir, manifest: m, reused: true, ms: performance.now() - t0 };
  }

  const canonical = await loadCanonical();
  // Reviewed corrections (corrections.json) apply to the source lines before anything is parsed.
  const lines0 = applyCorrections(canonical.lines, canonical.firstLineNumber, corrections.list);
  const { entries: raw } = segment(lines0, canonical.firstLineNumber);
  const segmentLayer = toSegmentEntries(raw);
  const resolve = spec.layers.includes("senses") ? makeResolver(segmentLayer) : null;
  const withSenses = resolve ? segmentLayer.map((e, i) => toSensesEntry(e, raw[i]!, resolve)) : segmentLayer;
  const withSyn = resolve && spec.layers.includes("syn") ? withSenses.map((e) => toSynEntry(e as ReturnType<typeof toSensesEntry>, resolve)) : withSenses;
  const withLabels = spec.layers.includes("labels") ? withSyn.map((e) => toLabelsEntry(e as ReturnType<typeof toSynEntry>)) : withSyn;
  const withProsody = spec.layers.includes("prosody") ? withLabels.map((e) => toProsodyEntry(e as ReturnType<typeof toLabelsEntry>)) : withLabels;
  const withQuotes = spec.layers.includes("quotes") ? withProsody.map((e) => toQuotesEntry(e as ReturnType<typeof toProsodyEntry>)) : withProsody;
  const all = resolve && spec.layers.includes("collocations") ? withQuotes.map((e) => toCollocationsEntry(e as ReturnType<typeof toQuotesEntry>, resolve)) : withQuotes;
  const chosen =
    spec.scope === "all"
      ? all
      : (() => {
          const keep = new Set(spec.scope.flatMap((s) => slice(raw, s).map((e) => e.ord)));
          return all.filter((e) => keep.has(e.ord));
        })();

  // Validate every line against the schema before anything is written.
  const lines = chosen.map((e, i) => {
    const r = EditionEntry.safeParse(e);
    if (!r.success) throw new Error(`Entry ${i} (${e.id}) fails the schema: ${r.error.message}`);
    return JSON.stringify(r.data);
  });
  const body = lines.join("\n") + "\n";
  const jsonlName = `w1913-${spec.version}.jsonl`;
  const vocabulary = spec.layers.includes("labels") ? JSON.stringify(LABELS, null, 2) + "\n" : null;
  const authors = spec.layers.includes("quotes") ? JSON.stringify([BIBLE, ...AUTHORS], null, 2) + "\n" : null;
  const manifest = Manifest.parse({
    edition: "w1913",
    version: spec.version,
    layers: spec.layers,
    scope: spec.scope,
    entries: chosen.length,
    source: { file: "29765.txt", sha256: sourceSha },
    corrections: { file: "corrections.json", count: corrections.list.length, sha256: correctionsSha },
    parserVersion: PARSER_VERSION,
    jsonl: { file: jsonlName, sha256: sha256Bytes(body), bytes: Buffer.byteLength(body) },
    ...(vocabulary ? { vocabulary: { file: "labels.json", sha256: sha256Bytes(vocabulary) } } : {}),
    ...(authors ? { authors: { file: "authors.json", sha256: sha256Bytes(authors) } } : {}),
    licence: "CC0-1.0",
    built: new Date().toISOString(),
  });

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${jsonlName}.part`), body);
  await rename(path.join(dir, `${jsonlName}.part`), path.join(dir, jsonlName));
  if (vocabulary) await writeFile(path.join(dir, "labels.json"), vocabulary);
  if (authors) await writeFile(path.join(dir, "authors.json"), authors);
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { dir, manifest, reused: false, ms: performance.now() - t0 };
}
