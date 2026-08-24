import { describe, expect, it } from "vitest";
import { handwerkerangebotAusNotizen, summenAusDaten, vergleicheHandwerkerangebote } from "./handwerkerangebote";

const notizenA = `Dachdecker Wolf bietet die Dachsanierung für 48.000 € netto an.

${JSON.stringify({
  anbieterName: "Dachdeckerei Wolf GmbH",
  anbieterAdresse: "Hauptstraße 1, 50667 Köln",
  angebotsnummer: "AN-2026-114",
  datum: "2026-08-10",
  gueltigBis: "2026-10-10",
  objektId: "OBJ-005",
  objektHinweis: "Severinstraße 88",
  leistungKurz: "Dachsanierung mit Dämmung",
  positionen: [
    { beschreibung: "Gerüst", menge: 1, einheit: "pausch.", einzelpreisNetto: 4000, netto: 4000, ustSatz: 19 },
    { beschreibung: "Dachdeckung", menge: 320, einheit: "m²", einzelpreisNetto: 137.5, netto: 44000, ustSatz: 19 },
  ],
  nettoGesamt: 48000,
  ustGesamt: 9120,
  bruttoGesamt: 57120,
  bedingungen: ["Zahlung 30 % bei Auftrag, Rest nach Abnahme", "Ausführung Frühjahr 2027"],
  auffaelligkeiten: ["Entsorgung der Altdeckung nicht enthalten"],
})}`;

const notizenB = `Zweites Angebot.\n\n${JSON.stringify({
  anbieterName: "Bedachungen Kern",
  positionen: [{ beschreibung: "Komplettpaket", menge: 1, einheit: "pausch.", einzelpreisNetto: 52000, netto: 52000, ustSatz: 19 }],
  nettoGesamt: null,
  ustGesamt: null,
  bruttoGesamt: null,
  bedingungen: [],
  auffaelligkeiten: [],
})}`;

describe("handwerkerangebotAusNotizen", () => {
  it("liest Zusammenfassung und JSON", () => {
    const r = handwerkerangebotAusNotizen(notizenA);
    expect(r).not.toBeNull();
    expect(r?.zusammenfassung).toBe("Dachdecker Wolf bietet die Dachsanierung für 48.000 € netto an.");
    expect(r?.daten.anbieterName).toBe("Dachdeckerei Wolf GmbH");
    expect(r?.daten.positionen).toHaveLength(2);
  });
  it("gibt null ohne JSON oder bei kaputtem JSON", () => {
    expect(handwerkerangebotAusNotizen("Nur ein Satz.")).toBeNull();
    expect(handwerkerangebotAusNotizen("Kaputt {anbieterName: ")).toBeNull();
  });
  it("ergänzt fehlende Summen aus den Positionen", () => {
    const r = handwerkerangebotAusNotizen(notizenB);
    expect(r).not.toBeNull();
    expect(summenAusDaten(r!.daten)).toEqual({ netto: 52000, brutto: 61880 });
  });
});

describe("vergleicheHandwerkerangebote", () => {
  const zeilen = vergleicheHandwerkerangebote([
    { dokumentId: "D2", dateiname: "kern.pdf", notizen: notizenB },
    { dokumentId: "D1", dateiname: "wolf.pdf", notizen: notizenA },
    { dokumentId: "D3", dateiname: "rechnung.pdf", notizen: "Keine Angebotsdaten." },
  ]);
  it("überspringt Dokumente ohne Daten und sortiert nach Brutto", () => {
    expect(zeilen.map((z) => z.dokumentId)).toEqual(["D1", "D2"]);
  });
  it("markiert das günstigste und rechnet die Abweichung", () => {
    expect(zeilen[0].guenstigstes).toBe(true);
    expect(zeilen[0].abweichungProzent).toBe(0);
    expect(zeilen[1].guenstigstes).toBe(false);
    expect(zeilen[1].abweichungProzent).toBe(8.3); // 61.880 gegen 57.120
    expect(zeilen[0].anzahlPositionen).toBe(2);
    expect(zeilen[0].bedingungen).toHaveLength(2);
    expect(zeilen[0].auffaelligkeiten[0]).toContain("Entsorgung");
  });
});
