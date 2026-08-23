/**
 * XRechnung (UBL 2.1, EN 16931) aus einer Rechnung erzeugen.
 * Vertrag: reine Funktion, keine Datenbank, läuft im Browser und auf dem Server.
 * Wird vom Modul "export" implementiert (siehe docs/ARCHITEKTUR.md).
 */
import type { Firma, Rechnung } from "../domain/schema";

export interface XRechnungOptionen {
  /** Käuferreferenz (BT-10). Bei B2B meist die Kundennummer, bei Behörden die Leitweg-ID. */
  kaeuferreferenz?: string;
}

export function xrechnungUbl(rechnung: Rechnung, firma: Firma, optionen: XRechnungOptionen = {}): string {
  void rechnung;
  void firma;
  void optionen;
  throw new Error("XRechnung-Export ist noch nicht implementiert.");
}
