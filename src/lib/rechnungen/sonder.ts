/**
 * Sonderrechnung: eine Leistung aus dem Katalog (Mahngebühr, Wohnungsübergabe, Stunden,
 * zusätzliche Eigentümerversammlung) an den Auftraggeber eines Objekts. Reiner Code.
 */
import type { Einstellungen, Leistung, Objekt, Position } from "../domain/schema";
import { datum as datumFmt } from "../format";
import { rundeGeld } from "../geld";
import { einheitText } from "../preise/kalkulation";
import { empfaengerAusObjekt, entwurfBauen, objektAnschrift, ustSatzFuer, type RechnungsEntwurf } from "./entwurf";

export interface SonderrechnungEingabe {
  objekt: Objekt;
  leistung: Leistung;
  menge: number;
  /** Freitext zur Position, z. B. "Wohnungsübergabe Whg 3 am 12.08.2026". */
  text: string;
  /** Rechnungsdatum */
  datum: string;
  /** Tag der Leistung (§ 14 Abs. 4 Nr. 6 UStG); Standard: Rechnungsdatum. */
  leistungsdatum?: string;
  einstellungen: Einstellungen;
}

export function sonderPosition(leistung: Leistung, menge: number, text: string, ustSatz: number): Position {
  return {
    pos: 1,
    leistungCode: leistung.code,
    bezeichnung: leistung.bezeichnung,
    beschreibung: text.trim() || leistung.beschreibung,
    menge,
    einheit: einheitText(leistung.einheit),
    einzelpreisNetto: leistung.preisNetto,
    gesamtNetto: rundeGeld(menge * leistung.preisNetto),
    ustSatz,
  };
}

export function sonderrechnung(e: SonderrechnungEingabe): RechnungsEntwurf {
  if (!(e.menge > 0)) throw new Error("Die Menge muss größer als 0 sein.");
  const firma = e.einstellungen.firma;
  const leistungsdatum = e.leistungsdatum ?? e.datum;
  const position = sonderPosition(e.leistung, e.menge, e.text, ustSatzFuer(firma));
  return entwurfBauen({
    art: "sonderleistung",
    datum: e.datum,
    firma,
    objekt: e.objekt,
    empfaenger: empfaengerAusObjekt(e.objekt),
    betreff: `${e.leistung.bezeichnung}, ${e.objekt.kurzname}`,
    einleitung: `Für das Objekt ${e.objekt.kurzname}, ${objektAnschrift(e.objekt)}, berechnen wir folgende Sonderleistung vom ${datumFmt(leistungsdatum)}:`,
    positionen: [position],
    leistungVon: leistungsdatum,
    leistungBis: leistungsdatum,
  });
}
