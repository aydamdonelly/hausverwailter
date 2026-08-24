/**
 * Mieteingang je Person und Monat: Soll aus den Stammdaten, Ist aus den zugeordneten
 * Bankumsätzen. Das ist das Blatt "Mieteingang" im Excel-Journal; die Bankseite hat ihre
 * eigene, ausführlichere Sicht.
 */
import type { Bankumsatz, Objekt, Person } from "../domain/schema";
import { monatsGrenzen } from "../format";
import { inCent, summe } from "../geld";

export interface MieteingangZeile {
  monat: string;
  objektId: string;
  objekt: string;
  personId: string;
  person: string;
  rolle: Person["rolle"];
  soll: number;
  ist: number;
  differenz: number;
  status: "bezahlt" | "teilweise" | "offen" | "ueberzahlt";
}

const MIETARTEN = new Set(["mieteingang", "hausgeld"]);

/** Monate von..bis (YYYY-MM), aufsteigend. */
export function monateZwischen(von: string, bis: string): string[] {
  const monate: string[] = [];
  let [j, m] = von.slice(0, 7).split("-").map(Number);
  const [jb, mb] = bis.slice(0, 7).split("-").map(Number);
  while (j < jb || (j === jb && m <= mb)) {
    monate.push(`${j}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      j += 1;
    }
  }
  return monate;
}

export function sollProMonat(p: Person): number {
  return summe([p.soll.kalt, p.soll.nebenkosten, p.soll.hausgeld]);
}

function wohntImMonat(p: Person, monat: string): boolean {
  const { von, bis } = monatsGrenzen(monat);
  if (p.seit && p.seit > bis) return false;
  if (p.bis && p.bis < von) return false;
  return true;
}

export function mieteingang(personen: Person[], bankumsaetze: Bankumsatz[], objekte: Objekt[], monate: string[], toleranzEuro = 1): MieteingangZeile[] {
  const objektName = new Map(objekte.map((o) => [o.id, o.kurzname]));
  const eingaenge = new Map<string, number[]>();
  for (const u of bankumsaetze) {
    const z = u.zuordnung;
    if (!z.personId || !MIETARTEN.has(z.art)) continue;
    const monat = z.monat ?? u.buchungstag.slice(0, 7);
    const schluessel = `${z.personId}|${monat}`;
    eingaenge.set(schluessel, [...(eingaenge.get(schluessel) ?? []), u.betrag]);
  }
  const zeilen: MieteingangZeile[] = [];
  for (const monat of monate) {
    for (const p of personen) {
      const soll = sollProMonat(p);
      if (!p.aktiv || soll <= 0 || !wohntImMonat(p, monat)) continue;
      const ist = summe(eingaenge.get(`${p.id}|${monat}`) ?? []);
      const differenz = summe([ist, -soll]);
      const toleranz = inCent(toleranzEuro);
      let status: MieteingangZeile["status"];
      if (inCent(ist) === 0) status = "offen";
      else if (inCent(differenz) > toleranz) status = "ueberzahlt";
      else if (inCent(differenz) >= -toleranz) status = "bezahlt";
      else status = "teilweise";
      zeilen.push({
        monat,
        objektId: p.objektId,
        objekt: objektName.get(p.objektId) ?? p.objektId,
        personId: p.id,
        person: p.name,
        rolle: p.rolle,
        soll,
        ist,
        differenz,
        status,
      });
    }
  }
  return zeilen;
}
