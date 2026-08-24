/**
 * Synthetische Daten für die Tests der Exporte. Alles über die Zod-Schemas geparst, damit
 * Standardwerte gesetzt sind und Änderungen am Modell hier auffallen.
 */
import {
  Bankkonto,
  Bankumsatz,
  Beleg,
  Buchung,
  Dokument,
  Einstellungen,
  Objekt,
  Person,
  Rechnung,
  type Kostenart,
} from "../domain/schema";
import { STANDARD_KOSTENARTEN } from "../domain/standard";

export const TEST_FIRMA = {
  name: "Hausverwaltung Mustermann GmbH",
  zusatz: "Haus- und Wohnungsverwaltung",
  adresse: { strasse: "Kaiserstraße 45", plz: "50667", ort: "Köln", land: "DE" },
  telefon: "0221 12 34 56 7",
  email: "post@hv-mustermann.de",
  geschaeftsfuehrung: "Max Mustermann",
  registergericht: "Amtsgericht Köln",
  handelsregister: "HRB 12345",
  steuernummer: "215/5847/1234",
  ustIdNr: "DE123456789",
  iban: "DE02 1203 0000 0000 2020 51",
  bic: "BYLADEM1001",
  zahlungszielTage: 14,
};

export function testEinstellungen(patch: Record<string, unknown> = {}): Einstellungen {
  return Einstellungen.parse({
    firma: TEST_FIRMA,
    kontenrahmen: "SKR03",
    datev: { beraternummer: "1001", mandantennummer: "456", sachkontenlaenge: 4, bankkonto: "1200", erloeskonto: "8400", kreditorStart: 70000, debitorStart: 10000 },
    ...patch,
  });
}

export const TEST_KOSTENARTEN: Kostenart[] = STANDARD_KOSTENARTEN;

export const TEST_OBJEKTE: Objekt[] = [
  Objekt.parse({
    id: "OBJ-001",
    kurzname: "WEG Am Stadtpark 3",
    adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln" },
    art: "WEG",
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Am Stadtpark 3", adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln" }, email: "beirat.stadtpark@example.de", kundennummer: "K-1001" },
  }),
  Objekt.parse({
    id: "OBJ-002",
    kurzname: "Bahnhofstraße 7",
    adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln" },
    art: "MIET",
    auftraggeber: { name: "Erika Vogel", adresse: { strasse: "Rösrather Straße 12", plz: "51107", ort: "Köln" }, kundennummer: "K-1002" },
  }),
];

export const TEST_BANKKONTEN: Bankkonto[] = [
  Bankkonto.parse({ id: "BK-001", bezeichnung: "Mietkonto Bahnhofstraße 7", iban: "DE41500105170123456789", bic: "INGDDEFFXXX", bankname: "ING", objektId: "OBJ-002" }),
  Bankkonto.parse({ id: "BK-003", bezeichnung: "Geschäftskonto Verwaltung", iban: "DE02120300000000202051", bic: "BYLADEM1001", bankname: "DKB", objektId: null }),
];

export const TEST_PERSONEN: Person[] = [
  Person.parse({ id: "P-201", objektId: "OBJ-002", einheitId: "E-201", rolle: "mieter", name: "Anna Schmidt", ibans: ["DE21100110012626667882"], soll: { kalt: 720, nebenkosten: 180 }, seit: "2019-05-01" }),
  Person.parse({ id: "P-202", objektId: "OBJ-002", einheitId: "E-202", rolle: "mieter", name: "Familie Yilmaz", soll: { kalt: 810, nebenkosten: 200 }, seit: "2021-02-01" }),
];

export function testBeleg(patch: Record<string, unknown> = {}): Beleg {
  return Beleg.parse({
    id: "B-1",
    dokumentId: "D-1",
    lieferant: { name: "Schlosserei Müller & Söhne GmbH", adresse: "Werkstraße 9, 50827 Köln", iban: "DE89 3704 0044 0532 0130 00", bic: "COBADEFFXXX", kundennummerBeimLieferanten: "K-4711" },
    rechnungsnummer: "RE-2026/0815",
    rechnungsdatum: "2026-08-12",
    leistungVon: "2026-08-01",
    leistungBis: "2026-08-05",
    faelligAm: "2026-08-26",
    nettoGesamt: 500,
    ustGesamt: 95,
    bruttoGesamt: 595,
    steuersaetze: [{ satz: 19, netto: 500, ust: 95 }],
    objektId: "OBJ-001",
    kostenartCode: "INSTANDHALTUNG",
    zahlungsart: "ueberweisung",
    ...patch,
  });
}

export function testDokument(patch: Record<string, unknown> = {}): Dokument {
  return Dokument.parse({ id: "D-1", dateiname: "rechnung.pdf", mime: "application/pdf", groesse: 1000, hash: "abc", hochgeladenAm: "2026-08-12T09:00:00.000Z", typ: "eingangsrechnung", status: "gebucht", belegId: "B-1", ...patch });
}

export function testBuchung(patch: Record<string, unknown> = {}): Buchung {
  return Buchung.parse({
    id: "BU-1",
    datum: "2026-08-12",
    belegId: "B-1",
    objektId: "OBJ-001",
    kostenartCode: "INSTANDHALTUNG",
    umlagefaehig: false,
    konto: "4260",
    belegnummer: "RE-2026/0815",
    buchungstext: "Schlosserei Müller & Söhne GmbH RE-2026/0815",
    netto: 500,
    ust: 95,
    brutto: 595,
    ustSatz: 19,
    sollHaben: "S",
    quelle: "beleg",
    erstelltAm: "2026-08-12T10:00:00.000Z",
    ...patch,
  });
}

export function testRechnung(patch: Record<string, unknown> = {}): Rechnung {
  return Rechnung.parse({
    id: "R-1",
    nummer: "R-2026-0132",
    art: "honorar",
    datum: "2026-08-01",
    leistungVon: "2026-08-01",
    leistungBis: "2026-08-31",
    faelligAm: "2026-08-15",
    objektId: "OBJ-001",
    empfaenger: {
      name: "Wohnungseigentümergemeinschaft Am Stadtpark 3",
      zusatz: "vertreten durch die Verwaltung",
      adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln" },
      email: "beirat.stadtpark@example.de",
      kundennummer: "K-1001",
    },
    betreff: "Verwaltervergütung August 2026",
    positionen: [
      { pos: 1, leistungCode: "WEG_GRUND", bezeichnung: "WEG-Verwaltung, Grundhonorar August 2026", beschreibung: "25 Einheiten × 27,50 €", menge: 25, einheit: "Einheit/Monat", einzelpreisNetto: 27.5, gesamtNetto: 687.5, ustSatz: 19 },
      { pos: 2, leistungCode: "STELLPLATZ", bezeichnung: "Stellplätze August 2026", menge: 20, einheit: "Stellplatz/Monat", einzelpreisNetto: 3.5, gesamtNetto: 70, ustSatz: 19 },
    ],
    steuersaetze: [{ satz: 19, netto: 757.5, ust: 143.93 }],
    netto: 757.5,
    ust: 143.93,
    brutto: 901.43,
    zahlungsbedingung: "Zahlbar bis 15.08.2026 ohne Abzug.",
    status: "gestellt",
    erstelltAm: "2026-08-01T08:00:00.000Z",
    ...patch,
  });
}

export function testUmsatz(patch: Record<string, unknown> = {}): Bankumsatz {
  return Bankumsatz.parse({
    id: "U-1",
    bankkontoId: "BK-003",
    buchungstag: "2026-08-20",
    betrag: -595,
    name: "Schlosserei Mueller & Soehne GmbH",
    iban: "DE89370400440532013000",
    verwendungszweck: "Rechnung RE-2026/0815 vom 12.08.2026",
    endToEndId: "RE-2026/0815",
    hash: "h1",
    importiertAm: "2026-08-21T07:00:00.000Z",
    zuordnung: { art: "belegzahlung", belegId: "B-1", sicherheit: "sicher", quelle: "regel" },
    ...patch,
  });
}
