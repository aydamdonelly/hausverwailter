import { describe, expect, it } from "vitest";
import { Kostenart, Leistung, Objekt, Person } from "@/lib/domain/schema";
import {
  exportDateiname, fehlendeNachCode, ibansBereinigen, kostenartCodeAusText, lokalesDatum, pruefeKostenart, pruefeLeistung,
  pruefeObjekt, pruefePerson, sollGesamt, speicherGroesse, unterschiede, verwendungText,
} from "./logik";

const objekt = Objekt.parse({
  id: "o1", kurzname: "Bahnhofstraße 7", adresse: { strasse: "Bahnhofstraße 7", plz: "50667", ort: "Köln" }, art: "MIET",
  auftraggeber: { name: "Erika Vogel" },
});

describe("unterschiede", () => {
  it("findet geänderte Felder mit Punktpfad, altem und neuem Wert", () => {
    const neu = { ...objekt, kurzname: "Bahnhofstr. 7", adresse: { ...objekt.adresse, plz: "50668" } };
    expect(unterschiede(objekt, neu)).toEqual({
      kurzname: { alt: "Bahnhofstraße 7", neu: "Bahnhofstr. 7" },
      "adresse.plz": { alt: "50667", neu: "50668" },
    });
  });
  it("ist leer, wenn nichts anders ist", () => {
    expect(unterschiede(objekt, { ...objekt })).toEqual({});
  });
  it("vergleicht Listen als Ganzes und kürzt lange Texte", () => {
    const lang = "x".repeat(500);
    const d = unterschiede({ ibans: ["A"], logo: null }, { ibans: ["A", "B"], logo: lang });
    expect(d.ibans).toEqual({ alt: ["A"], neu: ["A", "B"] });
    expect(String(d.logo.neu)).toMatch(/… \(500 Zeichen\)$/);
  });
  it("behandelt null und fehlend als gleich", () => {
    expect(unterschiede({ a: null }, { a: undefined })).toEqual({});
  });
});

describe("speicherGroesse", () => {
  it("formatiert deutsch mit passender Einheit", () => {
    expect(speicherGroesse(0)).toBe("0 Bytes");
    expect(speicherGroesse(900)).toBe("900 Bytes");
    expect(speicherGroesse(12.4 * 1024 * 1024)).toBe("12,4 MB");
    expect(speicherGroesse(3 * 1024 ** 3)).toBe("3 GB");
    expect(speicherGroesse(null)).toBe("");
  });
});

describe("exportDateiname", () => {
  it("trägt das lokale Datum", () => {
    expect(exportDateiname("2026-08-23T12:00:00.000Z")).toBe("hausverwailter-arbeitsbereich-2026-08-23.json");
    expect(lokalesDatum("kaputt")).toBe("kaputt");
  });
});

describe("sollGesamt und ibansBereinigen", () => {
  it("summiert in Cent", () => {
    expect(sollGesamt({ kalt: 0.1, nebenkosten: 0.2, hausgeld: 0, faelligTag: 3 })).toBe(0.3);
  });
  it("normalisiert IBANs und entfernt Doppelte und Leere", () => {
    expect(ibansBereinigen(["de02 1203 0000 0000 2020 51", "", "DE02120300000000202051", " "])).toEqual(["DE02120300000000202051"]);
  });
});

describe("fehlendeNachCode", () => {
  it("liefert nur Einträge mit neuem Code", () => {
    const standard = [{ code: "A" }, { code: "B" }, { code: "C" }];
    expect(fehlendeNachCode(["a", "C"], standard)).toEqual([{ code: "B" }]);
  });
});

describe("verwendungText", () => {
  const namen = { belege: ["Beleg", "Belegen"], personen: ["Person", "Personen"] } as Record<string, [string, string]>;
  it("zählt mit Singular, Plural und „und“", () => {
    expect(verwendungText({ belege: 1, personen: 3 }, namen)).toBe("1 Beleg und 3 Personen");
    expect(verwendungText({ belege: 2, personen: 0 }, namen)).toBe("2 Belegen");
    expect(verwendungText({ belege: 0 }, namen)).toBe("");
  });
});

describe("pruefeObjekt", () => {
  it("akzeptiert ein vollständiges Objekt", () => {
    expect(pruefeObjekt(objekt)).toEqual({});
  });
  it("meldet Kurzname, Auftraggeber, PLZ, IBAN und Baujahr", () => {
    const f = pruefeObjekt({
      ...objekt, kurzname: " ", adresse: { ...objekt.adresse, plz: "1234" }, auftraggeber: { ...objekt.auftraggeber, name: "" },
      bankIban: "DE00123", baujahr: 12, einheitenWohnen: -1,
    });
    expect(Object.keys(f).sort()).toEqual(["adresse.plz", "auftraggeber.name", "bankIban", "baujahr", "einheitenWohnen", "kurzname"]);
  });
  it("erlaubt eine gültige Objektkonto-IBAN und leeres Honorar", () => {
    expect(pruefeObjekt({ ...objekt, bankIban: "DE02 1203 0000 0000 2020 51", honorarNettoMonat: null })).toEqual({});
  });
});

describe("pruefePerson", () => {
  const person = Person.parse({ id: "p1", objektId: "o1", rolle: "mieter", name: "Anna Schmidt", ibans: ["DE02120300000000202051"] });
  it("akzeptiert eine gültige Person", () => {
    expect(pruefePerson(person)).toEqual({});
  });
  it("meldet ungültige IBAN je Position, negatives Soll und verdrehte Daten", () => {
    const f = pruefePerson({ ...person, ibans: ["DE02120300000000202051", "DE99"], soll: { ...person.soll, kalt: -5, faelligTag: 40 }, seit: "2026-05-01", bis: "2026-01-01" });
    expect(f["ibans.1"]).toBeTruthy();
    expect(f["ibans.0"]).toBeUndefined();
    expect(f["soll.kalt"]).toBeTruthy();
    expect(f["soll.faelligTag"]).toBeTruthy();
    expect(f.bis).toBe("Das Ende liegt vor dem Beginn.");
  });
});

describe("pruefeKostenart und Code", () => {
  const k = Kostenart.parse({ code: "HEIZUNG", bezeichnung: "Heizung", umlagefaehig: true, kontoSkr03: "4230" });
  it("bildet Codes aus Text", () => {
    expect(kostenartCodeAusText(" Müll & Straßenreinigung ")).toBe("MUELL_STRASSENREINIGUNG");
  });
  it("prüft Code, Doppelte und Kontonummern", () => {
    expect(pruefeKostenart(k)).toEqual({});
    expect(pruefeKostenart(k, ["HEIZUNG"]).code).toBe("Diesen Code gibt es schon.");
    expect(pruefeKostenart({ ...k, code: "heiz ung" }).code).toBeTruthy();
    expect(pruefeKostenart({ ...k, kontoSkr04: "63" }).kontoSkr04).toBeTruthy();
  });
});

describe("pruefeLeistung", () => {
  const l = Leistung.parse({ id: "l1", code: "WEG_GRUND", bezeichnung: "WEG-Verwaltung", einheit: "einheit_monat", preisNetto: 27.5 });
  it("verlangt Code, Bezeichnung und Preis ab 0", () => {
    expect(pruefeLeistung(l)).toEqual({});
    expect(pruefeLeistung({ ...l, code: "", bezeichnung: "", preisNetto: -1 })).toEqual({
      code: "Ein Code ist nötig, z. B. WEG_GRUND.",
      bezeichnung: "Eine Bezeichnung ist nötig.",
      preisNetto: "Ein Preis ab 0,00 €.",
    });
    expect(pruefeLeistung(l, ["WEG_GRUND"]).code).toBe("Diesen Code gibt es schon.");
  });
});
