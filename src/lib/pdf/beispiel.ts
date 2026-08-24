/**
 * Beispieldokumente für Tests und die Sichtprobe (probe.ts): ein Angebot für eine WEG,
 * eine dreiseitige Rechnung mit zwei Steuersätzen und drei Mahnstufen. Die Firma entspricht
 * BEISPIEL_FIRMA aus lib/beispiel/daten.ts (dort hängt Dexie dran, deshalb hier eine Kopie
 * ohne Datenbankabhängigkeit).
 */
import { Angebot, Firma, Mahnung, Rechnung, type Position } from "../domain/schema";
import { summen } from "../geld";

export const BEISPIEL_PDF_FIRMA: Firma = Firma.parse({
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
  branche: "hausverwaltung",
});

const WEG_STADTPARK = {
  name: "Wohnungseigentümergemeinschaft Am Stadtpark 3",
  zusatz: "vertreten durch den Verwaltungsbeirat, z. Hd. Herrn Herbert Klein",
  adresse: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", land: "DE" },
  email: "beirat.stadtpark@example.de",
  kundennummer: "K-1001",
  leitwegId: "",
  ustIdNr: "",
};

function position(pos: number, bezeichnung: string, beschreibung: string, menge: number, einheit: string, einzelpreisNetto: number, ustSatz = 19): Position {
  return { pos, leistungCode: "", bezeichnung, beschreibung, menge, einheit, einzelpreisNetto, gesamtNetto: Math.round(menge * einzelpreisNetto * 100) / 100, ustSatz };
}

export function beispielAngebot(): Angebot {
  const positionen = [
    position(1, "WEG-Verwaltung, Grundhonorar", "Kaufmännische, technische und rechtliche Verwaltung des Gemeinschaftseigentums nach § 27 WEG.", 25, "einheit_monat", 27.5),
    position(2, "Zuschlag Gewerbeeinheit", "Mehraufwand für den Gewerbemietvertrag im Erdgeschoss und dessen Indexierung.", 1, "einheit_monat", 12),
    position(3, "Stellplatz / Garage", "Tiefgaragenstellplätze inkl. Abrechnung der Torwartung.", 20, "stellplatz_monat", 3.5),
  ];
  const zwischensumme = summen(positionen).netto;
  const rabattBetrag = Math.round(zwischensumme * 0.05 * 100) / 100;
  const netto = Math.round((zwischensumme - rabattBetrag) * 100) / 100;
  const ust = Math.round(netto * 0.19 * 100) / 100;
  return Angebot.parse({
    id: "ANG-BEISPIEL",
    nummer: "A-2026-0017",
    datum: "2026-08-23",
    gueltigBis: "2026-10-31",
    anfrageId: null,
    empfaenger: WEG_STADTPARK,
    ansprechpartner: "Max Mustermann",
    objekt: {
      strasse: "Am Stadtpark 3",
      plz: "50674",
      ort: "Köln",
      art: "WEG",
      einheitenWohnen: 24,
      einheitenGewerbe: 1,
      stellplaetze: 20,
      besonderheiten: ["zwei Aufzüge", "Tiefgarage", "Baujahr 1996"],
    },
    betreff: "Verwaltung der Wohnungseigentümergemeinschaft Am Stadtpark 3, Köln",
    positionen,
    rabattProzent: 5,
    rabattBetrag,
    netto,
    ustSatz: 19,
    ust,
    brutto: Math.round((netto + ust) * 100) / 100,
    turnus: "monatlich",
    laufzeitText: "Der Verwaltervertrag läuft zunächst drei Jahre ab Bestellung und verlängert sich um jeweils ein Jahr, wenn er nicht drei Monate vor Ablauf gekündigt wird.",
    leistungsumfang: [
      "Vorbereitung, Einladung und Durchführung der jährlichen Eigentümerversammlung mit Protokoll und Beschlusssammlung",
      "Erstellung von Wirtschaftsplan und Jahresabrechnung mit Einzelabrechnungen, Vermögensbericht nach § 28 Abs. 4 WEG",
      "Führung der Gemeinschaftskonten, Hausgeldinkasso und Mahnwesen",
      "Abschluss und Überwachung von Wartungs-, Versicherungs- und Versorgungsverträgen",
      "Regelmäßige Objektbegehung, Koordination von Instandhaltung und Handwerkern",
    ],
    sonderleistungen: [
      { bezeichnung: "Zusätzliche Eigentümerversammlung", preisNetto: 350, einheit: "pauschal" },
      { bezeichnung: "Baubegleitung größerer Maßnahmen", preisNetto: 75, einheit: "stunde" },
      { bezeichnung: "Mahnung (Hausgeld)", preisNetto: 15, einheit: "stueck" },
    ],
    annahmen: [
      "Die Verwaltungsunterlagen werden vollständig und digital übergeben.",
      "Das Gemeinschaftskonto wird auf ein Konto bei einer Bank mit Online-Zugang geführt.",
      "Die Hausgeldzahlungen laufen im SEPA-Lastschriftverfahren.",
    ],
    anschreiben: [
      "vielen Dank für Ihre Anfrage vom 18.08.2026 und das Gespräch mit Ihrem Verwaltungsbeirat. Gern übernehmen wir die Verwaltung Ihrer Gemeinschaft mit 25 Einheiten und 20 Tiefgaragenstellplätzen ab dem 01.01.2027.",
      "Unser Angebot umfasst die vollständige kaufmännische, technische und rechtliche Verwaltung nach § 27 WEG. Auf die Grundvergütung gewähren wir Ihnen wegen der Objektgröße einen Nachlass von 5 %.",
    ],
    antwortEmail: null,
    status: "entwurf",
    erstelltAm: "2026-08-23T09:15:00.000Z",
  });
}

/** Dreiseitige Rechnung: Honorar für ein Quartal, viele Sonderleistungen, zwei Steuersätze. */
export function beispielRechnung(): Rechnung {
  const positionen: Position[] = [
    position(1, "WEG-Verwaltung, Grundhonorar Juli 2026", "25 Einheiten × 27,50 € abzüglich 5 % Nachlass nach Verwaltervertrag vom 01.01.2021.", 1, "pauschal_monat", 653.13),
    position(2, "WEG-Verwaltung, Grundhonorar August 2026", "25 Einheiten × 27,50 € abzüglich 5 % Nachlass.", 1, "pauschal_monat", 653.13),
    position(3, "WEG-Verwaltung, Grundhonorar September 2026", "25 Einheiten × 27,50 € abzüglich 5 % Nachlass.", 1, "pauschal_monat", 653.13),
    position(4, "Stellplätze Juli bis September 2026", "20 Tiefgaragenstellplätze × 3,50 € × 3 Monate.", 60, "stellplatz_monat", 3.5),
    position(5, "Zusätzliche Eigentümerversammlung am 14.07.2026", "Beschlussfassung zur Dachsanierung; Einladung, Durchführung, Protokoll und Beschlusssammlung.", 1, "pauschal", 350),
    position(6, "Baubegleitung Dachsanierung, Juli 2026", "Angebotsvergleich, Vergabegespräche, Baustellentermine (Stundennachweis liegt bei).", 12.5, "stunde", 75),
    position(7, "Baubegleitung Dachsanierung, August 2026", "Bauleitungstermine, Abnahme des ersten Bauabschnitts, Rechnungsprüfung.", 9, "stunde", 75),
    position(8, "Baubegleitung Dachsanierung, September 2026", "Abnahme des zweiten Bauabschnitts, Mängelverfolgung, Schlussrechnungsprüfung.", 6.5, "stunde", 75),
    position(9, "Mahnungen Hausgeld (Einheiten 7, 12 und 19)", "Je Mahnung nach Sonderleistungskatalog; Zeitraum Juli bis September 2026.", 3, "stueck", 15),
    position(10, "Wohnungsübergabe Einheit 12 am 31.08.2026", "Protokoll, Zählerstände, Schlüsselübergabe an die neue Eigentümerin.", 1, "stueck", 120),
    position(11, "Schriftverkehr Versicherungsschaden Wasserrohrbruch 3. OG", "Schadensmeldung, Abstimmung mit dem Gebäudeversicherer, Regulierung.", 4, "stunde", 75),
    position(12, "Beschaffung der Grundbuchauszüge", "Für die Beschlusssammlung nach Eigentümerwechsel; Auslagen nach Kostenverzeichnis.", 3, "stueck", 20),
    position(13, "Bereitstellung der Verwaltungsunterlagen auf Datenträger", "Jahresabrechnungen 2021 bis 2025 auf USB-Stick für den Verwaltungsbeirat.", 1, "stueck", 45),
    position(14, "Rauchwarnmelderprüfung, Koordination", "Terminabstimmung mit dem Wartungsdienst und den 24 Wohnungen.", 2.5, "stunde", 75),
    position(15, "Fachliteratur und Formulare (WEG-Beschlusssammlung, gedruckt)", "Weiterberechnung der Auslagen zum ermäßigten Steuersatz für Druckerzeugnisse.", 2, "stueck", 38.5, 7),
    position(16, "Kopien und Postversand Einladungen Eigentümerversammlung", "Weiterberechnung Porto und Druck; 26 Einladungen mit Anlagen.", 26, "stueck", 2.1),
    position(17, "Kartenmaterial und Pläne, Druck DIN A1", "Weiterberechnung Druckerzeugnisse (Dachsanierung) zum ermäßigten Steuersatz.", 4, "stueck", 12.75, 7),
    position(18, "Anfahrten Sondertermine", "Fahrtkosten nach Verwaltervertrag § 6 Abs. 3.", 7, "stueck", 12),
  ];
  const s = summen(positionen);
  return Rechnung.parse({
    id: "RE-BEISPIEL",
    nummer: "R-2026-0132",
    art: "honorar",
    datum: "2026-10-01",
    leistungVon: "2026-07-01",
    leistungBis: "2026-09-30",
    faelligAm: "2026-10-15",
    objektId: "OBJ-001",
    angebotId: null,
    empfaenger: WEG_STADTPARK,
    betreff: "Verwaltervergütung und Sonderleistungen 3. Quartal 2026",
    einleitung: "",
    positionen,
    steuersaetze: s.steuersaetze,
    netto: s.netto,
    ust: s.ust,
    brutto: s.brutto,
    zahlungsbedingung: "",
    hinweise: ["Die Stundennachweise zur Baubegleitung liegen dieser Rechnung als Anlage bei."],
    status: "gestellt",
    bezahltAm: null,
    bankumsatzId: null,
    mahnstufe: 0,
    erstelltAm: "2026-10-01T08:00:00.000Z",
  });
}

export function beispielMahnung(stufe: 1 | 2 | 3): Mahnung {
  const posten =
    stufe === 3
      ? [
          { bezeichnung: "Miete Juli 2026", soll: 900, ist: 0, offen: 900 },
          { bezeichnung: "Miete August 2026", soll: 900, ist: 0, offen: 900 },
          { bezeichnung: "Miete September 2026", soll: 900, ist: 450, offen: 450 },
        ]
      : stufe === 2
        ? [
            { bezeichnung: "Miete August 2026", soll: 900, ist: 0, offen: 900 },
            { bezeichnung: "Miete September 2026", soll: 900, ist: 450, offen: 450 },
          ]
        : [{ bezeichnung: "Miete September 2026", soll: 900, ist: 450, offen: 450 }];
  const betragOffen = posten.reduce((a, p) => a + p.offen, 0);
  const mahngebuehr = stufe === 1 ? 0 : 2.5;
  const verzugszinsen = stufe === 1 ? 0 : stufe === 2 ? 4.83 : 21.37;
  return Mahnung.parse({
    id: `MA-BEISPIEL-${stufe}`,
    nummer: `M-2026-${String(stufe + 7).padStart(4, "0")}`,
    stufe,
    datum: stufe === 1 ? "2026-09-10" : stufe === 2 ? "2026-09-24" : "2026-10-08",
    frist: stufe === 1 ? "2026-09-20" : stufe === 2 ? "2026-10-05" : "2026-10-18",
    objektId: "OBJ-002",
    personId: "P-203",
    rechnungId: null,
    empfaenger: {
      name: "Herrn Peter Wagner",
      zusatz: "Wohnung 3, 1. OG links",
      adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln", land: "DE" },
      email: "",
      kundennummer: "M-203",
      leitwegId: "",
      ustIdNr: "",
    },
    posten,
    betragOffen,
    mahngebuehr,
    verzugszinsen,
    gesamt: Math.round((betragOffen + mahngebuehr + verzugszinsen) * 100) / 100,
    text: [],
    status: "erstellt",
    erstelltAm: "2026-09-10T07:30:00.000Z",
  });
}
