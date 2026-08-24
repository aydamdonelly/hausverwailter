import { describe, expect, it } from "vitest";
import { Angebot, Anfrage, Firma } from "../domain/schema";
import { auftragAnschreiben, floskelnEntfernen, pruefeAnschreiben, systemAnschreiben } from "./anschreiben";
import { eur } from "../format";

const firma = Firma.parse({ name: "Hausverwaltung Mustermann GmbH", geschaeftsfuehrung: "Max Mustermann" });

const anfrage = Anfrage.parse({
  id: "ANF-1",
  eingangAm: "2026-08-20T09:00:00.000Z",
  text: "Wir suchen eine neue Verwaltung. Dachsanierung 2027 geplant.",
  istAnfrage: true,
  verwaltungsart: "WEG",
  strasse: "Am Stadtpark 3",
  plz: "50674",
  ort: "Köln",
  einheitenWohnen: 24,
  besonderheiten: ["Dachsanierung 2027 geplant"],
  kontakt: { name: "Herbert Klein", rolle: "Verwaltungsbeirat" },
  zusammenfassung: "WEG sucht Verwaltung.",
});

const angebot = Angebot.parse({
  id: "ANG-1",
  nummer: "A-2026-0017",
  datum: "2026-08-23",
  gueltigBis: "2026-09-22",
  anfrageId: "ANF-1",
  empfaenger: { name: "Wohnungseigentümergemeinschaft Am Stadtpark 3", zusatz: "z. Hd. Herbert Klein" },
  objekt: { strasse: "Am Stadtpark 3", plz: "50674", ort: "Köln", art: "WEG", einheitenWohnen: 24 },
  betreff: "Angebot WEG-Verwaltung Am Stadtpark 3, 50674 Köln",
  positionen: [{ pos: 1, leistungCode: "WEG_GRUND", bezeichnung: "WEG-Verwaltung, Grundhonorar", menge: 24, einheit: "Einheit/Monat", einzelpreisNetto: 27.5, gesamtNetto: 660, ustSatz: 19 }],
  netto: 660,
  ust: 125.4,
  brutto: 785.4,
  laufzeitText: "Bestellung für drei Jahre ab dem 01.01.2027.",
  leistungsumfang: ["Wirtschaftsplan", "Jahresabrechnung"],
  annahmen: ["Wir gehen davon aus, dass das Objekt keine Gewerbeeinheiten hat."],
  erstelltAm: "2026-08-23T10:00:00.000Z",
});

describe("Prompts", () => {
  it("System nennt Firma, Sie-Form und verbietet Floskeln", () => {
    const s = systemAnschreiben(firma);
    expect(s).toContain("Hausverwaltung Mustermann GmbH");
    expect(s).toContain("Sie-Form");
    expect(s).toContain('"gerne"');
    expect(s).toContain("rechnest nichts");
  });
  it("Auftrag enthält Beträge im deutschen Format, Besonderheiten, Annahmen und Nummer", () => {
    const a = auftragAnschreiben(anfrage, angebot, firma);
    expect(a).toContain(eur(660));
    expect(a).toContain(eur(785.4));
    expect(a).toContain("Dachsanierung 2027 geplant");
    expect(a).toContain("A-2026-0017");
    expect(a).toContain("- Wir gehen davon aus, dass das Objekt keine Gewerbeeinheiten hat.");
    expect(a).toContain(`24 Einheit/Monat × ${eur(27.5)} = ${eur(660)}`);
    expect(a).toContain("Gültig bis: 22.09.2026");
  });
  it("Kleinunternehmer: Auftrag nennt keine Umsatzsteuer", () => {
    const a = auftragAnschreiben(anfrage, { ...angebot, ustSatz: 0, ust: 0, brutto: 660 }, firma);
    expect(a).toContain("Keine Umsatzsteuer");
    expect(a).not.toContain("Brutto im Monat");
  });
  it("kürzt sehr lange Anfragetexte", () => {
    const a = auftragAnschreiben({ ...anfrage, text: "x".repeat(10000) }, angebot, firma);
    expect(a.length).toBeLessThan(9000);
    expect(a).toContain("…");
  });
});

describe("pruefeAnschreiben", () => {
  const gut = {
    anschreiben: ["Sehr geehrter Herr Klein,", "vielen Dank für Ihre Anfrage vom 20.08.2026.", "Das Grundhonorar beträgt 660,00 € netto im Monat.", "Wir sind davon ausgegangen, dass es keine Gewerbeeinheiten gibt."],
    antwortBetreff: "Angebot A-2026-0017 WEG Am Stadtpark 3",
    antwortText: "Sehr geehrter Herr Klein,\n\nanbei unser Angebot als PDF.\n\nMit freundlichen Grüßen\nHausverwaltung Mustermann GmbH",
  };
  it("nimmt ein sauberes Ergebnis an", () => {
    const p = pruefeAnschreiben(gut);
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.daten.anschreiben).toHaveLength(4);
  });
  it("lehnt zu wenige Absätze ab", () => {
    const p = pruefeAnschreiben({ ...gut, anschreiben: ["Sehr geehrter Herr Klein,", "Anbei."] });
    expect(p.ok).toBe(false);
  });
  it("lehnt eine fehlende Anrede ab", () => {
    const p = pruefeAnschreiben({ ...gut, anschreiben: ["Vielen Dank für Ihre Anfrage.", "Absatz zwei.", "Absatz drei."] });
    expect(p.ok).toBe(false);
  });
  it("lehnt einen leeren Betreff ab", () => {
    expect(pruefeAnschreiben({ ...gut, antwortBetreff: "  " }).ok).toBe(false);
  });
  it("entfernt eingeschlichenes 'gerne' und leere Absätze", () => {
    const p = pruefeAnschreiben({ ...gut, anschreiben: [...gut.anschreiben, "", "Für Rückfragen stehen wir gerne zur Verfügung."] });
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.daten.anschreiben).toHaveLength(5);
      expect(p.daten.anschreiben[4]).toBe("Für Rückfragen stehen wir zur Verfügung.");
    }
  });
  it("lehnt ab, wenn 'Gerne' am Satzanfang bleibt", () => {
    const p = pruefeAnschreiben({ ...gut, antwortText: "Gerne senden wir Ihnen das Angebot." });
    expect(p.ok).toBe(false);
  });
});

describe("floskelnEntfernen", () => {
  it("lässt normale Sätze in Ruhe", () => {
    expect(floskelnEntfernen("Das Honorar beträgt 660,00 € netto.")).toBe("Das Honorar beträgt 660,00 € netto.");
  });
  it("entfernt 'gerne' und 'gern' mitten im Satz", () => {
    expect(floskelnEntfernen("Wir stellen das Angebot gerne in der Versammlung vor.")).toBe("Wir stellen das Angebot in der Versammlung vor.");
    expect(floskelnEntfernen("Wir stellen das Angebot gern persönlich vor.")).toBe("Wir stellen das Angebot persönlich vor.");
  });
  it("lehnt ab, wenn 'Noch zu klären' wörtlich übernommen wurde", () => {
    const p = pruefeAnschreiben({ anschreiben: ["Sehr geehrter Herr Klein,", "Danke für die Anfrage.", "Noch zu klären: Gibt es einen Aufzug?"], antwortBetreff: "Angebot", antwortText: "Anbei das Angebot." });
    expect(p.ok).toBe(false);
  });
  it("behält Absätze der Mail, ersetzt Gedankenstriche", () => {
    expect(floskelnEntfernen("Sehr geehrter Herr Klein,\n\nanbei das Angebot – als PDF.\n\n\n\nMit freundlichen Grüßen")).toBe("Sehr geehrter Herr Klein,\n\nanbei das Angebot, als PDF.\n\nMit freundlichen Grüßen");
  });
});
