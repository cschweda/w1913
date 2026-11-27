// Abbreviations the 1913 Webster's prints, decoded for <abbr title> and the
// "Abbreviations on this page" key (DESIGN.md §4, "Decoded abbreviations").
// Chosen by frequency in the edition (Phase 1 survey, 27 Nov 2026).
//
// Two contexts, because a single capital letter is ambiguous:
// - ETYMOLOGY: inside an etymology, "L." is Latin and "E." English.
// - LABELS: inside (...) or [...] in senses and header lines, where "R." is
//   rare and "Obs." obsolete. Outside those, "R. L. Stevenson" stays a name.

/** Languages and words used in etymologies. Single letters are safe only here. */
export const ETYMOLOGY: Record<string, string> = {
  "L.": "Latin", "LL.": "Late Latin", "NL.": "New Latin", "ML.": "Medieval Latin", "OL.": "Old Latin",
  "Gr.": "Greek", "F.": "French", "OF.": "Old French", "E.": "English", "OE.": "Old English", "ME.": "Middle English",
  "AS.": "Anglo-Saxon", "G.": "German", "OHG.": "Old High German", "MHG.": "Middle High German", "D.": "Dutch",
  "OD.": "Old Dutch", "LG.": "Low German", "OS.": "Old Saxon", "OFries.": "Old Frisian", "Icel.": "Icelandic",
  "Sw.": "Swedish", "Dan.": "Danish", "Goth.": "Gothic", "It.": "Italian", "Sp.": "Spanish", "Pg.": "Portuguese",
  "Pr.": "Provençal", "Prov.": "Provençal", "Skr.": "Sanskrit", "Ar.": "Arabic", "Heb.": "Hebrew", "Per.": "Persian",
  "W.": "Welsh", "Ir.": "Irish", "Gael.": "Gaelic", "Armor.": "Armorican (Breton)", "Russ.": "Russian",
  "Lith.": "Lithuanian", "Hind.": "Hindi", "Turk.": "Turkish", "Scand.": "Scandinavian", "Scot.": "Scottish",
  "fr.": "from", "cf.": "compare", "Cf.": "compare", "CF.": "compare", "pref.": "prefix", "Pref.": "prefix",
  "dim.": "diminutive", "Dim.": "diminutive", "perh.": "perhaps", "Perh.": "perhaps", "prob.": "probably",
  "Prob.": "probably", "orig.": "originally", "origin.": "originally", "lit.": "literally", "fem.": "feminine",
  "masc.": "masculine", "neut.": "neuter", "intens.": "intensive", "dial.": "dialect", "equiv.": "equivalent",
  "contr.": "contraction", "Contr.": "contraction", "Abbrev.": "abbreviation", "gen.": "genitive", "comp.": "compound",
  "pl.": "plural", "sing.": "singular", "adv.": "adverb", "adj.": "adjective", "prep.": "preposition",
  "imp.": "imperfect (past tense)", "p. p.": "past participle", "p. pr.": "present participle", "sc.": "namely",
  "Etymol.": "etymology",
};

/** Usage and subject labels, read inside (...) or [...]. */
export const LABELS: Record<string, string> = {
  "Obs.": "obsolete", "R.": "rare", "Archaic": "archaic", "Colloq.": "colloquial", "Slang": "slang", "Cant": "cant",
  "Poetic": "poetic", "Local": "local", "Prov. Eng.": "provincial English", "Prov.": "provincial", "Eng.": "English",
  "Scot.": "Scottish", "U. S.": "United States", "U.S.": "United States", "Obsoles.": "obsolescent", "Low": "low (vulgar)",
  "Zoöl.": "zoology", "Bot.": "botany", "Chem.": "chemistry", "Law": "law", "Med.": "medicine", "Anat.": "anatomy",
  "Naut.": "nautical", "Min.": "mineralogy", "Mus.": "music", "Arch.": "architecture", "Physiol.": "physiology",
  "Biol.": "biology", "Mil.": "military", "Eccl.": "ecclesiastical", "Math.": "mathematics", "Astron.": "astronomy",
  "Geol.": "geology", "Physics": "physics", "Her.": "heraldry", "Geom.": "geometry", "Mach.": "machinery",
  "Hist.": "history", "Mining": "mining", "Gram.": "grammar", "Mech.": "mechanics", "Elec.": "electricity",
  "Antiq.": "antiquities", "Print.": "printing", "Surg.": "surgery", "Myth.": "mythology", "Paleon.": "paleontology",
  "Ethnol.": "ethnology", "Fort.": "fortification", "Logic": "logic", "Com.": "commerce", "Theol.": "theology",
  "Metal.": "metallurgy", "Far.": "farriery", "Opt.": "optics", "Crystallog.": "crystallography", "Carp.": "carpentry",
  "Engin.": "engineering", "Metaph.": "metaphysics", "Rhet.": "rhetoric", "Paint.": "painting", "Manuf.": "manufacturing",
  "Photog.": "photography", "Script.": "Scripture", "Alg.": "algebra", "Geog.": "geography", "Pros.": "prosody",
  "Agric.": "agriculture", "Gun.": "gunnery", "Phon.": "phonetics", "Arith.": "arithmetic", "Astrol.": "astrology",
  "Philos.": "philosophy", "Pharm.": "pharmacy", "Meteor.": "meteorology", "Hort.": "horticulture", "Surv.": "surveying",
  "Econ.": "economics", "Fine Arts": "fine arts", "Class.": "classical", "Phys.": "physics",
  "Zool.": "zoology", "Bibliog.": "bibliography", "Mythol.": "mythology", "Gr. Antiq.": "Greek antiquities",
  "Rom. Antiq.": "Roman antiquities", "R. C. Ch.": "Roman Catholic Church", "Gr. & Rom. Myth.": "Greek and Roman mythology",
};

/** Part-of-speech words in the inflection lines ("imp. & p. p. Subjoined; p. pr. & vb. n. Subjoining."). */
export const GRAMMAR: Record<string, string> = {
  "imp.": "imperfect (past tense)", "p. p.": "past participle", "p. pr.": "present participle", "vb. n.": "verbal noun",
  "pl.": "plural", "sing.": "singular", "Compar.": "comparative", "Comp.": "comparative", "superl.": "superlative",
  "pret.": "preterit (past tense)", "fem.": "feminine", "masc.": "masculine", "3d pers. sing. pres.": "third person singular present",
};

const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A matcher for whole abbreviations from a table, longest first, never inside a word. */
function matcher(table: Record<string, string>): RegExp {
  const keys = Object.keys(table).sort((a, b) => b.length - a.length).map(ESC);
  return new RegExp(`(?<![\\p{L}.])(${keys.join("|")})(?![\\p{L}])`, "gu");
}
const RE = { ETYMOLOGY: matcher(ETYMOLOGY), LABELS: matcher(LABELS), GRAMMAR: matcher(GRAMMAR) };

function wrap(html: string, re: RegExp, table: Record<string, string>): string {
  return html.replace(re, (m) => `<abbr title="${table[m]}">${m}</abbr>`);
}

/**
 * Decorate escaped HTML text (no tags in it) with <abbr> elements.
 * Rule: "etymology" decodes languages and etymology words anywhere in the
 * text; "inflections" decodes grammatical words; "text" decodes labels only
 * inside (...) and [...] groups, so names and ordinary prose are left alone.
 */
export function abbreviate(html: string, context: "etymology" | "inflections" | "text"): string {
  if (context === "etymology") return wrap(html, RE.ETYMOLOGY, ETYMOLOGY);
  if (context === "inflections") return wrap(html, RE.GRAMMAR, GRAMMAR);
  return html.replace(/\(([^()<>]{1,60})\)|\[([^[\]<>]{1,60})\]/g, (group, inParens?: string, inBrackets?: string) => {
    const inner = inParens ?? inBrackets ?? "";
    const done = wrap(inner, RE.LABELS, LABELS);
    if (done === inner) return group;
    return inParens !== undefined ? `(${done})` : `[${done}]`;
  });
}

/** The distinct abbreviations used in some HTML, for the page's key. */
export function abbreviationsIn(html: string): { abbr: string; meaning: string }[] {
  const seen = new Map<string, string>();
  for (const m of html.matchAll(/<abbr title="([^"]+)">([^<]+)<\/abbr>/g)) if (!seen.has(m[2]!)) seen.set(m[2]!, m[1]!);
  return [...seen].map(([abbr, meaning]) => ({ abbr, meaning })).sort((a, b) => a.abbr.localeCompare(b.abbr, "en", { sensitivity: "base" }));
}
