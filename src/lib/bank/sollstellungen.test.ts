import { describe, expect, it } from "vitest";
import type { Bankumsatz } from "../domain/schema";
import { istDoppelzahlung, monateZwischen, offeneSollstellungen, personAktivImMonat, sollstellungen } from "./sollstellungen";
import { PERSONEN } from "./fixtures/testdaten";

function eingang(id: string, personId: string, betrag: number, monat: string, art: "mieteingang" | "hausgeld" = "mieteingang"): Bankumsatz {
  return {
    id, bankkontoId: "BK-001", buchungstag: `${monat}-02`, valuta: null, betrag, waehrung: "EUR", name: "", iban: "", bic: "", verwendungszweck: "", buchungstext: "", endToEndId: "", mandatsreferenz: "",
    hash: id, importiertAm: "2026-08-01T00:00:00Z",
    zuordnung: { art, personId, belegId: null, rechnungId: null, kostenartCode: null, monat, sicherheit: "sicher", quelle: "regel", begruendung: "" },
  };
}

const personen = PERSONEN.filter((p) => p.objektId === "OBJ-002");

describe("Sollstellungen", () => {
  const umsaetze = [
    eingang("U1", "P-201", 900, "2026-07"),
    eingang("U2", "P-203", 500, "2026-07"),
    eingang("U3", "P-206", 545, "2026-07"),
    eingang("U4", "P-206", 545, "2026-07"),
    eingang("U5", "P-208", 770, "2026-07"),
    eingang("U6", "P-208", 770, "2026-07"),
    eingang("U7", "P-204", 860, "2026-08"),
  ];
  const liste = sollstellungen(personen, umsaetze, "2026-07", 1);
  const von = (id: string) => liste.find((s) => s.personId === id)!;

  it("bezahlt, wenn Ist = Soll", () => {
    expect(von("P-201").status).toBe("bezahlt");
    expect(von("P-201").ist).toBe(900);
    expect(von("P-201").differenz).toBe(0);
    expect(von("P-201").umsatzIds).toEqual(["U1"]);
  });
  it("teilweise mit Differenz", () => {
    expect(von("P-203").status).toBe("teilweise");
    expect(von("P-203").differenz).toBe(310);
  });
  it("mehrere Teilzahlungen werden summiert (WG)", () => {
    expect(von("P-206").status).toBe("bezahlt");
    expect(von("P-206").ist).toBe(1090);
    expect(von("P-206").umsatzIds).toHaveLength(2);
  });
  it("Doppelzahlung wird als überzahlt erkannt", () => {
    expect(von("P-208").status).toBe("ueberzahlt");
    expect(von("P-208").differenz).toBe(-770);
    expect(istDoppelzahlung(von("P-208"), 1)).toBe(true);
    expect(istDoppelzahlung(von("P-201"), 1)).toBe(false);
  });
  it("offen ohne Eingang; Zahlungen anderer Monate zählen nicht", () => {
    expect(von("P-204").status).toBe("offen");
    expect(von("P-204").ist).toBe(0);
    expect(von("P-204").differenz).toBe(860);
  });
  it("Toleranz: 1 € Abweichung gilt als bezahlt", () => {
    const l = sollstellungen(personen, [eingang("X", "P-201", 899.5, "2026-07")], "2026-07", 1);
    expect(l.find((s) => s.personId === "P-201")!.status).toBe("bezahlt");
  });
  it("Personen außerhalb ihres Zeitraums fehlen", () => {
    const neu = { ...personen[0], id: "P-NEU", seit: "2026-09-01" };
    expect(personAktivImMonat(neu, "2026-07")).toBe(false);
    expect(sollstellungen([neu], [], "2026-07", 1)).toHaveLength(0);
    expect(sollstellungen([neu], [], "2026-09", 1)).toHaveLength(1);
  });
  it("Monate zwischen zwei Monaten", () => {
    expect(monateZwischen("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monateZwischen("2026-08", "2026-08")).toEqual(["2026-08"]);
  });
  it("offene Sollstellungen über mehrere Monate", () => {
    const offen = offeneSollstellungen([personen[0]], [eingang("A", "P-201", 900, "2026-07")], "2026-06", "2026-08", 1);
    expect(offen.map((s) => s.monat)).toEqual(["2026-06", "2026-08"]);
  });
});
