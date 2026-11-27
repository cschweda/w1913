import { describe, expect, it } from "vitest";
import { addToList, byName, createList, mergeLists, readLists, removeFromList, renameList, MAX_LISTS, type NamedList } from "./lists.ts";
import { parseSavedFile, toSavedFile } from "./saved.ts";

const t = (m: number) => new Date(Date.UTC(2026, 10, 27, 12, m));
const make = (names: string[]) => names.reduce<NamedList[]>((ls, n, i) => { const r = createList(ls, n, t(i)); if ("error" in r) throw new Error(r.error); return r.lists; }, []);

describe("named lists", () => {
  it("creates lists with clean names and refuses empty or repeated ones", () => {
    const ls = make(["  Chapter   3 ", "Sea words"]);
    expect(ls.map((l) => l.name)).toEqual(["Chapter 3", "Sea words"]);
    expect(createList(ls, "   ")).toEqual({ error: "A list needs a name." });
    expect(createList(ls, "sea WORDS")).toEqual({ error: 'There is already a list called "sea WORDS".' });
    expect(new Set(ls.map((l) => l.id)).size).toBe(2);
  });
  it("stops at MAX_LISTS", () => {
    const ls = make(Array.from({ length: MAX_LISTS }, (_, i) => `List ${i}`));
    expect(createList(ls, "One more")).toMatchObject({ error: expect.stringContaining(String(MAX_LISTS)) });
  });
  it("adds a word once, newest first, and removes it", () => {
    let ls = make(["Sea words"]);
    const id = ls[0]!.id;
    ls = addToList(ls, id, "yaffle", "Yaffle", t(5)).lists;
    const again = addToList(ls, id, "yaffle", "Yaffle", t(6));
    expect(again.added).toBe(false);
    ls = addToList(again.lists, id, "brine", "Brine", t(7)).lists;
    expect(ls[0]!.words.map((w) => w.slug)).toEqual(["brine", "yaffle"]);
    expect(removeFromList(ls, id, "brine")[0]!.words.map((w) => w.slug)).toEqual(["yaffle"]);
  });
  it("renames, refusing a name another list has", () => {
    const ls = make(["A", "B"]);
    expect(renameList(ls, ls[0]!.id, "b")).toEqual({ error: 'There is already a list called "b".' });
    const r = renameList(ls, ls[0]!.id, "Chapter 1");
    expect("lists" in r && byName(r.lists).map((l) => l.name)).toEqual(["B", "Chapter 1"]);
  });
  it("merges an import by name, adding only missing words", () => {
    let mine = make(["Sea words"]);
    mine = addToList(mine, mine[0]!.id, "brine", "Brine", t(1)).lists;
    let theirs = make(["SEA WORDS", "Birds"]);
    theirs = addToList(theirs, theirs[0]!.id, "brine", "Brine", t(2)).lists;
    theirs = addToList(theirs, theirs[0]!.id, "spume", "Spume", t(3)).lists;
    const r = mergeLists(mine, theirs);
    expect(r).toMatchObject({ newLists: 1, newWords: 1, skipped: 0 });
    expect(r.lists.map((l) => [l.name, l.words.map((w) => w.slug)])).toEqual([["Sea words", ["brine", "spume"]], ["Birds", []]]);
  });
  it("travels in the export file and reads stored lists leniently", () => {
    let ls = make(["Sea words"]);
    ls = addToList(ls, ls[0]!.id, "brine", "Brine", t(1)).lists;
    const r = parseSavedFile(JSON.stringify(toSavedFile([], t(9), ls)));
    expect("lists" in r && r.lists).toEqual(ls);
    expect(readLists([{ id: "<x>", name: "Bad" }, { ...ls[0], words: [{ slug: "ok", headword: "Ok", added: "2026-11-27" }, { slug: "<b>" }] }]).map((l) => l.words.length)).toEqual([1]);
    expect(readLists("nope")).toEqual([]);
  });
});
