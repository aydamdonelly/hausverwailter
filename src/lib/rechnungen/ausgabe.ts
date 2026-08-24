/**
 * Ausgabe einer Rechnung als PDF (Server, Modul "pdf") oder XRechnung-XML (Modul "export").
 * Fehler werden an die Oberfläche durchgereicht, die sie als Hinweis zeigt.
 */
import type { Rechnung } from "../domain/schema";
import { herunterladen } from "../api";
import { pdfHerunterladen } from "../client/pdf";
import { xrechnungBefunde, xrechnungUbl } from "../xrechnung/ubl";
import { ladeEinstellungen } from "../store/arbeitsbereich";
import { protokolliere } from "../store/protokoll";

export async function rechnungAlsPdf(rechnung: Rechnung): Promise<void> {
  const { firma } = await ladeEinstellungen();
  await pdfHerunterladen({ art: "rechnung", dokument: rechnung, firma });
  await protokolliere("nutzer", "Rechnung als PDF ausgegeben", `rechnung:${rechnung.id}`, { nummer: rechnung.nummer });
}

/**
 * XRechnung (UBL): Käuferreferenz BT-10 ist die Leitweg-ID, sonst die Kundennummer. Dateiname =
 * Rechnungsnummer. Gibt zurück, was einer gültigen XRechnung laut Prüfung noch fehlt (Stammdaten).
 */
export async function rechnungAlsXRechnung(rechnung: Rechnung): Promise<string[]> {
  const { firma } = await ladeEinstellungen();
  const optionen = { kaeuferreferenz: rechnung.empfaenger.leitwegId || rechnung.empfaenger.kundennummer };
  const xml = xrechnungUbl(rechnung, firma, optionen);
  const befunde = xrechnungBefunde(rechnung, firma, optionen);
  herunterladen(new Blob([xml], { type: "application/xml" }), `${rechnung.nummer.replace(/[^A-Za-z0-9-]+/g, "_")}.xml`);
  await protokolliere("nutzer", "XRechnung ausgegeben", `rechnung:${rechnung.id}`, { nummer: rechnung.nummer, befunde: befunde.length });
  return befunde;
}
