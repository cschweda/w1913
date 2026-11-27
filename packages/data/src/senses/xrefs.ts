// Heuristic cross-references (DESIGN.md §2, problem 6).

export interface XrefMatch {
  /** Offsets of the referenced word in the text (what becomes the link). */
  start: number;
  end: number;
  /** The word as printed: "Grand", "Hypostasis". */
  to: string;
  /** Part of speech named after it ("See Like, a."), if any. */
  pos: string | null;
  /** Sense number named after it ("Same as Hypostasis, 2."), if any. */
  sense: number | null;
}

const POS = String.raw`(?:n\.|a\.|v\. ?t\.|v\. ?i\.|adv\.|prep\.|conj\.|interj\.|pron\.)`;
const WORD = String.raw`[A-Z][A-Za-zæœÆŒäëïöüéèêáàâíóôúûñç'\-]*`;
const ITEM = new RegExp(String.raw`(${WORD})(?:,\s+(${POS}))?(?:,\s+(\d+)(?=[.,;\])\s]))?`, "y");
const TRIGGER = /\b(?:See(?: under| also)?|[Cc]f\.|Same as|Compare)\s+/g;

// Language and source abbreviations that follow "cf." in etymologies
// ("cf. F. sublime", "Cf. G. gar"); a capital followed by "." from this list
// is a language, not a headword.
const LANGUAGES = new Set(("F L G D E AS OE OF ME LL NL ML Gr It Sp Pg Pr Prov Icel Sw Dan Goth OHG MHG " +
  "Skr Ar Heb Per Pers W Ir Gael Arm Russ Pol Bohem Lith Lat Fr Ger OS OFries Fries LG Corn Armor Hind " +
  "Turk Malay Chin Jap Mex Peruv Braz Am Amer Norw Fin Hung Gr Syr Chald Copt Egypt Assyr Zend Pali " +
  "Teut Celt Slav Scand Sc Scot Eng Dial OD MD OSw ODan OIcel OCelt Bret Manx Wel Port").split(" "));

/**
 * Rule: after "See", "See under", "See also", "Cf."/"cf.", "Same as" or
 * "Compare", read a list of capitalised words. Each may be followed by a part
 * of speech ("Like, a.") and a sense number ("Hypostasis, 2"). Items are
 * joined by ", " or " and " / ", and " (optionally followed by "cf."). The
 * list ends at the first item that is not a capitalised word, or at a
 * language abbreviation ("cf. F. sublime"). The same word is not reported
 * twice ("See Cede, and cf. Success"). Whether a word is a real headword is
 * decided later, against the headword list.
 */
export function findXrefs(text: string): XrefMatch[] {
  const out: XrefMatch[] = [];
  for (const t of text.matchAll(TRIGGER)) {
    let pos = t.index + t[0].length;
    for (;;) {
      ITEM.lastIndex = pos;
      const m = ITEM.exec(text);
      if (!m) break;
      if (LANGUAGES.has(m[1]!) && text[m.index + m[1]!.length] === ".") break;
      if (!out.some((x) => x.start === m.index)) out.push({ start: m.index, end: m.index + m[1]!.length, to: m[1]!, pos: m[2] ?? null, sense: m[3] ? Number(m[3]) : null });
      pos = m.index + m[0].length;
      const sep = /^(?:,\s+(?:and\s+)?(?:cf\.\s+)?|\s+and\s+(?:cf\.\s+)?)/.exec(text.slice(pos));
      if (!sep) break;
      pos += sep[0].length;
    }
  }
  return out;
}
