import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { bankumsatzZeilen, belegZeilen, buchungsjournalXlsx, xlsxDateiname } from "./xlsx";
import { journalZeilen } from "./journal";
import { mieteingang } from "./mieteingang";
import { TEST_BANKKONTEN, TEST_KOSTENARTEN, TEST_OBJEKTE, TEST_PERSONEN, testBeleg, testBuchung, testDokument, testRechnung, testUmsatz } from "./testdaten";

describe("Excel-Buchungsjournal", () => {
  it("schreibt vier Blätter mit fetter Kopfzeile, Autofilter, Zahlenformat und Summenzeile", async () => {
    const buchungen = journalZeilen([testBuchung(), testBuchung({ id: "BU-2", datum: "2026-08-15", netto: 100, ust: 19, brutto: 119 })], {
      objekte: TEST_OBJEKTE,
      kostenarten: TEST_KOSTENARTEN,
      belege: [testBeleg()],
      rechnungen: [testRechnung()],
      bankumsaetze: [testUmsatz()],
    });
    const miete = testUmsatz({ id: "U-2", bankkontoId: "BK-001", buchungstag: "2026-08-03", betrag: 900, name: "Anna Schmidt", zuordnung: { art: "mieteingang", personId: "P-201", monat: "2026-08", sicherheit: "sicher" } });
    const bytes = await buchungsjournalXlsx({
      buchungen,
      belege: belegZeilen([testBeleg()], [testDokument()], TEST_OBJEKTE, TEST_KOSTENARTEN),
      bankumsaetze: bankumsatzZeilen([testUmsatz(), miete], TEST_BANKKONTEN, TEST_PERSONEN, [testBeleg()], [testRechnung()]),
      mieteingang: mieteingang(TEST_PERSONEN, [miete], TEST_OBJEKTE, ["2026-08"]),
      erstelltAm: "2026-08-23T12:00:00.000Z",
    });
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x50); // "PK": ZIP-Container einer xlsx

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Buchungen", "Belege", "Bankumsätze", "Mieteingang"]);

    const b = wb.getWorksheet("Buchungen")!;
    expect(b.getRow(1).getCell(1).value).toBe("Datum");
    expect(b.getRow(1).font?.bold).toBe(true);
    expect(b.autoFilter).toBe("A1:Q1");
    expect(b.getColumn(1).width).toBe(12);
    expect(b.getColumn(3).width).toBe(44);
    expect(b.rowCount).toBe(4); // Kopf, zwei Buchungen, Summe
    // neueste zuerst: 15.08. vor 12.08.
    expect(b.getRow(2).getCell(1).value).toEqual(new Date("2026-08-15T00:00:00Z"));
    expect(b.getRow(2).getCell(1).numFmt).toBe("dd.mm.yyyy");
    expect(b.getRow(3).getCell(13).value).toBe(595);
    expect(b.getRow(3).getCell(13).numFmt).toBe("#,##0.00");
    expect(b.getRow(3).getCell(8).value).toBe("Nein");
    expect(b.getRow(3).getCell(16).value).toBe("Beleg");
    const summe = b.getRow(4);
    expect(summe.getCell(1).value).toBe("Summe");
    expect(summe.font?.bold).toBe(true);
    expect((summe.getCell(13).value as { formula: string }).formula).toBe("SUM(M2:M3)");

    const belege = wb.getWorksheet("Belege")!;
    expect(belege.getRow(2).getCell(2).value).toBe("RE-2026/0815");
    expect(belege.getRow(2).getCell(13).value).toBe("Gebucht");
    expect(belege.getRow(2).getCell(11).value).toEqual(new Date("2026-08-26T00:00:00Z"));

    const bank = wb.getWorksheet("Bankumsätze")!;
    expect(bank.rowCount).toBe(4);
    expect(bank.getRow(2).getCell(6).value).toBe(-595);
    expect(bank.getRow(2).getCell(7).value).toBe("Belegzahlung");
    expect(bank.getRow(2).getCell(8).value).toBe("Schlosserei Müller & Söhne GmbH RE-2026/0815");
    expect(bank.getRow(3).getCell(7).value).toBe("Mieteingang");
    expect(bank.getRow(3).getCell(8).value).toBe("Anna Schmidt");

    const m = wb.getWorksheet("Mieteingang")!;
    expect(m.getRow(2).values).toEqual([undefined, "2026-08", "Bahnhofstraße 7", "Anna Schmidt", "Mieter", 900, 900, 0, "bezahlt"]);
    expect(m.getRow(3).getCell(8).value).toBe("offen");
    expect(xlsxDateiname("2026-08-01", "2026-08-31")).toBe("Buchungsjournal_2026-08-01_2026-08-31.xlsx");
  });

  it("kommt mit leeren Blättern zurecht", async () => {
    const bytes = await buchungsjournalXlsx({ buchungen: [], belege: [], bankumsaetze: [], mieteingang: [], erstelltAm: "2026-08-23T12:00:00.000Z" });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(wb.getWorksheet("Buchungen")!.rowCount).toBe(1);
  });
});
