import { describe, expect, it } from "vitest";
import iconv from "iconv-lite";
import { cp1252Dekodieren, cp1252Kodieren } from "./cp1252";

describe("cp1252", () => {
  it("kodiert Umlaute, ß, Euro und Gedankenstrich wie iconv-lite", () => {
    const text = "Müller & Söhne GmbH – Straße 12, 1.190,00 € „Dach“ ‚x‘ … ™ Œ Ÿ ž";
    const eigen = cp1252Kodieren(text);
    const referenz = new Uint8Array(iconv.encode(text, "win1252"));
    expect([...eigen]).toEqual([...referenz]);
    expect(eigen[1]).toBe(0xfc); // ü
    expect(eigen[eigen.indexOf(0x96)]).toBe(0x96); // – als 0x96
  });

  it("deckt den kompletten Bereich 0x00 bis 0xFF ab", () => {
    // Die fünf unbelegten Positionen (0x81, 0x8D, 0x8F, 0x90, 0x9D) bildet iconv-lite auf U+FFFD ab; sie kommen in Text nicht vor.
    const unbelegt = new Set([0x81, 0x8d, 0x8f, 0x90, 0x9d]);
    const alle: number[] = [];
    for (let b = 0; b < 256; b++) if (!unbelegt.has(b)) alle.push(b);
    const bytes = new Uint8Array(alle);
    const text = iconv.decode(Buffer.from(bytes), "win1252");
    const eigen = cp1252Kodieren(text);
    const referenz = new Uint8Array(iconv.encode(text, "win1252"));
    expect([...eigen]).toEqual([...referenz]);
  });

  it("ersetzt Unkodierbares durch ? und liest sich selbst zurück", () => {
    expect([...cp1252Kodieren("a€b")]).toEqual([0x61, 0x80, 0x62]);
    expect([...cp1252Kodieren("日本")]).toEqual([0x3f, 0x3f]);
    expect(cp1252Dekodieren(cp1252Kodieren("Grüße – „ok“"))).toBe("Grüße – „ok“");
  });
});
