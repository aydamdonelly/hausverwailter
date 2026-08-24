/**
 * Der Honorarlauf: ein Monat, alle aktiven Objekte, je Objekt ein Rechnungsentwurf.
 * Hausverwaltung: Grundhonorar aus dem Leistungskatalog (Einheiten × Satz, Gewerbezuschlag,
 * Stellplätze, Staffel, Mindesthonorar) oder die vertragliche Pauschale des Objekts.
 * Dienstleister: die Monatspauschalen der aktiven Grundleistungen.
 * Reiner Code; die Nummern vergibt erst speichern.ts.
 */
import type { Einstellungen, Leistung, Objekt, Position, Rechnung } from "../domain/schema";
import { monatName, monatsGrenzen } from "../format";
import { rundeGeld } from "../geld";
import { einheitText, kalkuliereGrundhonorar } from "../preise/kalkulation";
import { empfaengerAusObjekt, entwurfBauen, objektAnschrift, ustSatzFuer, type RechnungsEntwurf } from "./entwurf";

export interface HonorarlaufEingabe {
  /** YYYY-MM */
  monat: string;
  objekte: Objekt[];
  leistungen: Leistung[];
  einstellungen: Einstellungen;
  /** Rechnungsdatum (YYYY-MM-DD) */
  datum: string;
  /** Alle vorhandenen Rechnungen, um einen doppelten Lauf zu erkennen. */
  vorhandene?: Rechnung[];
}

export type HonorarGrund = "" | "bereits_abgerechnet" | "keine_positionen";

export interface HonorarZeile {
  objekt: Objekt;
  /** null, wenn es nichts abzurechnen gibt (kein passender Katalogeintrag). */
  entwurf: RechnungsEntwurf | null;
  /** Die schon vorhandene Honorarrechnung für diesen Monat, falls es eine gibt. */
  vorhanden: Rechnung | null;
  grund: HonorarGrund;
}

export interface HonorarlaufErgebnis {
  monat: string;
  zeilen: HonorarZeile[];
  /** Die Entwürfe, die der Lauf tatsächlich anlegen würde. */
  zuErzeugen: RechnungsEntwurf[];
  netto: number;
  ust: number;
  brutto: number;
}

/** Gibt es für Objekt und Monat schon eine nicht stornierte Honorarrechnung? */
export function bereitsAbgerechnet(objektId: string, monat: string, rechnungen: Rechnung[]): Rechnung | null {
  return (
    rechnungen.find((r) => r.art === "honorar" && r.objektId === objektId && r.status !== "storniert" && (r.leistungVon ?? "").slice(0, 7) === monat) ??
    null
  );
}

/** Die Positionen eines Objekts für einen Monat: Pauschale, Katalogkalkulation oder Dienstleister-Pauschalen. */
export function honorarPositionen(objekt: Objekt, leistungen: Leistung[], einstellungen: Einstellungen): Position[] {
  const firma = einstellungen.firma;
  const ustSatz = ustSatzFuer(firma);
  const dienstleister = firma.branche === "dienstleister";

  if (objekt.honorarNettoMonat !== null) {
    const preis = rundeGeld(objekt.honorarNettoMonat);
    return [
      {
        pos: 1,
        leistungCode: "",
        bezeichnung: dienstleister ? "Monatspauschale laut Vertrag" : "Verwaltungshonorar, Pauschale laut Vertrag",
        beschreibung: "",
        menge: 1,
        einheit: einheitText("pauschal_monat"),
        einzelpreisNetto: preis,
        gesamtNetto: preis,
        ustSatz,
      },
    ];
  }

  const objektdaten = { art: objekt.art, einheitenWohnen: objekt.einheitenWohnen, einheitenGewerbe: objekt.einheitenGewerbe, stellplaetze: objekt.stellplaetze };
  if (dienstleister) {
    // Zugeordnete Leistungen des Objekts (Stammdaten); ohne Zuordnung alle aktiven monatlichen Grundleistungen.
    const codes = (objekt.leistungCodes ?? []).length
      ? (objekt.leistungCodes ?? []).filter((c) => leistungen.some((l) => l.code === c && l.aktiv))
      : leistungen
          .filter((l) => l.aktiv && l.kategorie === "grundleistung" && (l.einheit === "pauschal_monat" || l.einheit === "einheit_monat"))
          .map((l) => l.code);
    if (!codes.length) return [];
    return kalkuliereGrundhonorar(objektdaten, leistungen, [], 0, codes, ustSatz).positionen;
  }
  return kalkuliereGrundhonorar(objektdaten, leistungen, einstellungen.staffel, einstellungen.mindesthonorarMonat, undefined, ustSatz).positionen;
}

export function honorarEntwurf(objekt: Objekt, e: HonorarlaufEingabe): RechnungsEntwurf | null {
  const positionen = honorarPositionen(objekt, e.leistungen, e.einstellungen);
  if (!positionen.length) return null;
  const firma = e.einstellungen.firma;
  const { von, bis } = monatsGrenzen(e.monat);
  const monat = monatName(e.monat);
  const dienstleister = firma.branche === "dienstleister";
  const pauschale = objekt.honorarNettoMonat !== null;
  const betreff = `${dienstleister ? "Leistungen" : "Verwaltungshonorar"} ${monat}, ${objekt.kurzname}`;
  const einleitung = dienstleister
    ? `Für unsere Leistungen im Objekt ${objekt.kurzname}, ${objektAnschrift(objekt)}, berechnen wir für ${monat}${pauschale ? " vereinbarungsgemäß" : ""}:`
    : `Für die Verwaltung des Objekts ${objekt.kurzname}, ${objektAnschrift(objekt)}, berechnen wir für ${monat}${pauschale ? " vereinbarungsgemäß" : ""}:`;
  return entwurfBauen({
    art: "honorar",
    datum: e.datum,
    firma,
    objekt,
    empfaenger: empfaengerAusObjekt(objekt),
    betreff,
    einleitung,
    positionen,
    leistungVon: von,
    leistungBis: bis,
  });
}

/** Der ganze Lauf: eine Zeile je aktivem Objekt, schon abgerechnete Objekte werden übersprungen. */
export function honorarlauf(e: HonorarlaufEingabe): HonorarlaufErgebnis {
  const vorhandene = e.vorhandene ?? [];
  const zeilen: HonorarZeile[] = e.objekte
    .filter((o) => o.aktiv)
    .sort((a, b) => a.kurzname.localeCompare(b.kurzname, "de"))
    .map((objekt) => {
      const vorhanden = bereitsAbgerechnet(objekt.id, e.monat, vorhandene);
      const entwurf = honorarEntwurf(objekt, e);
      const grund: HonorarGrund = vorhanden ? "bereits_abgerechnet" : entwurf ? "" : "keine_positionen";
      return { objekt, entwurf, vorhanden, grund };
    });
  const zuErzeugen = zeilen.filter((z) => z.grund === "" && z.entwurf).map((z) => z.entwurf!);
  const cent = (n: number) => Math.round(n * 100);
  const netto = zuErzeugen.reduce((s, r) => s + cent(r.netto), 0) / 100;
  const ust = zuErzeugen.reduce((s, r) => s + cent(r.ust), 0) / 100;
  const brutto = zuErzeugen.reduce((s, r) => s + cent(r.brutto), 0) / 100;
  return { monat: e.monat, zeilen, zuErzeugen, netto, ust, brutto };
}
