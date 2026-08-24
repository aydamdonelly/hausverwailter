import { describe, expect, it } from "vitest";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Firma } from "../domain/schema";
import { TEST_FIRMA, testRechnung } from "../export/testdaten";
import { XRECHNUNG_CUSTOMIZATION_ID, XRECHNUNG_PROFILE_ID, unitCode, xrechnungBefunde, xrechnungDateiname, xrechnungUbl } from "./ubl";

const firma = Firma.parse(TEST_FIRMA);

type Knoten = Record<string, unknown>;

function suche(knoten: Knoten[], name: string): Knoten[] | null {
  for (const k of knoten) {
    if (name in k) return k[name] as Knoten[];
    for (const [schluessel, wert] of Object.entries(k)) {
      if (schluessel === ":@" || !Array.isArray(wert)) continue;
      const treffer = suche(wert as Knoten[], name);
      if (treffer) return treffer;
    }
  }
  return null;
}

/** Namen der direkten Kindelemente des ersten Elements `name` in Dokumentreihenfolge. */
function kinder(xml: string, name: string): string[] {
  const doc = new XMLParser({ preserveOrder: true, ignoreAttributes: false }).parse(xml) as Knoten[];
  const element = suche(doc, name);
  if (!element) throw new Error(`${name} nicht gefunden`);
  return element.map((k) => Object.keys(k).find((n) => n !== ":@") ?? "");
}

const REIHENFOLGE_INVOICE = [
  "cbc:CustomizationID",
  "cbc:ProfileID",
  "cbc:ID",
  "cbc:IssueDate",
  "cbc:DueDate",
  "cbc:InvoiceTypeCode",
  "cbc:DocumentCurrencyCode",
  "cbc:BuyerReference",
  "cac:InvoicePeriod",
  "cac:AccountingSupplierParty",
  "cac:AccountingCustomerParty",
  "cac:PaymentMeans",
  "cac:PaymentTerms",
  "cac:TaxTotal",
  "cac:LegalMonetaryTotal",
  "cac:InvoiceLine",
  "cac:InvoiceLine",
];

describe("XRechnung UBL", () => {
  it("ist wohlgeformt und trägt die Kennungen von XRechnung 3.0 und Peppol", () => {
    const xml = xrechnungUbl(testRechnung(), firma);
    expect(XMLValidator.validate(xml)).toBe(true);
    const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const inv = doc["ubl:Invoice"];
    expect(inv["@_xmlns:ubl"]).toBe("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
    expect(inv["cbc:CustomizationID"]).toBe("urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0");
    expect(inv["cbc:CustomizationID"]).toBe(XRECHNUNG_CUSTOMIZATION_ID);
    expect(inv["cbc:ProfileID"]).toBe(XRECHNUNG_PROFILE_ID);
    expect(inv["cbc:ID"]).toBe("R-2026-0132");
    expect(inv["cbc:IssueDate"]).toBe("2026-08-01");
    expect(inv["cbc:DueDate"]).toBe("2026-08-15");
    expect(inv["cbc:InvoiceTypeCode"]).toBe(380);
    expect(inv["cbc:DocumentCurrencyCode"]).toBe("EUR");
    expect(inv["cbc:BuyerReference"]).toBe("K-1001");
    expect(inv["cac:InvoicePeriod"]).toEqual({ "cbc:StartDate": "2026-08-01", "cbc:EndDate": "2026-08-31" });
  });

  it("hält die Reihenfolge der Kindelemente des Invoice-Elements ein", () => {
    const xml = xrechnungUbl(testRechnung(), firma);
    expect(kinder(xml, "ubl:Invoice")).toEqual(REIHENFOLGE_INVOICE);
    expect(kinder(xml, "cac:Party")).toEqual(["cbc:EndpointID", "cac:PartyName", "cac:PostalAddress", "cac:PartyTaxScheme", "cac:PartyTaxScheme", "cac:PartyLegalEntity", "cac:Contact"]);
    expect(kinder(xml, "cac:InvoiceLine")).toEqual(["cbc:ID", "cbc:InvoicedQuantity", "cbc:LineExtensionAmount", "cac:Item", "cac:Price"]);
    expect(kinder(xml, "cac:Item")).toEqual(["cbc:Description", "cbc:Name", "cac:ClassifiedTaxCategory"]);
    expect(kinder(xml, "cac:PaymentMeans")).toEqual(["cbc:PaymentMeansCode", "cbc:PaymentID", "cac:PayeeFinancialAccount"]);
  });

  it("füllt Verkäufer, Käufer, Zahlung und Kontakt (BR-DE-Pflichtfelder)", () => {
    const xml = xrechnungUbl(testRechnung(), firma);
    const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const inv = doc["ubl:Invoice"];
    const v = inv["cac:AccountingSupplierParty"]["cac:Party"];
    expect(v["cbc:EndpointID"]).toEqual({ "#text": "post@hv-mustermann.de", "@_schemeID": "EM" });
    expect(v["cac:PartyName"]["cbc:Name"]).toBe("Hausverwaltung Mustermann GmbH");
    expect(v["cac:PostalAddress"]["cbc:StreetName"]).toBe("Kaiserstraße 45");
    expect(v["cac:PostalAddress"]["cbc:CityName"]).toBe("Köln");
    expect(v["cac:PostalAddress"]["cbc:PostalZone"]).toBe(50667);
    expect(v["cac:PostalAddress"]["cac:Country"]["cbc:IdentificationCode"]).toBe("DE");
    expect(v["cac:PartyTaxScheme"][0]).toEqual({ "cbc:CompanyID": "DE123456789", "cac:TaxScheme": { "cbc:ID": "VAT" } });
    expect(v["cac:PartyTaxScheme"][1]).toEqual({ "cbc:CompanyID": "215/5847/1234", "cac:TaxScheme": { "cbc:ID": "FC" } });
    expect(v["cac:PartyLegalEntity"]["cbc:RegistrationName"]).toBe("Hausverwaltung Mustermann GmbH");
    expect(v["cac:PartyLegalEntity"]["cbc:CompanyID"]).toBe("HRB 12345");
    expect(v["cac:Contact"]).toEqual({ "cbc:Name": "Max Mustermann", "cbc:Telephone": "0221 12 34 56 7", "cbc:ElectronicMail": "post@hv-mustermann.de" });
    const k = inv["cac:AccountingCustomerParty"]["cac:Party"];
    expect(k["cbc:EndpointID"]["#text"]).toBe("beirat.stadtpark@example.de");
    expect(k["cac:PartyIdentification"]["cbc:ID"]).toBe("K-1001");
    expect(k["cac:PartyLegalEntity"]["cbc:RegistrationName"]).toBe("Wohnungseigentümergemeinschaft Am Stadtpark 3");
    expect(k["cac:PostalAddress"]["cbc:PostalZone"]).toBe(50674);
    const z = inv["cac:PaymentMeans"];
    expect(z["cbc:PaymentMeansCode"]).toBe(58);
    expect(z["cbc:PaymentID"]).toBe("R-2026-0132");
    expect(z["cac:PayeeFinancialAccount"]["cbc:ID"]).toBe("DE02120300000000202051");
    expect(z["cac:PayeeFinancialAccount"]["cbc:Name"]).toBe("Hausverwaltung Mustermann GmbH");
    expect(z["cac:PayeeFinancialAccount"]["cac:FinancialInstitutionBranch"]["cbc:ID"]).toBe("BYLADEM1001");
    expect(inv["cac:PaymentTerms"]["cbc:Note"]).toBe("Zahlbar bis 15.08.2026 ohne Abzug.");
  });

  it("rechnet Summen konsistent (BR-CO-10 bis 17, BR-S-08) und je Satz ein TaxSubtotal", () => {
    const r = testRechnung({
      positionen: [
        { pos: 1, bezeichnung: "Verwaltung", menge: 1, einheit: "Monat", einzelpreisNetto: 1000, gesamtNetto: 1000, ustSatz: 19 },
        { pos: 2, bezeichnung: "Wasser", menge: 3, einheit: "m³", einzelpreisNetto: 2.1, gesamtNetto: 6.3, ustSatz: 7 },
        { pos: 3, bezeichnung: "Porto", menge: 2, einheit: "Stück", einzelpreisNetto: 0.85, gesamtNetto: 1.7, ustSatz: 0 },
      ],
      steuersaetze: [
        { satz: 19, netto: 1000, ust: 190 },
        { satz: 7, netto: 6.3, ust: 0.44 },
        { satz: 0, netto: 1.7, ust: 0 },
      ],
      netto: 1008,
      ust: 190.44,
      brutto: 1198.44,
    });
    const xml = xrechnungUbl(r, firma);
    expect(XMLValidator.validate(xml)).toBe(true);
    const inv = new XMLParser({ ignoreAttributes: false }).parse(xml)["ubl:Invoice"];
    const summen = inv["cac:LegalMonetaryTotal"];
    expect(summen["cbc:LineExtensionAmount"]["#text"]).toBe(1008);
    expect(summen["cbc:TaxExclusiveAmount"]["#text"]).toBe(1008);
    expect(summen["cbc:TaxInclusiveAmount"]["#text"]).toBe(1198.44);
    expect(summen["cbc:PayableAmount"]["#text"]).toBe(1198.44);
    expect(inv["cac:TaxTotal"]["cbc:TaxAmount"]["#text"]).toBe(190.44);
    const teile = inv["cac:TaxTotal"]["cac:TaxSubtotal"];
    expect(teile).toHaveLength(3);
    expect(teile[0]["cbc:TaxableAmount"]["#text"]).toBe(1000);
    expect(teile[0]["cbc:TaxAmount"]["#text"]).toBe(190);
    expect(teile[0]["cac:TaxCategory"]["cbc:ID"]).toBe("S");
    expect(teile[0]["cac:TaxCategory"]["cbc:Percent"]).toBe(19);
    expect(teile[1]["cbc:TaxAmount"]["#text"]).toBe(0.44);
    expect(teile[2]["cac:TaxCategory"]["cbc:ID"]).toBe("E");
    expect(teile[2]["cac:TaxCategory"]["cbc:Percent"]).toBe(0);
    expect(teile[2]["cac:TaxCategory"]["cbc:TaxExemptionReason"]).toBe("Steuerfreie Leistung nach § 4 UStG");
    const summeZeilen = inv["cac:InvoiceLine"].map((z: { "cbc:LineExtensionAmount": { "#text": number } }) => z["cbc:LineExtensionAmount"]["#text"]).reduce((a: number, b: number) => a + b, 0);
    expect(Math.round(summeZeilen * 100) / 100).toBe(1008);
    expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">190.44</cbc:TaxAmount>');
    expect(xml).toContain('<cbc:InvoicedQuantity unitCode="MTQ">3</cbc:InvoicedQuantity>');
  });

  it("lehnt Rechnungen ab, deren Summen nicht zu den Positionen passen", () => {
    expect(() => xrechnungUbl(testRechnung({ brutto: 900 }), firma)).toThrow(/passen nicht/);
    expect(() => xrechnungUbl(testRechnung({ positionen: [], netto: 0, ust: 0, brutto: 0 }), firma)).toThrow(/Position/);
  });

  it("schreibt Positionen mit Menge, Einheit, Preis und Steuerkategorie", () => {
    const xml = xrechnungUbl(testRechnung(), firma);
    const inv = new XMLParser({ ignoreAttributes: false }).parse(xml)["ubl:Invoice"];
    const [p1, p2] = inv["cac:InvoiceLine"];
    expect(p1["cbc:ID"]).toBe(1);
    expect(p1["cbc:InvoicedQuantity"]).toEqual({ "#text": 25, "@_unitCode": "C62" });
    expect(p1["cbc:LineExtensionAmount"]["#text"]).toBe(687.5);
    expect(p1["cac:Item"]["cbc:Name"]).toBe("WEG-Verwaltung, Grundhonorar August 2026");
    expect(p1["cac:Item"]["cbc:Description"]).toBe("25 Einheiten × 27,50 €");
    expect(p1["cac:Item"]["cac:ClassifiedTaxCategory"]).toEqual({ "cbc:ID": "S", "cbc:Percent": 19, "cac:TaxScheme": { "cbc:ID": "VAT" } });
    expect(p1["cac:Price"]["cbc:PriceAmount"]["#text"]).toBe(27.5);
    expect(p2["cbc:InvoicedQuantity"]["@_unitCode"]).toBe("C62");
    expect(xml).toContain('<cbc:PriceAmount currencyID="EUR">3.5</cbc:PriceAmount>');
  });

  it("bildet Einheiten auf UN/ECE-Codes ab", () => {
    expect(unitCode("Einheit/Monat")).toBe("C62");
    expect(unitCode("Stellplatz/Monat")).toBe("C62");
    expect(unitCode("Stück")).toBe("C62");
    expect(unitCode("Monat")).toBe("MON");
    expect(unitCode("pauschal/Monat")).toBe("MON");
    expect(unitCode("Std.")).toBe("HUR");
    expect(unitCode("Stunde")).toBe("HUR");
    expect(unitCode("pauschal")).toBe("LS");
    expect(unitCode("qm/Monat")).toBe("MTK");
    expect(unitCode("m²")).toBe("MTK");
    expect(unitCode("m³")).toBe("MTQ");
    expect(unitCode("Jahr")).toBe("ANN");
    expect(unitCode("Tag")).toBe("DAY");
    expect(unitCode("")).toBe("C62");
    expect(unitCode("Karton")).toBe("C62");
  });

  it("gibt Gutschriften als CreditNote mit Typ 381 aus", () => {
    const xml = xrechnungUbl(testRechnung({ art: "gutschrift", nummer: "G-2026-0001" }), firma);
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(kinder(xml, "ubl:CreditNote")).toEqual([
      "cbc:CustomizationID",
      "cbc:ProfileID",
      "cbc:ID",
      "cbc:IssueDate",
      "cbc:CreditNoteTypeCode",
      "cbc:DocumentCurrencyCode",
      "cbc:BuyerReference",
      "cac:InvoicePeriod",
      "cac:AccountingSupplierParty",
      "cac:AccountingCustomerParty",
      "cac:PaymentMeans",
      "cac:PaymentTerms",
      "cac:TaxTotal",
      "cac:LegalMonetaryTotal",
      "cac:CreditNoteLine",
      "cac:CreditNoteLine",
    ]);
    const cn = new XMLParser({ ignoreAttributes: false }).parse(xml)["ubl:CreditNote"];
    expect(cn["@_xmlns:ubl"]).toBe("urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2");
    expect(cn["cbc:CreditNoteTypeCode"]).toBe(381);
    expect(cn["cac:PaymentMeans"]["cbc:PaymentDueDate"]).toBe("2026-08-15");
    expect(cn["cac:CreditNoteLine"][0]["cbc:CreditedQuantity"]["#text"]).toBe(25);
    expect(xrechnungDateiname(testRechnung({ nummer: "G-2026/0001" }))).toBe("XRechnung_G-2026_0001.xml");
  });

  it("nutzt Leitweg-ID vor Kundennummer und Kleinunternehmer-Befreiung", () => {
    const r = testRechnung({
      empfaenger: { name: "Stadt Köln", adresse: { strasse: "Rathaus 1", plz: "50667", ort: "Köln" }, email: "rechnung@stadt-koeln.example", kundennummer: "K-9", leitwegId: "05315-12345-67" },
      positionen: [{ pos: 1, bezeichnung: "Beratung", menge: 2, einheit: "Std.", einzelpreisNetto: 75, gesamtNetto: 150, ustSatz: 0 }],
      steuersaetze: [{ satz: 0, netto: 150, ust: 0 }],
      netto: 150,
      ust: 0,
      brutto: 150,
    });
    const klein = Firma.parse({ ...TEST_FIRMA, kleinunternehmer: true });
    const xml = xrechnungUbl(r, klein);
    const inv = new XMLParser({ ignoreAttributes: false }).parse(xml)["ubl:Invoice"];
    expect(inv["cbc:BuyerReference"]).toBe("05315-12345-67");
    expect(inv["cac:TaxTotal"]["cac:TaxSubtotal"]["cac:TaxCategory"]["cbc:TaxExemptionReason"]).toBe("Steuerbefreiung für Kleinunternehmer (§ 19 UStG)");
    expect(xrechnungUbl(r, klein, { kaeuferreferenz: "BESTELL-7" })).toContain("<cbc:BuyerReference>BESTELL-7</cbc:BuyerReference>");
    const ae = xrechnungUbl(r, firma, { kategorieNull: "AE" });
    expect(ae).toContain("<cbc:ID>AE</cbc:ID>");
    expect(ae).toContain("Steuerschuldnerschaft des Leistungsempfängers");
  });

  it("escaped XML-Sonderzeichen", () => {
    const xml = xrechnungUbl(testRechnung({ positionen: [{ pos: 1, bezeichnung: 'Tür <Nord> & "Süd"', menge: 1, einheit: "Stück", einzelpreisNetto: 100, gesamtNetto: 100, ustSatz: 19 }], steuersaetze: [{ satz: 19, netto: 100, ust: 19 }], netto: 100, ust: 19, brutto: 119 }), firma);
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(xml).toContain("Tür &lt;Nord&gt; &amp; &quot;Süd&quot;");
  });

  it("nennt fehlende Pflichtangaben", () => {
    expect(xrechnungBefunde(testRechnung(), firma)).toEqual([]);
    const duenn = Firma.parse({ name: "X" });
    const befunde = xrechnungBefunde(testRechnung({ empfaenger: { name: "Y", kundennummer: "" }, leistungVon: null, leistungBis: null }), duenn);
    expect(befunde.join("\n")).toMatch(/Käuferreferenz/);
    expect(befunde.join("\n")).toMatch(/PLZ und Ort der Firma/);
    expect(befunde.join("\n")).toMatch(/E-Mail der Firma/);
    expect(befunde.join("\n")).toMatch(/Telefon/);
    expect(befunde.join("\n")).toMatch(/USt-IdNr/);
    expect(befunde.join("\n")).toMatch(/IBAN/);
    expect(befunde.join("\n")).toMatch(/E-Mail des Empfängers/);
    expect(befunde.join("\n")).toMatch(/Leistungszeitraum/);
  });
});
