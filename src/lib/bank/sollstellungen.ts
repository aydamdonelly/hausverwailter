/**
 * Soll/Ist je Person und Monat. Die Sollstellung wird berechnet, nicht gespeichert: Soll aus
 * den Stammdaten der Person (Kaltmiete + Nebenkosten bzw. Hausgeld), Ist aus den zugeordneten
 * Umsätzen (Art mieteingang/hausgeld, gleicher Monat). Teilzahlungen werden summiert,
 * Überzahlungen und Doppelzahlungen ausgewiesen.
 */
import type { Bankumsatz, Person, Sollstellung } from "../domain/schema";
import { rundeGeld, summe } from "../geld";
import { monatsGrenzen } from "../format";
import { sollBetrag } from "./abgleich";

export { sollBetrag };

/** Gilt die Person (Mietverhältnis/Eigentum) in diesem Monat? */
export function personAktivImMonat(p: Person, monat: string): boolean {
  const { von, bis } = monatsGrenzen(monat);
  if (p.seit && p.seit > bis) return false;
  if (p.bis && p.bis < von) return false;
  return true;
}

export function statusAus(soll: number, ist: number, toleranz: number): Sollstellung["status"] {
  const diff = rundeGeld(soll - ist);
  if (Math.abs(diff) <= toleranz) return "bezahlt";
  if (ist <= 0) return "offen";
  if (diff > 0) return "teilweise";
  return "ueberzahlt";
}

/**
 * Sollstellungen eines Monats für die übergebenen Personen. Umsätze anderer Monate zählen nicht;
 * die Zuordnung (personId + monat) entscheidet, nicht der Buchungstag.
 */
export function sollstellungen(personen: Person[], umsaetze: Bankumsatz[], monat: string, toleranz: number): Sollstellung[] {
  const proPerson = new Map<string, Bankumsatz[]>();
  for (const u of umsaetze) {
    const z = u.zuordnung;
    if (!z.personId || z.monat !== monat) continue;
    if (z.art !== "mieteingang" && z.art !== "hausgeld") continue;
    const liste = proPerson.get(z.personId) ?? [];
    liste.push(u);
    proPerson.set(z.personId, liste);
  }
  const ergebnis: Sollstellung[] = [];
  for (const p of personen) {
    if (!p.aktiv && !proPerson.has(p.id)) continue;
    if (!personAktivImMonat(p, monat) && !proPerson.has(p.id)) continue;
    const soll = sollBetrag(p);
    const eingaenge = proPerson.get(p.id) ?? [];
    if (soll <= 0 && !eingaenge.length) continue;
    const ist = summe(eingaenge.map((u) => u.betrag));
    ergebnis.push({
      personId: p.id,
      objektId: p.objektId,
      monat,
      soll,
      ist,
      differenz: rundeGeld(soll - ist),
      status: statusAus(soll, ist, toleranz),
      umsatzIds: eingaenge.map((u) => u.id),
    });
  }
  return ergebnis;
}

/** Alle Monate von `von` bis `bis` (YYYY-MM, einschließlich). */
export function monateZwischen(von: string, bis: string): string[] {
  const liste: string[] = [];
  let [j, m] = von.split("-").map(Number);
  const [jb, mb] = bis.split("-").map(Number);
  let schutz = 0;
  while ((j < jb || (j === jb && m <= mb)) && schutz++ < 240) {
    liste.push(`${j}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      j++;
    }
  }
  return liste;
}

/** Offene und teilweise bezahlte Sollstellungen über einen Zeitraum, z. B. für Mahnvorschläge. */
export function offeneSollstellungen(personen: Person[], umsaetze: Bankumsatz[], vonMonat: string, bisMonat: string, toleranz: number): Sollstellung[] {
  return monateZwischen(vonMonat, bisMonat).flatMap((monat) => sollstellungen(personen, umsaetze, monat, toleranz).filter((s) => s.status === "offen" || s.status === "teilweise"));
}

/** Ist ein Eingang eine Doppelzahlung? (Ist ≈ 2 × Soll oder mehr) */
export function istDoppelzahlung(s: Sollstellung, toleranz: number): boolean {
  return s.soll > 0 && s.ist - s.soll >= s.soll - toleranz;
}
