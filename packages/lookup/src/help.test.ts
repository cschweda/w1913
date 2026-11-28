import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The README shows the command's whole help; HELP.txt is the one source.
describe("w1913 --help", () => {
  it("is shown in full in the README", () => {
    const help = readFileSync(new URL("../HELP.txt", import.meta.url), "utf8").trimEnd();
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toContain("```text\n" + help + "\n```");
  });
});
