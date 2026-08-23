import { apiDatei, herunterladen } from "../api";
import { pdfDateiname, type PdfAnfrage } from "../pdf";

/** Holt das PDF vom Server und speichert es. Wirft ApiFehler mit lesbarer Meldung. */
export async function pdfHerunterladen(anfrage: PdfAnfrage): Promise<void> {
  const blob = await apiDatei(`/api/pdf/${anfrage.art}`, {
    method: "POST",
    body: JSON.stringify({ dokument: anfrage.dokument, firma: anfrage.firma }),
  });
  herunterladen(blob, pdfDateiname(anfrage));
}

/** Holt das PDF und gibt eine Objekt-URL zur Anzeige zurück (Aufrufer räumt mit URL.revokeObjectURL auf). */
export async function pdfVorschau(anfrage: PdfAnfrage): Promise<string> {
  const blob = await apiDatei(`/api/pdf/${anfrage.art}`, {
    method: "POST",
    body: JSON.stringify({ dokument: anfrage.dokument, firma: anfrage.firma }),
  });
  return URL.createObjectURL(blob);
}
