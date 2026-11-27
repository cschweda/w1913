// The characters the self-hosted Inter subset covers: the standard "Latin"
// range. public/fonts/*-latin.woff2 were cut to exactly this with fonttools:
//
//   pyftsubset InterVariable.woff2 --unicodes="<LATIN_RANGE>" \
//     --layout-features='*' --flavor=woff2 --output-file=InterVariable-4.1-latin.woff2
//
// It is also the unicode-range in app/assets/css/main.css. A test checks
// that every character in the edition falls inside it, so a new edition
// cannot silently lose letters to the fallback font.
export const LATIN_RANGE =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

export function inRange(range: string, codePoint: number): boolean {
  return range.split(",").some((part) => {
    const [a, b] = part.replace(/^U\+/, "").split("-");
    const lo = parseInt(a!, 16);
    const hi = b ? parseInt(b, 16) : lo;
    return codePoint >= lo && codePoint <= hi;
  });
}
