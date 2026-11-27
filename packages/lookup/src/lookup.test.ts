import { describe, expect, it } from "vitest";
import { createLookup, createShardedLookup } from "./lookup.ts";
import { makeShards } from "./shards.ts";
import type { LookupBuild } from "./format.ts";

// A tiny hand-made build in the real format (the full one is tested against the site in apps/site).
const build: LookupBuild = {
  format: "w1913-lookup", formatVersion: 1, edition: "test", siteVersion: "0.0.0", built: "2026-11-27", licence: "CC0-1.0", source: "test",
  site: "https://w1913.com", reserved: ["search"],
  pages: [
    ["com", "Com-", [[null, [[null, "A prefix."]]]]],
    ["comet", "Comet", [["n.", [[null, "A celestial body."]]]]],
    ["come", "Come", [["v. i.", [[1, "To move hitherward.", [["a", "Of persons."]]]]]]],
    ["go", "Go", [["v. i.", [[1, "To pass from one place to another."]]]]],
    ["search", "Search", [["v. t.", [[1, "To look over or through."]]]]],
    ["walk", "Walk", [["v. i.", [[1, "To move along on foot."]]]]],
  ],
  forms: { com: 0, comet: 1, come: 2, go: 3, went: 3, search: 4, walk: 5 },
  stemForms: { com: -1 },
};

describe("@w1913/lookup", () => {
  const lk = createLookup(build);
  it("finds a headword, folding case and marks", () => {
    expect(lk.lookup("WALK")).toMatchObject({ slug: "walk", headword: "Walk", via: null, url: "https://w1913.com/walk" });
  });
  it("finds a listed inflection directly and a stripped form with `via`", () => {
    expect(lk.lookup("went")).toMatchObject({ slug: "go", via: null });
    expect(lk.lookup("walked")).toMatchObject({ slug: "walk", via: "walked" });
    expect(lk.lookup("goeth")).toMatchObject({ slug: "go", via: "goeth" });
  });
  it("never takes a prefix as a stem", () => {
    expect(lk.lookup("cometh")).toMatchObject({ slug: "come", via: "cometh" });
  });
  it("gives senses and sub-senses, and reserved words their /w/ address", () => {
    expect(lk.lookup("come")!.entries[0]).toEqual({ pos: "v. i.", senses: [{ n: 1, text: "To move hitherward.", sub: [{ letter: "a", text: "Of persons." }] }] });
    expect(lk.lookup("search")!.url).toBe("https://w1913.com/w/search");
  });
  it("returns null for a word it does not have, and refuses other files", () => {
    expect(lk.lookup("smartphone")).toBeNull();
    expect(lk.lookup("")).toBeNull();
    expect(() => createLookup({ ...build, format: "nope" } as unknown as LookupBuild)).toThrow();
  });
  it("suggests headwords by prefix in dictionary order", () => {
    expect(lk.suggest("com").map((s) => s.headword)).toEqual(["Com-", "Comet", "Come"]);
  });
  it("answers the same from shards, fetching only what a word needs", async () => {
    const shards = makeShards(build);
    const fetched: string[] = [];
    const sl = createShardedLookup(async (p) => { fetched.push(p); return shards.get(p) ?? null; });
    expect((await sl.lookup("walked"))?.slug).toBe("walk");
    expect((await sl.lookup("went"))?.slug).toBe("go");
    expect(await sl.lookup("smartphone")).toBeNull();
    expect(fetched).toContain("wa");
    expect(fetched).not.toContain("go");
  });
});
