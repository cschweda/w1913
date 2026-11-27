import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import config from "../../../w1913.config.ts";
import { LABELS, labelsInGroup } from "../../../packages/data/src/labels/vocabulary.ts";
import { makeLabeler } from "./labels.ts";
import { searchDefinitions, snippetHtml, toFtsQuery } from "./search.ts";
import { richProse, useLabeler } from "./render.ts";

describe("labels on the site", () => {
  const site = makeLabeler(LABELS);
  it("reads every group exactly as the data package does", () => {
    const groups = ["[Obs.]", "(Zoöl)", "[Obs. or Prov. Eng.]", "(Bot. & Zoöl.)", "[Local, U. S.]", "[Prov.\nEng.]", "(Pseudemus concinna)", "[F.]", "(Obs. stuff)", "()", "(Gr. & Rom. Myth.)", "[Colloq. U.S.]"];
    for (const g of groups) expect(site.group(g)).toEqual(labelsInGroup(g));
    for (const l of LABELS) for (const f of l.forms) expect(site.group(`(${f})`)).toEqual(labelsInGroup(`(${f})`));
  });
  it("shows label groups as chips and leaves other groups as printed", () => {
    useLabeler(site);
    expect(richProse("Elevated by joy; elate. [Poetic] Milton.", "text")).toBe('Elevated by joy; elate. <a href="/label/poetic" class="chip">Poetic</a> Milton.');
    expect(richProse("A turtle (Pseudemus concinna).", "text")).toBe("A turtle (Pseudemus concinna).");
    expect(richProse("[Obs. or R.]", "text")).toContain('href="/label/rare"');
    useLabeler(null);
  });
});

describe("definition search query", () => {
  it("quotes every word, so FTS syntax cannot be injected", () => {
    expect(toFtsQuery("walk idly", "all")).toBe('"walk" AND "idly"');
    expect(toFtsQuery("walk idly", "any")).toBe('"walk" OR "idly"');
    expect(toFtsQuery('NEAR(a b) OR * "x', "all")).toBe('"NEAR" AND "b" AND "x"');
    expect(toFtsQuery("killing of a brother", "all")).toBe('"killing" AND "brother"');
    expect(toFtsQuery("of the", "all")).toBe('"of" AND "the"');
    expect(toFtsQuery('"young salmon" fish', "all")).toBe('"young salmon" AND "fish"');
    expect(toFtsQuery("  ;; -- ", "all")).toBeNull();
  });
  it("escapes snippets and keeps only its own marks", () => {
    expect(snippetHtml("a <b> \u0001walk\u0002 -- c")).toBe("a &lt;b&gt; <mark>walk</mark> — c");
  });
});

// Phase 3 exit test (DESIGN.md §6): 20 fixed queries, each must return the
// expected word in its top results. Search matches the 1913's own words, so
// where modern phrasing misses ("fear of water"), the query uses the
// dictionary's ("dread of water"), as the search page advises. Runs when the database has been built.
const db = path.join(import.meta.dirname, "../../..", config.paths.devDatabase);
describe.skipIf(!existsSync(db))("Phase 3 exit test: 20 fixed queries", () => {
  const conn = existsSync(db) ? new Database(db, { readonly: true }) : null;
  const cases: [string, string, number][] = [
    ["walk idly", "saunter", 5],
    ["young salmon", "grilse", 10],
    ["dread of water", "hydrophobia", 10],
    ["performs actions during sleep", "somnambulism", 10],
    ["murder of a king", "regicide", 10],
    ["killing of a brother", "fratricide", 10],
    ["irrepressible desire for alcoholic drinks", "dipsomaniac", 10],
    ["love of one's country", "patriotism", 10],
    ["government by the old", "gerontocracy", 20],
    ["having the qualities of wine", "vinous", 10],
    ["rain in very small drops", "drizzle", 10],
    ["act of whispering", "susurrus", 10],
    ["one who writes from dictation", "amanuensis", 5],
    ["hatred of women", "misogyny", 10],
    ["faint unsteady light", "glimmer", 10],
    ["hatred of mankind", "misanthropy", 10],
    ["eating of human flesh", "anthropophagy", 10],
    ["a ship's kitchen", "cookroom", 10],
    ["burst of ill-humor", "tantrum", 10],
    ["gentle wind", "zephyr", 20],
  ];
  it.each(cases)("%s → %s", (q, want, within) => {
    const slugs = searchDefinitions(conn!, q, within, 0).hits.map((h) => h.slug);
    expect(slugs).toContain(want);
  });
});
