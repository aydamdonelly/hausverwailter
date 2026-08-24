import { describe, expect, it } from "vitest";
import type { Protokoll } from "@/lib/domain/schema";
import { bezugTeile, bezugZiel, csvDateiname, detailsKurz, detailsLesbar, leererNachschlag, passtZuSuche, protokollCsv } from "./logik";

const eintrag: Protokoll = {
  id: "p1",
  zeit: "2026-08-23T14:42:00.000Z",
  akteur: "nutzer",
  aktion: "Objekt geändert",
  bezug: "objekt:OBJ-002",
  details: JSON.stringify({ kurzname: "Bahnhofstraße 7", "adresse.plz": { alt: "50667", neu: "50668" }, aktiv: false, honorar: 1234.5, seit: "2023-04-01", ibans: ["A", "B"] }),
};

describe("detailsLesbar", () => {
  it("löst JSON in Zeilen auf, Änderungen als alt → neu, mit deutschen Formaten", () => {
    expect(detailsLesbar(eintrag.details)).toEqual([
      { schluessel: "kurzname", wert: "Bahnhofstraße 7" },
      { schluessel: "adresse.plz", wert: "50667 → 50668" },
      { schluessel: "aktiv", wert: "nein" },
      { schluessel: "honorar", wert: "1.234,5" },
      { schluessel: "seit", wert: "01.04.2023" },
      { schluessel: "ibans", wert: "A, B" },
    ]);
  });
  it("lässt Freitext in Ruhe und meldet leer", () => {
    expect(detailsLesbar("Nicht unser Beleg")).toEqual([{ schluessel: "", wert: "Nicht unser Beleg" }]);
    expect(detailsLesbar("")).toEqual([]);
    expect(detailsLesbar(JSON.stringify({ grund: null }))).toEqual([{ schluessel: "grund", wert: "leer" }]);
  });
  it("macht Listen von Objekten lesbar", () => {
    const d = JSON.stringify({ staffel: { alt: [{ abEinheiten: 30, rabattProzent: 5 }], neu: [{ abEinheiten: 30, rabattProzent: 5 }, { abEinheiten: 60, rabattProzent: 10 }] } });
    expect(detailsLesbar(d)).toEqual([{ schluessel: "staffel", wert: "abEinheiten 30, rabattProzent 5 → abEinheiten 30, rabattProzent 5; abEinheiten 60, rabattProzent 10" }]);
  });
  it("kürzt für die Tabelle", () => {
    expect(detailsKurz(eintrag.details, 30)).toBe("kurzname: Bahnhofstraße 7 · a…");
  });
});

describe("bezugZiel", () => {
  const n = leererNachschlag();
  n.belege.set("B1", { dokumentId: "D1", text: "Müller GmbH R-77" });
  n.dokumente.set("D1", "rechnung.pdf");
  n.objekte.set("OBJ-002", "Bahnhofstraße 7");
  n.personen.set("P-201", { name: "Anna Schmidt", objektId: "OBJ-002" });
  n.kostenarten.set("HEIZUNG", "Heizung");
  it("zerlegt Bezüge", () => {
    expect(bezugTeile("beleg:abc")).toEqual({ art: "beleg", id: "abc" });
    expect(bezugTeile("einstellungen")).toEqual({ art: "einstellungen", id: "" });
    expect(bezugTeile("")).toBeNull();
  });
  it("verlinkt Belege über ihr Dokument und Dokumente direkt", () => {
    expect(bezugZiel("beleg:B1", n)).toEqual({ text: "Beleg Müller GmbH R-77", href: "/belege/D1" });
    expect(bezugZiel("dokument:D1", n)).toEqual({ text: "rechnung.pdf", href: "/belege/D1" });
    expect(bezugZiel("beleg:weg", n)).toEqual({ text: "Beleg weg (gelöscht)", href: null });
  });
  it("führt Stammdaten auf den richtigen Reiter", () => {
    expect(bezugZiel("objekt:OBJ-002", n)).toEqual({ text: "Objekt Bahnhofstraße 7", href: "/stammdaten?reiter=objekte" });
    expect(bezugZiel("person:P-201", n)).toEqual({ text: "Anna Schmidt", href: "/stammdaten?reiter=personen&objekt=OBJ-002" });
    expect(bezugZiel("kostenart:HEIZUNG", n)).toEqual({ text: "Kostenart Heizung", href: "/stammdaten?reiter=kostenarten" });
    expect(bezugZiel("einstellungen", n)).toEqual({ text: "Einstellungen", href: "/stammdaten?reiter=einstellungen" });
    expect(bezugZiel("arbeitsbereich", n)).toEqual({ text: "Arbeitsbereich", href: "/stammdaten?reiter=daten" });
  });
  it("kennt Angebote, Rechnungen, Mahnungen und Bank auch ohne Nachschlag", () => {
    expect(bezugZiel("angebot:A1", n)).toEqual({ text: "Angebot A1", href: "/angebote?angebot=A1" });
    expect(bezugZiel("rechnung:R1", n)?.href).toBe("/rechnungen?rechnung=R1");
    expect(bezugZiel("mahnung:M1", n)?.href).toBe("/rechnungen?mahnung=M1");
    expect(bezugZiel("bankumsatz:U1", n)?.href).toBe("/bank");
    expect(bezugZiel("irgendwas:x", n)).toEqual({ text: "irgendwas:x", href: null });
  });
});

describe("passtZuSuche", () => {
  it("findet Wörter in Aktion, Details und aufgelöstem Bezug", () => {
    expect(passtZuSuche(eintrag, "objekt 50668")).toBe(true);
    expect(passtZuSuche(eintrag, "Bahnhof", "Objekt Bahnhofstraße 7")).toBe(true);
    expect(passtZuSuche(eintrag, "Nutzer")).toBe(true);
    expect(passtZuSuche(eintrag, "Rechnung")).toBe(false);
    expect(passtZuSuche(eintrag, "   ")).toBe(true);
  });
});

describe("protokollCsv", () => {
  it("schreibt Excel-taugliches CSV mit BOM, Semikolon und CRLF", () => {
    const csv = protokollCsv([{ ...eintrag, details: 'Grund: "nicht unser"; Beleg' }], () => "Objekt Bahnhofstraße 7");
    expect(csv.startsWith("﻿Zeit;Akteur;Aktion;Bezug;Bezug (Schlüssel);Details\r\n")).toBe(true);
    const zeile = csv.split("\r\n")[1];
    expect(zeile).toContain(";Nutzer;Objekt geändert;Objekt Bahnhofstraße 7;objekt:OBJ-002;");
    expect(zeile.endsWith('"Grund: ""nicht unser""; Beleg"')).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });
  it("benennt die Datei nach dem Datum", () => {
    expect(csvDateiname("2026-08-23T12:00:00.000Z")).toBe("protokoll-2026-08-23.csv");
  });
});
