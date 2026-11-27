// Lookups shared by the entry, suggest and exists routes.
import config from "../../../../w1913.config.ts";
import { foldForCompare } from "../../shared/fold.ts";
import { lookupWith } from "../../shared/inflect.ts";

export interface Suggestion { form: string; slug: string }

/** Rule: headwords and variants whose folded spelling starts with the query; exact match first, then shorter, then edition order. */
export function suggest(q: string, limit: number = config.features.suggestions): Suggestion[] {
  const f = foldForCompare(q);
  if (!f) return [];
  return useDb()
    .prepare(
      `SELECT form, slug FROM (
         SELECT form, slug, fold, MIN(ord) AS ord FROM forms WHERE fold >= ? AND fold < ? GROUP BY slug
       ) ORDER BY (fold = ?) DESC, length(fold), ord LIMIT ?`,
    )
    .all(f, f + "{", f, limit) as Suggestion[];
}

/** Rule: an exact headword or variant match after folding, then a listed inflection ("went" → go), else null. */
export function exactSlug(word: string): string | null {
  const f = foldForCompare(word);
  if (!f) return null;
  const row = useDb().prepare("SELECT slug FROM forms WHERE fold = ? ORDER BY (kind = 'inflection'), ord LIMIT 1").get(f) as { slug: string } | undefined;
  return row?.slug ?? null;
}

/**
 * Rule (DESIGN.md §4, inflected lookup): exactSlug(), else the first of the
 * suffix stripper's stems that is one ("walked" → walk, "goeth" → go). The
 * form it came from is returned too, so a page can say "walked: a form of walk".
 */
export function lookupWord(word: string): { slug: string; via: string | null } | null {
  return lookupWith(word, exactSlug, foldForCompare, stemSlug);
}

/** exactSlug() without affix entries ("Com-", "-ness"): a stem is never a prefix or suffix. */
export function stemSlug(word: string): string | null {
  const f = foldForCompare(word);
  if (!f) return null;
  const row = useDb()
    .prepare("SELECT slug FROM forms WHERE fold = ? AND form NOT LIKE '%-' AND form NOT LIKE '-%' ORDER BY (kind = 'inflection'), ord LIMIT 1")
    .get(f) as { slug: string } | undefined;
  return row?.slug ?? null;
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]!);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * "Did you mean": headwords within two edits of the query, among those that
 * share its first letter and are within two letters of its length, closest
 * first. Prefix matches fill any remaining places.
 */
export function didYouMean(word: string, limit: number = config.features.didYouMean): Suggestion[] {
  const f = foldForCompare(word);
  if (!f) return [];
  const rows = useDb()
    .prepare("SELECT fold, form, slug FROM forms WHERE fold >= ? AND fold < ? AND length(fold) BETWEEN ? AND ?")
    .all(f[0]!, f[0]! + "{", f.length - 2, f.length + 2) as { fold: string; form: string; slug: string }[];
  const scored = rows
    .map((r) => ({ ...r, d: editDistance(f, r.fold, 2) }))
    .filter((r) => r.d <= 2)
    .sort((a, b) => a.d - b.d || a.fold.localeCompare(b.fold));
  const out: Suggestion[] = [];
  for (const r of [...scored, ...suggest(f.slice(0, Math.max(1, f.length - 1)), limit)]) {
    if (!out.some((o) => o.slug === r.slug)) out.push({ form: r.form, slug: r.slug });
    if (out.length >= limit) break;
  }
  return out;
}
