/**
 * Fälligkeit und Verzugszinsen nach BGB.
 *
 * - Miete ist bis zum dritten Werktag des Monats fällig (§ 556b Abs. 1 BGB); Samstage zählen
 *   dabei nicht als Werktag (BGH VIII ZR 291/09). Feiertage werden hier nicht berücksichtigt
 *   (Hinweis in der Oberfläche). Für Hausgeld gilt der Beschluss, ersatzweise dieselbe Regel.
 * - Verzug tritt ohne Mahnung mit Ablauf des Fälligkeitstags ein (§ 286 Abs. 2 Nr. 1 BGB),
 *   Zinsen laufen ab dem Folgetag (§ 187 Abs. 1 BGB).
 * - Zinssatz: Basiszins + 5 Prozentpunkte gegenüber Verbrauchern (§ 288 Abs. 1 BGB), taggenau
 *   act/act (365 bzw. 366 Tage), kein Zinseszins (§ 289 BGB). Erst am Ende auf Cent runden.
 * Quelle: Recherche nachrecherche-mahnwesen--verzugszins-zeitreihe--zinsmethode--schuldnertyp-gdwe.md.
 */
import { inCent } from "../geld";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(isoDatum: string): Date {
  return new Date(`${isoDatum}T00:00:00Z`);
}

/** n-ter Werktag (Montag bis Freitag) eines Monats (YYYY-MM). */
export function nterWerktag(monat: string, n: number): string {
  const [j, m] = monat.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, 1));
  let gezaehlt = 0;
  for (let i = 0; i < 31; i++) {
    const wochentag = d.getUTCDay();
    if (wochentag !== 0 && wochentag !== 6) {
      gezaehlt++;
      if (gezaehlt === Math.max(1, n)) return iso(d);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return iso(d);
}

/** Fälligkeit einer Monatszahlung: `faelligTag` als n-ter Werktag (Standard 3, § 556b BGB). */
export function faelligkeit(monat: string, faelligTag = 3): string {
  return nterWerktag(monat, faelligTag);
}

/** Erster Zinstag: der Tag nach der Fälligkeit (§ 187 Abs. 1 BGB). */
export function verzugsbeginn(monat: string, faelligTag = 3): string {
  const d = utc(faelligkeit(monat, faelligTag));
  d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

function schaltjahr(j: number): boolean {
  return (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
}

export interface Zinsergebnis {
  /** Zinsen in Euro, kaufmännisch gerundet */
  zinsen: number;
  tage: number;
  /** Zinssatz in Prozent p. a. */
  satz: number;
}

/**
 * Verzugszinsen auf `betrag` vom ersten Zinstag `von` bis `bis` (beide einschließlich) mit
 * `basiszinsProzent` + `aufschlag` Prozentpunkten. Jahreswechsel werden getrennt gerechnet
 * (365/366 Tage). Liegt `bis` vor `von`, gibt es keine Zinsen.
 */
export function verzugszinsen(betrag: number, von: string, bis: string, basiszinsProzent: number, aufschlag = 5): Zinsergebnis {
  const satz = basiszinsProzent + aufschlag;
  if (betrag <= 0 || bis < von) return { zinsen: 0, tage: 0, satz };
  const start = utc(von);
  const ende = utc(bis);
  const cent = inCent(betrag);
  let summe = 0;
  let tageGesamt = 0;
  let aktuell = start;
  while (aktuell <= ende) {
    const jahr = aktuell.getUTCFullYear();
    const jahresende = new Date(Date.UTC(jahr, 11, 31));
    const periodenEnde = jahresende < ende ? jahresende : ende;
    const tage = Math.round((periodenEnde.getTime() - aktuell.getTime()) / 86400000) + 1;
    summe += (cent * (satz / 100) * tage) / (schaltjahr(jahr) ? 366 : 365);
    tageGesamt += tage;
    aktuell = new Date(Date.UTC(jahr + 1, 0, 1));
  }
  return { zinsen: Math.round(summe) / 100, tage: tageGesamt, satz };
}
