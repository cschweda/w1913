// The answer key for quotations (DESIGN.md §2, evaluation step 3): what the
// tagged v0.50 markup says is a quotation, its author, or an authority.
// Development only; never a data source.
import { stripTags } from "./tagged.ts";

export interface KeyQuote { text: string; author: string; kind: "block" | "inline" }
export interface Key { quotes: KeyQuote[]; authorities: string[] }

const clean = (s: string) => stripTags(s).replace(/\s+/g, " ").trim();
const author = (s: string) => clean(s).replace(/\.$/, "");

/**
 * Rules, from the v0.50 legend and the files: a block quotation is
 * <blockquote>…</blockquote> followed by its author in <i>…</i>, or with the
 * author inside it after a final <BR>; an inline quotation is "…" followed by
 * an italic author; an authority is an italic name directly after </def>
 * (labels in brackets allowed between) with no quotation.
 */
export function keyOf(raw: string): Key {
  const quotes: KeyQuote[] = [];
  const authorities: string[] = [];
  for (const m of raw.matchAll(/<blockquote>([\s\S]*?)<\/blockquote>\s*(?:<i>([\s\S]{1,80}?)<\/i>)?/g)) {
    // The author follows the blockquote, or closes it after a <BR>.
    const inside = /^([\s\S]*?)<BR>\s*<i>([^<]{1,80})<\/i>\s*$/i.exec(m[1]!);
    if (inside) quotes.push({ text: clean(inside[1]!), author: author(inside[2]!), kind: "block" });
    else if (m[2]) quotes.push({ text: clean(m[1]!), author: author(m[2]), kind: "block" });
  }
  const outside = raw.replace(/<blockquote>[\s\S]*?<\/blockquote>/g, " ");
  for (const m of outside.matchAll(/(?<=[\s(>])"((?:<i>)?[A-Z][^"]{2,600}?)"\s*<i>([^<]{1,60})<\/i>/g)) {
    if (/\.\s*$/.test(m[2]!)) quotes.push({ text: clean(m[1]!), author: author(m[2]!), kind: "inline" });
  }
  for (const m of outside.matchAll(/<\/def>\s*(?:\[[^\]]{1,40}\]\s*)*<i>([^<]{1,60})<\/i>/g)) {
    const a = author(m[1]!);
    if (/^[A-Z]/.test(a) && !/^(?:pl|imp|p\. ?p|n|a|v|adv)\b/.test(a)) authorities.push(a);
  }
  return { quotes, authorities };
}
