import { describe, expect, it } from "vitest";
import type { Rechnung } from "../domain/schema";
import { bereitsAbgerechnet, honorarlauf } from "./honorar";
import { buchungenAusRechnung, stornoBuchungen } from "./buchung";
import { fehlendePflichtangaben, zahlungsweiseFuer } from "./entwurf";
import { KATALOG_DIENSTLEISTER, KATALOG_HAUSVERWALTUNG, TEST_OBJEKTE, testEinstellungen } from "./testdaten";

const lauf = (teil: Partial<Parameters<typeof honorarlauf>[0]> = {}) =>
  honorarlauf({ monat: "2026-08", objekte: TEST_OBJEKTE, leistungen: KATALOG_HAUSVERWALTUNG, einstellungen: testEinstellungen(), datum: "2026-08-23", ...teil });

function alsRechnung(entwurf: NonNullable<ReturnType<typeof honorarlauf>["zeilen"][number]["entwurf"]>, nummer = "R-2026-0132", status: Rechnung["status"] = "gestellt"): Rechnung {
  return { ...entwurf, id: `id-${nummer}`, nummer, status, erstelltAm: "2026-08-23T10:00:00Z" };
}

describe("honorarlauf", () => {
  it("macht aus fünf Objekten fünf Rechnungen mit den richtigen Beträgen", () => {
    const l = lauf();
    expect(l.zeilen).toHaveLength(5);
    expect(l.zuErzeugen).toHaveLength(5);
    const netto = Object.fromEntries(l.zeilen.map((z) => [z.objekt.kurzname, z.entwurf?.netto]));
    // 25 Einheiten × 27,50 + 1 × 12 + 20 × 3,50 = 769,50 (25 Einheiten: noch kein Staffelrabatt)
    expect(netto["WEG Am Stadtpark 3"]).toBe(769.5);
    // 8 × 32 + 4 × 3,50 = 270
    expect(netto["Bahnhofstraße 7"]).toBe(270);
    // Pauschale laut Vertrag
    expect(netto["WEG Rosenhof 5-7"]).toBe(1450);
    // 6 × 32 = 192 → Mindesthonorar 250
    expect(netto["Gartenweg 21"]).toBe(250);
    // 13 × 27,50 + 1 × 12 + 6 × 3,50 = 390,50
    expect(netto["WEG Severinstraße 88"]).toBe(390.5);
    expect(l.netto).toBe(3130);
    const stadtpark = l.zeilen.find((z) => z.objekt.id === "OBJ-001")!.entwurf!;
    expect(stadtpark.positionen.map((p) => p.leistungCode)).toEqual(["WEG_GRUND", "GEWERBE_ZUSCHLAG", "STELLPLATZ"]);
    expect(stadtpark.ust).toBe(146.21);
    expect(stadtpark.brutto).toBe(915.71);
    expect(stadtpark.steuersaetze).toEqual([{ satz: 19, netto: 769.5, ust: 146.21 }]);
  });

  it("füllt Kopf, Empfänger, Zeitraum und Fälligkeit", () => {
    const r = lauf().zeilen.find((z) => z.objekt.id === "OBJ-001")!.entwurf!;
    expect(r.art).toBe("honorar");
    expect(r.status).toBe("entwurf");
    expect(r.datum).toBe("2026-08-23");
    expect(r.leistungVon).toBe("2026-08-01");
    expect(r.leistungBis).toBe("2026-08-31");
    expect(r.faelligAm).toBe("2026-09-06");
    expect(r.objektId).toBe("OBJ-001");
    expect(r.betreff).toBe("Verwaltungshonorar August 2026, WEG Am Stadtpark 3");
    expect(r.empfaenger.name).toBe("Wohnungseigentümergemeinschaft Am Stadtpark 3");
    expect(r.empfaenger.zusatz).toBe("vertreten durch die Verwaltung");
    expect(r.empfaenger.kundennummer).toBe("K-1001");
    expect(r.empfaenger.adresse.plz).toBe("50674");
    // Verwaltung führt das Gemeinschaftskonto: Entnahme statt Überweisung
    expect(r.zahlungsbedingung).toContain("06.09.2026");
    expect(r.zahlungsbedingung).toContain("entnommen");
    expect(r.zahlungsbedingung).toContain("DE12 5001 0517 0648 4898 90");
  });

  it("ergänzt bei einer WEG ohne Zusatz „vertreten durch die Verwaltung“, sonst nicht", () => {
    const zeilen = lauf().zeilen;
    expect(zeilen.find((z) => z.objekt.id === "OBJ-003")!.entwurf!.empfaenger.zusatz).toBe("vertreten durch die Verwaltung");
    expect(zeilen.find((z) => z.objekt.id === "OBJ-004")!.entwurf!.empfaenger.zusatz).toBe("z. Hd. Thomas Brandt");
    expect(zeilen.find((z) => z.objekt.id === "OBJ-002")!.entwurf!.empfaenger.zusatz).toBe("");
  });

  it("rechnet ein Pauschalobjekt mit genau einer Position ab", () => {
    const r = lauf().zeilen.find((z) => z.objekt.id === "OBJ-003")!.entwurf!;
    expect(r.positionen).toHaveLength(1);
    expect(r.positionen[0]).toMatchObject({ menge: 1, einheit: "pauschal/Monat", einzelpreisNetto: 1450, gesamtNetto: 1450, ustSatz: 19 });
    expect(r.ust).toBe(275.5);
    expect(r.brutto).toBe(1725.5);
    expect(r.einleitung).toContain("vereinbarungsgemäß");
  });

  it("weist als Kleinunternehmer keine Umsatzsteuer aus und sagt das", () => {
    const l = lauf({ einstellungen: testEinstellungen({ kleinunternehmer: true }) });
    for (const z of l.zeilen) {
      const r = z.entwurf!;
      expect(r.positionen.every((p) => p.ustSatz === 0)).toBe(true);
      expect(r.ust).toBe(0);
      expect(r.brutto).toBe(r.netto);
      expect(r.steuersaetze).toEqual([{ satz: 0, netto: r.netto, ust: 0 }]);
      expect(r.hinweise.some((h) => h.includes("§ 19 UStG"))).toBe(true);
    }
    expect(l.ust).toBe(0);
    expect(l.brutto).toBe(3130);
  });

  it("überspringt Objekte, für die der Monat schon abgerechnet ist (nicht aber stornierte oder andere Monate)", () => {
    const erster = lauf();
    const stadtpark = alsRechnung(erster.zeilen[0].objekt.id === "OBJ-001" ? erster.zeilen[0].entwurf! : erster.zeilen.find((z) => z.objekt.id === "OBJ-001")!.entwurf!);
    const zweiter = lauf({ vorhandene: [stadtpark] });
    const zeile = zweiter.zeilen.find((z) => z.objekt.id === "OBJ-001")!;
    expect(zeile.grund).toBe("bereits_abgerechnet");
    expect(zeile.vorhanden?.nummer).toBe("R-2026-0132");
    expect(zweiter.zuErzeugen).toHaveLength(4);
    expect(zweiter.netto).toBe(3130 - 769.5);

    const storniert = alsRechnung(stadtpark, "R-2026-0132", "storniert");
    expect(lauf({ vorhandene: [storniert] }).zuErzeugen).toHaveLength(5);
    expect(bereitsAbgerechnet("OBJ-001", "2026-07", [stadtpark])).toBeNull();
    expect(bereitsAbgerechnet("OBJ-001", "2026-08", [stadtpark])?.id).toBe(stadtpark.id);
  });

  it("lässt inaktive Objekte aus", () => {
    const objekte = TEST_OBJEKTE.map((o) => (o.id === "OBJ-004" ? { ...o, aktiv: false } : o));
    const l = lauf({ objekte });
    expect(l.zeilen.map((z) => z.objekt.id)).not.toContain("OBJ-004");
    expect(l.zuErzeugen).toHaveLength(4);
  });

  it("meldet Objekte ohne abrechenbare Leistung statt eine leere Rechnung zu bauen", () => {
    const l = lauf({ leistungen: [] });
    expect(l.zeilen.find((z) => z.objekt.id === "OBJ-001")!.grund).toBe("keine_positionen");
    // Die Pauschale braucht keinen Katalog
    expect(l.zeilen.find((z) => z.objekt.id === "OBJ-003")!.grund).toBe("");
    expect(l.zuErzeugen).toHaveLength(1);
  });

  it("rechnet als Dienstleister alle monatlichen Grundleistungen ab und zieht per Lastschrift ein", () => {
    const einstellungen = testEinstellungen({ branche: "dienstleister" });
    const l = lauf({ einstellungen, leistungen: KATALOG_DIENSTLEISTER, objekte: TEST_OBJEKTE.filter((o) => o.id === "OBJ-002" || o.id === "OBJ-003") });
    const bahnhof = l.zeilen.find((z) => z.objekt.id === "OBJ-002")!.entwurf!;
    expect(bahnhof.positionen.map((p) => p.leistungCode)).toEqual(["HAUSMEISTER", "TREPPENHAUS", "GARTEN", "WINTERDIENST"]);
    expect(bahnhof.netto).toBe(730);
    expect(bahnhof.betreff).toBe("Leistungen August 2026, Bahnhofstraße 7");
    expect(bahnhof.zahlungsbedingung).toContain("SEPA-Lastschrift");
    expect(bahnhof.hinweise.some((h) => h.includes("DE98ZZZ09999999999") && h.includes("K-1002"))).toBe(true);
    // Pauschale gilt auch für den Dienstleister
    const rosenhof = l.zeilen.find((z) => z.objekt.id === "OBJ-003")!.entwurf!;
    expect(rosenhof.netto).toBe(1450);
    expect(rosenhof.positionen[0].bezeichnung).toBe("Monatspauschale laut Vertrag");
  });

  it("sortiert die Zeilen nach Objektname", () => {
    expect(lauf().zeilen.map((z) => z.objekt.kurzname)).toEqual(["Bahnhofstraße 7", "Gartenweg 21", "WEG Am Stadtpark 3", "WEG Rosenhof 5-7", "WEG Severinstraße 88"]);
  });
});

describe("zahlungsweise und Pflichtangaben", () => {
  it("überweist, wenn kein Objektkonto bekannt ist", () => {
    const e = testEinstellungen();
    const gartenweg = TEST_OBJEKTE.find((o) => o.id === "OBJ-004")!;
    expect(zahlungsweiseFuer(gartenweg, e.firma)).toBe("ueberweisung");
    const r = lauf().zeilen.find((z) => z.objekt.id === "OBJ-004")!.entwurf!;
    expect(r.zahlungsbedingung).toContain("Zahlbar ohne Abzug bis zum 06.09.2026");
    expect(r.zahlungsbedingung).toContain("DE02 1203 0000 0000 2020 51");
  });
  it("Dienstleister ohne Gläubiger-ID lässt überweisen", () => {
    const e = testEinstellungen({ branche: "dienstleister", glaeubigerId: "" });
    expect(zahlungsweiseFuer(TEST_OBJEKTE[0], e.firma)).toBe("ueberweisung");
  });
  it("findet fehlende Pflichtangaben nach § 14 Abs. 4 UStG", () => {
    expect(fehlendePflichtangaben(testEinstellungen().firma)).toEqual([]);
    expect(fehlendePflichtangaben(testEinstellungen({ steuernummer: "", ustIdNr: "" }).firma)).toEqual(["Steuernummer oder USt-IdNr."]);
    expect(fehlendePflichtangaben(testEinstellungen({ adresse: { strasse: "", plz: "", ort: "", land: "DE" } }).firma)).toEqual(["vollständige Anschrift"]);
  });
});

describe("buchungen zur Rechnung", () => {
  let n = 0;
  const id = () => `B${++n}`;

  it("bucht je Steuersatz eine Habenzeile auf das Erlöskonto mit der Rechnungsnummer", () => {
    const e = testEinstellungen();
    const r = alsRechnung(lauf().zeilen.find((z) => z.objekt.id === "OBJ-001")!.entwurf!);
    const b = buchungenAusRechnung(r, e, "2026-08-23T10:00:00Z", id);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({
      rechnungId: r.id,
      objektId: "OBJ-001",
      konto: "8400",
      gegenkonto: "",
      belegnummer: "R-2026-0132",
      netto: 769.5,
      ust: 146.21,
      brutto: 915.71,
      ustSatz: 19,
      sollHaben: "H",
      quelle: "rechnung",
      datum: "2026-08-23",
      exportiertAm: null,
    });
    expect(b[0].buchungstext).toBe("Verwaltungshonorar August 2026, WEG Am Stadtpark 3");
  });

  it("trennt gemischte Steuersätze in mehrere Zeilen", () => {
    const e = testEinstellungen();
    const basis = alsRechnung(lauf().zeilen.find((z) => z.objekt.id === "OBJ-001")!.entwurf!);
    const r: Rechnung = { ...basis, steuersaetze: [{ satz: 19, netto: 100, ust: 19 }, { satz: 7, netto: 50, ust: 3.5 }] };
    const b = buchungenAusRechnung(r, e, "2026-08-23T10:00:00Z", id);
    expect(b.map((x) => [x.ustSatz, x.brutto])).toEqual([[19, 119], [7, 53.5]]);
  });

  it("storniert mit umgekehrtem Vorzeichen auf denselben Konten", () => {
    const e = testEinstellungen();
    const r = alsRechnung(lauf().zeilen.find((z) => z.objekt.id === "OBJ-001")!.entwurf!);
    const b = buchungenAusRechnung(r, e, "2026-08-23T10:00:00Z", id);
    const fremd = { ...b[0], id: "fremd", rechnungId: "andere" };
    const s = stornoBuchungen(r, [...b, fremd], "2026-09-01", "2026-09-01T09:00:00Z", id);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ netto: -769.5, ust: -146.21, brutto: -915.71, konto: "8400", sollHaben: "H", datum: "2026-09-01", belegnummer: "R-2026-0132" });
    expect(s[0].buchungstext.startsWith("Storno R-2026-0132")).toBe(true);
    expect(s[0].id).not.toBe(b[0].id);
  });
});
