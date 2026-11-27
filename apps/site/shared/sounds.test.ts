import { describe, expect, it } from "vitest";
import { agreeing, parseCmu, respell } from "./sounds.ts";

const cmu = parseCmu([
  ";;; comment", "sublime S AH0 B L AY1 M", "gossamer G AA1 S AH0 M ER0", "saunter S AO1 N T ER0", "yodel Y OW1 D AH0 L",
  "time T AY1 M", "happy HH AE1 P IY0", "record R AH0 K AO1 R D", "record(2) R EH1 K ER0 D", "monster M AA1 N S T ER0",
  "love L AH1 V", "ice AY1 S", "father F AA1 DH ER0", "abstract AE0 B S T R AE1 K T # verb",
].join("\n"));
const say = (w: string, i = 0) => respell(cmu.get(w)![i]!);

describe("sounds like", () => {
  it("respells in plain letters, the stressed syllable in capitals", () => {
    expect(say("sublime")).toBe("suh-BLYME");
    expect(say("gossamer")).toBe("GAH-suh-mer");
    expect(say("saunter")).toBe("SAWN-ter");
    expect(say("yodel")).toBe("YOH-duhl");
    expect(say("time")).toBe("TYME");
    expect(say("happy")).toBe("HAP-ee");
    expect(say("monster")).toBe("MAHN-ster");
    expect(say("love")).toBe("LUV");
    expect(say("father")).toBe("FAH-dher");
    expect(say("record", 0)).toBe("ruh-KORD");
    expect(say("record", 1)).toBe("REK-erd");
    expect(say("ice")).toBe("EYESS");
  });
  it("reads alternates and ignores comments", () => {
    expect(cmu.get("record")).toHaveLength(2);
    expect(cmu.get("abstract")![0]).toEqual(["AE0", "B", "S", "T", "R", "AE1", "K", "T"]);
  });
  it("shows a pronunciation only where it agrees with the 1913's stress", () => {
    expect(agreeing(cmu.get("record"), "10")).toEqual(cmu.get("record")![1]);
    expect(agreeing(cmu.get("record"), "01")).toEqual(cmu.get("record")![0]);
    expect(agreeing(cmu.get("record"), "100")).toBeNull();
    expect(agreeing(cmu.get("record"), null)).toBeNull();
    expect(agreeing(cmu.get("sublime"), null)).toEqual(cmu.get("sublime")![0]);
    expect(agreeing(undefined, "1")).toBeNull();
    expect(agreeing(cmu.get("time"), "0")).toEqual(cmu.get("time")![0]);
    expect(agreeing([["L", "EH1", "D"], ["L", "IY1", "D"]], "0")).toBeNull();
  });
});
