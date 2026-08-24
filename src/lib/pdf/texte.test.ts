import { describe, expect, it } from "vitest";
import { BEISPIEL_PDF_FIRMA, beispielAngebot, beispielMahnung, beispielRechnung } from "./beispiel";
import {
  ANREDE_STANDARD,
  HINWEIS_AUFBEWAHRUNG,
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_VERZUG,
  angebotSummen,
  anredeErgaenzen,
  anschriftZeilen,
  bankZeile,
  bankZeilen,
  einheitText,
  einheitenText,
  infoblockZeilen,
  jahresbetragText,
  kuendigungsHinweis,
  laendername,
  leistungszeitraumText,
  mahnAbsaetze,
  mahnSchlussAbsaetze,
  mahnTitel,
  mahnungSummen,
  mengeText,
  objektZeilen,
  preisEinheitText,
  rechnungSummen,
  rechnungTitel,
  rechnungsHinweise,
  ruecksendeangabe,
  zahlungsbedingungText,
} from "./texte";

const firma = BEISPIEL_PDF_FIRMA;

describe("Anschrift und Absender", () => {
  it("baut die Anschrift ohne Leerzeilen und ohne Land bei Deutschland", () => {
    const zeilen = anschriftZeilen(beispielRechnung().empfaenger);
    expect(zeilen).toEqual(["Wohnungseigentümergemeinschaft Am Stadtpark 3", "vertreten durch den Verwaltungsbeirat, z. Hd. Herrn Herbert Klein", "Am Stadtpark 3", "50674 Köln"]);
  });
  it("setzt das Ausland in Großbuchstaben als letzte Zeile", () => {
    const e = { ...beispielRechnung().empfaenger, zusatz: "", adresse: { strasse: "Ringstraße 1", plz: "1010", ort: "Wien", land: "AT" } };
    expect(anschriftZeilen(e).at(-1)).toBe("ÖSTERREICH");
    expect(laendername("de")).toBe("");
    expect(laendername("")).toBe("");
  });
  it("formuliert die Rücksendeangabe einzeilig mit Mittelpunkten", () => {
    expect(ruecksendeangabe(firma)).toBe("Hausverwaltung Mustermann GmbH · Kaiserstraße 45 · 50667 Köln");
  });
  it("liefert nur gefüllte Bankzeilen mit IBAN in Vierergruppen", () => {
    expect(bankZeilen(firma)).toEqual([
      ["Kontoinhaber", "Hausverwaltung Mustermann GmbH"],
      ["IBAN", "DE02 1203 0000 0000 2020 51"],
      ["BIC", "BYLADEM1001"],
      ["Bank", "Deutsche Kreditbank"],
    ]);
    expect(bankZeilen({ ...firma, iban: "", bic: "", bankname: "" })).toEqual([["Kontoinhaber", "Hausverwaltung Mustermann GmbH"]]);
  });
  it("fasst die Bankverbindung in einen Satz und schweigt ohne Konto", () => {
    expect(bankZeile(firma)).toBe("Bankverbindung: Deutsche Kreditbank, IBAN DE02 1203 0000 0000 2020 51, BIC BYLADEM1001, Kontoinhaber Hausverwaltung Mustermann GmbH.");
    expect(bankZeile({ ...firma, iban: "", bic: "", bankname: "" })).toBe("");
  });
});

describe("Informationsblock", () => {
  it("nennt für die Rechnung Datum, Nummer, Fälligkeit, Kundennummer und Kontakt", () => {
    const zeilen = infoblockZeilen({ art: "rechnung", dokument: beispielRechnung() }, firma);
    expect(zeilen.map(([l]) => l)).toEqual(["Datum", "Rechnungsnummer", "Fällig am", "Kundennummer", "Ansprechpartner", "Telefon", "E-Mail"]);
    expect(zeilen[0][1]).toBe("01.10.2026");
    expect(zeilen[2][1]).toBe("15.10.2026");
  });
  it("zeigt Leitweg-ID und USt-IdNr. des Empfängers nur, wenn vorhanden", () => {
    const r = beispielRechnung();
    r.empfaenger.leitwegId = "04011000-1234512345-06";
    r.empfaenger.ustIdNr = "DE999999999";
    const labels = infoblockZeilen({ art: "rechnung", dokument: r }, firma).map(([l]) => l);
    expect(labels).toContain("Leitweg-ID");
    expect(labels).toContain("Ihre USt-IdNr.");
  });
  it("nennt für das Angebot die Bindefrist und den Ansprechpartner", () => {
    const zeilen = infoblockZeilen({ art: "angebot", dokument: beispielAngebot() }, firma);
    expect(zeilen).toContainEqual(["Gültig bis", "31.10.2026"]);
    expect(zeilen).toContainEqual(["Ansprechpartner", "Max Mustermann"]);
  });
  it("nennt für die Mahnung das Zeichen und die Zahlungsfrist", () => {
    const zeilen = infoblockZeilen({ art: "mahnung", dokument: beispielMahnung(2) }, firma);
    expect(zeilen).toContainEqual(["Unser Zeichen", "M-2026-0009"]);
    expect(zeilen).toContainEqual(["Zahlung bis", "05.10.2026"]);
  });
});

describe("Mengen, Einheiten, Objekt", () => {
  it("schreibt Mengen deutsch ohne überflüssige Nullen", () => {
    expect(mengeText(25)).toBe("25");
    expect(mengeText(12.5)).toBe("12,5");
    expect(mengeText(1234.567)).toBe("1.234,57");
  });
  it("übersetzt Einheitencodes mit Einzahl und Mehrzahl und lässt Freitext stehen", () => {
    expect(einheitText("einheit_monat", 1)).toBe("Einheit/Monat");
    expect(einheitText("einheit_monat", 25)).toBe("Einheiten/Monat");
    expect(einheitText("stunde", 2)).toBe("Stunden");
    expect(einheitText("stueck", 3)).toBe("Stück");
    expect(einheitText("Paket", 3)).toBe("Paket");
    expect(preisEinheitText("stunde")).toBe("je Stunde");
    expect(preisEinheitText("pauschal")).toBe("pauschal");
    expect(preisEinheitText("je Termin")).toBe("je Termin");
  });
  it("beschreibt das Objekt kompakt", () => {
    const objekt = beispielAngebot().objekt;
    expect(einheitenText(objekt)).toBe("24 Wohnungen, 1 Gewerbeeinheit, 20 Stellplätze");
    expect(objektZeilen(objekt)).toEqual([
      ["Objekt", "Am Stadtpark 3, 50674 Köln"],
      ["Art", "Wohnungseigentümergemeinschaft"],
      ["Einheiten", "24 Wohnungen, 1 Gewerbeeinheit, 20 Stellplätze"],
      ["Besonderheiten", "zwei Aufzüge, Tiefgarage, Baujahr 1996"],
    ]);
    expect(objektZeilen({ ...objekt, strasse: "", plz: "", ort: "", art: "UNKLAR", einheitenWohnen: 0, einheitenGewerbe: 0, stellplaetze: 0, besonderheiten: [] })).toEqual([]);
  });
});

describe("Anrede", () => {
  it("stellt die Anrede voran, wenn sie fehlt, und lässt eine vorhandene stehen", () => {
    expect(anredeErgaenzen([])).toEqual([ANREDE_STANDARD]);
    expect(anredeErgaenzen(["vielen Dank für Ihre Anfrage."])).toEqual([ANREDE_STANDARD, "vielen Dank für Ihre Anfrage."]);
    expect(anredeErgaenzen(["Sehr geehrter Herr Klein,", "vielen Dank."])).toEqual(["Sehr geehrter Herr Klein,", "vielen Dank."]);
    expect(anredeErgaenzen(["  ", "Guten Tag Frau Vogel,"])).toEqual(["Guten Tag Frau Vogel,"]);
  });
});

describe("Rechnung", () => {
  it("weist Netto und Steuer je Steuersatz aus, wenn mehrere Sätze vorkommen", () => {
    const zeilen = rechnungSummen(beispielRechnung(), firma);
    expect(zeilen.map((z) => z.text)).toEqual(["Nettobetrag 19 %", "Nettobetrag 7 %", "Umsatzsteuer 19 %", "Umsatzsteuer 7 %", "Rechnungsbetrag"]);
    expect(zeilen.at(-1)?.fett).toBe(true);
    expect(zeilen.at(-1)?.wert).toBe(beispielRechnung().brutto);
  });
  it("zeigt bei einem Steuersatz drei Zeilen", () => {
    const r = beispielRechnung();
    r.steuersaetze = [{ satz: 19, netto: 100, ust: 19 }];
    r.netto = 100;
    r.ust = 19;
    r.brutto = 119;
    expect(rechnungSummen(r, firma)).toEqual([
      { text: "Nettobetrag", wert: 100 },
      { text: "zzgl. 19 % Umsatzsteuer", wert: 19 },
      { text: "Rechnungsbetrag", wert: 119, fett: true },
    ]);
  });
  it("weist beim Kleinunternehmer keine Steuer aus und setzt den § 19-Hinweis davor", () => {
    const klein = { ...firma, kleinunternehmer: true };
    const r = beispielRechnung();
    expect(rechnungSummen(r, klein)).toEqual([{ text: "Rechnungsbetrag", wert: r.brutto, fett: true }]);
    const hinweise = rechnungsHinweise(r, klein);
    expect(hinweise[0]).toBe(HINWEIS_KLEINUNTERNEHMER);
    expect(hinweise).toContain(HINWEIS_VERZUG);
    expect(hinweise).toContain(HINWEIS_AUFBEWAHRUNG);
    expect(hinweise).toContain("Die Stundennachweise zur Baubegleitung liegen dieser Rechnung als Anlage bei.");
  });
  it("verdoppelt Hinweise nicht, die das Fachmodul schon formuliert hat", () => {
    const r = beispielRechnung();
    r.hinweise = ["Es gilt § 19 UStG, daher ohne Umsatzsteuer.", "Bitte bewahren Sie diese Rechnung zwei Jahre auf (Aufbewahrungspflicht)."];
    const hinweise = rechnungsHinweise(r, { ...firma, kleinunternehmer: true });
    expect(hinweise.filter((h) => /§\s?19/.test(h))).toHaveLength(1);
    expect(hinweise).not.toContain(HINWEIS_AUFBEWAHRUNG);
  });
  it("lässt den Verzugshinweis bei einer Korrektur weg und nennt sie Rechnungskorrektur", () => {
    const r = { ...beispielRechnung(), art: "gutschrift" as const };
    expect(rechnungTitel(r)).toBe("Rechnungskorrektur");
    expect(rechnungsHinweise(r, firma)).not.toContain(HINWEIS_VERZUG);
    expect(zahlungsbedingungText(r, firma)).toMatch(/wird Ihnen in den nächsten Tagen überwiesen/);
  });
  it("nennt den Leistungszeitpunkt nach § 14 Abs. 4 Nr. 6 UStG in jedem Fall", () => {
    const r = beispielRechnung();
    expect(leistungszeitraumText(r)).toBe("Leistungszeitraum: 01.07.2026 bis 30.09.2026");
    expect(leistungszeitraumText({ ...r, leistungVon: "2026-08-31", leistungBis: "2026-08-31" })).toBe("Leistungsdatum: 31.08.2026");
    expect(leistungszeitraumText({ ...r, leistungVon: null, leistungBis: "2026-08-31" })).toBe("Leistungsdatum: 31.08.2026");
    expect(leistungszeitraumText({ ...r, leistungVon: null, leistungBis: null })).toBe("Das Leistungsdatum entspricht dem Rechnungsdatum.");
  });
  it("formuliert die Zahlungsbedingung mit Betrag, Fälligkeit und Verwendungszweck", () => {
    const text = zahlungsbedingungText(beispielRechnung(), firma);
    expect(text).toContain("bis zum 15.10.2026");
    expect(text).toContain("R-2026-0132");
    expect(text).toContain("auf das unten genannte Konto");
    expect(zahlungsbedingungText({ ...beispielRechnung(), zahlungsbedingung: "Zahlbar sofort." }, firma)).toBe("Zahlbar sofort.");
  });
});

describe("Angebot", () => {
  it("zeigt Zwischensumme und Nachlass, dann Netto, Steuer und Gesamt pro Monat", () => {
    const a = beispielAngebot();
    const zeilen = angebotSummen(a, firma);
    expect(zeilen.map((z) => z.text)).toEqual(["Zwischensumme", "Nachlass 5 %", "Nettobetrag pro Monat", "zzgl. 19 % Umsatzsteuer", "Gesamtbetrag pro Monat"]);
    expect(zeilen[0].wert).toBe(769.5);
    expect(zeilen[1].wert).toBe(-38.48);
    expect(zeilen[2].wert).toBe(a.netto);
  });
  it("rechnet den Jahresbetrag in Cent und nennt ihn nur bei monatlichem Turnus", () => {
    const a = beispielAngebot();
    expect(jahresbetragText(a, firma).replace(/\u00a0/g, " ")).toBe("Das entspricht einem Jahresbetrag von 8.772,24 € netto (10.438,92 € brutto).");
    expect(jahresbetragText({ ...a, turnus: "einmalig" }, firma)).toBe("");
    expect(angebotSummen({ ...a, turnus: "einmalig", rabattBetrag: 0 }, firma).map((z) => z.text)).toEqual(["Nettobetrag", "zzgl. 19 % Umsatzsteuer", "Gesamtbetrag"]);
  });
});

describe("Mahnung", () => {
  it("benennt die Stufen", () => {
    expect(mahnTitel(1)).toBe("Zahlungserinnerung");
    expect(mahnTitel(2)).toBe("Mahnung");
    expect(mahnTitel(3)).toBe("Letzte Mahnung");
  });
  it("nutzt eigene Absätze des Mahnwesens, sonst den Standard je Stufe", () => {
    expect(mahnAbsaetze(beispielMahnung(1))[1]).toMatch(/Ihrer Aufmerksamkeit entgangen/);
    expect(mahnAbsaetze(beispielMahnung(2))[1]).toMatch(/in Verzug/);
    expect(mahnAbsaetze({ ...beispielMahnung(2), text: ["Sehr geehrter Herr Wagner,", "leider fehlt noch die Miete."] })).toEqual(["Sehr geehrter Herr Wagner,", "leider fehlt noch die Miete."]);
  });
  it("zeigt Gebühr und Zinsen nur, wenn sie anfallen", () => {
    expect(mahnungSummen(beispielMahnung(1)).map((z) => z.text)).toEqual(["Offene Posten", "Zu zahlen"]);
    expect(mahnungSummen(beispielMahnung(2)).map((z) => z.text)).toEqual(["Offene Posten", "Mahngebühr", "Verzugszinsen (§ 288 BGB)", "Zu zahlen"]);
  });
  it("weist erst bei zwei Monatsmieten Rückstand auf § 543 BGB hin, und nur bei Miete", () => {
    expect(kuendigungsHinweis(beispielMahnung(1))).toBe("");
    expect(kuendigungsHinweis(beispielMahnung(2))).toBe("");
    expect(kuendigungsHinweis(beispielMahnung(3))).toMatch(/§ 543 Abs\. 2 Satz 1 Nr\. 3 BGB/);
    const hausgeld = { ...beispielMahnung(3), posten: beispielMahnung(3).posten.map((p) => ({ ...p, bezeichnung: p.bezeichnung.replace("Miete", "Hausgeld") })) };
    expect(kuendigungsHinweis(hausgeld)).toBe("");
  });
  it("kündigt in der letzten Mahnung das gerichtliche Mahnverfahren an", () => {
    const schluss = mahnSchlussAbsaetze(beispielMahnung(3));
    expect(schluss[0]).toMatch(/gerichtliche Mahnverfahren/);
    expect(schluss[1]).toMatch(/§ 543/);
    expect(mahnSchlussAbsaetze(beispielMahnung(1))[0]).toMatch(/gegenstandslos/);
  });
});
