// @w1913/lookup: look words up in the 1913 Webster's offline, with the same
// answers as w1913.com. See README.md.
export { createLookup, createShardedLookup, shardPrefix, type Result, type Entry, type Sense } from "./lookup.ts";
export { foldForCompare, slugify } from "./fold.ts";
export { stems, lookupWith } from "./inflect.ts";
export type { LookupBuild, LookupShard, BuildPage, BuildEntry, BuildSense } from "./format.ts";
