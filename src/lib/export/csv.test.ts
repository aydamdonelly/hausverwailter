import { describe, expect, it } from "vitest";
import { buchungsjournalCsv, csvText, JOURNAL_SPALTEN } from "./csv";
import { journalZeilen } from "./journal";
import { TEST_KOSTENARTEN, TEST_OBJEKTE, testBeleg, testBuchung, testRechnung, testUmsatz } from "./testdaten";

describe("CSV für Excel", () => {
  it("beginnt mit BOM, trennt mit Semikolon, endet Zeilen mit CRLF und schreibt deutsche Zahlen", () => {
    const text = csvText(["A", "B", "C"], [["x", 1234.5, true], ["y", -0.5, null]]);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.slice(1)).toBe("A;B;C\r\nx;1.234,50;Ja\r\ny;-0,50;\r\n");
  });

  it("rahmt Texte mit Semikolon, Anführungszeichen oder Zeilenumbruch ein", () => {
    const text = csvText(["T"], [['Reparatur; "Haustür"'], ["Zeile 1\nZeile 2"], ["ohne"]]);
    expect(text.slice(1)).toBe('T\r\n"Reparatur; ""Haustür"""\r\n"Zeile 1\nZeile 2"\r\nohne\r\n');
  });

  it("exportiert das Journal mit allen Spalten", () => {
    const zeilen = journalZeilen([testBuchung()], { objekte: TEST_OBJEKTE, kostenarten: TEST_KOSTENARTEN, belege: [testBeleg()], rechnungen: [testRechnung()], bankumsaetze: [testUmsatz()] });
    const text = buchungsjournalCsv(zeilen);
    const [kopf, zeile] = text.slice(1).split("\r\n");
    expect(kopf.split(";")).toEqual(JOURNAL_SPALTEN);
    expect(zeile.split(";")).toEqual([
      "12.08.2026",
      "RE-2026/0815",
      "Schlosserei Müller & Söhne GmbH RE-2026/0815",
      "Schlosserei Müller & Söhne GmbH",
      "WEG Am Stadtpark 3",
      "Instandhaltung und Instandsetzung",
      "",
      "Nein",
      "4260",
      "",
      "500,00",
      "95,00",
      "595,00",
      "19 %",
      "S",
      "Beleg",
      "",
    ]);
  });
});
