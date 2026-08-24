/**
 * Sichtprobe und Rauchtest der PDF-Vorlagen: rendert Beispiel-Angebot (mit und ohne Logo),
 * die dreiseitige Beispielrechnung, eine Kleinunternehmer-Rechnung und drei Mahnstufen.
 * Ist PDF_PROBE_ORDNER gesetzt, landen die PDFs dort zum Anschauen:
 *
 *   PDF_PROBE_ORDNER=/pfad/zum/ordner npx vitest run src/lib/pdf/probe.test.ts
 *   pdftoppm -png -r 80 /pfad/zum/ordner/pdf-rechnung.pdf /pfad/zum/ordner/pdf-rechnung
 *
 * (Als eigenständiges tsx-Skript geht das nicht: @react-pdf/hyphenate ist ESM-only, und tsx
 * lädt die .tsx-Vorlagen dieses Projekts als CommonJS.)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { Firma } from "../domain/schema";
import type { PdfAnfrage } from "./index";
import { pdfRendern } from "./rendern";
import { BEISPIEL_PDF_FIRMA, beispielAngebot, beispielMahnung, beispielRechnung } from "./beispiel";

/** Ein kleines PNG (Wortbild aus Rechtecken) als data-URL, um den Logo-Pfad zu prüfen. */
export function probeLogo(): string {
  const breite = 240;
  const hoehe = 56;
  const pixel = Buffer.alloc(breite * hoehe * 4, 0);
  const rechteck = (x0: number, y0: number, b: number, h: number, farbe: [number, number, number]) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + b; x++) {
        const i = (y * breite + x) * 4;
        pixel[i] = farbe[0];
        pixel[i + 1] = farbe[1];
        pixel[i + 2] = farbe[2];
        pixel[i + 3] = 255;
      }
    }
  };
  rechteck(0, 0, 56, 56, [47, 107, 79]);
  rechteck(12, 12, 32, 32, [251, 250, 246]);
  rechteck(72, 14, 160, 10, [21, 32, 27]);
  rechteck(72, 32, 110, 10, [75, 84, 79]);
  const zeilen = Buffer.alloc((breite * 4 + 1) * hoehe);
  for (let y = 0; y < hoehe; y++) {
    zeilen[y * (breite * 4 + 1)] = 0;
    pixel.copy(zeilen, y * (breite * 4 + 1) + 1, y * breite * 4, (y + 1) * breite * 4);
  }
  const crcTabelle = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTabelle[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (typ: string, daten: Buffer) => {
    const laenge = Buffer.alloc(4);
    laenge.writeUInt32BE(daten.length);
    const inhalt = Buffer.concat([Buffer.from(typ, "ascii"), daten]);
    const pruef = Buffer.alloc(4);
    pruef.writeUInt32BE(crc(inhalt));
    return Buffer.concat([laenge, inhalt, pruef]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(zeilen)), chunk("IEND", Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function proben(): { name: string; anfrage: PdfAnfrage }[] {
  const firma = BEISPIEL_PDF_FIRMA;
  const kleinunternehmerin: Firma = {
    ...firma,
    name: "Hausmeisterservice Özdemir",
    zusatz: "",
    kleinunternehmer: true,
    ustIdNr: "",
    registergericht: "",
    handelsregister: "",
    geschaeftsfuehrung: "Ayşe Özdemir",
    branche: "dienstleister",
  };
  const kleineRechnung = beispielRechnung();
  return [
    { name: "pdf-angebot", anfrage: { art: "angebot", dokument: beispielAngebot(), firma } },
    { name: "pdf-angebot-logo", anfrage: { art: "angebot", dokument: beispielAngebot(), firma: { ...firma, logoDataUrl: probeLogo(), farbe: "#2f6b4f" } } },
    { name: "pdf-rechnung", anfrage: { art: "rechnung", dokument: beispielRechnung(), firma } },
    {
      name: "pdf-rechnung-kleinunternehmer",
      anfrage: { art: "rechnung", dokument: { ...kleineRechnung, nummer: "R-2026-0133", positionen: kleineRechnung.positionen.slice(0, 4), steuersaetze: [], ust: 0, brutto: 2169.39, netto: 2169.39 }, firma: kleinunternehmerin },
    },
    { name: "pdf-mahnung-1", anfrage: { art: "mahnung", dokument: beispielMahnung(1), firma } },
    { name: "pdf-mahnung-2", anfrage: { art: "mahnung", dokument: beispielMahnung(2), firma } },
    { name: "pdf-mahnung-3", anfrage: { art: "mahnung", dokument: beispielMahnung(3), firma } },
  ];
}

describe("Sichtprobe", () => {
  const ordner = process.env.PDF_PROBE_ORDNER;
  it("rendert alle Beispiele; mit PDF_PROBE_ORDNER werden sie als Dateien abgelegt", async () => {
    if (ordner) mkdirSync(ordner, { recursive: true });
    for (const p of proben()) {
      const start = Date.now();
      const bytes = await pdfRendern(p.anfrage);
      expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      if (ordner) {
        const ziel = path.join(ordner, `${p.name}.pdf`);
        writeFileSync(ziel, bytes);
        console.log(`${p.name}: ${bytes.length} Bytes, ${Date.now() - start} ms → ${ziel}`);
      }
    }
  }, 60000);
});
