// Part-of-speech abbreviations, decoded for <abbr title>.
const ATOMS: Record<string, string> = {
  "n.": "noun", "a.": "adjective", "v.": "verb", "t.": "transitive", "i.": "intransitive",
  "adv.": "adverb", "prep.": "preposition", "conj.": "conjunction", "interj.": "interjection",
  "pron.": "pronoun", "p.": "participle", "pr.": "present", "pa.": "past", "pl.": "plural",
  "sing.": "singular", "imp.": "imperfect", "vb.": "verbal", "obs.": "obsolete",
};
const WHOLE: Record<string, string> = {
  "v. t.": "transitive verb", "v. i.": "intransitive verb", "v. t. & i.": "transitive and intransitive verb",
  "v. i. & t.": "intransitive and transitive verb", "n. pl.": "plural noun", "p. p.": "past participle",
  "p. pr.": "present participle", "p. a.": "participial adjective", "a. & n.": "adjective and noun",
  "n. & a.": "noun and adjective", "a. & adv.": "adjective and adverb", "adv. & a.": "adverb and adjective",
  "imp. & p. p.": "imperfect and past participle", "vb. n.": "verbal noun",
};

/** A plain-English expansion of a printed part of speech, for the abbr title. */
export function posTitle(pos: string): string {
  const p = pos.replace(/\s+/g, " ").trim();
  if (WHOLE[p]) return WHOLE[p]!;
  return p.split(" & ").map((part) => WHOLE[part] ?? part.split(/\s+/).map((a) => ATOMS[a] ?? a).join(" ")).join(" and ");
}

/** A short anchor for a part of speech: "a.", "v. t." -> "a", "vt". */
export function posAnchor(pos: string | null): string {
  if (!pos) return "e";
  return pos.replace(/[^a-z]/gi, "").toLowerCase().slice(0, 8) || "e";
}
