import { describe, expect, it } from "vitest";
import { einheitImZweck, monatAusZweck, nachnamen, normalisiere, ordneZu, type AbgleichKontext, type AbgleichUmsatz } from "./abgleich";
import { BELEGE, EINHEITEN, FIRMA, KONTEN, OBJEKTE, PERSONEN, RECHNUNGEN } from "./fixtures/testdaten";

function kontext(kontoId = "BK-001"): AbgleichKontext {
  return { konto: KONTEN.find((k) => k.id === kontoId)!, objekte: OBJEKTE, personen: PERSONEN, einheiten: EINHEITEN, belege: BELEGE, rechnungen: RECHNUNGEN, firma: FIRMA, toleranz: 1 };
}

function umsatz(teil: Partial<AbgleichUmsatz>): AbgleichUmsatz {
  return { buchungstag: "2026-07-01", betrag: 0, name: "", iban: "", verwendungszweck: "", buchungstext: "", ...teil };
}

describe("Text und Namen", () => {
  it("normalisiert Umlaute und Sonderzeichen", () => {
    expect(normalisiere("Müller-Lüdenscheid, Jörg ß")).toBe("mueller luedenscheid joerg ss");
  });
  it("findet Nachnamen", () => {
    expect(nachnamen("Lukas und Marie Hoffmann")).toEqual(["hoffmann"]);
    expect(nachnamen("WG Becker / Ott").sort()).toEqual(["becker", "ott"]);
    expect(nachnamen("Dr. Stefan Berger")).toEqual(["berger"]);
    expect(nachnamen("Müller, Hans")).toEqual(["mueller"]);
    expect(nachnamen("Yilmaz")).toEqual(["yilmaz"]);
  });
  it("findet Einheiten im Verwendungszweck", () => {
    expect(einheitImZweck("Miete Whg 3 Weber", EINHEITEN)?.id).toBe("E-203");
    expect(einheitImZweck("Miete Wohnung 8", EINHEITEN)?.id).toBe("E-208");
    expect(einheitImZweck("WE 1 Juli", EINHEITEN)?.id).toBe("E-201");
    expect(einheitImZweck("Whg 30", EINHEITEN)).toBeNull();
    expect(einheitImZweck("Miete Juli", EINHEITEN)).toBeNull();
  });
});

describe("Monat aus dem Verwendungszweck", () => {
  it("Monatsnamen und Zahlenformate", () => {
    expect(monatAusZweck("Miete Juli", "2026-07-01")).toEqual({ monat: "2026-07", quelle: "zweck" });
    expect(monatAusZweck("Miete 07/2026", "2026-07-02")).toEqual({ monat: "2026-07", quelle: "zweck" });
    expect(monatAusZweck("Miete 8/26", "2026-07-30")).toEqual({ monat: "2026-08", quelle: "zweck" });
    expect(monatAusZweck("HG 07.2026 Berger", "2026-07-01")).toEqual({ monat: "2026-07", quelle: "zweck" });
    expect(monatAusZweck("Miete 2026-08", "2026-07-30")).toEqual({ monat: "2026-08", quelle: "zweck" });
    expect(monatAusZweck("Miete August Hoffmann Whg 5", "2026-07-31")).toEqual({ monat: "2026-08", quelle: "zweck" });
  });
  it("Jahreswechsel bei Monatsnamen ohne Jahr", () => {
    expect(monatAusZweck("Miete Dezember", "2027-01-03").monat).toBe("2026-12");
    expect(monatAusZweck("Miete Januar", "2026-12-28").monat).toBe("2027-01");
  });
  it("Buchungstag entscheidet, wenn nichts im Zweck steht; ab dem 25. gilt der Folgemonat", () => {
    expect(monatAusZweck("Dauerauftrag", "2026-07-03")).toEqual({ monat: "2026-07", quelle: "buchungstag" });
    expect(monatAusZweck("Dauerauftrag", "2026-07-30")).toEqual({ monat: "2026-08", quelle: "buchungstag" });
    expect(monatAusZweck("", "2026-12-28").monat).toBe("2027-01");
  });
  it("volle Daten im Zweck werden nicht als Monat gelesen", () => {
    expect(monatAusZweck("Zahlung vom 05.12.2025 Kd 4711", "2026-01-05")).toEqual({ monat: "2026-01", quelle: "buchungstag" });
  });
});

describe("Eingänge zuordnen", () => {
  it("IBAN der Person → sicher, Monat aus dem Zweck", () => {
    const z = ordneZu(umsatz({ betrag: 900, name: "A. Schmidt", iban: "DE21100110012626667882", verwendungszweck: "Miete Juli 2026 Whg 1" }), kontext());
    expect(z.art).toBe("mieteingang");
    expect(z.personId).toBe("P-201");
    expect(z.sicherheit).toBe("sicher");
    expect(z.monat).toBe("2026-07");
    expect(z.quelle).toBe("regel");
  });
  it("Partner zahlt unter anderem Vornamen mit unbekannter IBAN: Nachname + Betrag → sicher", () => {
    const z = ordneZu(umsatz({ betrag: 1010, name: "Mehmet Yilmaz", iban: "DE99999999999999999999", verwendungszweck: "Miete 07/2026" }), kontext());
    expect(z.personId).toBe("P-202");
    expect(z.sicherheit).toBe("sicher");
    expect(z.monat).toBe("2026-07");
  });
  it("Name im Zweck plus Einheit plus Betrag → sicher", () => {
    const z = ordneZu(umsatz({ betrag: 810, name: "Sabine Müller", verwendungszweck: "Miete Whg 3 Weber" }), kontext());
    expect(z.personId).toBe("P-203");
    expect(z.sicherheit).toBe("sicher");
  });
  it("Partner mit fremdem Namen: Einheit und Betrag schlagen einen zufällig passenden Nachnamen", () => {
    // Peter Schmidt zahlt für Karl Fischer (Whg 8); Anna Schmidt (Whg 1) darf es nicht werden
    const z = ordneZu(umsatz({ betrag: 770, name: "Peter Schmidt", verwendungszweck: "Miete Whg 8" }), kontext());
    expect(z.personId).toBe("P-208");
    expect(z.sicherheit).toBe("sicher");
    expect(z.begruendung).toContain("Whg 8");
  });
  it("Betrag allein bei genau einer passenden Person → wahrscheinlich", () => {
    const z = ordneZu(umsatz({ betrag: 810, name: "Unbekannte Firma", verwendungszweck: "Dauerauftrag" }), kontext());
    expect(z.personId).toBe("P-203");
    expect(z.sicherheit).toBe("wahrscheinlich");
  });
  it("Betrag passt zu zwei Personen → offen mit Begründung", () => {
    const z = ordneZu(umsatz({ betrag: 860, name: "Unbekannt", verwendungszweck: "Ueberweisung" }), kontext());
    expect(z.art).toBe("offen");
    expect(z.personId).toBeNull();
    expect(z.begruendung).toContain("Mehrere Personen");
  });
  it("halbe Miete einer WG → wahrscheinlich, Teilzahlung wird der Person zugeordnet", () => {
    const z = ordneZu(umsatz({ betrag: 545, name: "Tim Becker", verwendungszweck: "Miete Juli Becker" }), kontext());
    expect(z.personId).toBe("P-206");
    expect(z.sicherheit).toBe("wahrscheinlich");
    expect(z.monat).toBe("2026-07");
  });
  it("Hausgeld eines Eigentümers auf dem Gemeinschaftskonto", () => {
    const z = ordneZu(umsatz({ betrag: 310, name: "Dr. Stefan Berger", iban: "DE44500105175407324931", verwendungszweck: "Hausgeld 07/2026" }), kontext("BK-002"));
    expect(z.art).toBe("hausgeld");
    expect(z.personId).toBe("P-501");
    expect(z.sicherheit).toBe("sicher");
    expect(z.monat).toBe("2026-07");
  });
  it("Personen anderer Objekte kommen auf dem Objektkonto nicht in Frage", () => {
    const z = ordneZu(umsatz({ betrag: 310, name: "Dr. Stefan Berger", iban: "DE44500105175407324931", verwendungszweck: "Hausgeld 07/2026" }), kontext("BK-001"));
    expect(z.personId).toBeNull();
  });
  it("eigene Rechnung: Nummer im Zweck → honorar", () => {
    const z = ordneZu(umsatz({ betrag: 1000, name: "WEG Severinstraße 88", verwendungszweck: "R-2026-0131 Verwalterhonorar Juli" }), kontext("BK-003"));
    expect(z.art).toBe("honorar");
    expect(z.rechnungId).toBe("R-1");
    expect(z.sicherheit).toBe("sicher");
  });
  it("Kaution → Art kaution mit Person", () => {
    const z = ordneZu(umsatz({ betrag: 2700, name: "Jonas Weber", verwendungszweck: "Kaution Whg 3" }), kontext());
    expect(z.art).toBe("kaution");
    expect(z.personId).toBe("P-203");
    expect(z.monat).toBeNull();
  });
  it("unbekannter Eingang bleibt offen", () => {
    const z = ordneZu(umsatz({ betrag: 33.33, name: "Finanzamt Köln", verwendungszweck: "Erstattung" }), kontext());
    expect(z.art).toBe("offen");
    expect(z.personId).toBeNull();
  });
});

describe("Ausgänge zuordnen", () => {
  it("Beleg: Betrag und Rechnungsnummer → belegzahlung sicher", () => {
    const z = ordneZu(umsatz({ betrag: -1238, name: "Müller Sanitär GmbH", verwendungszweck: "RE 2026-0815 Wartung Heizung" }), kontext());
    expect(z.art).toBe("belegzahlung");
    expect(z.belegId).toBe("B-1");
    expect(z.sicherheit).toBe("sicher");
  });
  it("Beleg: Betrag und IBAN des Lieferanten, Nummer fehlt → sicher", () => {
    const z = ordneZu(umsatz({ betrag: -1238, name: "MUELLER SAN", iban: "DE89370400440532013000", verwendungszweck: "Lastschrift" }), kontext());
    expect(z.belegId).toBe("B-1");
    expect(z.sicherheit).toBe("sicher");
  });
  it("Beleg: Rechnungsnummer passt, Betrag weicht ab (Skonto) → wahrscheinlich", () => {
    const z = ordneZu(umsatz({ betrag: -1213.24, name: "Müller Sanitär GmbH", verwendungszweck: "2026-0815 abzgl. 2% Skonto" }), kontext());
    expect(z.belegId).toBe("B-1");
    expect(z.sicherheit).toBe("wahrscheinlich");
  });
  it("Beleg: nur der Betrag passt → unsicher", () => {
    const z = ordneZu(umsatz({ betrag: -120, name: "Unbekannt", verwendungszweck: "Abschlag" }), kontext());
    expect(z.art).toBe("belegzahlung");
    expect(z.belegId).toBe("B-2");
    expect(z.sicherheit).toBe("unsicher");
  });
  it("Bankentgelt → gebuehr mit Kostenart BANKGEBUEHREN", () => {
    const z = ordneZu(umsatz({ betrag: -5.95, name: "", verwendungszweck: "Entgeltabrechnung siehe Anlage", buchungstext: "ENTGELTABSCHLUSS" }), kontext());
    expect(z.art).toBe("gebuehr");
    expect(z.kostenartCode).toBe("BANKGEBUEHREN");
    expect(z.sicherheit).toBe("sicher");
  });
  it("Bankentgelt auch ohne Namen und mit zusammengeschriebenem Buchungstext; Abschlussrechnung eines Handwerkers nicht", () => {
    expect(ordneZu(umsatz({ betrag: -12.9, verwendungszweck: "Entgeltabschluss siehe Anlage", buchungstext: "ENTGELTABSCHLUSS" }), kontext()).art).toBe("gebuehr");
    expect(ordneZu(umsatz({ betrag: -4.9, name: "ING", verwendungszweck: "Kontoführungsentgelt Juni", buchungstext: "Entgelt" }), kontext()).art).toBe("gebuehr");
    expect(ordneZu(umsatz({ betrag: -6, verwendungszweck: "Abschluss per 30.06.2026", buchungstext: "Abschluss" }), kontext()).art).toBe("gebuehr");
    const handwerker = ordneZu(umsatz({ betrag: -950, name: "Malermeister Kunz", iban: "DE89370400440532013000", verwendungszweck: "Abschlussrechnung 4711", buchungstext: "ONLINE-UEBERWEISUNG" }), kontext());
    expect(handwerker.art).not.toBe("gebuehr");
  });
  it("Zahlung an den Auftraggeber → auszahlung_eigentuemer", () => {
    const z = ordneZu(umsatz({ betrag: -2000, name: "Erika Vogel", verwendungszweck: "Auszahlung Juli 2026" }), kontext());
    expect(z.art).toBe("auszahlung_eigentuemer");
    expect(z.sicherheit).toBe("sicher");
  });
  it("Überweisung an das Konto der Verwaltung → honorar", () => {
    const z = ordneZu(umsatz({ betrag: -1000, name: "Hausverwaltung Mustermann", iban: "DE02120300000000202051", verwendungszweck: "Verwalterhonorar" }), kontext("BK-002"));
    expect(z.art).toBe("honorar");
    expect(z.rechnungId).toBe("R-1");
  });
  it("unbekannter Ausgang bleibt offen", () => {
    const z = ordneZu(umsatz({ betrag: -77.7, name: "Amazon", verwendungszweck: "Bestellung 123" }), kontext());
    expect(z.art).toBe("offen");
  });
});
