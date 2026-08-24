/**
 * Offene Posten und Zahlungsvorschlag. Verbindlichkeiten sind freigegebene oder gebuchte
 * Belege ohne Zahlungsdatum, Forderungen sind gestellte Rechnungen ohne Zahlungseingang.
 * Reiner Code; die Seite liefert die Tabellen.
 */
import type { Bankkonto, Beleg, Dokument, Firma, Objekt, Rechnung } from "../domain/schema";
import { ibanNormalisiert } from "../format";
import { ibanGueltig } from "../iban";
import { summe } from "../geld";

export interface OffenerPosten {
  art: "verbindlichkeit" | "forderung";
  /** Beleg- bzw. Rechnungs-ID */
  id: string;
  /** Dokument des Belegs (nur Verbindlichkeiten), für den Sprung in die Belegansicht. */
  dokumentId: string | null;
  nummer: string;
  name: string;
  datum: string | null;
  faelligAm: string | null;
  betrag: number;
  objektId: string | null;
  objekt: string;
  ueberfaellig: boolean;
  tageUeberfaellig: number;
  iban: string;
  bic: string;
  zahlungsart: Beleg["zahlungsart"];
  kundennummerBeimLieferanten: string;
}

/** Tage von a bis b (positiv, wenn b nach a liegt). */
export function tageZwischen(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const OFFENE_STATUS = new Set<Dokument["status"]>(["freigegeben", "gebucht"]);

export function offeneVerbindlichkeiten(belege: Beleg[], dokumente: Dokument[], objekte: Objekt[], heute: string): OffenerPosten[] {
  const status = new Map(dokumente.map((d) => [d.id, d.status]));
  const objektName = new Map(objekte.map((o) => [o.id, o.kurzname]));
  return belege
    .filter((b) => OFFENE_STATUS.has(status.get(b.dokumentId) ?? "neu"))
    .filter((b) => b.art === "rechnung" && !b.bezahltAm && b.zahlungsart !== "bereits_bezahlt" && b.bruttoGesamt > 0)
    .map((b) => {
      const tage = b.faelligAm ? tageZwischen(b.faelligAm, heute) : 0;
      return {
        art: "verbindlichkeit" as const,
        id: b.id,
        dokumentId: b.dokumentId,
        nummer: b.rechnungsnummer,
        name: b.lieferant.name,
        datum: b.rechnungsdatum,
        faelligAm: b.faelligAm,
        betrag: b.bruttoGesamt,
        objektId: b.objektId,
        objekt: b.objektId ? objektName.get(b.objektId) ?? b.objektId : "",
        ueberfaellig: tage > 0,
        tageUeberfaellig: Math.max(0, tage),
        iban: ibanNormalisiert(b.lieferant.iban),
        bic: b.lieferant.bic.replace(/\s+/g, "").toUpperCase(),
        zahlungsart: b.zahlungsart,
        kundennummerBeimLieferanten: b.lieferant.kundennummerBeimLieferanten,
      };
    })
    .sort(nachFaelligkeit);
}

export function offeneForderungen(rechnungen: Rechnung[], objekte: Objekt[], heute: string): OffenerPosten[] {
  const objektName = new Map(objekte.map((o) => [o.id, o.kurzname]));
  return rechnungen
    .filter((r) => r.status === "gestellt" && !r.bezahltAm && r.art !== "gutschrift")
    .map((r) => {
      const tage = tageZwischen(r.faelligAm, heute);
      return {
        art: "forderung" as const,
        id: r.id,
        dokumentId: null,
        nummer: r.nummer,
        name: r.empfaenger.name,
        datum: r.datum,
        faelligAm: r.faelligAm,
        betrag: r.brutto,
        objektId: r.objektId,
        objekt: r.objektId ? objektName.get(r.objektId) ?? r.objektId : "",
        ueberfaellig: tage > 0,
        tageUeberfaellig: Math.max(0, tage),
        iban: "",
        bic: "",
        zahlungsart: "ueberweisung" as const,
        kundennummerBeimLieferanten: r.empfaenger.kundennummer,
      };
    })
    .sort(nachFaelligkeit);
}

function nachFaelligkeit(a: OffenerPosten, b: OffenerPosten): number {
  return (a.faelligAm ?? "9999").localeCompare(b.faelligAm ?? "9999") || a.nummer.localeCompare(b.nummer);
}

export interface Auftraggeberkonto {
  /** null, wenn nur die IBAN der Firma bekannt ist */
  bankkontoId: string | null;
  bezeichnung: string;
  name: string;
  iban: string;
  bic: string;
}

export interface Zahlungsgruppe {
  konto: Auftraggeberkonto;
  posten: OffenerPosten[];
  summe: number;
}

export interface Zahlungsvorschlag {
  gruppen: Zahlungsgruppe[];
  /** Wird vom Lieferanten eingezogen, keine Überweisung nötig. */
  lastschrift: OffenerPosten[];
  /** Ohne gültige IBAN: erst im Beleg nachtragen. */
  ohneIban: OffenerPosten[];
}

/**
 * Welches Konto zahlt? Das Objektkonto (Mietkonto, Gemeinschaftskonto), sonst das Konto der
 * Verwaltung, sonst die IBAN aus den Firmendaten. Je Auftraggeberkonto eine SEPA-Datei.
 */
export function zahlungsvorschlag(verbindlichkeiten: OffenerPosten[], bankkonten: Bankkonto[], objekte: Objekt[], firma: Firma): Zahlungsvorschlag {
  const objekt = new Map(objekte.map((o) => [o.id, o]));
  const verwaltung = bankkonten.find((k) => k.objektId === null && ibanGueltig(k.iban));
  const gruppen = new Map<string, Zahlungsgruppe>();
  const lastschrift: OffenerPosten[] = [];
  const ohneIban: OffenerPosten[] = [];

  for (const p of verbindlichkeiten) {
    if (p.zahlungsart === "lastschrift") {
      lastschrift.push(p);
      continue;
    }
    if (!ibanGueltig(p.iban)) {
      ohneIban.push(p);
      continue;
    }
    const objektkonto = p.objektId ? bankkonten.find((k) => k.objektId === p.objektId && ibanGueltig(k.iban)) : undefined;
    const konto: Auftraggeberkonto = objektkonto
      ? {
          bankkontoId: objektkonto.id,
          bezeichnung: objektkonto.bezeichnung,
          name: objekt.get(p.objektId ?? "")?.auftraggeber.name || firma.name,
          iban: ibanNormalisiert(objektkonto.iban),
          bic: objektkonto.bic,
        }
      : verwaltung
        ? { bankkontoId: verwaltung.id, bezeichnung: verwaltung.bezeichnung, name: firma.name, iban: ibanNormalisiert(verwaltung.iban), bic: verwaltung.bic }
        : { bankkontoId: null, bezeichnung: "Konto laut Firmendaten", name: firma.name, iban: ibanNormalisiert(firma.iban), bic: firma.bic };
    const schluessel = konto.bankkontoId ?? `firma:${konto.iban}`;
    const g = gruppen.get(schluessel) ?? { konto, posten: [], summe: 0 };
    g.posten.push(p);
    g.summe = summe(g.posten.map((x) => x.betrag));
    gruppen.set(schluessel, g);
  }
  return { gruppen: [...gruppen.values()], lastschrift, ohneIban };
}
