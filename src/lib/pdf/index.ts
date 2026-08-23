/**
 * Vertrag der PDF-Erzeugung. Die Dokumente werden serverseitig mit @react-pdf/renderer
 * gebaut (Route /api/pdf/[art]); der Browser schickt das Fachobjekt und die Firmendaten
 * und bekommt ein PDF zurück. Implementiert vom Modul "pdf" (siehe docs/ARCHITEKTUR.md).
 */
import type { Angebot, Firma, Mahnung, Rechnung } from "../domain/schema";

export type PdfArt = "angebot" | "rechnung" | "mahnung";

export type PdfAnfrage =
  | { art: "angebot"; dokument: Angebot; firma: Firma }
  | { art: "rechnung"; dokument: Rechnung; firma: Firma }
  | { art: "mahnung"; dokument: Mahnung; firma: Firma };

export function pdfDateiname(anfrage: PdfAnfrage): string {
  const nummer = anfrage.dokument.nummer.replace(/[^A-Za-z0-9-]+/g, "_");
  const art = { angebot: "Angebot", rechnung: "Rechnung", mahnung: anfrage.art === "mahnung" && anfrage.dokument.stufe === 1 ? "Zahlungserinnerung" : "Mahnung" }[anfrage.art];
  return `${art}_${nummer}.pdf`;
}
