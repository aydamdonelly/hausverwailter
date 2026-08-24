/**
 * Stammdaten für die Tests des Bankmoduls: die Mieter der Bahnhofstraße 7 und die Eigentümer
 * der WEG Severinstraße 88 aus dem Beispielbetrieb, dazu Konten, ein offener Beleg und eine
 * eigene Rechnung. Bewusst hier dupliziert, damit die Tests nicht an lib/beispiel hängen.
 */
import type { Bankkonto, Beleg, Einheit, Objekt, Person, Rechnung } from "../../domain/schema";

function person(id: string, objektId: string, einheitId: string | null, rolle: Person["rolle"], name: string, ibans: string[], kalt: number, nebenkosten: number, hausgeld: number, anrede = ""): Person {
  return { id, objektId, einheitId, rolle, anrede, name, adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans, soll: { kalt, nebenkosten, hausgeld, faelligTag: 3 }, seit: "2020-01-01", bis: null, aktiv: true, notizen: "" };
}

export const PERSONEN: Person[] = [
  person("P-201", "OBJ-002", "E-201", "mieter", "Anna Schmidt", ["DE21100110012626667882"], 720, 180, 0, "Frau"),
  person("P-202", "OBJ-002", "E-202", "mieter", "Yilmaz", ["DE11520513735120710131"], 810, 200, 0, "Familie"),
  person("P-203", "OBJ-002", "E-203", "mieter", "Jonas Weber", [], 650, 160, 0, "Herr"),
  person("P-204", "OBJ-002", "E-204", "mieter", "Petra Lang", ["DE36700202700012345678"], 690, 170, 0, "Frau"),
  person("P-205", "OBJ-002", "E-205", "mieter", "Lukas und Marie Hoffmann", [], 950, 220, 0, "Herr und Frau"),
  person("P-206", "OBJ-002", "E-206", "mieter", "WG Becker / Ott", [], 880, 210, 0),
  person("P-207", "OBJ-002", "E-207", "mieter", "Elif Demir", ["DE59100100100057021049"], 700, 175, 0, "Frau"),
  person("P-208", "OBJ-002", "E-208", "mieter", "Karl Fischer", ["DE07100500000190001060"], 620, 150, 0, "Herr"),
  person("P-209", "OBJ-002", null, "mieter", "Max Neu", [], 860, 0, 0, "Herr"),
  person("P-501", "OBJ-005", null, "eigentuemer", "Dr. Stefan Berger", ["DE44500105175407324931"], 0, 0, 310, "Herr"),
  person("P-502", "OBJ-005", null, "eigentuemer", "Ingrid Sauer", [], 0, 0, 280, "Frau"),
];

export const EINHEITEN: Einheit[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `E-20${n}`, objektId: "OBJ-002", bezeichnung: `Whg ${n}`, art: "wohnung", flaecheQm: 60, lage: ["EG links", "EG rechts", "1. OG links", "1. OG rechts", "2. OG links", "2. OG rechts", "3. OG links", "3. OG rechts"][n - 1] }));

export const OBJEKTE: Objekt[] = [
  { id: "OBJ-002", kurzname: "Bahnhofstraße 7", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, art: "MIET", einheitenWohnen: 8, einheitenGewerbe: 0, stellplaetze: 4, baujahr: 1962, auftraggeber: { name: "Erika Vogel", zusatz: "", adresse: { strasse: "Rösrather Straße 12", plz: "51107", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1002", leitwegId: "", mandatsreferenz: "" }, honorarNettoMonat: null, verwaltungSeit: "2023-04-01", bankIban: "DE41500105170123456789", leistungCodes: [], aktiv: true, notizen: "" },
  { id: "OBJ-005", kurzname: "WEG Severinstraße 88", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, art: "WEG", einheitenWohnen: 12, einheitenGewerbe: 1, stellplaetze: 6, baujahr: 1955, auftraggeber: { name: "Wohnungseigentümergemeinschaft Severinstraße 88", zusatz: "", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1005", leitwegId: "", mandatsreferenz: "" }, honorarNettoMonat: null, verwaltungSeit: "2022-10-01", bankIban: "DE27100777770209299700", leistungCodes: [], aktiv: true, notizen: "" },
];

export const KONTEN: Bankkonto[] = [
  { id: "BK-001", bezeichnung: "Mietkonto Bahnhofstraße 7", iban: "DE41500105170123456789", bic: "INGDDEFFXXX", bankname: "ING", objektId: "OBJ-002", format: "" },
  { id: "BK-002", bezeichnung: "Gemeinschaftskonto WEG Severinstraße 88", iban: "DE27100777770209299700", bic: "NORSDE51XXX", bankname: "norisbank", objektId: "OBJ-005", format: "" },
  { id: "BK-003", bezeichnung: "Geschäftskonto Verwaltung", iban: "DE02120300000000202051", bic: "BYLADEM1001", bankname: "DKB", objektId: null, format: "" },
];

function beleg(id: string, lieferant: string, iban: string, rechnungsnummer: string, brutto: number): Beleg {
  return {
    id, dokumentId: `D-${id}`, art: "rechnung",
    lieferant: { name: lieferant, adresse: "", steuernummer: "", ustIdNr: "", iban, bic: "", email: "", kundennummerBeimLieferanten: "" },
    rechnungsnummer, rechnungsdatum: "2026-06-20", leistungVon: null, leistungBis: null, faelligAm: "2026-07-10", positionen: [], steuersaetze: [],
    nettoGesamt: Math.round((brutto / 1.19) * 100) / 100, ustGesamt: Math.round((brutto - brutto / 1.19) * 100) / 100, bruttoGesamt: brutto, waehrung: "EUR", zahlungsart: "ueberweisung",
    skontoText: "", kleinunternehmer: false, reverseCharge: false, versicherungsteuer: false, objektId: "OBJ-002", objektHinweis: "", einheitId: null, kostenartCode: "HEIZUNG", kostenartBegruendung: "",
    befunde: [], herkunft: {}, erkanntAm: null, modell: "", notizenKi: "", sachlichRichtigAm: null, bezahltAm: null, bankumsatzId: null,
  };
}

export const BELEGE: Beleg[] = [
  beleg("B-1", "Müller Sanitär GmbH", "DE89370400440532013000", "2026-0815", 1238),
  beleg("B-2", "RheinEnergie AG", "DE12370501980000000001", "4711", 120),
];

export const RECHNUNGEN: Rechnung[] = [
  {
    id: "R-1", nummer: "R-2026-0131", art: "honorar", datum: "2026-08-01", leistungVon: "2026-07-01", leistungBis: "2026-07-31", faelligAm: "2026-08-15", objektId: "OBJ-005", angebotId: null,
    empfaenger: { name: "Wohnungseigentümergemeinschaft Severinstraße 88", zusatz: "", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1005", leitwegId: "", ustIdNr: "" },
    betreff: "Verwalterhonorar Juli 2026", einleitung: "", positionen: [], steuersaetze: [], netto: 840.34, ust: 159.66, brutto: 1000, zahlungsbedingung: "", hinweise: [], status: "gestellt", bezahltAm: null, bankumsatzId: null, mahnstufe: 0, erstelltAm: "2026-08-01T08:00:00Z",
  },
];

export const FIRMA = { name: "Hausverwaltung Mustermann GmbH", iban: "DE02120300000000202051", bankname: "DKB" };
