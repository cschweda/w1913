// Character audit: every non-ASCII character and how often it occurs.

export interface CharCount {
  char: string;
  codePoint: string;
  count: number;
}

export function nonAsciiChars(lines: readonly string[]): CharCount[] {
  const counts = new Map<string, number>();
  for (const line of lines) for (const ch of line) if (ch.codePointAt(0)! > 0x7f) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()]
    .map(([char, count]) => ({ char, codePoint: `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`, count }))
    .sort((a, b) => b.count - a.count || a.char.localeCompare(b.char));
}
