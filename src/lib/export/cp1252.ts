/**
 * Windows-1252 (ANSI), der Zeichensatz, den DATEV für Buchungsstapel verlangt.
 *
 * Eigener Kodierer statt iconv-lite im Browser: die Tabelle ist winzig (Latin-1 plus 27
 * Sonderzeichen im Bereich 0x80 bis 0x9F), es gibt keine Abhängigkeit von einem Buffer-Polyfill
 * und das Ergebnis ist deterministisch. Der Test vergleicht gegen iconv-lite.
 */

/** Zeichen 0x80 bis 0x9F; "undefined" für die fünf unbelegten Positionen. */
const OBERER_BLOCK: (number | undefined)[] = [
  0x20ac, undefined, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, undefined, 0x017d, undefined,
  undefined, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, undefined, 0x017e, 0x0178,
];

const CODEPUNKT_ZU_BYTE = new Map<number, number>();
OBERER_BLOCK.forEach((cp, i) => {
  if (cp !== undefined) CODEPUNKT_ZU_BYTE.set(cp, 0x80 + i);
});

const ERSATZ = 0x3f; // "?"

/** Text → Bytes in Windows-1252. Nicht darstellbare Zeichen werden zu "?". */
export function cp1252Kodieren(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  let n = 0;
  for (const zeichen of text) {
    const cp = zeichen.codePointAt(0) ?? ERSATZ;
    if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) bytes[n++] = cp;
    else if (cp >= 0x80 && cp <= 0x9f) bytes[n++] = cp; // unbelegte Steuerzeichen, wie iconv-lite
    else bytes[n++] = CODEPUNKT_ZU_BYTE.get(cp) ?? ERSATZ;
  }
  return bytes.subarray(0, n);
}

/** Bytes in Windows-1252 → Text (für Tests und zum Zurücklesen). */
export function cp1252Dekodieren(bytes: Uint8Array): string {
  let text = "";
  for (const b of bytes) {
    if (b >= 0x80 && b <= 0x9f) text += String.fromCodePoint(OBERER_BLOCK[b - 0x80] ?? b);
    else text += String.fromCodePoint(b);
  }
  return text;
}
