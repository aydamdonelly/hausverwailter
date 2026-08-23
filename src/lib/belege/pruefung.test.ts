import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { Beleg } from "../domain/schema";
import { pruefeBeleg, statusAusBefunden, type PruefKontext } from "./pruefung";

const kontext: PruefKontext = {
  heute: "2026-08-23",
  freigabegrenze: 1000,
  kostenarten: [
    { code: "INSTANDHALTUNG", bezeichnung: "Instandhaltung", umlagefaehig: false },
    { code: "GEBAEUDEREINIGUNG", bezeichnung: "Gebäudereinigung", umlagefaehig: true },
    { code: "VERSICHERUNG", bezeichnung: "Versicherung", umlagefaehig: true },
  ],
  objekte: [{ id: "OBJ-2", art: "MIET", verwaltungSeit: "2024-01-01", kurzname: "Bahnhofstraße 7" }],
  vorhandeneBelege: [
    { id: "alt", lieferant: { name: "Sauber & Fein Gebäudereinigung GmbH", adresse: "", steuernummer: "", ustIdNr: "", iban: "", bic: "", email: "", kundennummerBeimLieferanten: "" }, rechnungsnummer: "2026-0711", bruttoGesamt: 226.1, rechnungsdatum: "2026-07-01" },
  ],
};

function beleg(teil: Partial<z.input<typeof Beleg>> = {}): Beleg {
  return Beleg.parse({
    id: "neu",
    dokumentId: "d",
    lieferant: { name: "Elektro Kaminski GmbH", adresse: "Weg 1, 50667 Köln", steuernummer: "215/5847/1234", ustIdNr: "", iban: "DE89370400440532013000" },
    rechnungsnummer: "2026-1187",
    rechnungsdatum: "2026-07-07",
    leistungVon: "2026-07-03",
    leistungBis: "2026-07-03",
    faelligAm: "2026-07-21",
    positionen: [{ beschreibung: "Reparatur Treppenhausbeleuchtung", netto: 486, ustSatz: 19 }],
    steuersaetze: [{ satz: 19, netto: 486, ust: 92.34 }],
    nettoGesamt: 486,
    ustGesamt: 92.34,
    bruttoGesamt: 578.34,
    objektId: "OBJ-2",
    kostenartCode: "INSTANDHALTUNG",
    bezahltAm: "2026-07-15",
    ...teil,
  });
}

describe("pruefeBeleg", () => {
  it("lässt einen sauberen Beleg durch", () => {
    const f = pruefeBeleg(beleg(), kontext);
    expect(f.filter((x) => x.stufe === "fehler")).toEqual([]);
    expect(statusAusBefunden(f)).toBe("erkannt");
  });
  it("findet Rechenfehler", () => {
    const f = pruefeBeleg(beleg({ bruttoGesamt: 587.34 }), kontext);
    expect(f.map((x) => x.code)).toContain("SUMME_BRUTTO");
    expect(statusAusBefunden(f)).toBe("freigabe");
  });
  it("findet Duplikate über Lieferant und Nummer, auch bei anderer Schreibweise", () => {
    const f = pruefeBeleg(
      beleg({ lieferant: { name: "SAUBER + FEIN Gebäudereinigung", adresse: "x", steuernummer: "1", ustIdNr: "", iban: "", bic: "", email: "", kundennummerBeimLieferanten: "" }, rechnungsnummer: "2026/0711" }),
      kontext,
    );
    expect(f.map((x) => x.code)).toContain("DUPLIKAT");
  });
  it("verlangt Steuernummer außer bei Kleinbeträgen", () => {
    const ohne = { ...beleg().lieferant, steuernummer: "", ustIdNr: "" };
    expect(pruefeBeleg(beleg({ lieferant: ohne }), kontext).map((x) => x.code)).toContain("PFLICHTANGABE");
    const klein = pruefeBeleg(beleg({ lieferant: ohne, positionen: [{ beschreibung: "Kleinteile", netto: 100, ustSatz: 19 }], steuersaetze: [{ satz: 19, netto: 100, ust: 19 }], nettoGesamt: 100, ustGesamt: 19, bruttoGesamt: 119 }), kontext);
    expect(klein.filter((x) => x.code === "PFLICHTANGABE" && x.feld === "lieferant.steuernummer")).toEqual([]);
  });
  it("meldet fehlendes Objekt, Freigabegrenze, Versicherungsfall und Reparatur auf umlagefähiger Kostenart", () => {
    const f = pruefeBeleg(
      beleg({
        objektId: null,
        objektHinweis: "Musterweg 9",
        kostenartCode: "GEBAEUDEREINIGUNG",
        positionen: [{ beschreibung: "Reparatur nach Sturmschaden", netto: 2000, ustSatz: 19 }],
        steuersaetze: [{ satz: 19, netto: 2000, ust: 380 }],
        nettoGesamt: 2000,
        ustGesamt: 380,
        bruttoGesamt: 2380,
      }),
      kontext,
    );
    const codes = f.map((x) => x.code);
    expect(codes).toEqual(expect.arrayContaining(["OBJEKT_FEHLT", "FREIGABE", "VERSICHERUNGSFALL", "WARTUNG_ODER_REPARATUR"]));
  });
  it("erkennt Versicherungsteuer und Kleinunternehmer als Hinweis, fehlende USt ohne Grund als Warnung", () => {
    const vers = pruefeBeleg(beleg({ kostenartCode: "VERSICHERUNG", versicherungsteuer: true, steuersaetze: [], positionen: [{ beschreibung: "Gebäudeversicherung", netto: 1940, ustSatz: 0 }], nettoGesamt: 1940, ustGesamt: 0, bruttoGesamt: 1940 }), kontext);
    expect(vers.map((x) => x.code)).toContain("VERSICHERUNGSTEUER");
    const ohne = pruefeBeleg(beleg({ steuersaetze: [], positionen: [{ beschreibung: "Gartenpflege", netto: 340, ustSatz: 0 }], nettoGesamt: 340, ustGesamt: 0, bruttoGesamt: 340 }), kontext);
    expect(ohne.map((x) => x.code)).toContain("KEINE_UST");
  });
});
