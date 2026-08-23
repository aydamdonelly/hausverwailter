import { db } from "./db";
import { Einstellungen, type Nummernkreis } from "../domain/schema";

/**
 * Fortlaufende, lückenlose Nummern (§ 14 Abs. 4 Nr. 4 UStG verlangt Einmaligkeit; lückenlos
 * ist Konvention und beruhigt jeden Prüfer). Format: PREFIX + JAHR + "-" + Zähler, z. B. R-2026-0007.
 * Jahreswechsel setzt den Zähler zurück.
 */
export function formatiereNummer(kreis: Nummernkreis, zaehler: number): string {
  return `${kreis.prefix}${kreis.jahr}-${String(zaehler).padStart(kreis.stellen, "0")}`;
}

export async function naechsteNummer(art: "angebot" | "rechnung" | "mahnung", datumIso: string): Promise<string> {
  return db.transaction("rw", db.einstellungen, async () => {
    const e = Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {});
    const kreis = { ...e.nummernkreise[art] };
    const jahr = Number(datumIso.slice(0, 4));
    if (jahr !== kreis.jahr) {
      kreis.jahr = jahr;
      kreis.zaehler = 0;
    }
    kreis.zaehler += 1;
    e.nummernkreise[art] = kreis;
    await db.einstellungen.put(e);
    return formatiereNummer(kreis, kreis.zaehler);
  });
}
