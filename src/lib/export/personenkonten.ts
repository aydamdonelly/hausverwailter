/**
 * Kreditoren- und Debitorenkonten für DATEV.
 *
 * DATEV-Konvention (SKR03/SKR04, Sachkontenlänge 4): Debitoren 10000 bis 69999, Kreditoren
 * 70000 bis 99999; Personenkonten sind immer eine Stelle länger als Sachkonten. Jeder
 * Lieferant bekommt beim ersten Export ein Konto und behält es; die Zuordnung liegt in
 * Einstellungen.datev.kreditoren (normalisierter Name → Konto) bzw. .debitoren
 * (Kundennummer → Konto) und wird vom Aufrufer nach dem Export gespeichert.
 */
import type { Einstellungen } from "../domain/schema";

type DatevEinstellungen = Einstellungen["datev"];

/** Name → Schlüssel: Kleinbuchstaben, ohne Rechtsform-Rauschen, ohne Satzzeichen, einfache Leerzeichen. */
export function kreditorSchluessel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(gmbh|ag|kg|ohg|ug|e k|ek|co|und|and|mbh|haftungsbeschraenkt)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Startnummer an die Sachkontenlänge anpassen: 70000 bei Länge 4, 700000 bei Länge 5 usw. */
export function startFuerLaenge(start: number, sachkontenlaenge: number): number {
  const ziel = sachkontenlaenge + 1;
  const stellen = String(start).length;
  return stellen < ziel ? start * 10 ** (ziel - stellen) : start;
}

function naechsteNummer(zuordnung: Record<string, string>, start: number): number {
  let hoechste = start - 1;
  for (const konto of Object.values(zuordnung)) {
    const n = Number(konto);
    if (Number.isFinite(n) && n > hoechste) hoechste = n;
  }
  return hoechste + 1;
}

export interface Personenkonten {
  /** Konto des Lieferanten; vergibt bei Bedarf das nächste freie. */
  kreditor(name: string): string;
  /** Konto des Kunden; Schlüssel ist die Kundennummer, ersatzweise der Name. */
  debitor(kundennummer: string, name: string): string;
  kreditoren: Record<string, string>;
  debitoren: Record<string, string>;
  neueKreditoren: string[];
  neueDebitoren: string[];
}

export function personenkonten(datev: DatevEinstellungen): Personenkonten {
  const kreditoren = { ...datev.kreditoren };
  const debitoren = { ...datev.debitoren };
  const kreditorStart = startFuerLaenge(datev.kreditorStart, datev.sachkontenlaenge);
  const debitorStart = startFuerLaenge(datev.debitorStart, datev.sachkontenlaenge);
  const neueKreditoren: string[] = [];
  const neueDebitoren: string[] = [];

  return {
    kreditoren,
    debitoren,
    neueKreditoren,
    neueDebitoren,
    kreditor(name) {
      const schluessel = kreditorSchluessel(name) || "unbekannt";
      const vorhanden = kreditoren[schluessel];
      if (vorhanden) return vorhanden;
      const konto = String(naechsteNummer(kreditoren, kreditorStart));
      kreditoren[schluessel] = konto;
      neueKreditoren.push(name.trim() || "Unbekannt");
      return konto;
    },
    debitor(kundennummer, name) {
      const schluessel = kundennummer.trim() || kreditorSchluessel(name) || "unbekannt";
      const vorhanden = debitoren[schluessel];
      if (vorhanden) return vorhanden;
      const konto = String(naechsteNummer(debitoren, debitorStart));
      debitoren[schluessel] = konto;
      neueDebitoren.push(name.trim() || kundennummer);
      return konto;
    },
  };
}
