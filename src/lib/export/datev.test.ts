import { describe, expect, it } from "vitest";
import iconv from "iconv-lite";
import { cp1252Dekodieren } from "./cp1252";
import { DATEV_SPALTEN, datevBelegfeld1, datevBuchungsstapel, datevZeitstempel, wirtschaftsjahrBeginn, type DatevKontext } from "./datev";
import { TEST_BANKKONTEN, TEST_KOSTENARTEN, TEST_OBJEKTE, TEST_PERSONEN, testBeleg, testBuchung, testEinstellungen, testRechnung, testUmsatz } from "./testdaten";

const OPTIONEN = { erzeugtAm: "2026-08-23T14:30:00", exportiertVon: "Adam" };

function kontext(patch: Partial<DatevKontext> = {}): DatevKontext {
  return {
    einstellungen: testEinstellungen(),
    belege: [testBeleg()],
    rechnungen: [testRechnung()],
    bankumsaetze: [testUmsatz()],
    bankkonten: TEST_BANKKONTEN,
    objekte: TEST_OBJEKTE,
    kostenarten: TEST_KOSTENARTEN,
    personen: TEST_PERSONEN,
    ...patch,
  };
}

function zeilen(text: string): string[][] {
  return text.split("\r\n").filter((z) => z.length > 0).map((z) => z.split(";"));
}

describe("DATEV-Buchungsstapel", () => {
  it("schreibt den Header mit 31 Feldern in DATEV-Reihenfolge", () => {
    const e = datevBuchungsstapel([testBuchung()], kontext(), OPTIONEN);
    const [header] = zeilen(e.text);
    expect(header).toHaveLength(31);
    expect(header.slice(0, 6)).toEqual(['"EXTF"', "700", "21", '"Buchungsstapel"', "13", "20260823143000000"]);
    expect(header[7]).toBe('"HV"');
    expect(header[8]).toBe('"Adam"');
    expect(header[10]).toBe("1001"); // Beraternummer
    expect(header[11]).toBe("456"); // Mandantennummer
    expect(header[12]).toBe("20260101"); // WJ-Beginn
    expect(header[13]).toBe("4"); // Sachkontenlänge
    expect(header[14]).toBe("20260812"); // Datum vom
    expect(header[15]).toBe("20260812"); // Datum bis
    expect(header[16]).toBe('"Buchungen 08/2026"');
    expect(header[18]).toBe("1"); // Buchungstyp
    expect(header[20]).toBe("0"); // Festschreibung
    expect(header[21]).toBe('"EUR"');
    expect(header[26]).toBe('"03"'); // SKR
    expect(e.dateiname).toBe("EXTF_Buchungsstapel_20260812_20260812.csv");
    expect(e.text.endsWith("\r\n")).toBe(true);
    expect(e.text).not.toContain("\n\n");
  });

  it("hat genau die 125 offiziellen Spaltenüberschriften", () => {
    expect(DATEV_SPALTEN).toHaveLength(125);
    const e = datevBuchungsstapel([testBuchung()], kontext(), OPTIONEN);
    const [, spalten] = zeilen(e.text);
    expect(spalten).toHaveLength(125);
    expect(spalten[0]).toBe("Umsatz (ohne Soll/Haben-Kz)");
    expect(spalten[6]).toBe("Konto");
    expect(spalten[7]).toBe("Gegenkonto (ohne BU-Schlüssel)");
    expect(spalten[8]).toBe("BU-Schlüssel");
    expect(spalten[9]).toBe("Belegdatum");
    expect(spalten[10]).toBe("Belegfeld 1");
    expect(spalten[13]).toBe("Buchungstext");
    expect(spalten[20]).toBe("Beleginfo – Art 1");
    expect(spalten[36]).toBe("KOST1 – Kostenstelle");
    expect(spalten[47]).toBe("Zusatzinformation – Art 1");
    expect(spalten[113]).toBe("Festschreibung");
    expect(spalten[114]).toBe("Leistungsdatum");
    expect(spalten[116]).toBe("Fälligkeit");
    expect(spalten[124]).toBe("Abw. Skontokonto");
  });

  it("bucht eine Eingangsrechnung mit 19 % als Kreditor (H) an Aufwand mit BU 9, brutto", () => {
    const e = datevBuchungsstapel([testBuchung()], kontext(), OPTIONEN);
    const [, , satz] = zeilen(e.text);
    expect(satz).toHaveLength(125);
    expect(satz[0]).toBe("595,00");
    expect(satz[1]).toBe('"H"');
    expect(satz[2]).toBe('"EUR"');
    expect(satz[6]).toBe("70000"); // erster Kreditor
    expect(satz[7]).toBe("4260");
    expect(satz[8]).toBe('"9"');
    expect(satz[9]).toBe("1208"); // Belegdatum TTMM
    expect(satz[10]).toBe('"RE-2026/0815"');
    expect(satz[11]).toBe('"260826"'); // Fälligkeit TTMMJJ
    expect(satz[13]).toBe('"Schlosserei Müller & Söhne GmbH RE-2026/0815"');
    expect(satz[36]).toBe('"WEG Am Stadtpark 3"');
    expect(satz[113]).toBe("0");
    expect(satz[114]).toBe("05082026"); // Leistungsdatum
    expect(satz[116]).toBe("26082026"); // Fälligkeit TTMMJJJJ
    expect(e.kreditoren["schlosserei mueller soehne"]).toBe("70000");
    expect(e.neueKreditoren).toEqual(["Schlosserei Müller & Söhne GmbH"]);
    expect(e.warnungen).toEqual([]);
  });

  it("bucht 7 % Wasser mit BU 8 und eine Gutschrift im Soll", () => {
    const wasser = testBeleg({ id: "B-2", dokumentId: "D-2", lieferant: { name: "Stadtwerke Köln" }, rechnungsnummer: "SW-77", nettoGesamt: 100, ustGesamt: 7, bruttoGesamt: 107, steuersaetze: [{ satz: 7, netto: 100, ust: 7 }], kostenartCode: "WASSER" });
    const gutschrift = testBeleg({ id: "B-3", dokumentId: "D-3", art: "gutschrift", rechnungsnummer: "GS-1", faelligAm: null });
    const buchungen = [
      testBuchung({ id: "BU-2", belegId: "B-2", kostenartCode: "WASSER", konto: "4240", belegnummer: "SW-77", buchungstext: "Stadtwerke Köln SW-77", netto: 100, ust: 7, brutto: 107, ustSatz: 7 }),
      testBuchung({ id: "BU-3", belegId: "B-3", belegnummer: "GS-1", buchungstext: "Gutschrift", netto: -500, ust: -95, brutto: -595, sollHaben: "H", datum: "2026-08-13" }),
    ];
    const e = datevBuchungsstapel(buchungen, kontext({ belege: [testBeleg(), wasser, gutschrift] }), OPTIONEN);
    const [, , w, g] = zeilen(e.text);
    expect(w.slice(0, 2)).toEqual(["107,00", '"H"']);
    expect(w[7]).toBe("4240");
    expect(w[8]).toBe('"8"');
    expect(g.slice(0, 2)).toEqual(["595,00", '"S"']);
    expect(g[11]).toBe("");
    expect(e.kreditoren["stadtwerke koeln"]).toBe("70000");
    expect(e.kreditoren["schlosserei mueller soehne"]).toBe("70001");
  });

  it("vergibt Kreditoren stabil über Exporte hinweg", () => {
    const erst = datevBuchungsstapel([testBuchung()], kontext(), OPTIONEN);
    const einstellungen = testEinstellungen({ datev: { ...testEinstellungen().datev, kreditoren: erst.kreditoren, kreditorStart: 70000 } });
    const neu = testBeleg({ id: "B-9", dokumentId: "D-9", lieferant: { name: "Gärtnerei Grün" }, rechnungsnummer: "G-1" });
    const zweit = datevBuchungsstapel(
      [testBuchung({ id: "BU-9", belegId: "B-9", belegnummer: "G-1", datum: "2026-09-01" }), testBuchung({ datum: "2026-09-02" })],
      kontext({ einstellungen, belege: [testBeleg(), neu] }),
      OPTIONEN,
    );
    const [, , a, b] = zeilen(zweit.text);
    expect(a[6]).toBe("70001"); // neuer Lieferant bekommt die nächste Nummer
    expect(b[6]).toBe("70000"); // bekannter Lieferant behält seine
    expect(zweit.neueKreditoren).toEqual(["Gärtnerei Grün"]);
  });

  it("bucht Ausgangsrechnungen als Debitor (S) an Erlöskonto ohne BU (Automatikkonto)", () => {
    const b = testBuchung({ id: "BU-R", belegId: null, rechnungId: "R-1", quelle: "rechnung", kostenartCode: null, konto: "", belegnummer: "R-2026-0132", buchungstext: "Verwaltervergütung August 2026", netto: 757.5, ust: 143.93, brutto: 901.43, datum: "2026-08-01" });
    const e = datevBuchungsstapel([b], kontext(), OPTIONEN);
    const [, , satz] = zeilen(e.text);
    expect(satz.slice(0, 2)).toEqual(["901,43", '"S"']);
    expect(satz[6]).toBe("10000");
    expect(satz[7]).toBe("8400");
    expect(satz[8]).toBe("");
    expect(satz[10]).toBe('"R-2026-0132"');
    expect(satz[114]).toBe("31082026");
    expect(e.debitoren["K-1001"]).toBe("10000");
  });

  it("bucht Bankumsätze: Zahlung an Kreditor, Mieteingang an Debitor, Gebühr an Aufwand", () => {
    const miete = testUmsatz({ id: "U-2", bankkontoId: "BK-001", buchungstag: "2026-08-03", betrag: 900, name: "Anna Schmidt", verwendungszweck: "Miete August", endToEndId: "", zuordnung: { art: "mieteingang", personId: "P-201", monat: "2026-08" } });
    const gebuehr = testUmsatz({ id: "U-3", buchungstag: "2026-08-31", betrag: -12.5, name: "DKB", verwendungszweck: "Kontoführung", endToEndId: "", zuordnung: { art: "gebuehr", kostenartCode: "BANKGEBUEHREN" } });
    const buchungen = [
      testBuchung({ id: "BU-Z", belegId: null, bankumsatzId: "U-1", quelle: "bank", kostenartCode: null, konto: "", belegnummer: "", buchungstext: "", netto: -595, ust: 0, brutto: -595, ustSatz: 0, datum: "2026-08-20" }),
      testBuchung({ id: "BU-M", belegId: null, bankumsatzId: "U-2", quelle: "bank", objektId: "OBJ-002", kostenartCode: null, konto: "", belegnummer: "", buchungstext: "Miete August Anna Schmidt", netto: 900, ust: 0, brutto: 900, ustSatz: 0, datum: "2026-08-03" }),
      testBuchung({ id: "BU-G", belegId: null, bankumsatzId: "U-3", quelle: "bank", objektId: null, kostenartCode: "BANKGEBUEHREN", konto: "", belegnummer: "", buchungstext: "Kontoführung", netto: -12.5, ust: 0, brutto: -12.5, ustSatz: 0, datum: "2026-08-31" }),
    ];
    const e = datevBuchungsstapel(buchungen, kontext({ bankumsaetze: [testUmsatz(), miete, gebuehr] }), OPTIONEN);
    const [, , m, z, g] = zeilen(e.text);
    // sortiert nach Datum: Miete 03.08., Zahlung 20.08., Gebühr 31.08.
    expect(m.slice(0, 2)).toEqual(["900,00", '"S"']);
    expect(m[6]).toBe("1210"); // Objektkonto = zweites Bankkonto
    expect(m[7]).toBe("10000"); // Debitor Anna Schmidt
    expect(m[36]).toBe('"Bahnhofstraße 7"');
    expect(z.slice(0, 2)).toEqual(["595,00", '"H"']);
    expect(z[6]).toBe("1200");
    expect(z[7]).toBe("70000");
    expect(z[8]).toBe("");
    expect(z[10]).toBe('"RE-2026/0815"'); // OPOS-Ausgleich über die Rechnungsnummer
    expect(g.slice(0, 2)).toEqual(["12,50", '"H"']);
    expect(g[7]).toBe("4970");
    expect(e.debitoren["P-201"]).toBe("10000");
  });

  it("kodiert Windows-1252 (ä, ß, Gedankenstrich) und keine UTF-8-Bytes", () => {
    const b = testBuchung({ buchungstext: "Straßenreinigung Köln – Größe 1" });
    const e = datevBuchungsstapel([b], kontext(), OPTIONEN);
    expect(e.bytes.includes(0xdf)).toBe(true); // ß
    expect(e.bytes.includes(0xf6)).toBe(true); // ö
    expect(e.bytes.includes(0x96)).toBe(true); // – in den Spaltenüberschriften und im Text
    expect(e.bytes.includes(0xc3)).toBe(false); // kein UTF-8
    expect(e.bytes[0]).toBe(0x22); // kein BOM
    expect(cp1252Dekodieren(e.bytes)).toBe(e.text);
    expect(iconv.decode(Buffer.from(e.bytes), "win1252")).toBe(e.text);
  });

  it("kürzt Buchungstext auf 60 und Belegfeld 1 auf 36 erlaubte Zeichen", () => {
    const lang = "Wartung Aufzug " + "x".repeat(80);
    const beleg = testBeleg({ rechnungsnummer: "Rechnung Nr. 2026_08.0815 äöü (Kopie) " + "9".repeat(30) });
    const e = datevBuchungsstapel([testBuchung({ buchungstext: lang, belegnummer: beleg.rechnungsnummer })], kontext({ belege: [beleg] }), OPTIONEN);
    const [, , satz] = zeilen(e.text);
    expect(satz[13].length).toBe(62); // 60 Zeichen plus zwei Anführungszeichen
    const belegfeld = satz[10].slice(1, -1);
    expect(belegfeld.length).toBeLessThanOrEqual(36);
    expect(belegfeld).toMatch(/^[A-Za-z0-9$&%*+\-/]+$/);
    expect(belegfeld).toBe("RechnungNr-2026-08-0815aeoeue-Kopie");
    expect(datevBelegfeld1("  RE 4711/2026  ")).toBe("RE4711/2026");
    expect(datevBelegfeld1("Ärger & Co. #12")).toBe("Aerger&Co-12");
  });

  it("verdoppelt Anführungszeichen im Text", () => {
    const e = datevBuchungsstapel([testBuchung({ buchungstext: 'Reparatur "Haustür"' })], kontext(), OPTIONEN);
    const [, , satz] = zeilen(e.text);
    expect(satz[13]).toBe('"Reparatur ""Haustür"""');
  });

  it("warnt bei fehlender Berater-/Mandantennummer und beim Wirtschaftsjahr-Wechsel", () => {
    const einstellungen = testEinstellungen({ datev: { ...testEinstellungen().datev, beraternummer: "", mandantennummer: "" } });
    const e = datevBuchungsstapel([testBuchung({ datum: "2026-12-30" }), testBuchung({ id: "BU-2", datum: "2027-01-02" })], kontext({ einstellungen }), OPTIONEN);
    expect(e.warnungen.some((w) => w.includes("Beraternummer"))).toBe(true);
    expect(e.warnungen.some((w) => w.includes("Wirtschaftsjahr"))).toBe(true);
    expect(e.header[10]).toBe("");
  });

  it("setzt Festschreibung und abweichendes Wirtschaftsjahr", () => {
    const einstellungen = testEinstellungen({ datev: { ...testEinstellungen().datev, wirtschaftsjahrBeginn: "2020-07-01" } });
    const e = datevBuchungsstapel([testBuchung({ datum: "2026-03-05" })], kontext({ einstellungen }), { ...OPTIONEN, festschreibung: true, bezeichnung: "Vorschlag März" });
    expect(e.header[12]).toBe("20250701");
    expect(e.header[16]).toBe('"Vorschlag März"');
    expect(e.header[20]).toBe("1");
    const [, , satz] = zeilen(e.text);
    expect(satz[113]).toBe("1");
    expect(wirtschaftsjahrBeginn("2026-08-01", "2019-07-01")).toBe("2026-07-01");
    expect(wirtschaftsjahrBeginn("2026-08-01", null)).toBe("2026-01-01");
  });

  it("nimmt den Zeitstempel wörtlich und lehnt Unlesbares ab", () => {
    expect(datevZeitstempel("2026-08-23T09:05:07.4Z")).toBe("20260823090507400");
    expect(() => datevZeitstempel("gestern")).toThrow();
    expect(() => datevBuchungsstapel([], kontext(), OPTIONEN)).toThrow(/Keine Buchungen/);
  });

  it("nutzt SKR04-Konten, wenn der Kontenrahmen SKR04 ist", () => {
    const einstellungen = testEinstellungen({ kontenrahmen: "SKR04", datev: { ...testEinstellungen().datev, bankkonto: "1800", erloeskonto: "4400" } });
    const e = datevBuchungsstapel([testBuchung({ konto: "" })], kontext({ einstellungen }), OPTIONEN);
    const [header, , satz] = zeilen(e.text);
    expect(header[26]).toBe('"04"');
    expect(satz[7]).toBe("6335"); // Instandhaltung im SKR04 aus der Kostenart
    expect(satz[8]).toBe('"9"');
  });
});
