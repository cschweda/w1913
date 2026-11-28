// The suffix stripper lives in packages/lookup (npm: w1913), so the site and every program
// using the lookup build give the same answer (DESIGN.md §4b).
export * from "../../../packages/lookup/src/inflect.ts";
