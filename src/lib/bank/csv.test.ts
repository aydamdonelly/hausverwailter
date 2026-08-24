import { describe, expect, it } from "vitest";
import { betragLesen, csvParsen, datumLesen, dekodiere, ibanImText, trennerErkennen } from "./csv";
import { sepaTags } from "./sepa";

describe("Beträge lesen", () => {
  it("deutsche Schreibweisen", () => {
    expect(betragLesen("1.234,56")).toBe(1234.56);
    expect(betragLesen("-1143,41")).toBe(-1143.41);
    expect(betragLesen("750")).toBe(750);
    expect(betragLesen("-100,8")).toBe(-100.8);
    expect(betragLesen("1.000", ",")).toBe(1000);
    expect(betragLesen("100.000,00 €")).toBe(100000);
    expect(betragLesen("9,90-")).toBe(-9.9);
    expect(betragLesen("1.234,56 EUR")).toBe(1234.56);
  });
  it("englische Schreibweisen mit Punkt", () => {
    expect(betragLesen("-60.00", ".")).toBe(-60);
    expect(betragLesen("1,234.56", ".")).toBe(1234.56);
    expect(betragLesen("-5.00")).toBe(-5);
    expect(betragLesen("2500.00")).toBe(2500);
  });
  it("Unlesbares wird null", () => {
    expect(betragLesen("")).toBeNull();
    expect(betragLesen("N/A")).toBeNull();
    expect(betragLesen("--")).toBeNull();
    expect(betragLesen("Kontostand")).toBeNull();
  });
});

describe("Daten lesen", () => {
  it("alle Bankvarianten", () => {
    expect(datumLesen("05.12.25")).toBe("2025-12-05");
    expect(datumLesen("23.08.2026")).toBe("2026-08-23");
    expect(datumLesen("1.6.2026")).toBe("2026-06-01");
    expect(datumLesen("2026-08-23")).toBe("2026-08-23");
    expect(datumLesen("2026-08-23T10:00:00")).toBe("2026-08-23");
    expect(datumLesen("05-08-2026 09:57:00")).toBe("2026-08-05");
    expect(datumLesen("20260823")).toBe("2026-08-23");
    expect(datumLesen("03.11.2025 Neu")).toBe("2025-11-03");
  });
  it("kein Datum", () => {
    expect(datumLesen("offen")).toBeNull();
    expect(datumLesen("--")).toBeNull();
    expect(datumLesen("Kontostand")).toBeNull();
    expect(datumLesen("")).toBeNull();
    expect(datumLesen("32.13.2026")).toBeNull();
  });
});

describe("Zeichensatz und CSV", () => {
  it("ISO-8859-1 wird erkannt und Umlaute stimmen", () => {
    const bytes = new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x3b, 0x53, 0x74, 0x72, 0x61, 0xdf, 0x65]); // "Müller;Straße"
    const { text, zeichensatz } = dekodiere(bytes.buffer);
    expect(zeichensatz).toBe("windows-1252");
    expect(text).toBe("Müller;Straße");
  });
  it("UTF-8 mit BOM: BOM wird entfernt", () => {
    const { text, zeichensatz } = dekodiere(new TextEncoder().encode("﻿Buchungstag;Betrag").buffer as ArrayBuffer);
    expect(zeichensatz).toBe("utf-8");
    expect(text).toBe("Buchungstag;Betrag");
  });
  it("Felder in Anführungszeichen mit Zeilenumbruch und verdoppelten Anführungszeichen", () => {
    const zeilen = csvParsen('"a";"b ""c""";"Zeile 1\r\nZeile 2"\r\n"x";"y";"z";\r\n', ";");
    expect(zeilen).toHaveLength(2);
    expect(zeilen[0]).toEqual(["a", 'b "c"', "Zeile 1\r\nZeile 2"]);
    expect(zeilen[1]).toEqual(["x", "y", "z", ""]);
  });
  it("Trennzeichen: Semikolon, Komma, Tab", () => {
    expect(trennerErkennen(["a;b;c", "1;2;3"])).toBe(";");
    expect(trennerErkennen(['"a","b, c","d"', "1,2,3"])).toBe(",");
    expect(trennerErkennen(["a\tb\tc"])).toBe("\t");
  });
  it("IBAN im Text, auch in Vierergruppen", () => {
    expect(ibanImText("IBAN;DE41500105170123456789")).toBe("DE41500105170123456789");
    expect(ibanImText("Konto DE41 5001 0517 0123 4567 89 Girokonto")).toBe("DE41500105170123456789");
    expect(ibanImText("nichts")).toBe("");
  });
});

describe("SEPA-Bezeichner", () => {
  it("Plus-Schreibweise ohne Trenner (MT940, Sparkasse)", () => {
    const t = sepaTags("EREF+11063225-1MREF+41310-1CRED+DE11ZZZ00000000003SVWZ+Rechnung 11063225");
    expect(t.zweck).toBe("Rechnung 11063225");
    expect(t.eref).toBe("11063225-1");
    expect(t.mref).toBe("41310-1");
    expect(t.cred).toBe("DE11ZZZ00000000003");
  });
  it("Doppelpunkt-Schreibweise (VR-Banken): Klartext steht davor", () => {
    const t = sepaTags("Servicepauschale 24.90 EUR EREF: N0003 MREF: MLREF1 CRED: DE80ZZZ00000030151 IBAN: DE89370400440532013000 BIC: RZOODE77");
    expect(t.zweck).toBe("Servicepauschale 24.90 EUR");
    expect(t.eref).toBe("N0003");
    expect(t.mref).toBe("MLREF1");
    expect(t.iban).toBe("DE89370400440532013000");
    expect(t.bic).toBe("RZOODE77");
  });
  it("ohne Bezeichner bleibt der Text", () => {
    expect(sepaTags("Miete Juli").zweck).toBe("Miete Juli");
    expect(sepaTags("").zweck).toBe("");
  });
});
