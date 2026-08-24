import { describe, expect, it } from "vitest";
import { bereiteImport, kontoFuerIban, umsatzHash } from "./import";
import { zuordnungenAusKi, type ZuordnungsAnfrage } from "./zuordnen-ki";
import { buchungAusUmsatz } from "./buchungen";
import type { UmsatzRoh } from "./typen";
import { KONTEN, OBJEKTE, PERSONEN } from "./fixtures/testdaten";
import type { Bankumsatz } from "../domain/schema";

const roh: UmsatzRoh = { buchungstag: "2026-07-01", valuta: "2026-07-01", betrag: 900, waehrung: "EUR", name: "Anna Schmidt", iban: "DE21 1001 1001 2626 6678 82", bic: "", verwendungszweck: "Miete Juli 2026 Whg 1", buchungstext: "GUTSCHRIFT", endToEndId: "", mandatsreferenz: "" };

let zaehler = 0;
const neueId = () => `ID-${++zaehler}`;

describe("Import", () => {
  it("Hash ist stabil und unempfindlich gegen Leerraum und Schreibweise im Zweck", async () => {
    const a = await umsatzHash("BK-001", roh);
    const b = await umsatzHash("BK-001", { ...roh, verwendungszweck: "  miete   juli 2026 whg 1 " });
    const c = await umsatzHash("BK-001", { ...roh, betrag: 900.01 });
    const d = await umsatzHash("BK-002", roh);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("übernimmt neue Umsätze, überspringt vorhandene und in der Datei doppelte", async () => {
    const vorhanden = new Set([await umsatzHash("BK-001", roh)]);
    const zweiter = { ...roh, buchungstag: "2026-07-02", betrag: 1010, name: "Mehmet Yilmaz" };
    const e = await bereiteImport([roh, zweiter, zweiter], "BK-001", vorhanden, neueId, "2026-08-01T00:00:00Z");
    expect(e.doppelt).toBe(1);
    expect(e.doppeltInDatei).toBe(1);
    expect(e.neue).toHaveLength(1);
    expect(e.neue[0].bankkontoId).toBe("BK-001");
    expect(e.neue[0].iban).toBe("DE21100110012626667882");
    expect(e.neue[0].zuordnung.art).toBe("offen");
    expect(e.neue[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("findet das Konto zur IBAN, notfalls über das Objekt", () => {
    expect(kontoFuerIban(KONTEN, "DE41 5001 0517 0123 4567 89")?.id).toBe("BK-001");
    const ohneIban = KONTEN.map((k) => ({ ...k, iban: "" }));
    expect(kontoFuerIban(ohneIban, "DE27100777770209299700", OBJEKTE)?.id).toBe("BK-002");
    expect(kontoFuerIban(KONTEN, "")).toBeNull();
    expect(kontoFuerIban(KONTEN, "DE00000000000000000000")).toBeNull();
  });
});

describe("KI-Zuordnung prüfen", () => {
  const anfrage: ZuordnungsAnfrage = {
    konto: { bezeichnung: "Mietkonto", objekt: "Bahnhofstraße 7", istVerwaltungskonto: false },
    umsaetze: [
      { index: 0, buchungstag: "2026-07-01", betrag: 900, name: "S. Schmidt", verwendungszweck: "Juli", buchungstext: "" },
      { index: 1, buchungstag: "2026-07-05", betrag: -1238, name: "Mueller", verwendungszweck: "Wartung", buchungstext: "" },
    ],
    personen: [{ id: "P-201", name: "Anna Schmidt", rolle: "mieter", einheit: "Whg 1", objekt: "Bahnhofstraße 7", sollMonat: 900 }],
    belege: [{ id: "B-1", lieferant: "Müller Sanitär GmbH", rechnungsnummer: "2026-0815", brutto: 1238, rechnungsdatum: "2026-06-20" }],
    rechnungen: [],
    auftraggeber: "Erika Vogel",
  };
  it("übernimmt nur bekannte Personen und findet den Beleg über den Betrag", () => {
    const z = zuordnungenAusKi(
      {
        zuordnungen: [
          { umsatzIndex: 0, personId: "P-201", art: "mieteingang", monat: "2026-07", sicherheit: "wahrscheinlich", begruendung: "Nachname und Betrag" },
          { umsatzIndex: 1, personId: null, art: "belegzahlung", monat: null, sicherheit: "sicher", begruendung: "Lieferant" },
          { umsatzIndex: 7, personId: "P-999", art: "mieteingang", monat: "2026-07", sicherheit: "sicher", begruendung: "" },
        ],
      },
      anfrage,
    );
    expect(z).toHaveLength(2);
    expect(z[0].zuordnung).toMatchObject({ art: "mieteingang", personId: "P-201", monat: "2026-07", quelle: "ki", sicherheit: "wahrscheinlich" });
    expect(z[1].zuordnung).toMatchObject({ art: "belegzahlung", belegId: "B-1", quelle: "ki" });
  });
  it("Mieteingang ohne bekannte Person wird offen", () => {
    const z = zuordnungenAusKi({ zuordnungen: [{ umsatzIndex: 0, personId: "P-999", art: "mieteingang", monat: "13/2026", sicherheit: "sicher", begruendung: "" }] }, anfrage);
    expect(z[0].zuordnung.art).toBe("offen");
    expect(z[0].zuordnung.personId).toBeNull();
    expect(z[0].zuordnung.sicherheit).toBe("unsicher");
  });
});

describe("Buchungen aus Umsätzen", () => {
  const basis: Bankumsatz = {
    id: "U-1", bankkontoId: "BK-001", buchungstag: "2026-07-01", valuta: null, betrag: 900, waehrung: "EUR", name: "Anna Schmidt", iban: "", bic: "", verwendungszweck: "Miete Juli", buchungstext: "", endToEndId: "E2E-1", mandatsreferenz: "",
    hash: "h", importiertAm: "2026-08-01T00:00:00Z",
    zuordnung: { art: "mieteingang", personId: "P-201", belegId: null, rechnungId: null, kostenartCode: null, monat: "2026-07", sicherheit: "sicher", quelle: "regel", begruendung: "" },
  };
  const kostenarten = [{ code: "BANKGEBUEHREN", bezeichnung: "Bankgebühren", betrkv: "", umlagefaehig: false, kontoSkr03: "4970", kontoSkr04: "6855", hinweis: "", aktiv: true }];
  it("Mieteingang wird Haben-Buchung mit Objekt und Monatstext", () => {
    const b = buchungAusUmsatz(basis, KONTEN[0], kostenarten, PERSONEN, "SKR03", neueId, "2026-08-01T00:00:00Z");
    expect(b).not.toBeNull();
    expect(b!.quelle).toBe("bank");
    expect(b!.sollHaben).toBe("H");
    expect(b!.brutto).toBe(900);
    expect(b!.objektId).toBe("OBJ-002");
    expect(b!.buchungstext).toBe("Miete Juli 2026 Anna Schmidt");
    expect(b!.bankumsatzId).toBe("U-1");
    expect(b!.belegnummer).toBe("E2E-1");
  });
  it("Bankentgelt wird Soll-Buchung mit Kostenart und Konto", () => {
    const u: Bankumsatz = { ...basis, betrag: -5.95, buchungstext: "ENTGELTABSCHLUSS", zuordnung: { ...basis.zuordnung, art: "gebuehr", personId: null, monat: null, kostenartCode: "BANKGEBUEHREN" } };
    const b = buchungAusUmsatz(u, KONTEN[0], kostenarten, PERSONEN, "SKR04", neueId, "2026-08-01T00:00:00Z");
    expect(b!.sollHaben).toBe("S");
    expect(b!.brutto).toBe(5.95);
    expect(b!.konto).toBe("6855");
    expect(b!.umlagefaehig).toBe(false);
  });
  it("Belegzahlung und offene Umsätze erzeugen keine Buchung", () => {
    expect(buchungAusUmsatz({ ...basis, zuordnung: { ...basis.zuordnung, art: "belegzahlung", belegId: "B-1" } }, KONTEN[0], kostenarten, PERSONEN, "SKR03", neueId, "x")).toBeNull();
    expect(buchungAusUmsatz({ ...basis, zuordnung: { ...basis.zuordnung, art: "offen" } }, KONTEN[0], kostenarten, PERSONEN, "SKR03", neueId, "x")).toBeNull();
    expect(buchungAusUmsatz({ ...basis, zuordnung: { ...basis.zuordnung, personId: null } }, KONTEN[0], kostenarten, PERSONEN, "SKR03", neueId, "x")).toBeNull();
  });
});
