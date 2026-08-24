/**
 * Das Buchungsjournal als flache Zeilen: jede Buchung mit dem, was Menschen und Exporte
 * daneben sehen wollen (Objekt, Kostenart, Partner). Reiner Code ohne Datenbank; die Seite
 * lädt die Tabellen und reicht sie hier hinein.
 */
import type { Bankumsatz, Beleg, Buchung, Kostenart, Objekt, Rechnung } from "../domain/schema";
import { summe } from "../geld";

export interface JournalZeile {
  id: string;
  datum: string;
  belegnummer: string;
  text: string;
  objektId: string | null;
  objekt: string;
  quelle: Buchung["quelle"];
  kostenartCode: string;
  kostenart: string;
  betrkv: string;
  umlagefaehig: boolean | null;
  konto: string;
  gegenkonto: string;
  netto: number;
  ust: number;
  brutto: number;
  ustSatz: number;
  sollHaben: "S" | "H";
  /** Lieferant, Rechnungsempfänger oder Name aus dem Bankumsatz. */
  partner: string;
  exportiertAm: string | null;
  belegId: string | null;
  /** Dokument des Belegs, für den Sprung in die Belegansicht. */
  dokumentId: string | null;
  rechnungId: string | null;
  bankumsatzId: string | null;
}

export interface JournalKontext {
  objekte: Objekt[];
  kostenarten: Kostenart[];
  belege: Beleg[];
  rechnungen: Rechnung[];
  bankumsaetze: Bankumsatz[];
}

export const QUELLE_TEXT: Record<Buchung["quelle"], string> = {
  beleg: "Beleg",
  bank: "Bank",
  rechnung: "Rechnung",
  manuell: "Manuell",
};

/** Buchungen zu Journalzeilen, neueste zuerst (gleiches Datum: zuletzt erstellt zuerst). */
export function journalZeilen(buchungen: Buchung[], k: JournalKontext): JournalZeile[] {
  const objekte = new Map(k.objekte.map((o) => [o.id, o]));
  const kostenarten = new Map(k.kostenarten.map((x) => [x.code, x]));
  const belege = new Map(k.belege.map((b) => [b.id, b]));
  const rechnungen = new Map(k.rechnungen.map((r) => [r.id, r]));
  const umsaetze = new Map(k.bankumsaetze.map((u) => [u.id, u]));

  return [...buchungen]
    .sort((a, b) => (a.datum === b.datum ? b.erstelltAm.localeCompare(a.erstelltAm) : b.datum.localeCompare(a.datum)))
    .map((b) => {
      const kostenart = b.kostenartCode ? kostenarten.get(b.kostenartCode) : undefined;
      const beleg = b.belegId ? belege.get(b.belegId) : undefined;
      const rechnung = b.rechnungId ? rechnungen.get(b.rechnungId) : undefined;
      const umsatz = b.bankumsatzId ? umsaetze.get(b.bankumsatzId) : undefined;
      const partner = beleg?.lieferant.name ?? rechnung?.empfaenger.name ?? umsatz?.name ?? "";
      return {
        id: b.id,
        datum: b.datum,
        belegnummer: b.belegnummer || beleg?.rechnungsnummer || rechnung?.nummer || "",
        text: b.buchungstext,
        objektId: b.objektId,
        objekt: b.objektId ? objekte.get(b.objektId)?.kurzname ?? b.objektId : "",
        quelle: b.quelle,
        kostenartCode: b.kostenartCode ?? "",
        kostenart: kostenart?.bezeichnung ?? (b.kostenartCode ?? ""),
        betrkv: kostenart?.betrkv ?? "",
        umlagefaehig: b.umlagefaehig ?? kostenart?.umlagefaehig ?? null,
        konto: b.konto,
        gegenkonto: b.gegenkonto,
        netto: b.netto,
        ust: b.ust,
        brutto: b.brutto,
        ustSatz: b.ustSatz,
        sollHaben: b.sollHaben,
        partner,
        exportiertAm: b.exportiertAm,
        belegId: b.belegId,
        dokumentId: beleg?.dokumentId ?? null,
        rechnungId: b.rechnungId,
        bankumsatzId: b.bankumsatzId,
      };
    });
}

/**
 * Zeitstempel (UTC) → Kalendertag in der Zeitzone des Nutzers als YYYY-MM-DD. Für "exportiert am"
 * zählt der Tag, an dem der Nutzer geklickt hat, nicht der UTC-Tag.
 */
export function lokalesDatum(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface JournalFilter {
  /** YYYY-MM oder "" für alle */
  monat: string;
  objektId: string;
  quelle: Buchung["quelle"] | "";
  exportiert: "" | "ja" | "nein";
}

export const LEERER_FILTER: JournalFilter = { monat: "", objektId: "", quelle: "", exportiert: "" };

export function filtereJournal(zeilen: JournalZeile[], f: JournalFilter): JournalZeile[] {
  return zeilen.filter((z) => {
    if (f.monat && !z.datum.startsWith(f.monat)) return false;
    if (f.objektId && z.objektId !== f.objektId) return false;
    if (f.quelle && z.quelle !== f.quelle) return false;
    if (f.exportiert === "ja" && !z.exportiertAm) return false;
    if (f.exportiert === "nein" && z.exportiertAm) return false;
    return true;
  });
}

/** Alle Monate, in denen gebucht wurde, neueste zuerst. */
export function monateImJournal(zeilen: JournalZeile[]): string[] {
  return [...new Set(zeilen.map((z) => z.datum.slice(0, 7)))].sort().reverse();
}

export interface Betragssumme {
  netto: number;
  ust: number;
  brutto: number;
}

export interface KostenartSumme extends Betragssumme {
  code: string;
  bezeichnung: string;
  betrkv: string;
  umlagefaehig: boolean | null;
  anzahl: number;
}

export interface KostenartenSummen {
  umlagefaehig: KostenartSumme[];
  nichtUmlagefaehig: KostenartSumme[];
  summeUmlagefaehig: Betragssumme;
  summeNichtUmlagefaehig: Betragssumme;
  gesamt: Betragssumme;
}

export function summeBetraege(zeilen: Betragssumme[]): Betragssumme {
  return {
    netto: summe(zeilen.map((z) => z.netto)),
    ust: summe(zeilen.map((z) => z.ust)),
    brutto: summe(zeilen.map((z) => z.brutto)),
  };
}

/**
 * Summen je Kostenart, getrennt nach umlagefähig und nicht umlagefähig: die Vorarbeit zur
 * Betriebskostenabrechnung. Gezählt wird der Aufwand (Belege, manuelle Buchungen und Bankumsätze
 * mit Kostenart wie Gebühren); Ausgangsrechnungen sind Erlöse, Zahlungen zu Belegen wären doppelt
 * und Mieteingänge sind kein Aufwand, die bleiben alle draußen.
 */
export function summenJeKostenart(zeilen: JournalZeile[]): KostenartenSummen {
  const aufwand = zeilen.filter((z) => z.quelle !== "rechnung" && !(z.quelle === "bank" && (z.belegId || !z.kostenartCode)));
  const gruppen = new Map<string, KostenartSumme>();
  for (const z of aufwand) {
    const schluessel = z.kostenartCode || "";
    const g = gruppen.get(schluessel) ?? {
      code: schluessel,
      bezeichnung: z.kostenartCode ? z.kostenart : "Ohne Kostenart",
      betrkv: z.betrkv,
      umlagefaehig: z.kostenartCode ? z.umlagefaehig : null,
      anzahl: 0,
      netto: 0,
      ust: 0,
      brutto: 0,
    };
    g.anzahl += 1;
    g.netto = summe([g.netto, z.netto]);
    g.ust = summe([g.ust, z.ust]);
    g.brutto = summe([g.brutto, z.brutto]);
    gruppen.set(schluessel, g);
  }
  const alle = [...gruppen.values()].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de"));
  const umlagefaehig = alle.filter((g) => g.umlagefaehig === true);
  const nichtUmlagefaehig = alle.filter((g) => g.umlagefaehig !== true);
  return {
    umlagefaehig,
    nichtUmlagefaehig,
    summeUmlagefaehig: summeBetraege(umlagefaehig),
    summeNichtUmlagefaehig: summeBetraege(nichtUmlagefaehig),
    gesamt: summeBetraege(alle),
  };
}
