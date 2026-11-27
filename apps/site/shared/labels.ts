// Labels on the site (data 0.4). The vocabulary comes from the edition's
// labels.json; the matching rule is the data package's (labelsInGroup), kept
// here so the site needs nothing from it at runtime. A test checks they agree.

export interface Label { code: string; name: string; kind: "usage" | "subject"; forms: string[] }

export function makeLabeler(vocabulary: readonly Label[]) {
  const forms: [string, string][] = vocabulary.flatMap((l) => l.forms.map((f) => [f, l.code] as [string, string])).sort((a, b) => b[0].length - a[0].length);
  const byCode = new Map(vocabulary.map((l) => [l.code, l]));
  /** The label codes of a "(...)" or "[...]" group made only of known forms, else null. */
  function group(g: string): string[] | null {
    const inner = g.slice(1, -1).replace(/\s+/g, " ").trim();
    if (!inner) return null;
    const codes: string[] = [];
    let i = 0;
    while (i < inner.length) {
      const sep = /^(?:[\s,&]+|(?:or|and)(?=\s))+/.exec(inner.slice(i));
      if (sep) { i += sep[0].length; continue; }
      const hit = forms.find(([f]) => inner.startsWith(f, i) && !/\p{L}/u.test(inner[i + f.length] ?? ""));
      if (!hit) return null;
      if (!codes.includes(hit[1])) codes.push(hit[1]);
      i += hit[0].length;
    }
    return codes.length ? codes : null;
  }
  return { group, label: (code: string) => byCode.get(code) };
}
export type Labeler = ReturnType<typeof makeLabeler>;
