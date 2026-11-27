import { describe, expect, it } from "vitest";
import { soundKey, spellingKey } from "./rhymes.ts";
import { prosodyOf } from "./prosody.ts";

const sp = (marked: string) => spellingKey(prosodyOf(marked), marked.replace(/[*"`]/g, ""));

describe("rhyme keys", () => {
  it("takes the sound from the last primary stress to the end", () => {
    expect(soundKey(["S", "AH0", "B", "L", "AY1", "M"])).toBe("AY M");
    expect(soundKey(["K", "L", "AY1", "M"])).toBe("AY M");
    expect(soundKey(["G", "AA1", "S", "AH0", "M", "ER0"])).toBe("AA S AH M ER");
    expect(soundKey(["AH0"])).toBeNull();
  });
  it("takes the spelling from the 1913's stressed vowel to the end", () => {
    expect(sp('Yaf"fle')).toBe("affle");
    expect(sp('Baf"fle')).toBe("affle");
    expect(sp('Sub*lime"')).toBe("ime");
    expect(sp("Time")).toBe("ime");
    expect(sp('Gos"sa*mer')).toBe("ossamer");
    expect(sp('Rhyme')).toBe("yme");
    expect(sp("Sky")).toBeNull(); // too short to rhyme by
    expect(sp("Yockel")).toBeNull(); // unmarked, two syllables: no claim
    expect(sp('Æ"ther')).toBe("aether");
    expect(sp("Sub*lime")).toBeNull();
  });
});

// Against the imported database, when it exists (as in lookup-agreement.test.ts).
import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import config from "../../../w1913.config.ts";
import { rhymeGroups, rhymesOf } from "./search.ts";

const dbFile = path.join(import.meta.dirname, "../../..", config.paths.devDatabase);
describe.skipIf(!existsSync(dbFile))("rhymes in the dictionary", () => {
  const db = existsSync(dbFile) ? new Database(dbFile, { readonly: true }) : null;
  const words = (slug: string, r = {}) => rhymesOf(db!, slug, r, 200).hits.map((h) => h.slug);
  it("finds sound rhymes, fewer syllables first", () => {
    const r = rhymesOf(db!, "time", {}, 200);
    expect(r.kind).toBe("sound");
    expect(words("time")).toEqual(expect.arrayContaining(["chime", "climb", "rhyme", "thyme", "sublime"]));
    expect(words("time").indexOf("chime")).toBeLessThan(words("time").indexOf("sublime"));
    expect(words("time")).not.toContain("time");
  });
  it("falls back to spelling, labelled, for a word CMU lacks", () => {
    const r = rhymesOf(db!, "yaffle", {}, 200);
    expect(r.kind).toBe("spelling");
    expect(r.hits.map((h) => h.slug)).toEqual(expect.arrayContaining(["baffle", "raffle", "snaffle"]));
  });
  it("filters by rhythm and finds nothing for orange", () => {
    expect(words("time", { syllables: 2 })).toContain("sublime");
    expect(words("time", { syllables: 2 })).not.toContain("chime");
    expect(rhymesOf(db!, "orange").total).toBe(0);
  });
  it("gives homographs that sound different their own groups", () => {
    // MIN-uht (n.) has no rhyme in the dictionary; my-NOOT (a.) has, and says which it is.
    const g = rhymeGroups(db!, "minute");
    expect(g.map((x) => [x.sounds, x.pos, x.labelled])).toEqual([["my-NOOT", ["a."], true]]);
    expect(rhymeGroups(db!, "time").every((x) => !x.labelled)).toBe(true);
  });
});
