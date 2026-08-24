/** Kurztexte für Tabellen und Stempel der Rechnungsseite. Reiner Code. */
import type { Position, Rechnung } from "../domain/schema";
import { betrag, kurz } from "../format";

const mengeFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

/** 25 → "25", 2.5 → "2,5" */
export function mengeText(menge: number): string {
  return mengeFormat.format(menge);
}

/** "WEG-Verwaltung, Grundhonorar 25 × 27,50 · Stellplatz / Garage 20 × 3,50" */
export function positionenKurz(positionen: Position[], maxBezeichnung = 44): string {
  return positionen.map((p) => `${kurz(p.bezeichnung, maxBezeichnung)} ${mengeText(p.menge)} × ${betrag(p.einzelpreisNetto)}`).join(" · ");
}

export const ART_TEXT: Record<Rechnung["art"], string> = {
  honorar: "Honorar",
  sonderleistung: "Sonderleistung",
  aus_angebot: "aus Angebot",
  gutschrift: "Gutschrift",
  weiterberechnung: "Weiterberechnung",
};

export const STATUS_TEXT: Record<Rechnung["status"], { text: string; ton: "rot" | "gruen" | "tinte" | "ocker" }> = {
  entwurf: { text: "Entwurf", ton: "tinte" },
  gestellt: { text: "Gestellt", ton: "ocker" },
  bezahlt: { text: "Bezahlt", ton: "gruen" },
  storniert: { text: "Storniert", ton: "rot" },
};

/** Ist die Rechnung offen und nach dem Stichtag fällig gewesen? */
export function ueberfaellig(r: Rechnung, heute: string): boolean {
  return r.status === "gestellt" && r.faelligAm < heute;
}
