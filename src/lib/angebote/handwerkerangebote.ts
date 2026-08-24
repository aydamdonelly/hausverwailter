/**
 * Vergleich von Handwerkerangeboten. Die KI legt die gelesenen Daten eines Dokuments vom Typ
 * "handwerkerangebot" als JSON in dokument.notizen ab (hinter der Zusammenfassung). Hier werden
 * sie gelesen, die Summen ergänzt und die Angebote nebeneinander gestellt. Reiner Code.
 */
import { z } from "zod";
import { rundeGeld, summe, ustAusNetto } from "../geld";

export const HandwerkerangebotDaten = z.object({
  anbieterName: z.string().default(""),
  anbieterAdresse: z.string().default(""),
  angebotsnummer: z.string().default(""),
  datum: z.string().nullable().default(null),
  gueltigBis: z.string().nullable().default(null),
  objektId: z.string().default(""),
  objektHinweis: z.string().default(""),
  leistungKurz: z.string().default(""),
  positionen: z
    .array(
      z.object({
        beschreibung: z.string().default(""),
        menge: z.number().nullable().default(null),
        einheit: z.string().default(""),
        einzelpreisNetto: z.number().nullable().default(null),
        netto: z.number().default(0),
        ustSatz: z.number().default(19),
      }),
    )
    .default([]),
  nettoGesamt: z.number().nullable().default(null),
  ustGesamt: z.number().nullable().default(null),
  bruttoGesamt: z.number().nullable().default(null),
  bedingungen: z.array(z.string()).default([]),
  auffaelligkeiten: z.array(z.string()).default([]),
});
export type HandwerkerangebotDaten = z.infer<typeof HandwerkerangebotDaten>;

/** Liest Zusammenfassung und JSON aus den Notizen eines Dokuments. null, wenn kein JSON darin steht. */
export function handwerkerangebotAusNotizen(notizen: string): { zusammenfassung: string; daten: HandwerkerangebotDaten } | null {
  const start = notizen.indexOf("{");
  if (start < 0) return null;
  const ende = notizen.lastIndexOf("}");
  if (ende <= start) return null;
  try {
    const roh: unknown = JSON.parse(notizen.slice(start, ende + 1));
    const daten = HandwerkerangebotDaten.safeParse(roh);
    if (!daten.success) return null;
    return { zusammenfassung: notizen.slice(0, start).trim(), daten: daten.data };
  } catch {
    return null;
  }
}

export interface Vergleichszeile {
  dokumentId: string;
  dateiname: string;
  anbieter: string;
  leistungKurz: string;
  objektHinweis: string;
  objektId: string;
  datum: string | null;
  gueltigBis: string | null;
  netto: number;
  brutto: number;
  anzahlPositionen: number;
  bedingungen: string[];
  auffaelligkeiten: string[];
  /** Günstigstes Angebot nach Brutto (nur bei Betrag > 0). */
  guenstigstes: boolean;
  /** Abweichung zum günstigsten Angebot in Prozent, 0 beim günstigsten. */
  abweichungProzent: number;
}

/** Netto und Brutto aus den gelesenen Daten; fehlende Summen werden aus den Positionen ergänzt. */
export function summenAusDaten(d: HandwerkerangebotDaten): { netto: number; brutto: number } {
  const netto = d.nettoGesamt ?? summe(d.positionen.map((p) => p.netto));
  const ust = d.ustGesamt ?? (d.positionen.length ? summe(d.positionen.map((p) => ustAusNetto(p.netto, p.ustSatz))) : ustAusNetto(netto, 19));
  const brutto = d.bruttoGesamt ?? summe([netto, ust]);
  return { netto: rundeGeld(netto), brutto: rundeGeld(brutto) };
}

/** Stellt die Angebote nebeneinander, markiert das günstigste und berechnet die Abweichung. Reihenfolge: nach Brutto aufsteigend. */
export function vergleicheHandwerkerangebote(eintraege: { dokumentId: string; dateiname: string; notizen: string }[]): Vergleichszeile[] {
  const zeilen: Vergleichszeile[] = [];
  for (const e of eintraege) {
    const gelesen = handwerkerangebotAusNotizen(e.notizen);
    if (!gelesen) continue;
    const d = gelesen.daten;
    const { netto, brutto } = summenAusDaten(d);
    zeilen.push({
      dokumentId: e.dokumentId,
      dateiname: e.dateiname,
      anbieter: d.anbieterName || e.dateiname,
      leistungKurz: d.leistungKurz || gelesen.zusammenfassung,
      objektHinweis: d.objektHinweis,
      objektId: d.objektId,
      datum: d.datum,
      gueltigBis: d.gueltigBis,
      netto,
      brutto,
      anzahlPositionen: d.positionen.length,
      bedingungen: d.bedingungen,
      auffaelligkeiten: d.auffaelligkeiten,
      guenstigstes: false,
      abweichungProzent: 0,
    });
  }
  const mitBetrag = zeilen.filter((z) => z.brutto > 0);
  const min = mitBetrag.length ? Math.min(...mitBetrag.map((z) => z.brutto)) : 0;
  for (const z of zeilen) {
    z.guenstigstes = z.brutto > 0 && z.brutto === min;
    z.abweichungProzent = z.brutto > 0 && min > 0 ? Math.round(((z.brutto - min) / min) * 1000) / 10 : 0;
  }
  return zeilen.sort((a, b) => (a.brutto || Number.MAX_SAFE_INTEGER) - (b.brutto || Number.MAX_SAFE_INTEGER));
}
