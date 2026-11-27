import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import config from "../../../w1913.config.ts";
import { checkPassage } from "./check.ts";

const db = path.join(import.meta.dirname, "../../..", config.paths.devDatabase);
describe.skipIf(!existsSync(db))("period check against the word list", () => {
  const conn = existsSync(db) ? new Database(db, { readonly: true }) : null;
  const words = new Set((conn?.prepare("SELECT DISTINCT fold FROM forms WHERE form NOT LIKE '%-' AND form NOT LIKE '-%'").all() as { fold: string }[]).map((r) => r.fold));
  const has = (f: string) => words.has(f);
  const missing = (t: string, skip = true) => checkPassage(t, has, skip).missing.map((m) => m.word);

  it("finds ordinary, inflected and archaic words", () => {
    expect(missing("She walked slowly to the window, and the children went with her. Thou knowest he goeth thither.")).toEqual([]);
  });
  it("marks words coined after the dictionary", () => {
    expect(missing("He checked the radar on his smartphone, then the television.")).toEqual(expect.arrayContaining(["smartphone"]));
  });
  it("skips names inside a sentence unless asked", () => {
    expect(missing("Then Zygmuntowicz arrived.")).toEqual([]);
    expect(missing("Then Zygmuntowicz arrived.", false)).toEqual(["zygmuntowicz"]);
  });
  it("keeps the passage intact and marks in place", () => {
    const t = "A smartphone, twice: smartphone!";
    const r = checkPassage(t, has);
    expect(r.tokens.map((x) => x.text).join("")).toBe(t);
    expect(r.missing).toEqual([{ word: "smartphone", count: 2 }]);
  });
  it("accepts hyphenated compounds whose parts are words", () => {
    expect(missing("a sea-green, twice-told tale")).toEqual([]);
  });
});
