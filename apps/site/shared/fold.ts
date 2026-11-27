import config from "../../../w1913.config.ts";

// Folding and slugs come from @w1913/lookup (the same rules as the edition),
// so the site, the edition and programs using the lookup build agree.

export { foldForCompare, slugify } from "../../../packages/lookup/src/fold.ts";

/** Route words served by the site itself; an entry with one of these slugs lives at /w/<slug> (w1913.config.ts, DESIGN.md §3). */
export const RESERVED: ReadonlySet<string> = new Set(config.reservedWords);

export function entryPath(slug: string): string {
  return RESERVED.has(slug) ? `/w/${slug}` : `/${slug}`;
}
