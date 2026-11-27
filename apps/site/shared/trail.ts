// The trail's list rule, separate from storage so it can be tested.
import config from "../../../w1913.config.ts";

export interface TrailItem { slug: string; headword: string }

/** Rule: add a word at the end; a revisit moves it there instead of repeating it; keep at most trailMax. */
export function addToTrail(list: readonly TrailItem[], item: TrailItem): TrailItem[] {
  return [...list.filter((x) => x.slug !== item.slug), item].slice(-config.features.trailMax);
}
