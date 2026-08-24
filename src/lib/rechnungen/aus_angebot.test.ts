import { describe, expect, it } from "vitest";
import { Angebot } from "../domain/schema";
import { rechnungAusAngebot } from "./aus_angebot";
import { TEST_OBJEKTE, testEinstellungen } from "./testdaten";

function angebot(teil: Partial<Angebot> = {}): Angebot {
  return Angebot.parse({
    id: "ANG-1",
    nummer: "A-2026-0017",
    datum: "2026-08-10",
    gueltigBis: "2026-09-10",
    empfaenger: { name: "Wohnungseigentümergemeinschaft Lindenallee 12", zusatz: "vertreten durch die Verwaltung", adresse: { strasse: "Lindenallee 12", plz: "50733", ort: "Köln" }, kundennummer: "K-1006" },
    objekt: { strasse: "Lindenallee 12", plz: "50733", ort: "Köln", art: "WEG", einheitenWohnen: 40, einheitenGewerbe: 2, stellplaetze: 0 },
    betreff: "Angebot WEG-Verwaltung Lindenallee 12",
    positionen: [
      { pos: 1, leistungCode: "WEG_GRUND", bezeichnung: "WEG-Verwaltung, Grundhonorar", menge: 42, einheit: "Einheit/Monat", einzelpreisNetto: 27.5, gesamtNetto: 1155, ustSatz: 19 },
      { pos: 2, leistungCode: "GEWERBE_ZUSCHLAG", bezeichnung: "Zuschlag Gewerbeeinheit", menge: 2, einheit: "Einheit/Monat", einzelpreisNetto: 12, gesamtNetto: 24, ustSatz: 19 },
    ],
    rabattProzent: 5,
    rabattBetrag: 58.95,
    netto: 1120.05,
    ust: 212.81,
    brutto: 1332.86,
    turnus: "monatlich",
    status: "angenommen",
    erstelltAm: "2026-08-10T09:00:00Z",
    ...teil,
  });
}

describe("rechnungAusAngebot", () => {
  it("rechnet den ersten Monat eines monatlichen Angebots ab, Rabatt als eigene Zeile", () => {
    const r = rechnungAusAngebot(angebot(), { datum: "2026-09-01", monat: "2026-09", einstellungen: testEinstellungen() });
    expect(r.art).toBe("aus_angebot");
    expect(r.angebotId).toBe("ANG-1");
    expect(r.objektId).toBeNull();
    expect(r.positionen).toHaveLength(3);
    expect(r.positionen[2]).toMatchObject({ gesamtNetto: -58.95, bezeichnung: "Rabatt 5 % laut Angebot" });
    expect(r.netto).toBe(1120.05);
    expect(r.ust).toBe(212.81);
    expect(r.brutto).toBe(1332.86);
    expect(r.leistungVon).toBe("2026-09-01");
    expect(r.leistungBis).toBe("2026-09-30");
    expect(r.betreff).toBe("Verwaltungshonorar September 2026, Lindenallee 12, 50733 Köln");
    expect(r.einleitung).toContain("Angebot A-2026-0017 vom 10.08.2026");
    expect(r.empfaenger.kundennummer).toBe("K-1006");
    expect(r.faelligAm).toBe("2026-09-15");
    // Ohne Objektkonto: Überweisung
    expect(r.zahlungsbedingung).toContain("Zahlbar ohne Abzug");
  });

  it("nimmt den Monat des Rechnungsdatums, wenn keiner angegeben ist", () => {
    const r = rechnungAusAngebot(angebot(), { datum: "2026-10-05", einstellungen: testEinstellungen() });
    expect(r.leistungVon).toBe("2026-10-01");
    expect(r.leistungBis).toBe("2026-10-31");
  });

  it("verdoppelt den Rabatt nicht, wenn er schon als Position drin ist", () => {
    const a = angebot();
    a.positionen.push({ pos: 3, leistungCode: "", bezeichnung: "Mengenrabatt 5 % ab 30 Einheiten", beschreibung: "", menge: 1, einheit: "pauschal", einzelpreisNetto: -58.95, gesamtNetto: -58.95, ustSatz: 19 });
    const r = rechnungAusAngebot(a, { datum: "2026-09-01", einstellungen: testEinstellungen() });
    expect(r.positionen).toHaveLength(3);
    expect(r.netto).toBe(1120.05);
  });

  it("verknüpft ein vorhandenes Objekt und nutzt dessen Zahlungsweise", () => {
    const objekt = TEST_OBJEKTE.find((o) => o.id === "OBJ-001")!;
    const r = rechnungAusAngebot(angebot(), { objekt, datum: "2026-09-01", einstellungen: testEinstellungen() });
    expect(r.objektId).toBe("OBJ-001");
    expect(r.betreff).toContain("WEG Am Stadtpark 3");
    expect(r.zahlungsbedingung).toContain("entnommen");
  });

  it("einmalige Angebote: Leistungstag statt Monat", () => {
    const r = rechnungAusAngebot(angebot({ turnus: "einmalig", betreff: "Aufstellung Wirtschaftsplan", rabattBetrag: 0, rabattProzent: 0 }), { datum: "2026-09-01", leistungsdatum: "2026-08-28", einstellungen: testEinstellungen() });
    expect(r.leistungVon).toBe("2026-08-28");
    expect(r.leistungBis).toBe("2026-08-28");
    expect(r.positionen).toHaveLength(2);
    expect(r.netto).toBe(1179);
    expect(r.betreff).toBe("Aufstellung Wirtschaftsplan, Lindenallee 12, 50733 Köln");
  });

  it("Kleinunternehmer: alle Positionen ohne Steuer", () => {
    const r = rechnungAusAngebot(angebot(), { datum: "2026-09-01", einstellungen: testEinstellungen({ kleinunternehmer: true }) });
    expect(r.positionen.every((p) => p.ustSatz === 0)).toBe(true);
    expect(r.brutto).toBe(1120.05);
  });

  it("lehnt ein Angebot ohne Positionen ab", () => {
    expect(() => rechnungAusAngebot(angebot({ positionen: [], rabattBetrag: 0 }), { datum: "2026-09-01", einstellungen: testEinstellungen() })).toThrow(/Positionen/);
  });
});
