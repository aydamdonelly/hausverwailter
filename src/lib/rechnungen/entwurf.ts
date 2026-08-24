/**
 * Gemeinsame Bausteine aller Ausgangsrechnungen (Honorarlauf, Sonderleistung, aus Angebot):
 * Empfänger aus dem Objekt, Steuersatz, Zahlungstext, Pflichtangaben nach § 14 Abs. 4 UStG.
 * Reiner Code: keine Datenbank, kein React. Die Nummer vergibt erst lib/rechnungen/speichern.ts.
 */
import type { Empfaenger, Firma, Objekt, Position, Rechnung } from "../domain/schema";
import { datum as datumFmt, iban as ibanFmt, plusTage } from "../format";
import { summen } from "../geld";

/** Eine Rechnung, bevor sie gespeichert ist: ohne Id, Nummer und Zeitstempel. */
export type RechnungsEntwurf = Omit<Rechnung, "id" | "nummer" | "erstelltAm">;

/** Pflichttext nach § 34a UStDV, wenn die Firma die Kleinunternehmerregelung nutzt. */
export const KLEINUNTERNEHMER_HINWEIS = "Kein Ausweis von Umsatzsteuer gemäß § 19 UStG (Steuerbefreiung für Kleinunternehmer).";

export function ustSatzFuer(firma: Firma): number {
  return firma.kleinunternehmer ? 0 : firma.ustSatz;
}

/** Rechnungsempfänger aus dem Auftraggeber des Objekts. Eine WEG wird durch die Verwaltung vertreten (§ 9b WEG). */
export function empfaengerAusObjekt(objekt: Objekt): Empfaenger {
  const a = objekt.auftraggeber;
  return {
    name: a.name,
    zusatz: a.zusatz || (objekt.art === "WEG" ? "vertreten durch die Verwaltung" : ""),
    adresse: { ...a.adresse },
    email: a.email,
    kundennummer: a.kundennummer,
    leitwegId: a.leitwegId,
    ustIdNr: "",
  };
}

export function objektAnschrift(objekt: Objekt): string {
  const a = objekt.adresse;
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

/**
 * Wie das Geld kommt. Eine Hausverwaltung, die das Objektkonto führt, entnimmt ihr Honorar
 * dort (so der VDIV-Mustervertrag). Ein Dienstleister mit Gläubiger-ID zieht per Lastschrift
 * ein. Sonst wird überwiesen.
 */
export type Zahlungsweise = "ueberweisung" | "entnahme" | "lastschrift";

export function zahlungsweiseFuer(objekt: Objekt | null, firma: Firma): Zahlungsweise {
  if (!objekt || !objekt.bankIban) return "ueberweisung";
  if (firma.branche === "hausverwaltung") return "entnahme";
  if (firma.glaeubigerId) return "lastschrift";
  return "ueberweisung";
}

export function zahlungstexte(weise: Zahlungsweise, faelligAm: string, objekt: Objekt | null, firma: Firma): { zahlungsbedingung: string; hinweise: string[] } {
  const bis = datumFmt(faelligAm);
  if (weise === "entnahme" && objekt) {
    return {
      zahlungsbedingung: `Der Betrag wird zum ${bis} dem Objektkonto ${ibanFmt(objekt.bankIban)} entnommen. Bitte nicht überweisen.`,
      hinweise: [],
    };
  }
  if (weise === "lastschrift" && objekt) {
    const mandat = objekt.auftraggeber.kundennummer || objekt.id;
    return {
      zahlungsbedingung: `Der Betrag wird zum ${bis} per SEPA-Lastschrift vom Konto ${ibanFmt(objekt.bankIban)} eingezogen.`,
      hinweise: [`Gläubiger-Identifikationsnummer ${firma.glaeubigerId}, Mandatsreferenz ${mandat}.`],
    };
  }
  const konto = firma.iban ? ` auf das Konto ${ibanFmt(firma.iban)}${firma.bankname ? ` (${firma.bankname})` : ""}` : "";
  return { zahlungsbedingung: `Zahlbar ohne Abzug bis zum ${bis}${konto}.`, hinweise: [] };
}

export interface EntwurfEingabe {
  art: Rechnung["art"];
  datum: string;
  firma: Firma;
  objekt: Objekt | null;
  empfaenger: Empfaenger;
  betreff: string;
  einleitung: string;
  positionen: Position[];
  leistungVon: string | null;
  leistungBis: string | null;
  angebotId?: string | null;
  hinweise?: string[];
}

/** Baut aus Positionen und Rahmendaten den fertigen Entwurf: Summen je Steuersatz, Fälligkeit, Zahlungstext, Pflichthinweise. */
export function entwurfBauen(e: EntwurfEingabe): RechnungsEntwurf {
  const faelligAm = plusTage(e.datum, e.firma.zahlungszielTage);
  const { steuersaetze, netto, ust, brutto } = summen(e.positionen);
  const zahlung = zahlungstexte(zahlungsweiseFuer(e.objekt, e.firma), faelligAm, e.objekt, e.firma);
  const hinweise = [...(e.hinweise ?? []), ...zahlung.hinweise];
  if (e.firma.kleinunternehmer) hinweise.push(KLEINUNTERNEHMER_HINWEIS);
  return {
    art: e.art,
    datum: e.datum,
    leistungVon: e.leistungVon,
    leistungBis: e.leistungBis,
    faelligAm,
    objektId: e.objekt?.id ?? null,
    angebotId: e.angebotId ?? null,
    empfaenger: e.empfaenger,
    betreff: e.betreff,
    einleitung: e.einleitung,
    positionen: e.positionen,
    steuersaetze,
    netto,
    ust,
    brutto,
    zahlungsbedingung: zahlung.zahlungsbedingung,
    hinweise,
    status: "entwurf",
    bezahltAm: null,
    bankumsatzId: null,
    mahnstufe: 0,
  };
}

/**
 * § 14 Abs. 4 UStG verlangt vom Rechnungssteller Name, Anschrift und Steuernummer oder
 * USt-IdNr. Fehlt davon etwas in den Stammdaten, ist jede Rechnung unvollständig.
 */
export function fehlendePflichtangaben(firma: Firma): string[] {
  const fehlt: string[] = [];
  if (!firma.name.trim()) fehlt.push("Firmenname");
  if (!firma.adresse.strasse.trim() || !firma.adresse.plz.trim() || !firma.adresse.ort.trim()) fehlt.push("vollständige Anschrift");
  if (!firma.steuernummer.trim() && !firma.ustIdNr.trim()) fehlt.push("Steuernummer oder USt-IdNr.");
  return fehlt;
}
