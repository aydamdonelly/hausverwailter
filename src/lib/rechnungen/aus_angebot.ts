/**
 * Die erste Rechnung zu einem angenommenen Angebot: bei monatlichem Turnus für den ersten
 * Monat, sonst einmalig. Übernimmt Empfänger und Positionen des Angebots. Reiner Code.
 */
import type { Angebot, Einstellungen, Objekt, Position } from "../domain/schema";
import { datum as datumFmt, monatName, monatsGrenzen, monatVon } from "../format";
import { rundeGeld } from "../geld";
import { entwurfBauen, ustSatzFuer, type RechnungsEntwurf } from "./entwurf";

export interface AusAngebotEingabe {
  /** Das verwaltete Objekt, falls es schon angelegt ist (für Kostenstelle und Zahlungsweise). */
  objekt?: Objekt | null;
  /** Rechnungsdatum */
  datum: string;
  /** Erster Abrechnungsmonat (YYYY-MM) bei monatlichem Turnus; Standard: Monat des Rechnungsdatums. */
  monat?: string;
  /** Leistungstag bei einmaligen Leistungen; Standard: Rechnungsdatum. */
  leistungsdatum?: string;
  einstellungen: Einstellungen;
}

/** Die Positionen des Angebots, Rabatt als eigene Zeile, Steuersatz nach Firma (Kleinunternehmer: 0). */
export function positionenAusAngebot(angebot: Angebot, ustSatz: number): Position[] {
  const positionen: Position[] = angebot.positionen.map((p, i) => ({ ...p, pos: i + 1, ustSatz }));
  const rabattSchonDrin = positionen.some((p) => p.gesamtNetto < 0);
  if (angebot.rabattBetrag > 0 && !rabattSchonDrin) {
    positionen.push({
      pos: positionen.length + 1,
      leistungCode: "",
      bezeichnung: angebot.rabattProzent > 0 ? `Rabatt ${angebot.rabattProzent} % laut Angebot` : "Rabatt laut Angebot",
      beschreibung: "",
      menge: 1,
      einheit: "pauschal",
      einzelpreisNetto: -rundeGeld(angebot.rabattBetrag),
      gesamtNetto: -rundeGeld(angebot.rabattBetrag),
      ustSatz,
    });
  }
  return positionen;
}

export function angebotsObjektText(angebot: Angebot): string {
  const o = angebot.objekt;
  return [o.strasse, [o.plz, o.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function rechnungAusAngebot(angebot: Angebot, e: AusAngebotEingabe): RechnungsEntwurf {
  const firma = e.einstellungen.firma;
  const positionen = positionenAusAngebot(angebot, ustSatzFuer(firma));
  if (!positionen.length) throw new Error("Das Angebot hat keine Positionen.");
  const objektText = e.objekt?.kurzname || angebotsObjektText(angebot) || "das Objekt";
  const dienstleister = firma.branche === "dienstleister";
  const bezug = `Angebot ${angebot.nummer} vom ${datumFmt(angebot.datum)}`;

  if (angebot.turnus === "monatlich") {
    const monat = e.monat ?? monatVon(e.datum);
    const { von, bis } = monatsGrenzen(monat);
    return entwurfBauen({
      art: "aus_angebot",
      datum: e.datum,
      firma,
      objekt: e.objekt ?? null,
      empfaenger: angebot.empfaenger,
      betreff: `${dienstleister ? "Leistungen" : "Verwaltungshonorar"} ${monatName(monat)}, ${objektText}`,
      einleitung: `Gemäß unserem ${bezug} berechnen wir für ${monatName(monat)}:`,
      positionen,
      leistungVon: von,
      leistungBis: bis,
      angebotId: angebot.id,
    });
  }

  const leistungsdatum = e.leistungsdatum ?? e.datum;
  return entwurfBauen({
    art: "aus_angebot",
    datum: e.datum,
    firma,
    objekt: e.objekt ?? null,
    empfaenger: angebot.empfaenger,
    betreff: `${angebot.betreff || "Leistungen"}, ${objektText}`,
    einleitung: `Gemäß unserem ${bezug} berechnen wir die am ${datumFmt(leistungsdatum)} erbrachten Leistungen:`,
    positionen,
    leistungVon: leistungsdatum,
    leistungBis: leistungsdatum,
    angebotId: angebot.id,
  });
}
