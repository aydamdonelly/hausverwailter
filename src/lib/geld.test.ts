import { describe, expect, it } from "vitest";
import { gleich, nettoAusBrutto, rundeGeld, steuerzeilen, summe, summen, ustAusNetto } from "./geld";
import { parseDeDatum, parseDeZahl, eur, datum, iban, monatsGrenzen, plusTage } from "./format";

describe("geld", () => {
  it("rundet kaufmännisch und rechnet in Cent", () => {
    expect(rundeGeld(0.1 + 0.2)).toBe(0.3);
    expect(summe([0.1, 0.2, 0.3])).toBe(0.6);
    expect(ustAusNetto(486, 19)).toBe(92.34);
    expect(nettoAusBrutto(578.34, 19)).toBe(486);
  });
  it("gruppiert Steuersätze wie § 14 UStG", () => {
    const z = steuerzeilen([
      { gesamtNetto: 210, ustSatz: 7 },
      { gesamtNetto: 260, ustSatz: 0 },
      { gesamtNetto: 100, ustSatz: 19 },
    ]);
    expect(z.map((x) => x.satz)).toEqual([19, 7, 0]);
    expect(z[1]).toEqual({ satz: 7, netto: 210, ust: 14.7 });
    const s = summen([{ gesamtNetto: 210, ustSatz: 7 }, { gesamtNetto: 260, ustSatz: 0 }]);
    expect(s.brutto).toBe(484.7);
  });
  it("vergleicht mit Toleranz", () => {
    expect(gleich(100, 100.01)).toBe(true);
    expect(gleich(100, 100.02)).toBe(false);
  });
});

describe("format", () => {
  it("liest deutsche Zahlen", () => {
    expect(parseDeZahl("1.234,56")).toBe(1234.56);
    expect(parseDeZahl("-12,00")).toBe(-12);
    expect(parseDeZahl("12,00-")).toBe(-12);
    expect(parseDeZahl("1234.56")).toBe(1234.56);
    expect(parseDeZahl("1.234")).toBe(1234);
    expect(parseDeZahl("1,234.56")).toBe(1234.56);
    expect(parseDeZahl("€ 99,90")).toBe(99.9);
    expect(parseDeZahl("abc")).toBeNull();
  });
  it("liest deutsche Daten", () => {
    expect(parseDeDatum("23.08.2026")).toBe("2026-08-23");
    expect(parseDeDatum("3.8.26")).toBe("2026-08-03");
    expect(parseDeDatum("2026-08-23T10:00:00Z")).toBe("2026-08-23");
    expect(parseDeDatum("Montag")).toBeNull();
  });
  it("formatiert", () => {
    expect(eur(1234.5)).toMatch(/1\.234,50\s€/);
    expect(datum("2026-08-23")).toBe("23.08.2026");
    expect(iban("DE89370501980012345678")).toBe("DE89 3705 0198 0012 3456 78");
    expect(monatsGrenzen("2026-02")).toEqual({ von: "2026-02-01", bis: "2026-02-28" });
    expect(plusTage("2026-08-23", 14)).toBe("2026-09-06");
  });
});
