import { describe, expect, it } from "vitest";
import type { Einstellungen, Mahnung, Sollstellung } from "../domain/schema";
import { faelligkeit, nterWerktag, verzugsbeginn, verzugszinsen } from "./verzugszinsen";
import { mahnvorschlaege, naechsteStufe, type MahnKontext } from "./mahnvorschlaege";
import { EINHEITEN, FIRMA, OBJEKTE, PERSONEN } from "./fixtures/testdaten";
import { eur } from "../format";

describe("Fälligkeit und Verzugszinsen", () => {
  it("dritter Werktag ohne Samstag und Sonntag", () => {
    expect(nterWerktag("2026-08", 3)).toBe("2026-08-05"); // 1.8.2026 ist ein Samstag
    expect(nterWerktag("2026-07", 3)).toBe("2026-07-03"); // 1.7.2026 ist ein Mittwoch
    expect(faelligkeit("2026-07")).toBe("2026-07-03");
    expect(verzugsbeginn("2026-07")).toBe("2026-07-04");
  });
  it("taggenau act/act: Beispiel Creditreform 1.000 € bei 10,52 % für 32 Tage = 9,22 €", () => {
    expect(verzugszinsen(1000, "2026-07-20", "2026-08-20", 1.52, 9)).toEqual({ zinsen: 9.22, tage: 32, satz: 10.52 });
    expect(verzugszinsen(1000, "2026-07-20", "2026-08-20", 1.52, 5).zinsen).toBe(5.72);
  });
  it("Schaltjahr mit 366 Tagen", () => {
    expect(verzugszinsen(1000, "2024-02-01", "2024-02-29", 3.62, 5).zinsen).toBe(6.83);
  });
  it("Jahreswechsel wird getrennt gerechnet, keine Zinsen vor dem ersten Zinstag", () => {
    expect(verzugszinsen(1000, "2025-12-31", "2026-01-01", 1.27, 5)).toEqual({ zinsen: 0.34, tage: 2, satz: 6.27 });
    expect(verzugszinsen(1000, "2026-08-10", "2026-08-01", 1.27, 5).zinsen).toBe(0);
  });
});

function sollstellung(personId: string, monat: string, soll: number, ist: number): Sollstellung {
  return { personId, objektId: "OBJ-002", monat, soll, ist, differenz: soll - ist, status: ist > 0 ? "teilweise" : "offen", umsatzIds: [] };
}

const mahnwesen: Einstellungen["mahnwesen"] = { fristTage: 10, gebuehrStufe2: 5, gebuehrStufe3: 10, toleranzEuro: 1, basiszinsProzent: 1.52 };

function kontext(vorhandene: Mahnung[] = [], heute = "2026-08-23"): MahnKontext {
  return { personen: PERSONEN, objekte: OBJEKTE, einheiten: EINHEITEN, mahnwesen, firma: FIRMA, heute, vorhandene };
}

function mahnung(personId: string, stufe: number, status: Mahnung["status"]): Mahnung {
  return { id: `M-${stufe}`, nummer: `M-2026-000${stufe}`, stufe, datum: "2026-08-01", frist: "2026-08-11", objektId: "OBJ-002", personId, rechnungId: null, empfaenger: { name: "", zusatz: "", adresse: { strasse: "", plz: "", ort: "", land: "DE" }, email: "", kundennummer: "", leitwegId: "", ustIdNr: "" }, posten: [], betragOffen: 0, mahngebuehr: 0, verzugszinsen: 0, gesamt: 0, text: [], status, erstelltAm: "2026-08-01T00:00:00Z" };
}

describe("Mahnvorschläge", () => {
  const offene = [sollstellung("P-203", "2026-07", 810, 0), sollstellung("P-203", "2026-08", 810, 500)];

  it("Stufe 1: Zahlungserinnerung ohne Gebühr, Posten je Monat, Frist = heute + fristTage", () => {
    const [m] = mahnvorschlaege(offene, kontext());
    expect(m.stufe).toBe(1);
    expect(m.personId).toBe("P-203");
    expect(m.posten).toHaveLength(2);
    expect(m.posten[0].bezeichnung).toContain("Miete Juli 2026");
    expect(m.posten[0].bezeichnung).toContain("Whg 3");
    expect(m.posten[1].offen).toBe(310);
    expect(m.betragOffen).toBe(1120);
    expect(m.mahngebuehr).toBe(0);
    expect(m.frist).toBe("2026-09-02");
    expect(m.status).toBe("vorschlag");
    expect(m.empfaenger.name).toBe("Jonas Weber");
    expect(m.text[0]).toBe("Sehr geehrter Herr Weber,");
    expect(m.text.some((t) => t.includes(eur(1120)))).toBe(true);
  });
  it("Verzugszinsen werden taggenau ab dem Tag nach Fälligkeit ausgewiesen", () => {
    const [m] = mahnvorschlaege(offene, kontext());
    const juli = verzugszinsen(810, "2026-07-04", "2026-08-23", 1.52).zinsen;
    const august = verzugszinsen(310, "2026-08-06", "2026-08-23", 1.52).zinsen;
    expect(m.verzugszinsen).toBe(Math.round((juli + august) * 100) / 100);
    expect(m.gesamt).toBe(Math.round((1120 + m.verzugszinsen) * 100) / 100);
  });
  it("Stufe 2 nach versendeter Zahlungserinnerung, mit Gebühr und Verzugstext", () => {
    const [m] = mahnvorschlaege(offene, kontext([mahnung("P-203", 1, "versendet")]));
    expect(m.stufe).toBe(2);
    expect(m.mahngebuehr).toBe(5);
    expect(m.text.some((t) => t.includes("§ 286 Abs. 2 Nr. 1 BGB"))).toBe(true);
    expect(m.text.some((t) => t.includes("§ 288 Abs. 1 BGB"))).toBe(true);
  });
  it("Stufe 3 bleibt die letzte Stufe", () => {
    expect(naechsteStufe("P-203", [mahnung("P-203", 3, "versendet")])).toBe(3);
    const [m] = mahnvorschlaege(offene, kontext([mahnung("P-203", 3, "versendet")]));
    expect(m.mahngebuehr).toBe(10);
    expect(m.text.some((t) => t.includes("gerichtliche"))).toBe(true);
  });
  it("kein neuer Vorschlag, solange ein Vorschlag offen ist", () => {
    expect(mahnvorschlaege(offene, kontext([mahnung("P-203", 1, "vorschlag")]))).toHaveLength(0);
  });
  it("noch nicht fällige Monate werden nicht gemahnt", () => {
    const liste = mahnvorschlaege([sollstellung("P-203", "2026-08", 810, 0)], kontext([], "2026-08-03"));
    expect(liste).toHaveLength(0);
  });
  it("Rest innerhalb der Toleranz wird nicht gemahnt", () => {
    expect(mahnvorschlaege([sollstellung("P-203", "2026-07", 810, 809.5)], kontext())).toHaveLength(0);
  });
  it("ohne Basiszins keine Zinsen, aber auch kein Fehler", () => {
    const k = kontext();
    k.mahnwesen = { ...mahnwesen, basiszinsProzent: undefined as unknown as number };
    const [m] = mahnvorschlaege(offene, k);
    expect(m.verzugszinsen).toBe(0);
  });
});
