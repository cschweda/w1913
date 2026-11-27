// RawEntry -> edition entry, segment layer.
import { displayForm, isUmlautTransliteration } from "../segment/header.ts";
import { slugify } from "../segment/fold.ts";
import type { RawEntry } from "../segment/segment.ts";
import type { SegmentEntry } from "./schema.ts";

/**
 * Rule: ids are assigned over the WHOLE edition in edition order, so an
 * entry keeps its id whichever slice or release it appears in. The slug
 * comes from the display headword; homographs (and case pairs such as
 * august / August) share a slug and are numbered 1, 2, 3...
 * Variants that only transliterate an umlaut (ZOOECHEMICAL) are left out;
 * see isUmlautTransliteration.
 */
export function toSegmentEntries(all: readonly RawEntry[]): SegmentEntry[] {
  const seen = new Map<string, number>();
  return all.map((e) => {
    const forms = e.header?.forms ?? [];
    const shown = e.variants
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !isUmlautTransliteration(v, forms))
      .map(({ v, i }) => displayForm(v, forms, i).text);
    const headword = shown[0] ?? e.headwordLine;
    const slug = slugify(headword) || slugify(e.headwordLine) || "entry";
    const n = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, n);
    return {
      id: `${slug}-${n}`,
      ord: e.ord,
      line: e.line,
      headword,
      variants: shown.slice(1),
      marked: e.header?.marked ?? null,
      pos: e.header?.pos ?? null,
      text: e.lines.join("\n"),
      layers: ["segment"],
    };
  });
}
