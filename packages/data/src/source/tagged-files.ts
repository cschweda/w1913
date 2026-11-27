// The eleven tagged v0.50 files (#660-670). The evaluation command reads
// them; the build never does (DESIGN.md §2). Listed here only so the
// download step can fetch them, from gutenberg.org or PG's own mirror.

const PRIMARY = "https://www.gutenberg.org/files";
const MIRROR = "https://gutenberg.pglaf.org";

const FILES: readonly { etext: number; name: string; zip?: boolean }[] = [
  { etext: 660, name: "pgw050ab.txt" },
  { etext: 661, name: "pgw050c.txt", zip: true },
  { etext: 662, name: "pgw050de.txt" },
  { etext: 663, name: "pgw050fh.txt" },
  { etext: 664, name: "pgw050il.txt" },
  { etext: 665, name: "pgw050mo.txt" },
  { etext: 666, name: "pgw050pq.txt" },
  { etext: 667, name: "pgw050r.txt" },
  { etext: 668, name: "pgw050s.txt" },
  { etext: 669, name: "pgw050tw.txt" },
  { etext: 670, name: "pgw050xz.txt" },
];

/** PG mirror layout: etext 660 lives under 6/6/660/, etext 670 under 6/7/670/. */
function mirrorDir(etext: number): string {
  const s = String(etext);
  return [...s.slice(0, -1)].join("/") + "/" + s;
}

export interface TaggedSpec {
  name: string;
  urls: string[];
  /** Set when the download is a zip; the member to extract. */
  extract?: string;
}

export const TAGGED: readonly TaggedSpec[] = FILES.map((f) => {
  const remote = f.zip ? f.name.replace(/\.txt$/, ".zip") : f.name;
  const urls = [`${PRIMARY}/${f.etext}/old/${remote}`, `${MIRROR}/${mirrorDir(f.etext)}/old/${remote}`];
  return f.zip ? { name: f.name, urls, extract: f.name } : { name: f.name, urls };
});
