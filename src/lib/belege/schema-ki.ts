/**
 * Was die KI aus einem Dokument liest. Bewusst getrennt vom Speicher-Schema (domain/schema.ts):
 * Hier ist alles nullable, was im Dokument fehlen kann, und es gibt keine IDs. Die Umwandlung
 * in einen Beleg-Entwurf passiert in erkennen.ts, die Prüfung in pruefung.ts.
 */
import { z } from "zod";

/*
 * Die API erlaubt höchstens 16 nullable/union-Felder pro Schema. Deshalb sind Textfelder hier
 * einfache Strings ("" = steht nicht im Dokument) und nur Zahlen und Daten nullable.
 */
export const KiPosition = z.object({
  beschreibung: z.string().describe("Leistungstext der Position, wie gedruckt"),
  menge: z.number().nullable(),
  einheit: z.string().describe("z. B. Stk, Std, pausch., m²; leer wenn keine"),
  einzelpreisNetto: z.number().nullable(),
  netto: z.number().describe("Nettobetrag der Position in Euro"),
  ustSatz: z.number().describe("Umsatzsteuersatz in Prozent: 19, 7 oder 0"),
});

export const KiSteuerzeile = z.object({
  satz: z.number(),
  netto: z.number(),
  ust: z.number(),
});

export const KiBeleg = z.object({
  art: z.enum(["rechnung", "gutschrift"]),
  lieferantName: z.string(),
  lieferantAdresse: z.string().describe("Straße, PLZ Ort in einer Zeile; leer wenn nicht angegeben"),
  lieferantSteuernummer: z.string().describe("leer wenn nicht angegeben"),
  lieferantUstIdNr: z.string().describe("leer wenn nicht angegeben"),
  lieferantIban: z.string().describe("leer wenn nicht angegeben"),
  lieferantBic: z.string(),
  lieferantEmail: z.string(),
  kundennummer: z.string().describe("Kundennummer des Empfängers beim Lieferanten; leer wenn keine"),
  empfaengerName: z.string().describe("An wen die Rechnung adressiert ist, wie gedruckt"),
  rechnungsnummer: z.string().describe("leer wenn keine erkennbar"),
  rechnungsdatum: z.string().nullable().describe("YYYY-MM-DD"),
  leistungVon: z.string().nullable().describe("YYYY-MM-DD; bei einem einzelnen Leistungsdatum von = bis"),
  leistungBis: z.string().nullable().describe("YYYY-MM-DD"),
  faelligAm: z.string().nullable().describe("YYYY-MM-DD, falls angegeben oder aus 'zahlbar innerhalb X Tagen' berechenbar"),
  positionen: z.array(KiPosition),
  steuersaetze: z.array(KiSteuerzeile).describe("Netto und Steuerbetrag je Steuersatz, wie im Beleg ausgewiesen"),
  nettoGesamt: z.number().nullable(),
  ustGesamt: z.number().nullable(),
  bruttoGesamt: z.number().describe("Der Endbetrag, wie gedruckt, auch wenn er rechnerisch falsch wäre"),
  waehrung: z.string(),
  zahlungsart: z.enum(["ueberweisung", "lastschrift", "bereits_bezahlt", "unbekannt"]),
  skontoText: z.string().describe("z. B. '2 % Skonto bis 15.08.2026'; leer wenn kein Skonto"),
  kleinunternehmer: z.boolean().describe("true, wenn ein Hinweis auf § 19 UStG steht"),
  reverseCharge: z.boolean().describe("true bei Hinweis auf § 13b UStG / Steuerschuldnerschaft des Leistungsempfängers"),
  versicherungsteuer: z.boolean().describe("true, wenn Versicherungsteuer statt Umsatzsteuer ausgewiesen ist"),
  objektId: z.string().describe("ID aus der Objektliste, wenn der Beleg sich erkennbar auf dieses Objekt bezieht, sonst leer"),
  objektHinweis: z.string().describe("Objektadresse oder -bezeichnung, wie sie im Beleg steht; leer wenn keine"),
  kostenartCode: z.string().describe("Code aus der Kostenartenliste; leer wenn keiner passt"),
  kostenartBegruendung: z.string(),
  schadenOderVersicherungsfall: z.boolean().describe("true bei Sturm-, Wasser-, Brand-, Einbruchschaden o. ä."),
  auffaelligkeiten: z.array(z.string()).describe("Alles, was einem Buchhalter auffallen würde: fehlende Angaben, unklare Beträge, handschriftliche Vermerke, Mahnhinweise"),
});
export type KiBeleg = z.infer<typeof KiBeleg>;

export const KiAnfrage = z.object({
  istAnfrage: z.boolean().describe("true, wenn jemand eine Verwaltung, Betreuung oder Dienstleistung für ein Objekt sucht"),
  verwaltungsart: z.enum(["WEG", "MIET", "GEWERBE", "UNKLAR"]),
  strasse: z.string().describe("leer wenn unbekannt"),
  plz: z.string().describe("leer wenn unbekannt"),
  ort: z.string().describe("leer wenn unbekannt"),
  einheitenWohnen: z.number().int().nullable(),
  einheitenGewerbe: z.number().int().nullable(),
  stellplaetze: z.number().int().nullable(),
  baujahr: z.number().int().nullable(),
  besonderheiten: z.array(z.string()).describe("Aufzug, Tiefgarage, Heizungsart, anstehende Sanierung, Konflikte, bisheriger Verwalter"),
  leistungswuensche: z.array(z.string()).describe("Was ausdrücklich gewünscht wird"),
  gewuenschterBeginn: z.string().nullable().describe("YYYY-MM-DD"),
  kontaktName: z.string().describe("leer wenn unbekannt"),
  kontaktRolle: z.string().describe("Eigentümer, Verwaltungsbeirat, Miteigentümer, Makler ...; leer wenn unbekannt"),
  kontaktFirma: z.string(),
  kontaktEmail: z.string(),
  kontaktTelefon: z.string(),
  offeneFragen: z.array(z.string()).describe("Was fehlt, um ein belastbares Angebot zu machen"),
  zusammenfassung: z.string().describe("Ein Satz, worum es geht"),
});
export type KiAnfrage = z.infer<typeof KiAnfrage>;

export const KiHandwerkerangebot = z.object({
  anbieterName: z.string(),
  anbieterAdresse: z.string(),
  angebotsnummer: z.string(),
  datum: z.string().nullable().describe("YYYY-MM-DD"),
  gueltigBis: z.string().nullable().describe("YYYY-MM-DD"),
  objektId: z.string().describe("ID aus der Objektliste oder leer"),
  objektHinweis: z.string(),
  leistungKurz: z.string().describe("Worum es geht, ein Satz"),
  positionen: z.array(KiPosition),
  nettoGesamt: z.number().nullable(),
  ustGesamt: z.number().nullable(),
  bruttoGesamt: z.number().nullable(),
  bedingungen: z.array(z.string()).describe("Zahlungsbedingungen, Ausführungsfrist, Gewährleistung, Ausschlüsse"),
  auffaelligkeiten: z.array(z.string()),
});
export type KiHandwerkerangebot = z.infer<typeof KiHandwerkerangebot>;

/**
 * Schritt 1: Was ist das für ein Dokument? Bewusst klein, weil die API die Grammatik eines
 * Schemas kompiliert und ein Schema mit allen drei Extraktionsteilen zu groß war
 * ("compiled grammar is too large"). Schritt 2 nutzt dann nur das passende Schema.
 */
export const KiKlassifikation = z.object({
  typ: z.enum(["eingangsrechnung", "gutschrift", "anfrage", "handwerkerangebot", "kontoauszug", "mahnung", "vertrag", "sonstiges"]),
  zuversicht: z.enum(["hoch", "mittel", "niedrig"]),
  zusammenfassung: z.string().describe("Ein Satz für die Liste: wer, was, wie viel"),
});
export type KiKlassifikation = z.infer<typeof KiKlassifikation>;

/** Zuordnung offener Bankumsätze zu Personen (Mieter/Eigentümer), wenn die Regeln nicht greifen. */
export const KiBankzuordnung = z.object({
  zuordnungen: z.array(
    z.object({
      umsatzIndex: z.number().int(),
      personId: z.string().nullable(),
      art: z.enum(["mieteingang", "hausgeld", "belegzahlung", "honorar", "gebuehr", "auszahlung_eigentuemer", "kaution", "sonstiges", "offen"]),
      monat: z.string().nullable().describe("YYYY-MM, welcher Monat bezahlt wird, falls erkennbar"),
      sicherheit: z.enum(["sicher", "wahrscheinlich", "unsicher"]),
      begruendung: z.string(),
    }),
  ),
});
export type KiBankzuordnung = z.infer<typeof KiBankzuordnung>;

/** Spaltenerkennung für unbekannte Bank-CSV-Formate. */
export const KiSpalten = z.object({
  trennzeichen: z.string(),
  kopfzeile: z.number().int().describe("0-basierter Index der Zeile mit den Spaltennamen"),
  spalten: z.object({
    buchungstag: z.string().describe("Spaltenname oder leer"),
    valuta: z.string(),
    betrag: z.string().describe("Spaltenname der Betragsspalte oder leer, wenn Soll/Haben getrennt sind"),
    betragSoll: z.string().describe("Falls Soll und Haben getrennte Spalten sind, sonst leer"),
    betragHaben: z.string(),
    waehrung: z.string(),
    name: z.string(),
    iban: z.string(),
    bic: z.string(),
    verwendungszweck: z.array(z.string()).describe("Eine oder mehrere Spalten, die zusammen den Verwendungszweck ergeben"),
    buchungstext: z.string(),
    endToEndId: z.string(),
    mandatsreferenz: z.string(),
  }),
  datumsformat: z.string().describe("z. B. DD.MM.YYYY oder YYYY-MM-DD"),
  dezimaltrennzeichen: z.enum([",", "."]),
  bankVermutung: z.string().describe("Welche Bank das Format vermutlich ist"),
});
export type KiSpalten = z.infer<typeof KiSpalten>;
