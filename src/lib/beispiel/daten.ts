/**
 * Der Beispielbetrieb: "Hausverwaltung Mustermann GmbH" in Köln mit fünf Objekten.
 * Alle Namen, Adressen, IBANs und Nummern sind erfunden (IBANs sind gültig gebaut, gehören
 * aber niemandem). Die Beispieldokumente unter public/beispiel/ passen zu diesen Daten.
 */
import { db, neueId } from "../store/db";
import { Einstellungen, type Bankkonto, type Einheit, type Objekt, type Person } from "../domain/schema";
import { STANDARD_KOSTENARTEN, STANDARD_LEISTUNGEN_HAUSVERWALTUNG, STANDARD_STAFFEL } from "../domain/standard";
import { dokumentAblegen } from "../store/dokumente";

export const BEISPIEL_FIRMA = {
  name: "Hausverwaltung Mustermann GmbH",
  zusatz: "Haus- und Wohnungsverwaltung",
  adresse: { strasse: "Kaiserstraße 45", plz: "50667", ort: "Köln", land: "DE" },
  telefon: "0221 12 34 56 7",
  email: "post@hv-mustermann.de",
  web: "www.hv-mustermann.de",
  geschaeftsfuehrung: "Max Mustermann",
  registergericht: "Amtsgericht Köln",
  handelsregister: "HRB 12345",
  steuernummer: "215/5847/1234",
  ustIdNr: "DE123456789",
  iban: "DE02120300000000202051",
  bic: "BYLADEM1001",
  bankname: "Deutsche Kreditbank",
  glaeubigerId: "DE98ZZZ09999999999",
  logoDataUrl: null,
  farbe: "#15201b",
  zahlungszielTage: 14,
  kleinunternehmer: false,
  ustSatz: 19,
  freigabegrenze: 1000,
  branche: "hausverwaltung" as const,
};

export const BEISPIEL_OBJEKTE: Objekt[] = [
  {
    id: "OBJ-001", kurzname: "WEG Am Stadtpark 3", adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", land: "DE" }, art: "WEG",
    einheitenWohnen: 24, einheitenGewerbe: 1, stellplaetze: 20, baujahr: 1996,
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Am Stadtpark 3", zusatz: "vertreten durch die Verwaltung", adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", land: "DE" }, email: "beirat.stadtpark@example.de", kundennummer: "K-1001", leitwegId: "", mandatsreferenz: "" },
    honorarNettoMonat: null, verwaltungSeit: "2021-01-01", bankIban: "DE12500105170648489890", leistungCodes: [], aktiv: true, notizen: "Zwei Aufzüge, Tiefgarage. Beiratsvorsitz: Herbert Klein.",
  },
  {
    id: "OBJ-002", kurzname: "Bahnhofstraße 7", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, art: "MIET",
    einheitenWohnen: 8, einheitenGewerbe: 0, stellplaetze: 4, baujahr: 1962,
    auftraggeber: { name: "Erika Vogel", zusatz: "", adresse: { strasse: "Rösrather Straße 12", plz: "51107", ort: "Köln", land: "DE" }, email: "erika.vogel@example.de", kundennummer: "K-1002", leitwegId: "", mandatsreferenz: "" },
    honorarNettoMonat: null, verwaltungSeit: "2023-04-01", bankIban: "DE41500105170123456789", leistungCodes: [], aktiv: true, notizen: "Mietkonto läuft auf die Eigentümerin, Verwaltung hat Vollmacht.",
  },
  {
    id: "OBJ-003", kurzname: "WEG Rosenhof 5-7", adresse: { strasse: "Rosenhof 5-7", plz: "50823", ort: "Köln", land: "DE" }, art: "WEG",
    einheitenWohnen: 40, einheitenGewerbe: 2, stellplaetze: 30, baujahr: 2008,
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Rosenhof 5-7", zusatz: "vertreten durch die Verwaltung", adresse: { strasse: "Rosenhof 5", plz: "50823", ort: "Köln", land: "DE" }, email: "beirat.rosenhof@example.de", kundennummer: "K-1003", leitwegId: "", mandatsreferenz: "" },
    honorarNettoMonat: 1450, verwaltungSeit: "2019-07-01", bankIban: "DE75512108001245126199", leistungCodes: [], aktiv: true, notizen: "Vertraglich fester Pauschalpreis.",
  },
  {
    id: "OBJ-004", kurzname: "Gartenweg 21", adresse: { strasse: "Gartenweg 21", plz: "50939", ort: "Köln", land: "DE" }, art: "MIET",
    einheitenWohnen: 6, einheitenGewerbe: 0, stellplaetze: 0, baujahr: 1978,
    auftraggeber: { name: "Familie Brandt GbR", zusatz: "z. Hd. Thomas Brandt", adresse: { strasse: "Luxemburger Straße 300", plz: "50939", ort: "Köln", land: "DE" }, email: "t.brandt@example.de", kundennummer: "K-1004", leitwegId: "", mandatsreferenz: "" },
    honorarNettoMonat: null, verwaltungSeit: "2024-01-01", bankIban: "DE89370400440532013000", leistungCodes: [], aktiv: true, notizen: "",
  },
  {
    id: "OBJ-005", kurzname: "WEG Severinstraße 88", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, art: "WEG",
    einheitenWohnen: 12, einheitenGewerbe: 1, stellplaetze: 6, baujahr: 1955,
    auftraggeber: { name: "Wohnungseigentümergemeinschaft Severinstraße 88", zusatz: "vertreten durch die Verwaltung", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, email: "beirat.severinstrasse@example.de", kundennummer: "K-1005", leitwegId: "", mandatsreferenz: "" },
    honorarNettoMonat: null, verwaltungSeit: "2022-10-01", bankIban: "DE27100777770209299700", leistungCodes: [], aktiv: true, notizen: "Dachsanierung 2027 geplant.",
  },
];

/** Mieter der Bahnhofstraße 7 (Mietobjekt) mit Sollmieten; die IBANs tauchen im Beispiel-Kontoauszug auf. */
export const BEISPIEL_PERSONEN: Person[] = [
  { id: "P-201", objektId: "OBJ-002", einheitId: "E-201", rolle: "mieter", anrede: "Frau", name: "Anna Schmidt", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: ["DE31100110012626667882"], soll: { kalt: 720, nebenkosten: 180, hausgeld: 0, faelligTag: 3 }, seit: "2019-05-01", bis: null, aktiv: true, notizen: "" },
  { id: "P-202", objektId: "OBJ-002", einheitId: "E-202", rolle: "mieter", anrede: "Familie", name: "Yilmaz", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: ["DE11520513735120710131"], soll: { kalt: 810, nebenkosten: 200, hausgeld: 0, faelligTag: 3 }, seit: "2021-02-01", bis: null, aktiv: true, notizen: "Zahlt vom Konto Mehmet Yilmaz." },
  { id: "P-203", objektId: "OBJ-002", einheitId: "E-203", rolle: "mieter", anrede: "Herr", name: "Jonas Weber", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: [], soll: { kalt: 650, nebenkosten: 160, hausgeld: 0, faelligTag: 3 }, seit: "2024-09-01", bis: null, aktiv: true, notizen: "" },
  { id: "P-204", objektId: "OBJ-002", einheitId: "E-204", rolle: "mieter", anrede: "Frau", name: "Petra Lang", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: ["DE40700202700012345678"], soll: { kalt: 690, nebenkosten: 170, hausgeld: 0, faelligTag: 3 }, seit: "2017-11-01", bis: null, aktiv: true, notizen: "" },
  { id: "P-205", objektId: "OBJ-002", einheitId: "E-205", rolle: "mieter", anrede: "Herr und Frau", name: "Lukas und Marie Hoffmann", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: [], soll: { kalt: 950, nebenkosten: 220, hausgeld: 0, faelligTag: 3 }, seit: "2022-06-01", bis: null, aktiv: true, notizen: "" },
  { id: "P-206", objektId: "OBJ-002", einheitId: "E-206", rolle: "mieter", anrede: "", name: "WG Becker / Ott", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: [], soll: { kalt: 880, nebenkosten: 210, hausgeld: 0, faelligTag: 3 }, seit: "2023-10-01", bis: null, aktiv: true, notizen: "Zwei Überweisungen je Monat (Becker und Ott je die Hälfte)." },
  { id: "P-207", objektId: "OBJ-002", einheitId: "E-207", rolle: "mieter", anrede: "Frau", name: "Elif Demir", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: ["DE26100100100057021049"], soll: { kalt: 700, nebenkosten: 175, hausgeld: 0, faelligTag: 3 }, seit: "2020-03-01", bis: null, aktiv: true, notizen: "Dauerauftrag ohne Verwendungszweck." },
  { id: "P-208", objektId: "OBJ-002", einheitId: "E-208", rolle: "mieter", anrede: "Herr", name: "Karl Fischer", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: ["DE04100500000190001060"], soll: { kalt: 620, nebenkosten: 150, hausgeld: 0, faelligTag: 3 }, seit: "2015-01-01", bis: null, aktiv: true, notizen: "" },
  // Eigentümer der WEG Severinstraße 88 (Auszug) mit Hausgeld
  { id: "P-501", objektId: "OBJ-005", einheitId: null, rolle: "eigentuemer", anrede: "Herr", name: "Dr. Stefan Berger", adresse: { strasse: "Severinstraße 88", plz: "50678", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: ["DE44500105175407324931"], soll: { kalt: 0, nebenkosten: 0, hausgeld: 310, faelligTag: 3 }, seit: null, bis: null, aktiv: true, notizen: "" },
  { id: "P-502", objektId: "OBJ-005", einheitId: null, rolle: "eigentuemer", anrede: "Frau", name: "Ingrid Sauer", adresse: { strasse: "Bonner Straße 5", plz: "50677", ort: "Köln", land: "DE" }, email: "", telefon: "", ibans: [], soll: { kalt: 0, nebenkosten: 0, hausgeld: 280, faelligTag: 3 }, seit: null, bis: null, aktiv: true, notizen: "Vermietet ihre Wohnung." },
];

export const BEISPIEL_EINHEITEN: Einheit[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `E-20${n}`, objektId: "OBJ-002", bezeichnung: `Whg ${n}`, art: "wohnung" as const, flaecheQm: [62, 74, 55, 60, 88, 81, 58, 52][n - 1], lage: ["EG links", "EG rechts", "1. OG links", "1. OG rechts", "2. OG links", "2. OG rechts", "3. OG links", "3. OG rechts"][n - 1] })),
];

export const BEISPIEL_BANKKONTEN: Bankkonto[] = [
  { id: "BK-001", bezeichnung: "Mietkonto Bahnhofstraße 7", iban: "DE41500105170123456789", bic: "INGDDEFFXXX", bankname: "ING", objektId: "OBJ-002", format: "" },
  { id: "BK-002", bezeichnung: "Gemeinschaftskonto WEG Severinstraße 88", iban: "DE27100777770209299700", bic: "NORSDE51XXX", bankname: "norisbank", objektId: "OBJ-005", format: "" },
  { id: "BK-003", bezeichnung: "Geschäftskonto Verwaltung", iban: "DE02120300000000202051", bic: "BYLADEM1001", bankname: "DKB", objektId: null, format: "" },
];

/**
 * Beispieldokumente, die in den Posteingang gelegt werden (liegen unter public/beispiel/, erzeugt
 * von scripts/beispieldaten.mjs). Die Reihenfolge ist das Drehbuch der Demo (docs/BEISPIELE.md):
 * erst saubere Belege, dann die Fallen, dann Anfragen, Angebot und Kontoauszüge. Dateinamen mit
 * "kontoauszug" bekommen im Posteingang automatisch den Typ Kontoauszug und gehen an den Bankimport.
 */
export const BEISPIEL_DOKUMENTE: { pfad: string; mime: string }[] = [
  // Saubere Belege: Reparatur (Instandhaltung), Reinigung per Lastschrift, Aufzugswartung (umlagefähig), Baumarktbon als Foto
  { pfad: "/beispiel/rechnung-elektro-kaminski-2026-1187.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/rechnung-sauber-fein-2026-0711.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/rechnung-lifttec-wartung-q3-2026.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/foto-baumarkt-bon-bahnhofstrasse-7.jpg", mime: "image/jpeg" },
  // Fallen: Duplikat, zwei Steuersätze, fehlende Steuernummer, Freigabe/WEG/Versicherungsfall, Versicherungsteuer, Rechenfehler
  { pfad: "/beispiel/sauber-fein-2026-0711-erneut-gesendet.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/abschlag-rheinland-wasserwerke-07-2026.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/rechnung-garten-gruen-2026-31.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/rechnung-dachdeckerei-meier-26-0842-notreparatur.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/beitragsrechnung-rheinische-gebaeudeversicherung-2026-27.pdf", mime: "application/pdf" },
  { pfad: "/beispiel/rechnung-malerbetrieb-fuchs-2026-118.pdf", mime: "application/pdf" },
  // Anfragen und Handwerkerangebot
  { pfad: "/beispiel/anfrage-weg-lindenstrasse.eml", mime: "message/rfc822" },
  { pfad: "/beispiel/anfrage-whatsapp-vogel.txt", mime: "text/plain" },
  { pfad: "/beispiel/angebot-dachdeckerei-meier-dachsanierung-severinstrasse-88.pdf", mime: "application/pdf" },
  // Kontoauszüge: Sparkasse-CSV (ISO-8859-1), ING-CSV (UTF-8), MT940
  { pfad: "/beispiel/kontoauszug-bahnhofstr7-2026-07.csv", mime: "text/csv" },
  { pfad: "/beispiel/kontoauszug-severinstr88-2026-07.csv", mime: "text/csv" },
  { pfad: "/beispiel/kontoauszug-verwaltung-2026-07.sta", mime: "text/plain" },
];

export async function beispielbetriebAnlegen(): Promise<void> {
  const e = Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {});
  e.firma = { ...e.firma, ...BEISPIEL_FIRMA };
  e.staffel = STANDARD_STAFFEL;
  e.mindesthonorarMonat = 250;
  e.beispielGeladen = true;
  e.nummernkreise = {
    angebot: { prefix: "A-", jahr: 2026, zaehler: 16, stellen: 4 },
    rechnung: { prefix: "R-", jahr: 2026, zaehler: 131, stellen: 4 },
    mahnung: { prefix: "M-", jahr: 2026, zaehler: 7, stellen: 4 },
  };
  await db.transaction("rw", [db.einstellungen, db.objekte, db.einheiten, db.personen, db.kostenarten, db.leistungen, db.bankkonten], async () => {
    await db.einstellungen.put(e);
    await db.objekte.bulkPut(BEISPIEL_OBJEKTE);
    await db.einheiten.bulkPut(BEISPIEL_EINHEITEN);
    await db.personen.bulkPut(BEISPIEL_PERSONEN);
    if ((await db.kostenarten.count()) === 0) await db.kostenarten.bulkPut(STANDARD_KOSTENARTEN);
    if ((await db.leistungen.count()) === 0) await db.leistungen.bulkPut(STANDARD_LEISTUNGEN_HAUSVERWALTUNG.map((l) => ({ ...l, id: neueId() })));
    await db.bankkonten.bulkPut(BEISPIEL_BANKKONTEN);
  });
  for (const d of BEISPIEL_DOKUMENTE) {
    try {
      const res = await fetch(d.pfad);
      if (!res.ok) continue;
      const blob = await res.blob();
      const name = d.pfad.split("/").pop() ?? "beispiel";
      await dokumentAblegen(new File([blob], name, { type: d.mime }), "beispiel");
    } catch {
      /* Datei fehlt: kein Drama, die Stammdaten sind da */
    }
  }
}
