// The label vocabulary (data 0.4; DESIGN.md §2 problem 7: "a closed
// vocabulary built by frequency count"). Every bracketed or parenthesised
// group used 20 or more times in the senses and header lines of #29765 was
// surveyed (Phase 3, 27 Nov 2026); each printed form below maps to one label.

export interface Label {
  code: string;
  name: string;
  kind: "usage" | "subject";
  /** Printed forms, as they appear inside the brackets. */
  forms: string[];
}

const U = (code: string, name: string, ...forms: string[]): Label => ({ code, name, kind: "usage", forms });
const S = (code: string, name: string, ...forms: string[]): Label => ({ code, name, kind: "subject", forms });

export const LABELS: readonly Label[] = [
  // Usage
  U("obs", "Obsolete", "Obs."), U("rare", "Rare", "R."), U("archaic", "Archaic", "Archaic", "Archaic."),
  U("obsolescent", "Obsolescent", "Obsoles."), U("colloq", "Colloquial", "Colloq.", "Collog."), U("slang", "Slang", "Slang"),
  U("cant", "Cant", "Cant"), U("low", "Low", "Low"), U("poetic", "Poetic", "Poetic"), U("humorous", "Humorous", "Humorous", "Jocose"),
  U("recent", "Recent", "Recent"), U("local", "Local", "Local"), U("prov-eng", "Provincial English", "Prov. Eng.", "Prov.Eng."),
  U("scot", "Scottish", "Scot.", "Scotch"), U("eng", "British", "Eng."), U("us", "United States", "U.S.", "U. S."), U("india", "India", "India"),
  // Subjects
  S("zoology", "Zoology", "Zoöl.", "Zoöl", "Zool."), S("botany", "Botany", "Bot."), S("chemistry", "Chemistry", "Chem.", "Old Chem.", "Physiol. Chem."),
  S("medicine", "Medicine", "Med."), S("anatomy", "Anatomy", "Anat."), S("nautical", "Nautical", "Naut."),
  S("law", "Law", "Law", "Eng. Law", "O. Eng. Law", "Old Eng. Law", "Old Law", "Scots Law", "Civil Law", "Feudal Law", "Eccl. Law"),
  S("mineralogy", "Mineralogy", "Min."), S("music", "Music", "Mus.", "Music", "Encyc. of Music"), S("architecture", "Architecture", "Arch."),
  S("biology", "Biology", "Biol."), S("military", "Military", "Mil."), S("physiology", "Physiology", "Physiol."),
  S("mathematics", "Mathematics", "Math.", "Alg.", "Arith."), S("geometry", "Geometry", "Geom."), S("astronomy", "Astronomy", "Astron."),
  S("geology", "Geology", "Geol."), S("machinery", "Machinery", "Mach."), S("heraldry", "Heraldry", "Her."), S("physics", "Physics", "Physics"),
  S("mining", "Mining", "Mining", "Mining."), S("ecclesiastical", "Ecclesiastical", "Eccl.", "Eccl. Hist."), S("roman-catholic", "Roman Catholic Church", "R. C. Ch."),
  S("mechanics", "Mechanics", "Mech."), S("grammar", "Grammar", "Gram."), S("electricity", "Electricity", "Elec."),
  S("printing", "Printing", "Print.", "Printing"), S("surgery", "Surgery", "Surg."), S("paleontology", "Paleontology", "Paleon."),
  S("ethnology", "Ethnology", "Ethnol."), S("fortification", "Fortification", "Fort."), S("commerce", "Commerce", "Com."),
  S("logic", "Logic", "Logic"), S("theology", "Theology", "Theol."), S("farriery", "Farriery", "Far."), S("optics", "Optics", "Opt.", "Optics"),
  S("metallurgy", "Metallurgy", "Metal."), S("crystallography", "Crystallography", "Crystallog."), S("carpentry", "Carpentry", "Carp."),
  S("shipbuilding", "Shipbuilding", "Shipbuilding"), S("fine-arts", "Fine Arts", "Fine Arts"), S("cookery", "Cookery", "Cookery"),
  S("antiquities", "Antiquities", "Antiq.", "Rom. Antiq.", "Gr. Antiq.", "Jewish Antiq.", "Gr. & Rom. Antiq."),
  S("rhetoric", "Rhetoric", "Rhet."), S("metaphysics", "Metaphysics", "Metaph."), S("painting", "Painting", "Paint."),
  S("scripture", "Scripture", "Script."), S("photography", "Photography", "Photog."), S("gunnery", "Gunnery", "Gun."),
  S("founding", "Founding", "Founding"), S("card-playing", "Card Playing", "Card Playing"), S("engineering", "Engineering", "Engin."),
  S("steam", "Steam Engines", "Steam Engine", "Steam Boilers"), S("prosody", "Prosody", "Pros."), S("agriculture", "Agriculture", "Agric."),
  S("natural-history", "Natural History", "Nat. Hist."), S("phonetics", "Phonetics", "Phon.", "Phonetics"), S("masonry", "Masonry", "Masonry"),
  S("astrology", "Astrology", "Astrol."), S("railroads", "Railroads", "Railroad", "Railroads"), S("history", "History", "Hist.", "Eng. Hist."),
  S("horticulture", "Horticulture", "Hort."), S("mythology", "Mythology", "Myth.", "Class. Myth.", "Gr. & Rom. Myth."),
  S("baseball", "Baseball", "Baseball"), S("manege", "Horsemanship", "Man."), S("weaving", "Weaving", "Weaving"),
  S("meteorology", "Meteorology", "Meteor."), S("falconry", "Falconry", "Falconry"), S("aeronautics", "Aeronautics", "Aëronautics"),
  S("pharmacy", "Pharmacy", "Pharm."), S("philosophy", "Philosophy", "Philos."), S("cricket", "Cricket", "Cricket"),
  S("geography", "Geography", "Geog.", "Phys. Geog."), S("surveying", "Surveying", "Surv."), S("stock-exchange", "Stock Exchange", "Stock Exchange"),
  S("philology", "Philology", "Philol."), S("political-economy", "Political Economy", "Polit. Econ."), S("football", "Football", "Football"),
  S("billiards", "Billiards", "Billiards"), S("bookbinding", "Bookbinding", "Bookbinding"), S("firearms", "Firearms", "Firearms"),
  S("armor", "Armor", "Anc. Armor"),
];

/** Labels whose words are natural-science terms: entries with only these are left out of the random card deck (DESIGN.md §4). */
export const NATURAL_SCIENCE = new Set([
  "zoology", "botany", "chemistry", "mineralogy", "anatomy", "physiology", "biology", "geology", "paleontology",
  "crystallography", "natural-history", "meteorology",
]);

const FORMS: [string, string][] = LABELS.flatMap((l) => l.forms.map((f) => [f, l.code] as [string, string])).sort((a, b) => b[0].length - a[0].length);

/**
 * Rule: a bracketed or parenthesised group is a label group when its whole
 * text, whitespace normalised, is a sequence of known printed forms joined by
 * spaces, commas, "&", "and" or "or" ("[Obs. or Prov. Eng.]", "(Bot. &
 * Zoöl.)", "[Colloq. U.S.]"). Anything else in it ("(Pseudemus concinna)",
 * "[F.]") means it is not a label group, and null is returned.
 */
export function labelsInGroup(group: string): string[] | null {
  const inner = group.slice(1, -1).replace(/\s+/g, " ").trim();
  if (!inner) return null;
  const codes: string[] = [];
  let i = 0;
  while (i < inner.length) {
    const sep = /^(?:[\s,&]+|(?:or|and)(?=\s))+/.exec(inner.slice(i));
    if (sep) { i += sep[0].length; continue; }
    const hit = FORMS.find(([f]) => inner.startsWith(f, i) && !/\p{L}/u.test(inner[i + f.length] ?? ""));
    if (!hit) return null;
    if (!codes.includes(hit[1])) codes.push(hit[1]);
    i += hit[0].length;
  }
  return codes.length ? codes : null;
}

/** All label codes in a text, from its (...) and [...] groups. */
export function labelsInText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\([^()]{1,60}\)|\[[^[\]]{1,60}\]/g)) for (const c of labelsInGroup(m[0]) ?? []) if (!out.includes(c)) out.push(c);
  return out;
}
