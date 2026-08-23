/**
 * Geldrechnung. Alle Beträge sind Euro mit zwei Nachkommastellen; gerechnet wird in Cent
 * (Integer), damit 0,1 + 0,2 nicht 0,30000000000000004 ergibt.
 */
import type { Position, Steuerzeile } from "./domain/schema";

export function rundeGeld(betrag: number): number {
  return Math.round((betrag + Number.EPSILON) * 100) / 100;
}

export function inCent(betrag: number): number {
  return Math.round((betrag + Number.EPSILON) * 100);
}

export function ausCent(cent: number): number {
  return cent / 100;
}

export function summe(betraege: number[]): number {
  return ausCent(betraege.reduce((acc, b) => acc + inCent(b), 0));
}

/** Umsatzsteuer aus Netto und Satz (in Prozent), kaufmännisch gerundet. */
export function ustAusNetto(netto: number, satz: number): number {
  return ausCent(Math.round(inCent(netto) * (satz / 100)));
}

/** Netto aus Brutto und Satz. */
export function nettoAusBrutto(brutto: number, satz: number): number {
  return ausCent(Math.round(inCent(brutto) / (1 + satz / 100)));
}

/** Gruppiert Positionen nach Steuersatz und liefert Netto/USt je Satz (so, wie § 14 UStG es verlangt). */
export function steuerzeilen(positionen: Pick<Position, "gesamtNetto" | "ustSatz">[]): Steuerzeile[] {
  const proSatz = new Map<number, number>();
  for (const p of positionen) {
    proSatz.set(p.ustSatz, (proSatz.get(p.ustSatz) ?? 0) + inCent(p.gesamtNetto));
  }
  return [...proSatz.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([satz, nettoCent]) => ({
      satz,
      netto: ausCent(nettoCent),
      ust: ausCent(Math.round(nettoCent * (satz / 100))),
    }));
}

export function summen(positionen: Pick<Position, "gesamtNetto" | "ustSatz">[]) {
  const zeilen = steuerzeilen(positionen);
  const netto = summe(zeilen.map((z) => z.netto));
  const ust = summe(zeilen.map((z) => z.ust));
  return { steuersaetze: zeilen, netto, ust, brutto: summe([netto, ust]) };
}

/** Zwei Beträge gelten als gleich, wenn sie sich um höchstens `toleranz` Euro unterscheiden. */
export function gleich(a: number, b: number, toleranz = 0.01): boolean {
  return Math.abs(inCent(a) - inCent(b)) <= inCent(toleranz);
}
