import { describe, expect, it } from "vitest";
import { Einstellungen, type Anfrage } from "../domain/schema";
import { STANDARD_LEISTUNGEN_DIENSTLEISTER, STANDARD_LEISTUNGEN_HAUSVERWALTUNG, STANDARD_STAFFEL } from "../domain/standard";
import { angebotAusAnfrage, berechneSummen, positionenBereinigen, verwaltungsartBestimmen, waehleLeistungenNachWunsch } from "./erstellen";
import { laufzeitText, leistungsumfangFuer, sonderleistungenFuer, standardBeginn } from "./leistungsumfang";
import { eur } from "../format";

const katalog = STANDARD_LEISTUNGEN_HAUSVERWALTUNG.map((l, i) => ({ ...l, id: `L${i}` }));
const dienstKatalog = STANDARD_LEISTUNGEN_DIENSTLEISTER.map((l, i) => ({ ...l, id: `D${i}` }));

function einstellungen(patch: Partial<Einstellungen["firma"]> = {}): Einstellungen {
  const e = Einstellungen.parse({});
  e.firma = { ...e.firma, name: "Hausverwaltung Mustermann GmbH", ...patch };
  e.staffel = STANDARD_STAFFEL;
  e.mindesthonorarMonat = 250;
  return e;
}

function anfrage(patch: Partial<Anfrage> = {}): Anfrage {
  return {
    id: "ANF-1",
    dokumentId: null,
    eingangAm: "2026-08-20T09:00:00.000Z",
    text: "Sehr geehrte Damen und Herren, wir suchen ab 1.1.2027 eine neue Verwaltung für unsere WEG Am Stadtpark 3 in Köln.",
    istAnfrage: true,
    verwaltungsart: "WEG",
    strasse: "Am Stadtpark 3",
    plz: "50674",
    ort: "Köln",
    einheitenWohnen: 24,
    einheitenGewerbe: 1,
    stellplaetze: 20,
    baujahr: 1996,
    besonderheiten: ["Zwei Aufzüge", "Verwalterwechsel, bisheriger Verwalter gekündigt"],
    leistungswuensche: [],
    gewuenschterBeginn: "2027-01-01",
    kontakt: { name: "Herbert Klein", rolle: "Verwaltungsbeirat", firma: "", email: "klein@example.de", telefon: "" },
    offeneFragen: [],
    zusammenfassung: "WEG mit 25 Einheiten in Köln sucht ab 2027 eine neue Verwaltung.",
    angebotId: null,
    ...patch,
  };
}

describe("angebotAusAnfrage: WEG-Anfrage vollständig", () => {
  const a = angebotAusAnfrage(anfrage(), { leistungen: katalog, einstellungen: einstellungen(), datum: "2026-08-23", jetzt: "2026-08-23T10:00:00.000Z" });

  it("rechnet die Positionen aus dem Katalog", () => {
    expect(a.positionen.map((p) => p.leistungCode)).toEqual(["WEG_GRUND", "GEWERBE_ZUSCHLAG", "STELLPLATZ"]);
    // 25 × 27,50 + 1 × 12 + 20 × 3,50 = 687,50 + 12 + 70
    expect(a.netto).toBe(769.5);
    expect(a.ustSatz).toBe(19);
    expect(a.ust).toBe(146.21);
    expect(a.brutto).toBe(915.71);
  });

  it("adressiert die Gemeinschaft am Objekt, z. Hd. des Kontakts", () => {
    expect(a.empfaenger.name).toBe("Wohnungseigentümergemeinschaft Am Stadtpark 3");
    expect(a.empfaenger.zusatz).toBe("z. Hd. Herbert Klein, Verwaltungsbeirat");
    expect(a.empfaenger.adresse).toEqual({ strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", land: "DE" });
    expect(a.empfaenger.email).toBe("klein@example.de");
    expect(a.ansprechpartner).toBe("Herbert Klein");
  });

  it("setzt Datum, Gültigkeit, Betreff, Turnus und Status", () => {
    expect(a.datum).toBe("2026-08-23");
    expect(a.gueltigBis).toBe("2026-09-22");
    expect(a.betreff).toBe("Angebot WEG-Verwaltung Am Stadtpark 3, 50674 Köln");
    expect(a.turnus).toBe("monatlich");
    expect(a.status).toBe("entwurf");
    expect(a.anfrageId).toBe("ANF-1");
    expect(a.objekt).toEqual({ strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", art: "WEG", einheitenWohnen: 24, einheitenGewerbe: 1, stellplaetze: 20, besonderheiten: ["Zwei Aufzüge", "Verwalterwechsel, bisheriger Verwalter gekündigt"] });
  });

  it("hat keine Annahmen, wenn nichts fehlt", () => {
    expect(a.annahmen).toEqual([]);
  });

  it("liefert Leistungsumfang nach § 27/28 WEG, Laufzeit nach § 26 WEG und Sonderleistungen der Art", () => {
    expect(a.leistungsumfang.some((z) => z.includes("Wirtschaftsplan"))).toBe(true);
    expect(a.leistungsumfang.some((z) => z.includes("Jahresabrechnung"))).toBe(true);
    expect(a.leistungsumfang.some((z) => z.includes("Eigentümerversammlung"))).toBe(true);
    expect(a.leistungsumfang.some((z) => z.includes("Beschluss-Sammlung"))).toBe(true);
    expect(a.leistungsumfang.some((z) => z.includes("Erhaltungsrücklage"))).toBe(true);
    expect(a.leistungsumfang.some((z) => z.includes("Objektbegehung"))).toBe(true);
    expect(a.laufzeitText).toContain("01.01.2027");
    expect(a.laufzeitText).toContain("§ 26 Abs. 2 WEG");
    expect(a.laufzeitText).toContain("fünf Jahre");
    expect(a.sonderleistungen.map((s) => s.bezeichnung)).toContain("Zusätzliche Eigentümerversammlung");
    expect(a.sonderleistungen.map((s) => s.bezeichnung)).not.toContain("Wohnungsübergabe / -abnahme");
  });
});

describe("angebotAusAnfrage: Anfrage mit fehlenden Angaben", () => {
  const luecken = anfrage({
    verwaltungsart: "UNKLAR",
    einheitenWohnen: null,
    einheitenGewerbe: null,
    stellplaetze: null,
    gewuenschterBeginn: null,
    kontakt: { name: "Sabine Roth", rolle: "", firma: "", email: "", telefon: "" },
    offeneFragen: ["Wie viele Einheiten hat das Objekt?", "Gibt es Stellplätze?", "Gibt es einen Aufzug?"],
  });
  const a = angebotAusAnfrage(luecken, { leistungen: katalog, einstellungen: einstellungen(), datum: "2026-08-23" });

  it("nimmt WEG an und nennt das als Annahme", () => {
    expect(a.objekt.art).toBe("WEG");
    expect(a.annahmen[0]).toMatch(/Verwaltungsart nicht/);
    expect(a.annahmen[0]).toMatch(/WEG-Verwaltung/);
  });

  it("setzt fehlende Zahlen auf 0 und erklärt das", () => {
    expect(a.objekt.einheitenWohnen).toBe(0);
    expect(a.objekt.stellplaetze).toBe(0);
    expect(a.annahmen.some((t) => t.includes("Anzahl der Einheiten"))).toBe(true);
    expect(a.annahmen.some((t) => t.includes("Stellplätze") && t.includes(eur(3.5)))).toBe(true);
  });

  it("setzt einen Beginn am übernächsten Monatsersten und weist auf den Beschluss hin", () => {
    expect(standardBeginn("2026-08-23")).toBe("2026-10-01");
    expect(a.annahmen.some((t) => t.includes("01.10.2026") && t.includes("Beschluss"))).toBe(true);
    expect(a.laufzeitText).toContain("01.10.2026");
  });

  it("übernimmt nur die offenen Fragen, die nicht schon durch eine Annahme abgedeckt sind", () => {
    const offen = a.annahmen.filter((t) => t.startsWith("Noch zu klären"));
    expect(offen).toEqual(["Noch zu klären: Gibt es einen Aufzug"]);
  });

  it("lässt die Grundleistung mit Menge 0 stehen, damit die Zahl nachgetragen werden kann", () => {
    expect(a.positionen).toHaveLength(1);
    expect(a.positionen[0].leistungCode).toBe("WEG_GRUND");
    expect(a.positionen[0].menge).toBe(0);
    expect(a.netto).toBe(0);
  });

  it("nennt ohne Firma die Gemeinschaft als Empfänger, z. Hd. der Kontaktperson", () => {
    expect(a.empfaenger.name).toBe("Wohnungseigentümergemeinschaft Am Stadtpark 3");
    expect(a.empfaenger.zusatz).toBe("z. Hd. Sabine Roth");
  });
});

describe("verwaltungsartBestimmen", () => {
  it("Eigentümer als Einzelperson bei UNKLAR wird Mietverwaltung", () => {
    const r = verwaltungsartBestimmen(anfrage({ verwaltungsart: "UNKLAR", kontakt: { name: "Erika Vogel", rolle: "Eigentümerin", firma: "", email: "", telefon: "" } }));
    expect(r.art).toBe("MIET");
    expect(r.annahme).toMatch(/Mietverwaltung/);
  });
  it("Beirat bei UNKLAR bleibt WEG", () => {
    const r = verwaltungsartBestimmen(anfrage({ verwaltungsart: "UNKLAR", kontakt: { name: "H. Klein", rolle: "Miteigentümer und Beirat", firma: "", email: "", telefon: "" } }));
    expect(r.art).toBe("WEG");
  });
  it("bekannte Art bleibt ohne Annahme", () => {
    expect(verwaltungsartBestimmen(anfrage({ verwaltungsart: "MIET" }))).toEqual({ art: "MIET", annahme: null });
  });
});

describe("Mietverwaltung", () => {
  const a = angebotAusAnfrage(
    anfrage({ verwaltungsart: "MIET", einheitenWohnen: 8, einheitenGewerbe: 0, stellplaetze: 4, strasse: "Bahnhofstraße 7", plz: "50667", kontakt: { name: "Erika Vogel", rolle: "Eigentümerin", firma: "", email: "", telefon: "" } }),
    { leistungen: katalog, einstellungen: einstellungen(), datum: "2026-08-23" },
  );
  it("adressiert die Eigentümerin selbst", () => {
    expect(a.empfaenger.name).toBe("Erika Vogel");
    expect(a.empfaenger.zusatz).toBe("Eigentümerin");
    expect(a.betreff).toBe("Angebot Mietverwaltung Bahnhofstraße 7, 50667 Köln");
  });
  it("Leistungsumfang nennt die Frist des § 556 Abs. 3 BGB und Laufzeit zwei Jahre mit drei Monaten Kündigungsfrist", () => {
    expect(a.leistungsumfang.some((z) => z.includes("§ 556 Abs. 3 BGB") && z.includes("zwölften Monats"))).toBe(true);
    expect(a.leistungsumfang.some((z) => z.includes("Mieterwechsel"))).toBe(true);
    expect(a.laufzeitText).toContain("zwei Jahre");
    expect(a.laufzeitText).toContain("drei Monaten");
  });
  it("Mindesthonorar greift: 8 × 32 = 256 liegt über 250, also keine Anpassung", () => {
    expect(a.netto).toBe(270); // 256 + 4 × 3,50
    expect(a.positionen.some((p) => p.bezeichnung.includes("Mindesthonorar"))).toBe(false);
  });
});

describe("Dienstleister", () => {
  const e = einstellungen({ branche: "dienstleister", name: "Gebäudeservice Klar" });
  e.mindesthonorarMonat = 0;
  e.staffel = [];
  const a = angebotAusAnfrage(
    anfrage({
      verwaltungsart: "WEG",
      leistungswuensche: ["Treppenhausreinigung wöchentlich", "Winterdienst"],
      kontakt: { name: "Petra Sommer", rolle: "Sachbearbeiterin", firma: "Hausverwaltung Sommer GmbH", email: "", telefon: "" },
    }),
    { leistungen: dienstKatalog, einstellungen: e, datum: "2026-08-23" },
  );

  it("wählt die richtigen Codes per Wortabgleich", () => {
    expect(waehleLeistungenNachWunsch(["Treppenhausreinigung und Winterdienst"], dienstKatalog)).toEqual(["TREPPENHAUS", "WINTERDIENST"]);
    expect(waehleLeistungenNachWunsch(["Schnee räumen und streuen"], dienstKatalog)).toEqual(["WINTERDIENST"]);
    expect(waehleLeistungenNachWunsch(["Rasen mähen, Hecke schneiden"], dienstKatalog)).toEqual(["GARTEN"]);
    expect(waehleLeistungenNachWunsch(["Hausmeister für 12 Wohnungen"], dienstKatalog)).toEqual(["HAUSMEISTER"]);
    expect(waehleLeistungenNachWunsch(["Bitte Angebot"], dienstKatalog)).toEqual([]);
    expect(waehleLeistungenNachWunsch([], dienstKatalog)).toEqual([]);
  });

  it("rechnet Pauschalen und nennt die Leistungen im Betreff", () => {
    expect(a.positionen.map((p) => p.leistungCode)).toEqual(["TREPPENHAUS", "WINTERDIENST"]);
    expect(a.netto).toBe(330);
    expect(a.ust).toBe(62.7);
    expect(a.brutto).toBe(392.7);
    expect(a.betreff).toBe("Angebot Treppenhausreinigung und Winterdienst, Am Stadtpark 3, 50674 Köln");
  });

  it("adressiert die anfragende Verwaltung", () => {
    expect(a.empfaenger.name).toBe("Hausverwaltung Sommer GmbH");
    expect(a.empfaenger.zusatz).toBe("z. Hd. Petra Sommer");
  });

  it("Leistungsumfang je gewählter Leistung, Laufzeit zwölf Monate, keine Annahme zur Verwaltungsart", () => {
    expect(a.leistungsumfang[0]).toMatch(/^Treppenhausreinigung: /);
    expect(a.leistungsumfang[1]).toMatch(/^Winterdienst: /);
    expect(a.laufzeitText).toContain("zwölf Monate");
    expect(a.annahmen.some((t) => t.includes("Verwaltungsart"))).toBe(false);
    expect(a.annahmen.some((t) => t.includes("Stellplätze"))).toBe(false);
  });

  it("ohne erkennbaren Wunsch: erste Grundleistung mit Annahme", () => {
    const b = angebotAusAnfrage(anfrage({ leistungswuensche: [], text: "Bitte ein Angebot.", zusammenfassung: "", besonderheiten: [] }), { leistungen: dienstKatalog, einstellungen: e, datum: "2026-08-23" });
    expect(b.positionen.map((p) => p.leistungCode)).toEqual(["HAUSMEISTER"]);
    expect(b.annahmen.some((t) => t.includes("Hausmeisterdienst angesetzt"))).toBe(true);
  });
});

describe("Kleinunternehmer und Summen", () => {
  it("Kleinunternehmer: 0 % Umsatzsteuer", () => {
    const a = angebotAusAnfrage(anfrage(), { leistungen: katalog, einstellungen: einstellungen({ kleinunternehmer: true }), datum: "2026-08-23" });
    expect(a.ustSatz).toBe(0);
    expect(a.ust).toBe(0);
    expect(a.brutto).toBe(a.netto);
    expect(a.positionen.every((p) => p.ustSatz === 0)).toBe(true);
  });

  it("berechneSummen: Rabatt auf die Zwischensumme, dann USt", () => {
    const s = berechneSummen([{ gesamtNetto: 687.5 }, { gesamtNetto: 12 }, { gesamtNetto: 70 }], 10, 19);
    expect(s.zwischensumme).toBe(769.5);
    expect(s.rabattBetrag).toBe(76.95);
    expect(s.netto).toBe(692.55);
    expect(s.ust).toBe(131.58);
    expect(s.brutto).toBe(824.13);
  });

  it("positionenBereinigen nummeriert neu und rechnet Zeilen nach", () => {
    const p = positionenBereinigen([
      { pos: 7, leistungCode: "X", bezeichnung: "A", beschreibung: "", menge: 3, einheit: "Stück", einzelpreisNetto: 10.1, gesamtNetto: 0, ustSatz: 19 },
      { pos: 2, leistungCode: "Y", bezeichnung: "B", beschreibung: "", menge: 0.5, einheit: "Stunde", einzelpreisNetto: 75, gesamtNetto: 0, ustSatz: 19 },
    ]);
    expect(p.map((x) => x.pos)).toEqual([1, 2]);
    expect(p.map((x) => x.gesamtNetto)).toEqual([30.3, 37.5]);
  });
});

describe("leistungsumfang", () => {
  it("Gewerbe nennt Index und USt-Option", () => {
    const g = leistungsumfangFuer("GEWERBE");
    expect(g.some((z) => z.includes("Index"))).toBe(true);
    expect(g.some((z) => z.includes("§ 9 UStG"))).toBe(true);
  });
  it("UNKLAR wird wie WEG behandelt", () => {
    expect(leistungsumfangFuer("UNKLAR")).toEqual(leistungsumfangFuer("WEG"));
    expect(laufzeitText("UNKLAR", "2027-01-01")).toContain("§ 26");
  });
  it("Sonderleistungen für Gewerbe schließen Mietleistungen ein", () => {
    expect(sonderleistungenFuer("GEWERBE", katalog).map((s) => s.bezeichnung)).toContain("Wohnungsübergabe / -abnahme");
    expect(sonderleistungenFuer("WEG", katalog).map((s) => s.einheit)).toContain("pauschal");
  });
});
