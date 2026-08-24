import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { leseKontoauszug, zeitraum } from "./lesen";
import { formatName, gemerktesProfil, leseMitProfil, PROFILE } from "./formate";
import { profilAusKiSpalten } from "./spalten-ki";
import type { KiSpalten } from "../belege/schema-ki";

function fixture(name: string): ArrayBuffer {
  const b = readFileSync(path.join(__dirname, "fixtures", name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

describe("Formaterkennung und Parsen", () => {
  it("Sparkasse CSV-CAMT: ISO-8859-1, TT.MM.JJ, vorgemerkte Umsätze werden übersprungen", () => {
    const e = leseKontoauszug(fixture("sparkasse-camt.csv"), "Umsaetze_DE41500105170123456789_20260801.csv");
    expect(e.format).toBe("sparkasse-camt-csv");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    expect(e.umsaetze).toHaveLength(5);
    expect(e.uebersprungen).toBe(1);
    const [anna, yilmaz, , beleg, entgelt] = e.umsaetze;
    expect(anna.buchungstag).toBe("2026-07-01");
    expect(anna.betrag).toBe(900);
    expect(anna.name).toBe("Anna Schmidt");
    expect(anna.iban).toBe("DE21100110012626667882");
    expect(anna.verwendungszweck).toBe("Miete Juli 2026 Whg 1");
    expect(anna.endToEndId).toBe("");
    expect(yilmaz.betrag).toBe(1010);
    expect(beleg.betrag).toBe(-1238);
    expect(beleg.name).toBe("Müller Sanitär GmbH");
    expect(beleg.mandatsreferenz).toBe("M-0815");
    expect(beleg.endToEndId).toBe("EREF-0815");
    expect(entgelt.betrag).toBe(-5.95);
    expect(entgelt.buchungstext).toBe("ENTGELTABSCHLUSS");
    expect(e.warnungen.some((w) => /ISO-8859-1/.test(w))).toBe(true);
    expect(zeitraum(e.umsaetze)).toEqual({ von: "2026-06-30", bis: "2026-07-06" });
  });

  it("Sparkasse CSV-MT940: SEPA-Bezeichner ohne Trenner werden zerlegt", () => {
    const e = leseKontoauszug(fixture("sparkasse-mt940.csv"));
    expect(e.format).toBe("sparkasse-mt940-csv");
    expect(e.umsaetze).toHaveLength(2);
    expect(e.umsaetze[0].verwendungszweck).toBe("Rechnung 11063225 Dachrinne");
    expect(e.umsaetze[0].endToEndId).toBe("11063225-1");
    expect(e.umsaetze[0].mandatsreferenz).toBe("41310-1");
    expect(e.umsaetze[0].betrag).toBe(-29.99);
    expect(e.umsaetze[1].verwendungszweck).toBe("Miete Juli Fischer Whg 8");
    expect(e.umsaetze[1].betrag).toBe(770);
  });

  it("Volksbank/Raiffeisenbank: UTF-8 mit BOM, EREF/MREF im Verwendungszweck", () => {
    const e = leseKontoauszug(fixture("vr.csv"));
    expect(e.format).toBe("vr-csv");
    expect(e.kontoIban).toBe("DE27100777770209299700");
    expect(e.umsaetze).toHaveLength(3);
    expect(e.umsaetze[0].name).toBe("Dr. Stefan Berger");
    expect(e.umsaetze[0].betrag).toBe(310);
    expect(e.umsaetze[1].verwendungszweck).toBe("Wohngebäudeversicherung Police 40-059254925");
    expect(e.umsaetze[1].endToEndId).toBe("134541375034");
    expect(e.umsaetze[1].mandatsreferenz).toBe("M-200-002-644-385-2");
    expect(e.umsaetze[1].betrag).toBe(-453.11);
    expect(e.umsaetze[2].buchungstext).toBe("Abschluss");
    expect(e.umsaetze[2].betrag).toBe(-6);
  });

  it("Volksbank altes Format: Vorspann, mehrzeiliges Feld, unsignierter Betrag mit S/H", () => {
    const e = leseKontoauszug(fixture("vr-alt.csv"));
    expect(e.format).toBe("vr-alt-csv");
    expect(e.umsaetze).toHaveLength(2);
    const [sauer, strom] = e.umsaetze;
    expect(sauer.betrag).toBe(280);
    expect(sauer.name).toBe("Ingrid Sauer");
    expect(sauer.buchungstext).toBe("UEBERWEISUNGSGUTSCHR");
    expect(sauer.verwendungszweck).toBe("Hausgeld Juli 2026 Wohnung 5 Sauer");
    expect(sauer.iban).toBe("DE02500105170137075030");
    expect(strom.betrag).toBe(-1202.1);
    expect(strom.verwendungszweck).toBe("Abschlag Allgemeinstrom 07/2026 Kd 4711");
  });

  it("Deutsche Bank/Postbank: Vorspann mit IBAN, D.M.JJJJ, Betrag ohne Nachkommanullen, Fußzeile", () => {
    const e = leseKontoauszug(fixture("deutsche-bank.csv"));
    expect(e.format).toBe("deutsche-bank-csv");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    expect(e.umsaetze).toHaveLength(3);
    expect(e.umsaetze[0].buchungstag).toBe("2026-07-01");
    expect(e.umsaetze[0].betrag).toBe(860);
    expect(e.umsaetze[0].name).toBe("Petra Lang");
    expect(e.umsaetze[0].endToEndId).toBe("");
    expect(e.umsaetze[1].betrag).toBe(-1000);
    expect(e.umsaetze[1].mandatsreferenz).toBe("CMLP12345678901");
    expect(e.umsaetze[2].betrag).toBe(-55);
    expect(e.umsaetze[2].name).toBe("Westdeutscher Rundfunk Koeln");
  });

  it("Commerzbank: Name, BIC, IBAN und Zweck aus dem Buchungstext", () => {
    const e = leseKontoauszug(fixture("commerzbank.csv"));
    expect(e.format).toBe("commerzbank-csv");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    const [weber, mueller, entgelt] = e.umsaetze;
    expect(weber.name).toBe("JONAS WEBER");
    expect(weber.bic).toBe("INGDDEFFXXX");
    expect(weber.iban).toBe("DE02500105170137075030");
    expect(weber.verwendungszweck).toBe("MIETE JULI WHG 3");
    expect(weber.betrag).toBe(810);
    expect(mueller.name).toBe("Mueller Sanitaer GmbH");
    expect(mueller.verwendungszweck).toBe("RE 2026-0815 Wartung");
    expect(mueller.mandatsreferenz).toBe("009876584321");
    expect(mueller.betrag).toBe(-1238);
    expect(entgelt.betrag).toBe(-10.7);
    expect(entgelt.verwendungszweck.startsWith("Kontoführung")).toBe(true);
  });

  it("comdirect: gequotet, Zeile endet mit Semikolon, offene Umsätze übersprungen, Labels zerlegt", () => {
    const e = leseKontoauszug(fixture("comdirect.csv"));
    expect(e.format).toBe("comdirect-csv");
    expect(e.umsaetze).toHaveLength(2);
    const [demir, mueller] = e.umsaetze;
    expect(demir.name).toBe("Elif Demir");
    expect(demir.verwendungszweck).toBe("Miete Juli Whg 7");
    expect(demir.betrag).toBe(875);
    expect(demir.endToEndId).toBe("A1234567891");
    expect(mueller.name).toBe("Müller Sanitär GmbH");
    expect(mueller.iban).toBe("DE89370400440532013000");
    expect(mueller.bic).toBe("COBADEFFXXX");
    expect(mueller.verwendungszweck).toBe("RE 2026-0815");
    expect(mueller.betrag).toBe(-1238);
  });

  it("ING: Vorspann mit IBAN, ISO-8859-1, Zeile mit fehlendem Buchungstext wird repariert", () => {
    const e = leseKontoauszug(fixture("ing.csv"));
    expect(e.format).toBe("ing-csv");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    expect(e.umsaetze).toHaveLength(4);
    expect(e.umsaetze[0].name).toBe("Lukas Hoffmann");
    expect(e.umsaetze[0].betrag).toBe(1170);
    expect(e.umsaetze[0].verwendungszweck).toBe("Miete August Hoffmann Whg 5");
    expect(e.umsaetze[1].name).toBe("Rente");
    expect(e.umsaetze[1].betrag).toBe(2647.74);
    expect(e.umsaetze[1].verwendungszweck).toBe("9705218115 RV-RENTE 07.2026");
    expect(e.umsaetze[3].betrag).toBe(-4.9);
  });

  it("DKB: Vorspann, Status, Gegenpartei nach Umsatztyp, „1.000“ ist 1000,00", () => {
    const e = leseKontoauszug(fixture("dkb.csv"));
    expect(e.format).toBe("dkb-csv");
    expect(e.kontoIban).toBe("DE02120300000000202051");
    expect(e.umsaetze).toHaveLength(2);
    expect(e.uebersprungen).toBe(1);
    expect(e.umsaetze[0].betrag).toBe(1000);
    expect(e.umsaetze[0].buchungstag).toBe("2026-08-05");
    expect(e.umsaetze[0].name).toBe("WEG Severinstraße 88");
    expect(e.umsaetze[0].iban).toBe("DE27100777770209299700");
    expect(e.umsaetze[1].betrag).toBe(-62.3);
    expect(e.umsaetze[1].name).toBe("Bürobedarf Schulze");
    expect(e.umsaetze[1].endToEndId).toBe("4711");
  });

  it("N26: Komma-getrennt, ISO-Datum, Punkt-Dezimal", () => {
    const e = leseKontoauszug(fixture("n26.csv"));
    expect(e.format).toBe("n26-csv");
    expect(e.umsaetze).toHaveLength(2);
    expect(e.umsaetze[0].buchungstag).toBe("2026-07-01");
    expect(e.umsaetze[0].betrag).toBe(900);
    expect(e.umsaetze[0].iban).toBe("DE21100110012626667882");
    expect(e.umsaetze[0].verwendungszweck).toBe("Miete Juli Whg 1");
    expect(e.umsaetze[1].betrag).toBe(-16.8);
  });

  it("Targobank: keine Kopfzeile, Soll/Haben getrennt, eigene IBAN in einfachen Anführungszeichen", () => {
    const e = leseKontoauszug(fixture("targobank.csv"));
    expect(e.format).toBe("targobank-csv");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    expect(e.umsaetze).toHaveLength(3);
    const [anna, entgelt, mueller] = e.umsaetze;
    expect(anna.betrag).toBe(900);
    expect(anna.buchungstext).toBe("Echtzeitüberweisung");
    expect(anna.name).toBe("ANNA SCHMIDT");
    expect(anna.iban).toBe("DE21100110012626667882");
    expect(anna.verwendungszweck).toContain("Miete Juli 2026 Whg 1");
    expect(entgelt.betrag).toBe(-6.95);
    expect(mueller.betrag).toBe(-1238);
    expect(mueller.name).toBe("Mueller Sanitaer GmbH");
    expect(mueller.iban).toBe("DE89370400440532013000");
  });

  it("Finom: Komma, Punkt-Dezimal, N/A als leer", () => {
    const e = leseKontoauszug(fixture("finom.csv"));
    expect(e.format).toBe("finom-csv");
    expect(e.kontoIban).toBe("DE02120300000000202051");
    expect(e.umsaetze).toHaveLength(2);
    expect(e.umsaetze[0].betrag).toBe(-60);
    expect(e.umsaetze[0].verwendungszweck).toBe("");
    expect(e.umsaetze[0].name).toBe("SumUp *Haendler GmbH");
    expect(e.umsaetze[1].betrag).toBe(1000);
    expect(e.umsaetze[1].iban).toBe("DE27100777770209299700");
    expect(e.umsaetze[1].verwendungszweck).toBe("R-2026-0131 Verwalterhonorar");
  });

  it("Unbekanntes Format: generische Heuristik erkennt Spalten und liefert ein Profil zum Merken", () => {
    const e = leseKontoauszug(fixture("unbekannt.tsv"), "export.tsv");
    expect(e.format).toBe("generisch");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    expect(e.umsaetze).toHaveLength(2);
    expect(e.umsaetze[0].name).toBe("Anna Schmidt");
    expect(e.umsaetze[0].iban).toBe("DE21100110012626667882");
    expect(e.umsaetze[0].betrag).toBe(900);
    expect(e.umsaetze[1].betrag).toBe(-85.5);
    expect(e.profilJson).toBeDefined();
    const gemerkt = gemerktesProfil(e.profilJson!);
    expect(gemerkt?.id).toBe("generisch");
    // Beim nächsten Import mit gemerktem Profil ohne Erkennung
    const wieder = leseKontoauszug(fixture("unbekannt.tsv"), "export.tsv", e.profilJson);
    expect(wieder.umsaetze).toHaveLength(2);
  });

  it("KI-Spaltenprofil: Antwort der KI wird zum Profil und liest die Datei", () => {
    const ki: KiSpalten = {
      trennzeichen: "Tab",
      kopfzeile: 3,
      spalten: { buchungstag: "Buchungsdatum", valuta: "Wertstellung", betrag: "Betrag", betragSoll: "", betragHaben: "", waehrung: "Währung", name: "Auftraggeber/Empfänger", iban: "IBAN Gegenkonto", bic: "", verwendungszweck: ["Verwendungszweck"], buchungstext: "", endToEndId: "", mandatsreferenz: "" },
      datumsformat: "DD.MM.YYYY",
      dezimaltrennzeichen: ",",
      bankVermutung: "Meine Kleine Bank",
    };
    const profil = profilAusKiSpalten(ki);
    expect(profil.trennzeichen).toBe("\t");
    const text = new TextDecoder().decode(fixture("unbekannt.tsv"));
    const e = leseMitProfil(text, profil, "ki");
    expect(e.format).toBe("ki");
    expect(e.umsaetze).toHaveLength(2);
    expect(e.umsaetze[0].verwendungszweck).toBe("Miete Juli Whg 1");
    // Kopfzeilenindex um eine Leerzeile verschoben (die KI zählt Leerzeilen gern nicht mit): die Kopfzeile wird gesucht
    const verschoben = leseMitProfil(text, { ...profil, kopfzeile: 2 }, "ki");
    expect(verschoben.umsaetze).toHaveLength(2);
    expect(gemerktesProfil(verschoben.profilJson!)?.profil.kopfzeile).toBe(3);
  });

  it("wirklich unbekannte Datei liefert eine Vorschau für die KI", () => {
    const text = "Irgendwas\nohne;Struktur\n1;2;3\n";
    const e = leseKontoauszug(new TextEncoder().encode(text).buffer as ArrayBuffer, "x.csv");
    expect(e.format).toBe("unbekannt");
    expect(e.vorschau?.length).toBe(4);
  });

  it("alle festen Profile haben Kennung, Namen und eine Datumsspalte", () => {
    for (const p of PROFILE) {
      expect(p.id).toMatch(/-csv$/);
      expect(formatName(p.id)).toBe(p.name);
      expect(p.spalten.buchungstag).not.toBe("");
    }
    expect(PROFILE.length).toBeGreaterThanOrEqual(18);
  });
});

describe("CAMT.053 und MT940", () => {
  it("CAMT.053 v08: Konto-IBAN, Gegenpartei je Richtung, Sammler aufgelöst, PDNG übersprungen", () => {
    const e = leseKontoauszug(fixture("camt053.xml"), "camt.xml");
    expect(e.format).toBe("camt053");
    expect(e.kontoIban).toBe("DE41500105170123456789");
    expect(e.umsaetze).toHaveLength(4);
    expect(e.uebersprungen).toBe(1);
    const [anna, mueller, fischer, weber] = e.umsaetze;
    expect(anna.betrag).toBe(900);
    expect(anna.name).toBe("Anna Schmidt");
    expect(anna.iban).toBe("DE21100110012626667882");
    expect(anna.bic).toBe("DEUTDEDBBER");
    expect(anna.verwendungszweck).toBe("Miete Juli 2026 Whg 1 Schmidt");
    expect(anna.endToEndId).toBe("");
    expect(anna.buchungstext).toBe("SEPA GUTSCHRIFT");
    expect(mueller.betrag).toBe(-1238);
    expect(mueller.name).toBe("Müller Sanitär GmbH");
    expect(mueller.endToEndId).toBe("EREF-0815");
    expect(mueller.mandatsreferenz).toBe("M-0815");
    expect(fischer.betrag).toBe(770);
    expect(fischer.name).toBe("Karl Fischer");
    expect(weber.betrag).toBe(810);
    expect(weber.verwendungszweck).toBe("Miete Juli Whg 3");
  });

  it("CAMT.053 v02: ohne Pty-Ebene, BIC statt BICFI", () => {
    const e = leseKontoauszug(fixture("camt053-v02.xml"));
    expect(e.format).toBe("camt053");
    expect(e.kontoIban).toBe("DE27100777770209299700");
    expect(e.umsaetze).toHaveLength(1);
    expect(e.umsaetze[0].name).toBe("Dr. Stefan Berger");
    expect(e.umsaetze[0].bic).toBe("INGDDEFFXXX");
    expect(e.umsaetze[0].betrag).toBe(310);
  });

  it("MT940: :61: und :86: mit Subfeldern über mehrere Zeilen, Storno, Jahreswechsel", () => {
    const e = leseKontoauszug(fixture("mt940.sta"), "auszug.sta");
    expect(e.format).toBe("mt940");
    expect(e.kontoIban).toBe("DE41500105170123456789"); // aus BLZ 50010517 / Konto 0123456789 gebildet
    expect(e.umsaetze).toHaveLength(4);
    const [anna, mueller, storno, wechsel] = e.umsaetze;
    expect(anna.buchungstag).toBe("2026-07-01");
    expect(anna.betrag).toBe(900);
    expect(anna.name).toBe("Anna Schmidt");
    expect(anna.iban).toBe("DE21100110012626667882");
    expect(anna.bic).toBe("DEUTDEDBBER");
    expect(anna.verwendungszweck).toBe("Miete Juli 2026 Whg 1 Schmidt");
    expect(anna.buchungstext).toBe("SEPA-GUTSCHRIFT");
    expect(anna.endToEndId).toBe("");
    expect(mueller.betrag).toBe(-1238);
    expect(mueller.verwendungszweck).toBe("RE 2026-0815 Wartung Heizung");
    expect(mueller.endToEndId).toBe("EREF-0815");
    expect(mueller.mandatsreferenz).toBe("M-0815");
    expect(mueller.name).toBe("Müller Sanitär GmbH");
    expect(storno.betrag).toBe(-50);
    expect(wechsel.valuta).toBe("2026-12-30");
    expect(wechsel.buchungstag).toBe("2027-01-02");
  });
});
