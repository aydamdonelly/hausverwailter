/**
 * Die Preislogik für Grundhonorare, gemeinsam für Angebote und den Honorarlauf.
 * Reiner Code: Leistungskatalog + Objektdaten + Staffel + Mindesthonorar → Positionen.
 */
import type { Leistung, Position } from "../domain/schema";
import { rundeGeld, summe } from "../geld";

export interface Objektdaten {
  art: "WEG" | "MIET" | "GEWERBE" | "SONSTIG" | "UNKLAR";
  einheitenWohnen: number;
  einheitenGewerbe: number;
  stellplaetze: number;
}

export interface Staffelstufe {
  abEinheiten: number;
  rabattProzent: number;
}

export interface Kalkulation {
  positionen: Position[];
  einheiten: number;
  rabattProzent: number;
  rabattBetrag: number;
  nettoVorRabatt: number;
  netto: number;
  mindesthonorarAngewendet: boolean;
}

const EINHEIT_TEXT: Record<Leistung["einheit"], string> = {
  einheit_monat: "Einheit/Monat",
  stellplatz_monat: "Stellplatz/Monat",
  pauschal_monat: "pauschal/Monat",
  qm_monat: "m²/Monat",
  stunde: "Stunde",
  stueck: "Stück",
  pauschal: "pauschal",
};

export function einheitText(einheit: Leistung["einheit"]): string {
  return EINHEIT_TEXT[einheit];
}

/** Menge einer Leistung für ein Objekt, abgeleitet aus der Abrechnungseinheit. */
export function mengeFuer(leistung: Leistung, o: Objektdaten): number {
  switch (leistung.einheit) {
    case "einheit_monat":
      return o.einheitenWohnen + o.einheitenGewerbe;
    case "stellplatz_monat":
      return o.stellplaetze;
    default:
      return 1;
  }
}

function grundleistungFuer(art: Objektdaten["art"], leistungen: Leistung[]): Leistung | undefined {
  const gilt = art === "UNKLAR" || art === "SONSTIG" ? "WEG" : art === "GEWERBE" ? "MIET" : art;
  return (
    leistungen.find((l) => l.aktiv && l.kategorie === "grundleistung" && l.einheit === "einheit_monat" && l.gilt === gilt) ??
    leistungen.find((l) => l.aktiv && l.kategorie === "grundleistung" && l.einheit === "einheit_monat" && l.gilt === "ALLE")
  );
}

/**
 * Berechnet die monatlichen Grundhonorar-Positionen.
 * Ohne `codes`: Grundleistung nach Verwaltungsart + Gewerbezuschlag + Stellplätze (Hausverwaltung).
 * Mit `codes`: genau diese Leistungen aus dem Katalog (z. B. Dienstleister: Reinigung + Winterdienst).
 */
export function kalkuliereGrundhonorar(
  o: Objektdaten,
  leistungen: Leistung[],
  staffel: Staffelstufe[] = [],
  mindesthonorar = 0,
  codes?: string[],
  ustSatz = 19,
): Kalkulation {
  const gewaehlt: Leistung[] = [];
  if (codes && codes.length) {
    for (const c of codes) {
      const l = leistungen.find((x) => x.code === c && x.aktiv);
      if (l) gewaehlt.push(l);
    }
  } else {
    const grund = grundleistungFuer(o.art, leistungen);
    if (grund) gewaehlt.push(grund);
    if (o.einheitenGewerbe > 0) {
      const z = leistungen.find((l) => l.aktiv && l.code === "GEWERBE_ZUSCHLAG");
      if (z) gewaehlt.push(z);
    }
    if (o.stellplaetze > 0) {
      const s = leistungen.find((l) => l.aktiv && l.einheit === "stellplatz_monat");
      if (s) gewaehlt.push(s);
    }
  }

  const positionen: Position[] = [];
  let pos = 1;
  for (const l of gewaehlt) {
    const menge = l.code === "GEWERBE_ZUSCHLAG" ? o.einheitenGewerbe : mengeFuer(l, o);
    if (menge <= 0) continue;
    positionen.push({
      pos: pos++,
      leistungCode: l.code,
      bezeichnung: l.bezeichnung,
      beschreibung: l.beschreibung,
      menge,
      einheit: einheitText(l.einheit),
      einzelpreisNetto: l.preisNetto,
      gesamtNetto: rundeGeld(menge * l.preisNetto),
      ustSatz,
    });
  }

  const einheiten = o.einheitenWohnen + o.einheitenGewerbe;
  const nettoVorRabatt = summe(positionen.map((p) => p.gesamtNetto));
  const stufe = [...staffel].filter((s) => einheiten >= s.abEinheiten).sort((a, b) => b.rabattProzent - a.rabattProzent)[0];
  const rabattProzent = stufe?.rabattProzent ?? 0;
  let rabattBetrag = rundeGeld((nettoVorRabatt * rabattProzent) / 100);
  if (rabattBetrag > 0) {
    positionen.push({
      pos: pos++,
      leistungCode: "",
      bezeichnung: `Mengenrabatt ${rabattProzent} % ab ${stufe.abEinheiten} Einheiten`,
      beschreibung: "",
      menge: 1,
      einheit: "pauschal",
      einzelpreisNetto: -rabattBetrag,
      gesamtNetto: -rabattBetrag,
      ustSatz,
    });
  }
  let netto = summe([nettoVorRabatt, -rabattBetrag]);
  let mindesthonorarAngewendet = false;
  if (mindesthonorar > 0 && netto < mindesthonorar && positionen.length) {
    const differenz = rundeGeld(mindesthonorar - netto);
    positionen.push({
      pos: pos++,
      leistungCode: "",
      bezeichnung: "Anpassung auf Mindesthonorar",
      beschreibung: `Das monatliche Mindesthonorar beträgt ${mindesthonorar.toFixed(2).replace(".", ",")} € netto.`,
      menge: 1,
      einheit: "pauschal",
      einzelpreisNetto: differenz,
      gesamtNetto: differenz,
      ustSatz,
    });
    netto = mindesthonorar;
    rabattBetrag = rundeGeld(rabattBetrag);
    mindesthonorarAngewendet = true;
  }
  return { positionen, einheiten, rabattProzent, rabattBetrag, nettoVorRabatt, netto, mindesthonorarAngewendet };
}
