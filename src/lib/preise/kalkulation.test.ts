import { describe, expect, it } from "vitest";
import { kalkuliereGrundhonorar } from "./kalkulation";
import { STANDARD_LEISTUNGEN_DIENSTLEISTER, STANDARD_LEISTUNGEN_HAUSVERWALTUNG, STANDARD_STAFFEL } from "../domain/standard";

const katalog = STANDARD_LEISTUNGEN_HAUSVERWALTUNG.map((l, i) => ({ ...l, id: `L${i}` }));
const dienst = STANDARD_LEISTUNGEN_DIENSTLEISTER.map((l, i) => ({ ...l, id: `D${i}` }));

describe("kalkuliereGrundhonorar", () => {
  it("WEG mit Gewerbe und Stellplätzen, ohne Staffel", () => {
    const k = kalkuliereGrundhonorar({ art: "WEG", einheitenWohnen: 18, einheitenGewerbe: 2, stellplaetze: 14 }, katalog, STANDARD_STAFFEL, 250);
    // 20 × 27,50 + 2 × 12 + 14 × 3,50 = 550 + 24 + 49 = 623
    expect(k.nettoVorRabatt).toBe(623);
    expect(k.rabattProzent).toBe(0);
    expect(k.netto).toBe(623);
    expect(k.positionen.map((p) => p.leistungCode)).toEqual(["WEG_GRUND", "GEWERBE_ZUSCHLAG", "STELLPLATZ"]);
  });
  it("Staffelrabatt ab 30 Einheiten", () => {
    const k = kalkuliereGrundhonorar({ art: "WEG", einheitenWohnen: 40, einheitenGewerbe: 2, stellplaetze: 0 }, katalog, STANDARD_STAFFEL, 250);
    expect(k.rabattProzent).toBe(5);
    expect(k.nettoVorRabatt).toBe(1179); // 42 × 27,5 + 2 × 12
    expect(k.rabattBetrag).toBe(58.95);
    expect(k.netto).toBe(1120.05);
  });
  it("Mindesthonorar bei kleinen Objekten", () => {
    const k = kalkuliereGrundhonorar({ art: "MIET", einheitenWohnen: 4, einheitenGewerbe: 0, stellplaetze: 0 }, katalog, STANDARD_STAFFEL, 250);
    expect(k.mindesthonorarAngewendet).toBe(true);
    expect(k.netto).toBe(250);
    expect(k.positionen.at(-1)?.gesamtNetto).toBe(122);
  });
  it("Dienstleister: gewünschte Leistungen per Code", () => {
    const k = kalkuliereGrundhonorar({ art: "MIET", einheitenWohnen: 8, einheitenGewerbe: 0, stellplaetze: 0 }, dienst, [], 0, ["TREPPENHAUS", "WINTERDIENST"]);
    expect(k.positionen.map((p) => p.gesamtNetto)).toEqual([190, 140]);
    expect(k.netto).toBe(330);
  });
});
