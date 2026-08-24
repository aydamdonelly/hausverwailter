/**
 * Einstieg der PDF-Erzeugung auf dem Server: Fachobjekt und Firmendaten rein, PDF-Bytes raus.
 * Nur in der Node-Runtime verwenden (Route Handler, Skripte, Tests); nie im Browser importieren.
 */
import { renderToBuffer } from "@react-pdf/renderer";
import type { PdfAnfrage } from "./index";
import { schriftenRegistrieren } from "./fonts";
import { AngebotPdf } from "./Angebot";
import { RechnungPdf } from "./Rechnung";
import { MahnungPdf } from "./Mahnung";

export function pdfElement(anfrage: PdfAnfrage) {
  switch (anfrage.art) {
    case "angebot":
      return <AngebotPdf angebot={anfrage.dokument} firma={anfrage.firma} />;
    case "rechnung":
      return <RechnungPdf rechnung={anfrage.dokument} firma={anfrage.firma} />;
    case "mahnung":
      return <MahnungPdf mahnung={anfrage.dokument} firma={anfrage.firma} />;
  }
}

export async function pdfRendern(anfrage: PdfAnfrage): Promise<Buffer> {
  schriftenRegistrieren();
  return renderToBuffer(pdfElement(anfrage));
}
