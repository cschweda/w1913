// Static shards from a lookup build (DESIGN.md §4b): one per two-letter
// prefix of the folded forms, each carrying the pages its forms reach.
import type { BuildPage, LookupBuild, LookupShard } from "./format.ts";
import { shardPrefix } from "./lookup.ts";

export function makeShards(build: LookupBuild): Map<string, LookupShard> {
  const out = new Map<string, LookupShard>();
  const get = (prefix: string) => {
    let s = out.get(prefix);
    if (!s) out.set(prefix, (s = { format: "w1913-lookup-shard", formatVersion: 1, edition: build.edition, prefix, site: build.site, reserved: build.reserved, pages: {}, forms: {}, stemForms: {} }));
    return s;
  };
  const add = (s: LookupShard, p: BuildPage) => { s.pages[p[0]] = p; };
  for (const [fold, i] of Object.entries(build.forms)) {
    const s = get(shardPrefix(fold));
    const p = build.pages[i]!;
    s.forms[fold] = p[0];
    add(s, p);
  }
  for (const [fold, i] of Object.entries(build.stemForms)) {
    const s = get(shardPrefix(fold));
    if (i < 0) s.stemForms[fold] = null;
    else { const p = build.pages[i]!; s.stemForms[fold] = p[0]; add(s, p); }
  }
  return out;
}
