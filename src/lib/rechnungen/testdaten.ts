/**
 * Testdaten für die Rechnungslogik: die fünf Objekte des Beispielbetriebs (Zahlen wie in
 * lib/beispiel/daten.ts, aber ohne Datenbank-Import, damit Vitest ohne IndexedDB läuft).
 */
import { Einstellungen, type Leistung, type Objekt } from "../domain/schema";
import { STANDARD_LEISTUNGEN_DIENSTLEISTER, STANDARD_LEISTUNGEN_HAUSVERWALTUNG, STANDARD_STAFFEL } from "../domain/standard";

export const TEST_FIRMA = {
  name: "Hausverwaltung Mustermann GmbH",
  adresse: { strasse: "Kaiserstraße 45", plz: "50667", ort: "Köln", land: "DE" },
  steuernummer: "215/5847/1234",
  ustIdNr: "DE123456789",
  iban: "DE02120300000000202051",
  bankname: "Deutsche Kreditbank",
  glaeubigerId: "DE98ZZZ09999999999",
  zahlungszielTage: 14,
  kleinunternehmer: false,
  ustSatz: 19,
  branche: "hausverwaltung" as const,
};

export function testEinstellungen(firma: Partial<Einstellungen["firma"]> = {}): Einstellungen {
  return Einstellungen.parse({ firma: { ...TEST_FIRMA, ...firma }, staffel: STANDARD_STAFFEL, mindesthonorarMonat: 250 });
}

export const KATALOG_HAUSVERWALTUNG: Leistung[] = STANDARD_LEISTUNGEN_HAUSVERWALTUNG.map((l, i) => ({ ...l, id: `L${i}` }));
export const KATALOG_DIENSTLEISTER: Leistung[] = STANDARD_LEISTUNGEN_DIENSTLEISTER.map((l, i) => ({ ...l, id: `D${i}` }));

function objekt(teil: Partial<Objekt> & Pick<Objekt, "id" | "kurzname" | "art">): Objekt {
  return {
    adresse: { strasse: teil.kurzname, plz: "50667", ort: "Köln", land: "DE" },
    einheitenWohnen: 0,
    einheitenGewerbe: 0,
    stellplaetze: 0,
    baujahr: null,
    auftraggeber: { name: `Auftraggeber ${teil.kurzname}`, zusatz: "", adresse: { strasse: teil.kurzname, plz: "50667", ort: "Köln", land: "DE" }, email: "", kundennummer: "", leitwegId: "", mandatsreferenz: "" },
    honorarNettoMonat: null,
    verwaltungSeit: null,
    bankIban: "", leistungCodes: [],
    aktiv: true,
    notizen: "",
    ...teil,
  };
}

export const TEST_OBJEKTE: Objekt[] = [
  objekt({
    id: "OBJ-001", kurzname: "WEG Am Stadtpark 3", art: "WEG", einheitenWohnen: 24, einheitenGewerbe: 1, stellplaetze: 20,
    adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", land: "DE" },
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Am Stadtpark 3", zusatz: "vertreten durch die Verwaltung", adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", land: "DE" }, email: "beirat.stadtpark@example.de", kundennummer: "K-1001", leitwegId: "", mandatsreferenz: "" },
    bankIban: "DE12500105170648489890", leistungCodes: [],
  }),
  objekt({
    id: "OBJ-002", kurzname: "Bahnhofstraße 7", art: "MIET", einheitenWohnen: 8, stellplaetze: 4,
    auftraggeber: { name: "Erika Vogel", zusatz: "", adresse: { strasse: "Rösrather Straße 12", plz: "51107", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1002", leitwegId: "", mandatsreferenz: "" },
    bankIban: "DE41500105170123456789", leistungCodes: [],
  }),
  objekt({
    id: "OBJ-003", kurzname: "WEG Rosenhof 5-7", art: "WEG", einheitenWohnen: 40, einheitenGewerbe: 2, stellplaetze: 30, honorarNettoMonat: 1450,
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Rosenhof 5-7", zusatz: "", adresse: { strasse: "Rosenhof 5", plz: "50823", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1003", leitwegId: "", mandatsreferenz: "" },
    bankIban: "DE75512108001245126199", leistungCodes: [],
  }),
  objekt({
    id: "OBJ-004", kurzname: "Gartenweg 21", art: "MIET", einheitenWohnen: 6,
    auftraggeber: { name: "Familie Brandt GbR", zusatz: "z. Hd. Thomas Brandt", adresse: { strasse: "Luxemburger Straße 300", plz: "50939", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1004", leitwegId: "", mandatsreferenz: "" },
  }),
  objekt({
    id: "OBJ-005", kurzname: "WEG Severinstraße 88", art: "WEG", einheitenWohnen: 12, einheitenGewerbe: 1, stellplaetze: 6,
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Severinstraße 88", zusatz: "vertreten durch die Verwaltung", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, email: "", kundennummer: "K-1005", leitwegId: "", mandatsreferenz: "" },
    bankIban: "DE27100777770209299700", leistungCodes: [],
  }),
];
