/**
 * Domänenmodell der App. Alles, was gespeichert, importiert, exportiert oder von der KI
 * erzeugt wird, ist hier als Zod-Schema definiert. Die TypeScript-Typen werden daraus abgeleitet.
 *
 * Sprache: Deutsch, weil die Fachbegriffe (Beleg, Kontierung, Sollstellung, Hausgeld) die
 * Begriffe der Branche sind und der Nutzer sie in der Oberfläche wiederfinden soll.
 *
 * Geldbeträge sind Zahlen in Euro mit maximal zwei Nachkommastellen (kein Cent-Integer,
 * damit Import/Export und Formulare einfach bleiben). Alle Rechnungen laufen über
 * `rundeGeld` in lib/geld.ts. Daten sind ISO-Strings (YYYY-MM-DD bzw. ISO-Zeitstempel).
 */
import { z } from "zod";

// ---------- Basisbausteine ----------

export const Adresse = z.object({
  strasse: z.string().default(""),
  plz: z.string().default(""),
  ort: z.string().default(""),
  land: z.string().default("DE"),
});
export type Adresse = z.infer<typeof Adresse>;

export const Geld = z.number().finite();
export const Datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum als YYYY-MM-DD");
export const Monat = z.string().regex(/^\d{4}-\d{2}$/, "Monat als YYYY-MM");
export const Zeitstempel = z.string();

export const Verwaltungsart = z.enum(["WEG", "MIET", "GEWERBE", "SONSTIG"]);
export type Verwaltungsart = z.infer<typeof Verwaltungsart>;

// ---------- Stammdaten ----------

export const Firma = z.object({
  name: z.string().default("Meine Hausverwaltung"),
  zusatz: z.string().default(""),
  adresse: Adresse.prefault({}),
  telefon: z.string().default(""),
  email: z.string().default(""),
  web: z.string().default(""),
  geschaeftsfuehrung: z.string().default(""),
  registergericht: z.string().default(""),
  handelsregister: z.string().default(""),
  steuernummer: z.string().default(""),
  ustIdNr: z.string().default(""),
  iban: z.string().default(""),
  bic: z.string().default(""),
  bankname: z.string().default(""),
  glaeubigerId: z.string().default(""),
  /** Logo als data:-URL (PNG/SVG/JPG), optional. */
  logoDataUrl: z.string().nullable().default(null),
  /** Akzentfarbe des Briefkopfs (Hex). */
  farbe: z.string().default("#15201b"),
  zahlungszielTage: z.number().int().default(14),
  kleinunternehmer: z.boolean().default(false),
  ustSatz: z.number().default(19),
  /** Belege ab diesem Bruttobetrag brauchen eine ausdrückliche Freigabe. */
  freigabegrenze: Geld.default(1000),
  /** Was der Nutzer ist: entscheidet über Standard-Leistungskatalog und Wording. */
  branche: z.enum(["hausverwaltung", "dienstleister", "sonstige"]).default("hausverwaltung"),
});
export type Firma = z.infer<typeof Firma>;

export const Auftraggeber = z.object({
  name: z.string(),
  zusatz: z.string().default(""),
  adresse: Adresse.prefault({}),
  email: z.string().default(""),
  kundennummer: z.string().default(""),
  /** Leitweg-ID, nur für Rechnungen an öffentliche Auftraggeber (XRechnung B2G). */
  leitwegId: z.string().default(""),
});
export type Auftraggeber = z.infer<typeof Auftraggeber>;

export const Objekt = z.object({
  id: z.string(),
  kurzname: z.string(),
  adresse: Adresse,
  art: Verwaltungsart,
  einheitenWohnen: z.number().int().default(0),
  einheitenGewerbe: z.number().int().default(0),
  stellplaetze: z.number().int().default(0),
  baujahr: z.number().int().nullable().default(null),
  auftraggeber: Auftraggeber,
  /** Vertraglich vereinbartes Nettohonorar pro Monat; null = aus dem Leistungskatalog berechnen. */
  honorarNettoMonat: Geld.nullable().default(null),
  verwaltungSeit: Datum.nullable().default(null),
  /** IBAN des Objektkontos (Mietkonto/Gemeinschaftskonto), hilft beim Bankimport. */
  bankIban: z.string().default(""),
  aktiv: z.boolean().default(true),
  notizen: z.string().default(""),
});
export type Objekt = z.infer<typeof Objekt>;

export const Einheit = z.object({
  id: z.string(),
  objektId: z.string(),
  bezeichnung: z.string(),
  art: z.enum(["wohnung", "gewerbe", "stellplatz", "sonstige"]).default("wohnung"),
  flaecheQm: z.number().nullable().default(null),
  lage: z.string().default(""),
});
export type Einheit = z.infer<typeof Einheit>;

/** Monatliche Sollstellung einer Person (Miete + Nebenkosten bzw. Hausgeld). */
export const Soll = z.object({
  kalt: Geld.default(0),
  nebenkosten: Geld.default(0),
  hausgeld: Geld.default(0),
  /** Tag im Monat, bis zu dem gezahlt sein muss (§556b BGB: 3. Werktag). */
  faelligTag: z.number().int().default(3),
});
export type Soll = z.infer<typeof Soll>;

export const Person = z.object({
  id: z.string(),
  objektId: z.string(),
  einheitId: z.string().nullable().default(null),
  rolle: z.enum(["mieter", "eigentuemer", "sonstige"]),
  anrede: z.string().default(""),
  name: z.string(),
  adresse: Adresse.nullable().default(null),
  email: z.string().default(""),
  telefon: z.string().default(""),
  /** Bekannte IBAN(s), von denen diese Person zahlt. Wichtigstes Zuordnungsmerkmal. */
  ibans: z.array(z.string()).default([]),
  soll: Soll.prefault({}),
  seit: Datum.nullable().default(null),
  bis: Datum.nullable().default(null),
  aktiv: z.boolean().default(true),
  notizen: z.string().default(""),
});
export type Person = z.infer<typeof Person>;

export const Kostenart = z.object({
  code: z.string(),
  bezeichnung: z.string(),
  /** Fundstelle, z. B. "§ 2 Nr. 7 BetrKV". Leer, wenn nicht umlagefähig. */
  betrkv: z.string().default(""),
  umlagefaehig: z.boolean(),
  kontoSkr03: z.string().default(""),
  kontoSkr04: z.string().default(""),
  /** Hinweis für die KI und den Nutzer, wann diese Kostenart gilt. */
  hinweis: z.string().default(""),
  aktiv: z.boolean().default(true),
});
export type Kostenart = z.infer<typeof Kostenart>;

export const Leistung = z.object({
  id: z.string(),
  code: z.string(),
  bezeichnung: z.string(),
  beschreibung: z.string().default(""),
  einheit: z.enum(["einheit_monat", "stellplatz_monat", "pauschal_monat", "stunde", "stueck", "pauschal", "qm_monat"]),
  preisNetto: Geld,
  gilt: z.enum(["WEG", "MIET", "GEWERBE", "ALLE"]).default("ALLE"),
  kategorie: z.enum(["grundleistung", "sonderleistung"]).default("grundleistung"),
  aktiv: z.boolean().default(true),
});
export type Leistung = z.infer<typeof Leistung>;

// ---------- Dokumente und Belege ----------

export const DokumentTyp = z.enum([
  "eingangsrechnung",
  "gutschrift",
  "anfrage",
  "handwerkerangebot",
  "kontoauszug",
  "mahnung",
  "vertrag",
  "sonstiges",
]);
export type DokumentTyp = z.infer<typeof DokumentTyp>;

export const DokumentStatus = z.enum([
  "neu", // hochgeladen, noch nicht gelesen
  "wird_gelesen", // KI läuft
  "erkannt", // Daten liegen vor, Prüfung offen
  "freigabe", // Prüfung ergab: Mensch muss entscheiden (Fehler/Grenze)
  "freigegeben", // Nutzer hat freigegeben
  "gebucht", // Buchungssatz erzeugt
  "abgelehnt", // Nutzer hat verworfen
  "fehler", // technischer Fehler beim Lesen
]);
export type DokumentStatus = z.infer<typeof DokumentStatus>;

export const Dokument = z.object({
  id: z.string(),
  dateiname: z.string(),
  mime: z.string(),
  groesse: z.number().int(),
  /** SHA-256 des Dateiinhalts; erkennt doppelt hochgeladene Dateien. */
  hash: z.string(),
  hochgeladenAm: Zeitstempel,
  quelle: z.enum(["upload", "beispiel", "email"]).default("upload"),
  typ: DokumentTyp.nullable().default(null),
  status: DokumentStatus.default("neu"),
  fehler: z.string().default(""),
  seiten: z.number().int().nullable().default(null),
  /** Verknüpfte Fachobjekte, je nach Typ. */
  belegId: z.string().nullable().default(null),
  anfrageId: z.string().nullable().default(null),
  bankkontoId: z.string().nullable().default(null),
  notizen: z.string().default(""),
});
export type Dokument = z.infer<typeof Dokument>;

export const Befund = z.object({
  stufe: z.enum(["fehler", "warnung", "hinweis"]),
  code: z.string(),
  text: z.string(),
  feld: z.string().default(""),
});
export type Befund = z.infer<typeof Befund>;

export const BelegPosition = z.object({
  beschreibung: z.string(),
  menge: z.number().nullable().default(null),
  einheit: z.string().default(""),
  einzelpreisNetto: Geld.nullable().default(null),
  netto: Geld,
  ustSatz: z.number().default(19),
});
export type BelegPosition = z.infer<typeof BelegPosition>;

export const Steuerzeile = z.object({ satz: z.number(), netto: Geld, ust: Geld });
export type Steuerzeile = z.infer<typeof Steuerzeile>;

export const Lieferant = z.object({
  name: z.string(),
  adresse: z.string().default(""),
  steuernummer: z.string().default(""),
  ustIdNr: z.string().default(""),
  iban: z.string().default(""),
  bic: z.string().default(""),
  email: z.string().default(""),
  kundennummerBeimLieferanten: z.string().default(""),
});
export type Lieferant = z.infer<typeof Lieferant>;

export const Herkunft = z.enum(["ki", "regel", "manuell"]);

export const Beleg = z.object({
  id: z.string(),
  dokumentId: z.string(),
  art: z.enum(["rechnung", "gutschrift"]).default("rechnung"),
  lieferant: Lieferant,
  rechnungsnummer: z.string(),
  rechnungsdatum: Datum.nullable(),
  leistungVon: Datum.nullable().default(null),
  leistungBis: Datum.nullable().default(null),
  faelligAm: Datum.nullable().default(null),
  positionen: z.array(BelegPosition).default([]),
  steuersaetze: z.array(Steuerzeile).default([]),
  nettoGesamt: Geld,
  ustGesamt: Geld,
  bruttoGesamt: Geld,
  waehrung: z.string().default("EUR"),
  zahlungsart: z.enum(["ueberweisung", "lastschrift", "bereits_bezahlt", "unbekannt"]).default("unbekannt"),
  skontoText: z.string().default(""),
  kleinunternehmer: z.boolean().default(false),
  reverseCharge: z.boolean().default(false),
  versicherungsteuer: z.boolean().default(false),
  /** Zuordnung */
  objektId: z.string().nullable().default(null),
  objektHinweis: z.string().default(""),
  einheitId: z.string().nullable().default(null),
  kostenartCode: z.string().nullable().default(null),
  kostenartBegruendung: z.string().default(""),
  /** Prüfung */
  befunde: z.array(Befund).default([]),
  /** Welches Feld woher stammt: "ki" (gelesen), "regel" (Code), "manuell" (Nutzer). */
  herkunft: z.record(z.string(), Herkunft).prefault({}),
  erkanntAm: Zeitstempel.nullable().default(null),
  modell: z.string().default(""),
  notizenKi: z.string().default(""),
  /** Zahlung */
  bezahltAm: Datum.nullable().default(null),
  bankumsatzId: z.string().nullable().default(null),
});
export type Beleg = z.infer<typeof Beleg>;

// ---------- Buchhaltung ----------

export const Buchung = z.object({
  id: z.string(),
  datum: Datum,
  belegId: z.string().nullable().default(null),
  bankumsatzId: z.string().nullable().default(null),
  rechnungId: z.string().nullable().default(null),
  objektId: z.string().nullable().default(null),
  kostenartCode: z.string().nullable().default(null),
  umlagefaehig: z.boolean().nullable().default(null),
  konto: z.string().default(""),
  gegenkonto: z.string().default(""),
  buStuessel: z.string().default(""),
  belegnummer: z.string().default(""),
  buchungstext: z.string(),
  netto: Geld,
  ust: Geld,
  brutto: Geld,
  ustSatz: z.number().default(0),
  sollHaben: z.enum(["S", "H"]).default("S"),
  quelle: z.enum(["beleg", "bank", "rechnung", "manuell"]),
  erstelltAm: Zeitstempel,
  exportiertAm: Zeitstempel.nullable().default(null),
});
export type Buchung = z.infer<typeof Buchung>;

export const Bankkonto = z.object({
  id: z.string(),
  bezeichnung: z.string(),
  iban: z.string().default(""),
  bic: z.string().default(""),
  bankname: z.string().default(""),
  /** null = Konto der Verwaltung selbst. */
  objektId: z.string().nullable().default(null),
  /** Erkanntes Importformat, z. B. "sparkasse-camt-csv". */
  format: z.string().default(""),
});
export type Bankkonto = z.infer<typeof Bankkonto>;

export const ZuordnungArt = z.enum([
  "mieteingang",
  "hausgeld",
  "belegzahlung",
  "honorar",
  "gebuehr",
  "auszahlung_eigentuemer",
  "kaution",
  "sonstiges",
  "offen",
]);
export type ZuordnungArt = z.infer<typeof ZuordnungArt>;

export const Zuordnung = z.object({
  art: ZuordnungArt.default("offen"),
  personId: z.string().nullable().default(null),
  belegId: z.string().nullable().default(null),
  rechnungId: z.string().nullable().default(null),
  kostenartCode: z.string().nullable().default(null),
  /** Für Mieteingänge: welcher Monat wird damit bezahlt (YYYY-MM). */
  monat: Monat.nullable().default(null),
  sicherheit: z.enum(["sicher", "wahrscheinlich", "unsicher"]).default("unsicher"),
  quelle: Herkunft.default("regel"),
  begruendung: z.string().default(""),
});
export type Zuordnung = z.infer<typeof Zuordnung>;

export const Bankumsatz = z.object({
  id: z.string(),
  bankkontoId: z.string(),
  buchungstag: Datum,
  valuta: Datum.nullable().default(null),
  betrag: Geld,
  waehrung: z.string().default("EUR"),
  name: z.string().default(""),
  iban: z.string().default(""),
  bic: z.string().default(""),
  verwendungszweck: z.string().default(""),
  buchungstext: z.string().default(""),
  endToEndId: z.string().default(""),
  mandatsreferenz: z.string().default(""),
  /** Hash aus Konto+Datum+Betrag+Zweck; verhindert Doppelimporte. */
  hash: z.string(),
  importiertAm: Zeitstempel,
  zuordnung: Zuordnung.prefault({}),
});
export type Bankumsatz = z.infer<typeof Bankumsatz>;

/** Berechnet, nicht gespeichert: Soll/Ist einer Person in einem Monat. */
export const Sollstellung = z.object({
  personId: z.string(),
  objektId: z.string(),
  monat: Monat,
  soll: Geld,
  ist: Geld,
  differenz: Geld,
  status: z.enum(["bezahlt", "teilweise", "offen", "ueberzahlt"]),
  umsatzIds: z.array(z.string()),
});
export type Sollstellung = z.infer<typeof Sollstellung>;

// ---------- Angebote ----------

export const Kontakt = z.object({
  name: z.string().default(""),
  rolle: z.string().default(""),
  firma: z.string().default(""),
  email: z.string().default(""),
  telefon: z.string().default(""),
});
export type Kontakt = z.infer<typeof Kontakt>;

export const Anfrage = z.object({
  id: z.string(),
  dokumentId: z.string().nullable().default(null),
  eingangAm: Zeitstempel,
  text: z.string(),
  istAnfrage: z.boolean(),
  verwaltungsart: z.enum(["WEG", "MIET", "GEWERBE", "UNKLAR"]).default("UNKLAR"),
  strasse: z.string().default(""),
  plz: z.string().default(""),
  ort: z.string().default(""),
  einheitenWohnen: z.number().int().nullable().default(null),
  einheitenGewerbe: z.number().int().nullable().default(null),
  stellplaetze: z.number().int().nullable().default(null),
  baujahr: z.number().int().nullable().default(null),
  besonderheiten: z.array(z.string()).default([]),
  leistungswuensche: z.array(z.string()).default([]),
  gewuenschterBeginn: Datum.nullable().default(null),
  kontakt: Kontakt.prefault({}),
  offeneFragen: z.array(z.string()).default([]),
  zusammenfassung: z.string().default(""),
  angebotId: z.string().nullable().default(null),
});
export type Anfrage = z.infer<typeof Anfrage>;

export const Position = z.object({
  pos: z.number().int(),
  leistungCode: z.string().default(""),
  bezeichnung: z.string(),
  beschreibung: z.string().default(""),
  menge: z.number(),
  einheit: z.string(),
  einzelpreisNetto: Geld,
  gesamtNetto: Geld,
  ustSatz: z.number().default(19),
});
export type Position = z.infer<typeof Position>;

export const Empfaenger = z.object({
  name: z.string(),
  zusatz: z.string().default(""),
  adresse: Adresse.prefault({}),
  email: z.string().default(""),
  kundennummer: z.string().default(""),
  leitwegId: z.string().default(""),
  ustIdNr: z.string().default(""),
});
export type Empfaenger = z.infer<typeof Empfaenger>;

export const Angebot = z.object({
  id: z.string(),
  nummer: z.string(),
  datum: Datum,
  gueltigBis: Datum,
  anfrageId: z.string().nullable().default(null),
  empfaenger: Empfaenger,
  ansprechpartner: z.string().default(""),
  objekt: z.object({
    strasse: z.string().default(""),
    plz: z.string().default(""),
    ort: z.string().default(""),
    art: z.enum(["WEG", "MIET", "GEWERBE", "UNKLAR"]).default("UNKLAR"),
    einheitenWohnen: z.number().int().default(0),
    einheitenGewerbe: z.number().int().default(0),
    stellplaetze: z.number().int().default(0),
    besonderheiten: z.array(z.string()).default([]),
  }),
  betreff: z.string(),
  positionen: z.array(Position),
  rabattProzent: z.number().default(0),
  rabattBetrag: Geld.default(0),
  netto: Geld,
  ustSatz: z.number().default(19),
  ust: Geld,
  brutto: Geld,
  turnus: z.enum(["monatlich", "einmalig"]).default("monatlich"),
  laufzeitText: z.string().default(""),
  leistungsumfang: z.array(z.string()).default([]),
  sonderleistungen: z.array(z.object({ bezeichnung: z.string(), preisNetto: Geld, einheit: z.string() })).default([]),
  annahmen: z.array(z.string()).default([]),
  /** Absätze des Anschreibens, KI-formuliert, vom Nutzer editierbar. */
  anschreiben: z.array(z.string()).default([]),
  antwortEmail: z.object({ betreff: z.string(), text: z.string() }).nullable().default(null),
  status: z.enum(["entwurf", "versendet", "angenommen", "abgelehnt"]).default("entwurf"),
  erstelltAm: Zeitstempel,
});
export type Angebot = z.infer<typeof Angebot>;

// ---------- Rechnungen und Mahnungen ----------

export const Rechnung = z.object({
  id: z.string(),
  nummer: z.string(),
  art: z.enum(["honorar", "sonderleistung", "aus_angebot", "gutschrift", "weiterberechnung"]),
  datum: Datum,
  leistungVon: Datum.nullable().default(null),
  leistungBis: Datum.nullable().default(null),
  faelligAm: Datum,
  objektId: z.string().nullable().default(null),
  angebotId: z.string().nullable().default(null),
  empfaenger: Empfaenger,
  betreff: z.string().default(""),
  einleitung: z.string().default(""),
  positionen: z.array(Position),
  steuersaetze: z.array(Steuerzeile),
  netto: Geld,
  ust: Geld,
  brutto: Geld,
  zahlungsbedingung: z.string().default(""),
  hinweise: z.array(z.string()).default([]),
  status: z.enum(["entwurf", "gestellt", "bezahlt", "storniert"]).default("entwurf"),
  bezahltAm: Datum.nullable().default(null),
  bankumsatzId: z.string().nullable().default(null),
  mahnstufe: z.number().int().default(0),
  erstelltAm: Zeitstempel,
});
export type Rechnung = z.infer<typeof Rechnung>;

export const Mahnung = z.object({
  id: z.string(),
  nummer: z.string(),
  /** 1 = Zahlungserinnerung, 2 = Mahnung, 3 = letzte Mahnung */
  stufe: z.number().int().min(1).max(3),
  datum: Datum,
  frist: Datum,
  objektId: z.string().nullable().default(null),
  personId: z.string().nullable().default(null),
  rechnungId: z.string().nullable().default(null),
  empfaenger: Empfaenger,
  posten: z.array(z.object({ bezeichnung: z.string(), soll: Geld, ist: Geld, offen: Geld })),
  betragOffen: Geld,
  mahngebuehr: Geld.default(0),
  verzugszinsen: Geld.default(0),
  gesamt: Geld,
  text: z.array(z.string()).default([]),
  status: z.enum(["vorschlag", "erstellt", "versendet", "erledigt"]).default("vorschlag"),
  erstelltAm: Zeitstempel,
});
export type Mahnung = z.infer<typeof Mahnung>;

// ---------- Protokoll und Einstellungen ----------

export const Protokoll = z.object({
  id: z.string(),
  zeit: Zeitstempel,
  akteur: z.enum(["nutzer", "ki", "regel", "system"]),
  aktion: z.string(),
  /** z. B. "beleg:abc123" */
  bezug: z.string().default(""),
  details: z.string().default(""),
});
export type Protokoll = z.infer<typeof Protokoll>;

export const Nummernkreis = z.object({
  prefix: z.string(),
  jahr: z.number().int(),
  zaehler: z.number().int().default(0),
  /** Anzahl Stellen, z. B. 4 → 0001 */
  stellen: z.number().int().default(4),
});
export type Nummernkreis = z.infer<typeof Nummernkreis>;

export const Einstellungen = z.object({
  id: z.literal("einstellungen").default("einstellungen"),
  version: z.number().int().default(1),
  firma: Firma.prefault({}),
  staffel: z.array(z.object({ abEinheiten: z.number().int(), rabattProzent: z.number() })).default([]),
  mindesthonorarMonat: Geld.default(0),
  nummernkreise: z.object({
    angebot: Nummernkreis.default({ prefix: "A-", jahr: 2026, zaehler: 0, stellen: 4 }),
    rechnung: Nummernkreis.default({ prefix: "R-", jahr: 2026, zaehler: 0, stellen: 4 }),
    mahnung: Nummernkreis.default({ prefix: "M-", jahr: 2026, zaehler: 0, stellen: 4 }),
  }).prefault({}),
  kontenrahmen: z.enum(["SKR03", "SKR04"]).default("SKR03"),
  datev: z.object({
    beraternummer: z.string().default(""),
    mandantennummer: z.string().default(""),
    wirtschaftsjahrBeginn: Datum.nullable().default(null),
    sachkontenlaenge: z.number().int().default(4),
    bankkonto: z.string().default("1200"),
    erloeskonto: z.string().default("8400"),
    kreditorStart: z.number().int().default(70000),
    debitorStart: z.number().int().default(10000),
  }).prefault({}),
  mahnwesen: z.object({
    fristTage: z.number().int().default(10),
    gebuehrStufe2: Geld.default(5),
    gebuehrStufe3: Geld.default(10),
    toleranzEuro: Geld.default(1),
  }).prefault({}),
  beispielGeladen: z.boolean().default(false),
  onboardingErledigt: z.boolean().default(false),
});
export type Einstellungen = z.infer<typeof Einstellungen>;

/** Alles zusammen: das ist die Export-/Import-Datei (JSON) eines Arbeitsbereichs. */
export const Arbeitsbereich = z.object({
  format: z.literal("hausverwailter-arbeitsbereich"),
  version: z.number().int(),
  exportiertAm: Zeitstempel,
  einstellungen: Einstellungen,
  objekte: z.array(Objekt),
  einheiten: z.array(Einheit),
  personen: z.array(Person),
  kostenarten: z.array(Kostenart),
  leistungen: z.array(Leistung),
  dokumente: z.array(Dokument),
  /** Dateien base64-kodiert: { id, mime, base64 } */
  dateien: z.array(z.object({ id: z.string(), mime: z.string(), base64: z.string() })),
  belege: z.array(Beleg),
  buchungen: z.array(Buchung),
  bankkonten: z.array(Bankkonto),
  bankumsaetze: z.array(Bankumsatz),
  anfragen: z.array(Anfrage),
  angebote: z.array(Angebot),
  rechnungen: z.array(Rechnung),
  mahnungen: z.array(Mahnung),
  protokoll: z.array(Protokoll),
});
export type Arbeitsbereich = z.infer<typeof Arbeitsbereich>;
