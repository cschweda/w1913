import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import config from "../../../w1913.config.ts";
import { foldForCompare } from "./fold.ts";
import { lookupWith, stems } from "./inflect.ts";

describe("suffix stripper", () => {
  it("proposes bases, most likely first, never the word itself", () => {
    expect(stems("walked")).toEqual(["walk", "walke"]);
    expect(stems("stopped").slice(0, 3)).toContain("stop");
    expect(stems("loved")).toContain("love");
    expect(stems("berries")[0]).toBe("berry");
    expect(stems("happiest")[0]).toBe("happy");
    expect(stems("goeth")).toContain("go");
    expect(stems("king's")[0]).toBe("king");
    expect(stems("go")).toEqual([]);
  });
});

// Phase 4 exit test (DESIGN.md §6): the stripper tested on 200 forms (here 220). Each
// form must lead to the expected entry through the same rule the server uses.
const FORMS = `
walked walk|walking walk|walks walk|stopped stop|stopping stop|loved love|loving love|loves love|hoped hope|hoping hope
hopped hop|hopping hop|ran run|running run|runs run|went go|gone go|going go|goes go|was be
been be|being be|sang sing|sung sing|singing sing|made make|making make|makes make|children child|oxen ox
better good|best good|berries berry|cities city|ladies lady|flies fly|tried try|tries try|cried cry|carried carry
happier happy|happiest happy|happily happy|easier easy|easiest easy|bigger big|biggest big|hotter hot|hottest hot|thinner thin
faster fast|fastest fast|quickly quick|slowly slow|softly soft|boxes box|foxes fox|churches church|wishes wish|buzzes buzz
heroes hero|potatoes potato|echoes echo|kings king|king's king|horses horse|horse's horse|wolves wolf|knives knife|leaves leaf
sauntered saunter|sauntering saunter|saunters saunter|dismayed dismay|dismaying dismay|dismays dismay|subtler subtle|subtlest subtle|sublimer sublime|loftier lofty
loftiest lofty|loftily lofty|gossamers gossamer|yodeled yodel|yodeling yodel|yodels yodel|amanuenses amanuensis|susurrous susurrous|lambently lambent|whispered whisper
whispering whisper|whispers whisper|murmured murmur|murmurs murmur|trembled tremble|trembling tremble|trembles tremble|wandered wander|wanders wander|rambled ramble
rambling ramble|strolled stroll|strolling stroll|forsook forsake|forsaken forsake|forsakes forsake|deserted desert|abandoned abandon|abandons abandon|abandoning abandon
goeth go|doeth do|maketh make|loveth love|giveth give|taketh take|cometh come|seemeth seem|knowest know|lovest love
thinkest think|sayest say|believest believe|walkedst walk|lov'd love|call'd call|fill'd fill|kill'd kill|liv'd live|mov'd move
seeketh seek|sleepeth sleep|speaketh speak|heareth hear|keepeth keep|bringeth bring|calleth call|dwelleth dwell|faileth fail|abideth abide
dwelt dwell|spake speak|spoken speak|wrote write|written write|writing write|writes write|took take|taken take|taking take
gave give|given give|giving give|saw see|seen see|seeing see|knew know|known know|knowing know|thought think
brought bring|bought buy|sought seek|taught teach|caught catch|fought fight|stood stand|understood understand|held hold|told tell
sold sell|felt feel|kept keep|slept sleep|wept weep|crept creep|meant mean|sent send|spent spend|built build
lent lend|bent bend|lost lose|left leave|led lead|fed feed|fled flee|bled bleed|bred breed|sped speed
mice mouse|geese goose|teeth tooth|feet foot|men man|women woman|brethren brother|kine cow|alumni alumnus|cherubim cherub
seraphim seraph|phenomena phenomenon|criteria criterion|larvae larva|formulae formula|nebulae nebula|radii radius|fungi fungus|stimuli stimulus|termini terminus
oases oasis|crises crisis|theses thesis|axes axis|indices index|vertices vertex|appendices appendix|matrices matrix|stamina stamen|genera genus
`;
const pairs = FORMS.trim().split(/\s*\|\s*|\n/).map((p) => p.trim().split(/\s+/) as [string, string]);
const db = path.join(import.meta.dirname, "../../..", config.paths.devDatabase);

describe.skipIf(!existsSync(db))("Phase 4 exit test: 220 inflected forms", () => {
  const conn = existsSync(db) ? new Database(db, { readonly: true }) : null;
  const q = conn?.prepare("SELECT slug FROM forms WHERE fold = ? ORDER BY (kind = 'inflection'), ord LIMIT 1");
  const exact = (w: string) => (q!.get(foldForCompare(w)) as { slug: string } | undefined)?.slug ?? null;
  const qs = conn?.prepare("SELECT slug FROM forms WHERE fold = ? AND form NOT LIKE '%-' AND form NOT LIKE '-%' ORDER BY (kind = 'inflection'), ord LIMIT 1");
  const stemExact = (w: string) => (qs!.get(foldForCompare(w)) as { slug: string } | undefined)?.slug ?? null;
  it("has at least 200 forms", () => expect(pairs.length).toBe(220));
  it("finds the entry for every one", () => {
    const misses = pairs.filter(([form, want]) => {
      const got = lookupWith(form, exact, foldForCompare, stemExact)?.slug;
      return got !== want && !(got && exact(form) === got);
    });
    // A form that is itself a headword (better, sang) correctly opens its own entry; those count as found.
    expect(misses.map(([f, w]) => `${f}→${w}`)).toEqual([]);
  });
});
