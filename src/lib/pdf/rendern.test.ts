import { describe, expect, it } from "vitest";
import { pdfRendern } from "./rendern";
import { BEISPIEL_PDF_FIRMA, beispielAngebot, beispielMahnung, beispielRechnung } from "./beispiel";
import { pdfDateiname } from "./index";

/** Seiten zählen: jedes Seitenobjekt trägt "/Type /Page" (das Verzeichnis "/Type /Pages" nicht mitzählen). */
function seiten(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s])/g) ?? []).length;
}

const firma = BEISPIEL_PDF_FIRMA;

describe("PDF-Erzeugung", () => {
  it("rendert das Angebot als PDF mit eingebetteten Schriften", async () => {
    const pdf = await pdfRendern({ art: "angebot", dokument: beispielAngebot(), firma });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(seiten(pdf)).toBeGreaterThanOrEqual(2);
    const text = pdf.toString("latin1");
    expect(text).toMatch(/Vollkorn/);
    expect(text).toMatch(/SourceSans3/);
  }, 30000);

  it("rendert die Beispielrechnung mit zwei Steuersätzen auf drei Seiten", async () => {
    const pdf = await pdfRendern({ art: "rechnung", dokument: beispielRechnung(), firma });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(seiten(pdf)).toBe(3);
  }, 30000);

  it("rendert alle drei Mahnstufen einseitig", async () => {
    for (const stufe of [1, 2, 3] as const) {
      const pdf = await pdfRendern({ art: "mahnung", dokument: beispielMahnung(stufe), firma });
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(seiten(pdf)).toBe(1);
    }
  }, 30000);

  it("kommt mit einer fast leeren Firma und einem SVG-Logo zurecht (Wortmarke statt Bild)", async () => {
    const leer = { ...firma, zusatz: "", telefon: "", email: "", web: "", geschaeftsfuehrung: "", registergericht: "", handelsregister: "", steuernummer: "", ustIdNr: "", iban: "", bic: "", bankname: "", glaeubigerId: "", farbe: "nicht-hex", logoDataUrl: "data:image/svg+xml;base64,PHN2Zy8+" };
    const pdf = await pdfRendern({ art: "rechnung", dokument: beispielRechnung(), firma: leer });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30000);

  it("bildet Dateinamen ohne Sonderzeichen", () => {
    expect(pdfDateiname({ art: "rechnung", dokument: beispielRechnung(), firma })).toBe("Rechnung_R-2026-0132.pdf");
    expect(pdfDateiname({ art: "mahnung", dokument: beispielMahnung(1), firma })).toBe("Zahlungserinnerung_M-2026-0008.pdf");
    expect(pdfDateiname({ art: "mahnung", dokument: beispielMahnung(3), firma })).toBe("Mahnung_M-2026-0010.pdf");
  });
});
