import { describe, expect, it } from "vitest";
import { sonderrechnung } from "./sonder";
import { KATALOG_HAUSVERWALTUNG, TEST_OBJEKTE, testEinstellungen } from "./testdaten";

const leistung = (code: string) => KATALOG_HAUSVERWALTUNG.find((l) => l.code === code)!;
const bahnhof = TEST_OBJEKTE.find((o) => o.id === "OBJ-002")!;

describe("sonderrechnung", () => {
  it("berechnet eine Mahngebühr", () => {
    const r = sonderrechnung({ objekt: bahnhof, leistung: leistung("MAHNUNG"), menge: 1, text: "Mahnung Whg 3, Miete Juli 2026", datum: "2026-08-23", einstellungen: testEinstellungen() });
    expect(r.art).toBe("sonderleistung");
    expect(r.objektId).toBe("OBJ-002");
    expect(r.netto).toBe(15);
    expect(r.ust).toBe(2.85);
    expect(r.brutto).toBe(17.85);
    expect(r.positionen[0]).toMatchObject({ leistungCode: "MAHNUNG", menge: 1, einheit: "Stück", einzelpreisNetto: 15, gesamtNetto: 15, beschreibung: "Mahnung Whg 3, Miete Juli 2026" });
    expect(r.betreff).toBe("Mahnung (Hausgeld/Miete), Bahnhofstraße 7");
    expect(r.leistungVon).toBe("2026-08-23");
    expect(r.leistungBis).toBe("2026-08-23");
    expect(r.faelligAm).toBe("2026-09-06");
    expect(r.empfaenger.name).toBe("Erika Vogel");
  });

  it("rechnet Stunden mit Bruchteilen und eigenem Leistungstag", () => {
    const r = sonderrechnung({ objekt: bahnhof, leistung: leistung("STUNDE"), menge: 2.5, text: "", datum: "2026-08-23", leistungsdatum: "2026-08-12", einstellungen: testEinstellungen() });
    expect(r.positionen[0].gesamtNetto).toBe(187.5);
    expect(r.positionen[0].einheit).toBe("Stunde");
    expect(r.ust).toBe(35.63);
    expect(r.brutto).toBe(223.13);
    expect(r.leistungVon).toBe("2026-08-12");
    expect(r.einleitung).toContain("12.08.2026");
  });

  it("nimmt die Katalogbeschreibung, wenn kein Text da ist", () => {
    const r = sonderrechnung({ objekt: bahnhof, leistung: leistung("UEBERGABE"), menge: 1, text: "  ", datum: "2026-08-23", einstellungen: testEinstellungen() });
    expect(r.positionen[0].beschreibung).toBe("Termin vor Ort inkl. Protokoll und Zählerstände.");
    expect(r.netto).toBe(120);
  });

  it("weigert sich bei Menge 0", () => {
    expect(() => sonderrechnung({ objekt: bahnhof, leistung: leistung("STUNDE"), menge: 0, text: "", datum: "2026-08-23", einstellungen: testEinstellungen() })).toThrow(/Menge/);
  });

  it("Kleinunternehmer: Steuersatz 0 und Hinweis", () => {
    const r = sonderrechnung({ objekt: bahnhof, leistung: leistung("STUNDE"), menge: 1, text: "", datum: "2026-08-23", einstellungen: testEinstellungen({ kleinunternehmer: true }) });
    expect(r.positionen[0].ustSatz).toBe(0);
    expect(r.brutto).toBe(75);
    expect(r.hinweise.join(" ")).toContain("§ 19 UStG");
  });
});
