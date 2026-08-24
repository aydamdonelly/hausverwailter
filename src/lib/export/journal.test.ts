import { describe, expect, it } from "vitest";
import { filtereJournal, journalZeilen, LEERER_FILTER, monateImJournal, summenJeKostenart } from "./journal";
import { offeneForderungen, offeneVerbindlichkeiten, tageZwischen, zahlungsvorschlag } from "./offene-posten";
import { mieteingang, monateZwischen } from "./mieteingang";
import { kreditorSchluessel, personenkonten, startFuerLaenge } from "./personenkonten";
import { TEST_BANKKONTEN, TEST_FIRMA, TEST_KOSTENARTEN, TEST_OBJEKTE, TEST_PERSONEN, testBeleg, testBuchung, testDokument, testEinstellungen, testRechnung, testUmsatz } from "./testdaten";
import { Firma } from "../domain/schema";

const kontext = { objekte: TEST_OBJEKTE, kostenarten: TEST_KOSTENARTEN, belege: [testBeleg()], rechnungen: [testRechnung()], bankumsaetze: [testUmsatz()] };

describe("Buchungsjournal", () => {
  it("bildet Buchungen auf Journalzeilen mit Objekt, Kostenart und Partner ab, neueste zuerst", () => {
    const zeilen = journalZeilen([testBuchung(), testBuchung({ id: "BU-2", datum: "2026-08-20", quelle: "bank", belegId: null, bankumsatzId: "U-1", konto: "1200" })], kontext);
    expect(zeilen.map((z) => z.id)).toEqual(["BU-2", "BU-1"]);
    const z = zeilen[1];
    expect(z.objekt).toBe("WEG Am Stadtpark 3");
    expect(z.kostenart).toBe("Instandhaltung und Instandsetzung");
    expect(z.umlagefaehig).toBe(false);
    expect(z.partner).toBe("Schlosserei Müller & Söhne GmbH");
    expect(z.belegnummer).toBe("RE-2026/0815");
    expect(zeilen[0].partner).toBe("Schlosserei Mueller & Soehne GmbH");
  });

  it("filtert nach Monat, Objekt, Quelle und Exportstatus", () => {
    const zeilen = journalZeilen(
      [
        testBuchung(),
        testBuchung({ id: "BU-2", datum: "2026-07-05", objektId: "OBJ-002", exportiertAm: "2026-08-01T10:00:00.000Z" }),
        testBuchung({ id: "BU-3", datum: "2026-08-20", quelle: "bank" }),
      ],
      kontext,
    );
    expect(monateImJournal(zeilen)).toEqual(["2026-08", "2026-07"]);
    expect(filtereJournal(zeilen, { ...LEERER_FILTER, monat: "2026-08" }).map((z) => z.id)).toEqual(["BU-3", "BU-1"]);
    expect(filtereJournal(zeilen, { ...LEERER_FILTER, objektId: "OBJ-002" }).map((z) => z.id)).toEqual(["BU-2"]);
    expect(filtereJournal(zeilen, { ...LEERER_FILTER, quelle: "bank" }).map((z) => z.id)).toEqual(["BU-3"]);
    expect(filtereJournal(zeilen, { ...LEERER_FILTER, exportiert: "ja" }).map((z) => z.id)).toEqual(["BU-2"]);
    expect(filtereJournal(zeilen, { ...LEERER_FILTER, exportiert: "nein" }).map((z) => z.id)).toEqual(["BU-3", "BU-1"]);
  });

  it("summiert je Kostenart, getrennt nach umlagefähig, ohne Erlöse, Zahlungen zu Belegen und Mieteingänge", () => {
    const zeilen = journalZeilen(
      [
        testBuchung(), // Instandhaltung 595, nicht umlagefähig
        testBuchung({ id: "BU-2", kostenartCode: "GARTENPFLEGE", umlagefaehig: true, netto: 100, ust: 19, brutto: 119 }),
        testBuchung({ id: "BU-3", kostenartCode: "GARTENPFLEGE", umlagefaehig: true, netto: 50, ust: 9.5, brutto: 59.5 }),
        testBuchung({ id: "BU-4", quelle: "rechnung", belegId: null, rechnungId: "R-1", kostenartCode: null, netto: 757.5, ust: 143.93, brutto: 901.43 }),
        testBuchung({ id: "BU-5", quelle: "bank", bankumsatzId: "U-1", netto: -595, ust: 0, brutto: -595 }),
        testBuchung({ id: "BU-6", quelle: "bank", belegId: null, bankumsatzId: "U-3", kostenartCode: "BANKGEBUEHREN", umlagefaehig: false, netto: -12.5, ust: 0, brutto: -12.5 }),
        testBuchung({ id: "BU-7", quelle: "bank", belegId: null, bankumsatzId: "U-2", kostenartCode: null, umlagefaehig: null, netto: 900, ust: 0, brutto: 900 }), // Mieteingang, kein Aufwand
      ],
      kontext,
    );
    const s = summenJeKostenart(zeilen);
    expect(s.umlagefaehig.map((g) => [g.bezeichnung, g.anzahl, g.netto, g.brutto])).toEqual([["Gartenpflege", 2, 150, 178.5]]);
    expect(s.nichtUmlagefaehig.map((g) => [g.bezeichnung, g.brutto])).toEqual([
      ["Bankgebühren", -12.5],
      ["Instandhaltung und Instandsetzung", 595],
    ]);
    expect(s.summeUmlagefaehig).toEqual({ netto: 150, ust: 28.5, brutto: 178.5 });
    expect(s.summeNichtUmlagefaehig.brutto).toBe(582.5);
    expect(s.gesamt.brutto).toBe(761);
  });
});

describe("Offene Posten und Zahlungsvorschlag", () => {
  const heute = "2026-09-01";

  it("listet unbezahlte, freigegebene Belege und markiert Überfälliges", () => {
    const belege = [
      testBeleg(), // fällig 26.08., gebucht
      testBeleg({ id: "B-2", dokumentId: "D-2", rechnungsnummer: "X-2", faelligAm: "2026-09-10" }),
      testBeleg({ id: "B-3", dokumentId: "D-3", rechnungsnummer: "X-3", bezahltAm: "2026-08-20" }),
      testBeleg({ id: "B-4", dokumentId: "D-4", rechnungsnummer: "X-4" }), // nur erkannt
      testBeleg({ id: "B-5", dokumentId: "D-5", rechnungsnummer: "X-5", zahlungsart: "bereits_bezahlt" }),
    ];
    const dokumente = [testDokument(), testDokument({ id: "D-2", status: "freigegeben" }), testDokument({ id: "D-3" }), testDokument({ id: "D-4", status: "erkannt" }), testDokument({ id: "D-5" })];
    const offen = offeneVerbindlichkeiten(belege, dokumente, TEST_OBJEKTE, heute);
    expect(offen.map((p) => p.nummer)).toEqual(["RE-2026/0815", "X-2"]);
    expect(offen[0].ueberfaellig).toBe(true);
    expect(offen[0].tageUeberfaellig).toBe(6);
    expect(offen[0].objekt).toBe("WEG Am Stadtpark 3");
    expect(offen[0].iban).toBe("DE89370400440532013000");
    expect(offen[1].ueberfaellig).toBe(false);
    expect(tageZwischen("2026-08-26", "2026-09-01")).toBe(6);
  });

  it("listet gestellte, unbezahlte Rechnungen als Forderungen", () => {
    const f = offeneForderungen([testRechnung(), testRechnung({ id: "R-2", nummer: "R-2", status: "bezahlt" }), testRechnung({ id: "R-3", nummer: "R-3", status: "entwurf" })], TEST_OBJEKTE, heute);
    expect(f.map((p) => p.nummer)).toEqual(["R-2026-0132"]);
    expect(f[0].art).toBe("forderung");
    expect(f[0].betrag).toBe(901.43);
    expect(f[0].ueberfaellig).toBe(true);
  });

  it("gruppiert den Zahlungsvorschlag je Auftraggeberkonto und sortiert Lastschrift und fehlende IBAN aus", () => {
    const belege = [
      testBeleg(), // OBJ-001 ohne eigenes Konto → Verwaltung
      testBeleg({ id: "B-2", dokumentId: "D-2", rechnungsnummer: "X-2", objektId: "OBJ-002" }), // Mietkonto
      testBeleg({ id: "B-3", dokumentId: "D-3", rechnungsnummer: "X-3", zahlungsart: "lastschrift" }),
      testBeleg({ id: "B-4", dokumentId: "D-4", rechnungsnummer: "X-4", lieferant: { name: "Ohne Konto", iban: "" } }),
      testBeleg({ id: "B-5", dokumentId: "D-5", rechnungsnummer: "X-5", lieferant: { name: "Falsche IBAN", iban: "DE00123" } }),
    ];
    const dokumente = belege.map((b) => testDokument({ id: b.dokumentId, belegId: b.id }));
    const offen = offeneVerbindlichkeiten(belege, dokumente, TEST_OBJEKTE, heute);
    const v = zahlungsvorschlag(offen, TEST_BANKKONTEN, TEST_OBJEKTE, Firma.parse(TEST_FIRMA));
    expect(v.lastschrift.map((p) => p.nummer)).toEqual(["X-3"]);
    expect(v.ohneIban.map((p) => p.nummer)).toEqual(["X-4", "X-5"]);
    expect(v.gruppen).toHaveLength(2);
    const verwaltung = v.gruppen.find((g) => g.konto.bankkontoId === "BK-003")!;
    expect(verwaltung.konto.name).toBe("Hausverwaltung Mustermann GmbH");
    expect(verwaltung.posten.map((p) => p.nummer)).toEqual(["RE-2026/0815"]);
    expect(verwaltung.summe).toBe(595);
    const miet = v.gruppen.find((g) => g.konto.bankkontoId === "BK-001")!;
    expect(miet.konto.name).toBe("Erika Vogel");
    expect(miet.konto.iban).toBe("DE41500105170123456789");
    expect(miet.posten.map((p) => p.nummer)).toEqual(["X-2"]);
  });

  it("fällt auf die IBAN der Firma zurück, wenn kein Bankkonto angelegt ist", () => {
    const offen = offeneVerbindlichkeiten([testBeleg()], [testDokument()], TEST_OBJEKTE, heute);
    const v = zahlungsvorschlag(offen, [], TEST_OBJEKTE, Firma.parse(TEST_FIRMA));
    expect(v.gruppen[0].konto.bankkontoId).toBeNull();
    expect(v.gruppen[0].konto.iban).toBe("DE02120300000000202051");
  });
});

describe("Mieteingang", () => {
  it("rechnet Soll gegen zugeordnete Eingänge je Monat", () => {
    const umsaetze = [
      testUmsatz({ id: "U-2", bankkontoId: "BK-001", buchungstag: "2026-08-03", betrag: 900, zuordnung: { art: "mieteingang", personId: "P-201", monat: "2026-08" } }),
      testUmsatz({ id: "U-3", bankkontoId: "BK-001", buchungstag: "2026-07-02", betrag: 500, zuordnung: { art: "mieteingang", personId: "P-202", monat: "2026-07" } }),
      testUmsatz({ id: "U-4", bankkontoId: "BK-001", buchungstag: "2026-07-04", betrag: 300, zuordnung: { art: "mieteingang", personId: "P-202" } }),
      testUmsatz({ id: "U-5", bankkontoId: "BK-001", buchungstag: "2026-08-04", betrag: 1200, zuordnung: { art: "mieteingang", personId: "P-202", monat: "2026-08" } }),
    ];
    expect(monateZwischen("2026-07-15", "2026-09-01")).toEqual(["2026-07", "2026-08", "2026-09"]);
    const zeilen = mieteingang(TEST_PERSONEN, umsaetze, TEST_OBJEKTE, ["2026-07", "2026-08"]);
    expect(zeilen.map((z) => [z.monat, z.person, z.soll, z.ist, z.status])).toEqual([
      ["2026-07", "Anna Schmidt", 900, 0, "offen"],
      ["2026-07", "Familie Yilmaz", 1010, 800, "teilweise"],
      ["2026-08", "Anna Schmidt", 900, 900, "bezahlt"],
      ["2026-08", "Familie Yilmaz", 1010, 1200, "ueberzahlt"],
    ]);
    expect(zeilen[1].differenz).toBe(-210);
    expect(zeilen[0].objekt).toBe("Bahnhofstraße 7");
  });
});

describe("Personenkonten", () => {
  it("normalisiert Lieferantennamen und vergibt fortlaufend ab dem Start", () => {
    expect(kreditorSchluessel("Schlosserei Müller & Söhne GmbH")).toBe("schlosserei mueller soehne");
    expect(kreditorSchluessel("  STADTWERKE Köln AG ")).toBe("stadtwerke koeln");
    expect(kreditorSchluessel("Müller & Söhne GmbH & Co. KG")).toBe("mueller soehne");
    expect(startFuerLaenge(70000, 4)).toBe(70000);
    expect(startFuerLaenge(70000, 5)).toBe(700000);
    expect(startFuerLaenge(10000, 6)).toBe(1000000);
    const e = testEinstellungen();
    const k = personenkonten({ ...e.datev, kreditoren: { "alte firma": "70007" }, debitoren: {} });
    expect(k.kreditor("Neue Firma GmbH")).toBe("70008");
    expect(k.kreditor("neue firma")).toBe("70008");
    expect(k.kreditor("Alte Firma")).toBe("70007");
    expect(k.debitor("K-1", "WEG A")).toBe("10000");
    expect(k.debitor("", "Frau Vogel")).toBe("10001");
    expect(k.debitor("", "Frau Vogel")).toBe("10001");
    expect(k.neueKreditoren).toEqual(["Neue Firma GmbH"]);
    expect(k.neueDebitoren).toEqual(["WEG A", "Frau Vogel"]);
    expect(k.kreditoren).toEqual({ "alte firma": "70007", "neue firma": "70008" });
  });
});
