/**
 * XRechnung 3.0.2 (UBL 2.1, EN 16931) aus einer Rechnung erzeugen.
 *
 * Vertrag: reine Funktion, keine Datenbank, läuft im Browser und auf dem Server. Kennungen:
 * CustomizationID (BT-24) "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0",
 * ProfileID (BT-23) "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0". Rechnungen werden als
 * ubl:Invoice (Typ 380) ausgegeben, Gutschriften als ubl:CreditNote (Typ 381). Die Elemente
 * stehen in der Reihenfolge des UBL-Schemas; die Summen werden aus den Positionen gerechnet,
 * damit BR-CO-10 bis BR-CO-17 und BR-S-08 stimmen. Beträge auf zwei Stellen, Preise dürfen
 * mehr haben.
 *
 * Steuerkategorien: Satz > 0 → S; Satz 0 → E mit Befreiungsgrund (Kleinunternehmer § 19 UStG,
 * sonst der übergebene oder ein allgemeiner § 4 UStG-Text) bzw. AE (Reverse Charge, per Option).
 *
 * WICHTIG vor dem Produktivbetrieb: Die Datei mit dem KoSIT-Validator prüfen
 * (https://github.com/itplr-kosit/validator plus validator-configuration-xrechnung, Aufruf
 * `java -jar validator-*-standalone.jar -s scenarios.xml -r <konfig> -h rechnung.xml`) oder
 * über den Online-Validator des Landes Baden-Württemberg. Hier wird gegen das UBL-Schema und
 * die Rechenregeln gebaut; die Schematron-Regeln (BR-DE-*, PEPPOL-*) verlangen zusätzlich
 * Pflichtangaben, die aus den Stammdaten kommen müssen: E-Mail und Telefon der Firma
 * (BR-DE-6/7), USt-IdNr. oder Steuernummer (BR-DE-16), IBAN (BR-DE-19/23), E-Mail des
 * Empfängers (PEPPOL-EN16931-R010), PLZ und Ort beider Seiten (BR-DE-3/4/8/9). Was fehlt,
 * listet `xrechnungBefunde()` auf.
 */
import type { Firma, Position, Rechnung } from "../domain/schema";
import { datum as datumFmt, ibanNormalisiert } from "../format";
import { gleich, steuerzeilen, summe } from "../geld";
import { ibanGueltig } from "../iban";

export const XRECHNUNG_CUSTOMIZATION_ID = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";
export const XRECHNUNG_PROFILE_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

const NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
const NS_CREDITNOTE = "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2";
const NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
const NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";

export interface XRechnungOptionen {
  /** Käuferreferenz (BT-10). Bei B2B meist die Kundennummer, bei Behörden die Leitweg-ID. */
  kaeuferreferenz?: string;
  /** Steuerkategorie für Positionen mit 0 %: E = steuerfrei (Standard), AE = Reverse Charge, Z = Nullsatz. */
  kategorieNull?: "E" | "AE" | "Z";
  /** Befreiungsgrund (BT-120) für Kategorie E bzw. AE. */
  befreiungsgrund?: string;
}

// ---------- Hilfen ----------

function xml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function betrag(n: number): string {
  return n.toFixed(2);
}

/** Bis zu vier Nachkommastellen ohne nachlaufende Nullen, mindestens eine Ziffer. */
function zahl(n: number, stellen = 4): string {
  const s = n.toFixed(stellen);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** UN/ECE Rec. 20/21: Stück C62, Monat MON, Stunde HUR, Pauschale LS, Quadratmeter MTK ... */
export function unitCode(einheit: string): string {
  const e = einheit.toLowerCase().trim();
  if (!e) return "C62";
  if (/einheit|stellpl|st[üu]ck|stk|whg|wohnung|we\b|pos/.test(e)) return "C62";
  if (/m³|m3|kubik|mtq/.test(e)) return "MTQ";
  if (/m²|m2|qm|quadrat|mtk/.test(e)) return "MTK";
  if (/std|stunde|\bh\b|hur/.test(e)) return "HUR";
  if (/monat|mon\b/.test(e)) return "MON";
  if (/psch|pausch|\bls\b/.test(e)) return "LS";
  if (/jahr|\bann\b|p\.a\./.test(e)) return "ANN";
  if (/tag|day/.test(e)) return "DAY";
  if (/woche|wee/.test(e)) return "WEE";
  if (/km|kilometer/.test(e)) return "KMT";
  if (/\bm\b|meter/.test(e)) return "MTR";
  if (/kwh/.test(e)) return "KWH";
  if (/liter|ltr/.test(e)) return "LTR";
  if (/prozent|%/.test(e)) return "P1";
  return "C62";
}

function element(name: string, inhalt: string, attribute = ""): string {
  return `<${name}${attribute}>${xml(inhalt)}</${name}>`;
}

function wenn(bedingung: unknown, text: string): string {
  return bedingung ? text : "";
}

function telefonPlausibel(t: string): boolean {
  return (t.match(/\d/g) ?? []).length >= 3;
}

function emailPlausibel(e: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(e);
}

// ---------- Prüfung ----------

/** Was einer gültigen XRechnung noch fehlt (Stammdaten, Empfängerdaten). Leer = nichts Bekanntes. */
export function xrechnungBefunde(rechnung: Rechnung, firma: Firma, optionen: XRechnungOptionen = {}): string[] {
  const b: string[] = [];
  if (!rechnung.positionen.length) b.push("Die Rechnung hat keine Positionen (BR-16).");
  if (!rechnung.nummer) b.push("Rechnungsnummer fehlt (BT-1).");
  if (!kaeuferreferenz(rechnung, optionen)) b.push("Käuferreferenz fehlt: Kundennummer oder Leitweg-ID des Empfängers (BT-10, BR-DE-15).");
  if (!firma.adresse.plz || !firma.adresse.ort) b.push("PLZ und Ort der Firma fehlen (BR-DE-3/4).");
  if (!emailPlausibel(firma.email)) b.push("E-Mail der Firma fehlt oder ist unplausibel (BT-34/BT-43, BR-DE-7).");
  if (!telefonPlausibel(firma.telefon)) b.push("Telefon der Firma fehlt (BT-42, BR-DE-6).");
  if (!firma.ustIdNr && !firma.steuernummer) b.push("USt-IdNr. oder Steuernummer der Firma fehlt (BR-DE-16).");
  if (!ibanGueltig(firma.iban)) b.push("IBAN der Firma fehlt oder ist ungültig (BT-84, BR-DE-19).");
  if (!emailPlausibel(rechnung.empfaenger.email)) b.push("E-Mail des Empfängers fehlt (BT-49, PEPPOL-EN16931-R010).");
  if (!rechnung.empfaenger.adresse.plz || !rechnung.empfaenger.adresse.ort) b.push("PLZ und Ort des Empfängers fehlen (BR-DE-8/9).");
  const nullSaetze = rechnung.positionen.some((p) => p.ustSatz === 0);
  if (nullSaetze && optionen.kategorieNull === "AE" && !rechnung.empfaenger.ustIdNr) b.push("Reverse Charge braucht die USt-IdNr. des Empfängers (BR-AE-*).");
  if (!rechnung.leistungVon && !rechnung.leistungBis) b.push("Leistungszeitraum fehlt (BG-14, BR-DE-TMP-32 und § 14 Abs. 4 Nr. 6 UStG).");
  return b;
}

function kaeuferreferenz(rechnung: Rechnung, optionen: XRechnungOptionen): string {
  return optionen.kaeuferreferenz?.trim() || rechnung.empfaenger.leitwegId.trim() || rechnung.empfaenger.kundennummer.trim();
}

// ---------- Bausteine ----------

function partei(p: {
  endpoint: string;
  identifikation?: string;
  name: string;
  strasse: string;
  zusatz?: string;
  ort: string;
  plz: string;
  land: string;
  ustIdNr?: string;
  steuernummer?: string;
  handelsregister?: string;
  rechtsform?: string;
  kontakt?: { name: string; telefon: string; email: string };
}): string {
  return `<cac:Party>
${wenn(p.endpoint, `      <cbc:EndpointID schemeID="EM">${xml(p.endpoint)}</cbc:EndpointID>\n`)}${wenn(p.identifikation, `      <cac:PartyIdentification><cbc:ID>${xml(p.identifikation ?? "")}</cbc:ID></cac:PartyIdentification>\n`)}      <cac:PartyName><cbc:Name>${xml(p.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
${wenn(p.strasse, `        ${element("cbc:StreetName", p.strasse)}\n`)}${wenn(p.zusatz, `        ${element("cbc:AdditionalStreetName", p.zusatz ?? "")}\n`)}        ${element("cbc:CityName", p.ort)}
        ${element("cbc:PostalZone", p.plz)}
        <cac:Country><cbc:IdentificationCode>${xml(p.land || "DE")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
${wenn(p.ustIdNr, `      <cac:PartyTaxScheme><cbc:CompanyID>${xml((p.ustIdNr ?? "").replace(/\s+/g, ""))}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>\n`)}${wenn(p.steuernummer, `      <cac:PartyTaxScheme><cbc:CompanyID>${xml(p.steuernummer ?? "")}</cbc:CompanyID><cac:TaxScheme><cbc:ID>FC</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>\n`)}      <cac:PartyLegalEntity>
        ${element("cbc:RegistrationName", p.name)}
${wenn(p.handelsregister, `        ${element("cbc:CompanyID", p.handelsregister ?? "")}\n`)}${wenn(p.rechtsform, `        ${element("cbc:CompanyLegalForm", p.rechtsform ?? "")}\n`)}      </cac:PartyLegalEntity>
${wenn(
  p.kontakt,
  `      <cac:Contact>
        ${element("cbc:Name", p.kontakt?.name ?? "")}
        ${element("cbc:Telephone", p.kontakt?.telefon ?? "")}
        ${element("cbc:ElectronicMail", p.kontakt?.email ?? "")}
      </cac:Contact>
`,
)}    </cac:Party>`;
}

function steuerkategorie(satz: number, optionen: XRechnungOptionen, firma: Firma): { id: string; grund: string } {
  if (satz > 0) return { id: "S", grund: "" };
  const id = optionen.kategorieNull ?? "E";
  if (id === "Z") return { id, grund: "" };
  const grund =
    optionen.befreiungsgrund ??
    (id === "AE" ? "Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)" : firma.kleinunternehmer ? "Steuerbefreiung für Kleinunternehmer (§ 19 UStG)" : "Steuerfreie Leistung nach § 4 UStG");
  return { id, grund };
}

function kategorieXml(satz: number, optionen: XRechnungOptionen, firma: Firma, einrueckung: string, mitGrund: boolean): string {
  const k = steuerkategorie(satz, optionen, firma);
  return `${einrueckung}<cbc:ID>${k.id}</cbc:ID>
${einrueckung}<cbc:Percent>${zahl(satz, 2)}</cbc:Percent>
${wenn(mitGrund && k.grund, `${einrueckung}${element("cbc:TaxExemptionReason", k.grund)}\n`)}${einrueckung}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>`;
}

function positionXml(p: Position, gutschrift: boolean, optionen: XRechnungOptionen, firma: Firma): string {
  const zeile = gutschrift ? "cac:CreditNoteLine" : "cac:InvoiceLine";
  const menge = gutschrift ? "cbc:CreditedQuantity" : "cbc:InvoicedQuantity";
  return `  <${zeile}>
    <cbc:ID>${xml(String(p.pos))}</cbc:ID>
    <${menge} unitCode="${unitCode(p.einheit)}">${zahl(p.menge)}</${menge}>
    <cbc:LineExtensionAmount currencyID="EUR">${betrag(p.gesamtNetto)}</cbc:LineExtensionAmount>
    <cac:Item>
${wenn(p.beschreibung, `      ${element("cbc:Description", p.beschreibung)}\n`)}      ${element("cbc:Name", p.bezeichnung || `Position ${p.pos}`)}
      <cac:ClassifiedTaxCategory>
${kategorieXml(p.ustSatz, optionen, firma, "        ", false)}
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${zahl(p.einzelpreisNetto, 4)}</cbc:PriceAmount>
    </cac:Price>
  </${zeile}>`;
}

// ---------- Hauptfunktion ----------

export function xrechnungUbl(rechnung: Rechnung, firma: Firma, optionen: XRechnungOptionen = {}): string {
  if (!rechnung.positionen.length) throw new Error("Eine XRechnung braucht mindestens eine Position.");
  const gutschrift = rechnung.art === "gutschrift";

  // Summen aus den Positionen, damit die Rechenregeln der EN 16931 sicher stimmen.
  const zeilen = steuerzeilen(rechnung.positionen);
  const netto = summe(zeilen.map((z) => z.netto));
  const ust = summe(zeilen.map((z) => z.ust));
  const brutto = summe([netto, ust]);
  if (!gleich(brutto, rechnung.brutto) || !gleich(netto, rechnung.netto)) {
    throw new Error(`Die Rechnungssummen (${betrag(rechnung.netto)} / ${betrag(rechnung.brutto)}) passen nicht zu den Positionen (${betrag(netto)} / ${betrag(brutto)}).`);
  }

  const wurzel = gutschrift ? "ubl:CreditNote" : "ubl:Invoice";
  const ns = gutschrift ? NS_CREDITNOTE : NS_INVOICE;
  const typ = gutschrift ? `<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>` : `<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>`;
  const referenz = kaeuferreferenz(rechnung, optionen) || rechnung.nummer;
  const zahlungsbedingung = rechnung.zahlungsbedingung.trim() || `Zahlbar bis ${datumFmt(rechnung.faelligAm)} ohne Abzug.`;
  const iban = ibanNormalisiert(firma.iban);
  const bic = firma.bic.replace(/\s+/g, "").toUpperCase();
  const notizen = rechnung.hinweise.filter((h) => h.trim());

  const verkaeufer = partei({
    endpoint: firma.email,
    name: firma.name,
    strasse: firma.adresse.strasse,
    zusatz: firma.zusatz,
    ort: firma.adresse.ort,
    plz: firma.adresse.plz,
    land: firma.adresse.land,
    ustIdNr: firma.ustIdNr,
    steuernummer: firma.steuernummer,
    handelsregister: firma.handelsregister,
    rechtsform: [firma.registergericht, firma.handelsregister].filter(Boolean).join(" ") + (firma.geschaeftsfuehrung ? `, Geschäftsführung: ${firma.geschaeftsfuehrung}` : ""),
    kontakt: { name: firma.geschaeftsfuehrung || firma.name, telefon: firma.telefon, email: firma.email },
  });
  const kaeufer = partei({
    endpoint: rechnung.empfaenger.email,
    identifikation: rechnung.empfaenger.kundennummer,
    name: rechnung.empfaenger.name,
    strasse: rechnung.empfaenger.adresse.strasse,
    zusatz: rechnung.empfaenger.zusatz,
    ort: rechnung.empfaenger.adresse.ort,
    plz: rechnung.empfaenger.adresse.plz,
    land: rechnung.empfaenger.adresse.land,
    ustIdNr: rechnung.empfaenger.ustIdNr,
  });

  const steuerteile = zeilen
    .map(
      (z) => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${betrag(z.netto)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${betrag(z.ust)}</cbc:TaxAmount>
      <cac:TaxCategory>
${kategorieXml(z.satz, optionen, firma, "        ", true)}
      </cac:TaxCategory>
    </cac:TaxSubtotal>`,
    )
    .join("\n");

  const positionen = rechnung.positionen.map((p) => positionXml(p, gutschrift, optionen, firma)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<${wurzel} xmlns:ubl="${ns}" xmlns:cac="${NS_CAC}" xmlns:cbc="${NS_CBC}">
  <cbc:CustomizationID>${XRECHNUNG_CUSTOMIZATION_ID}</cbc:CustomizationID>
  <cbc:ProfileID>${XRECHNUNG_PROFILE_ID}</cbc:ProfileID>
  <cbc:ID>${xml(rechnung.nummer)}</cbc:ID>
  <cbc:IssueDate>${rechnung.datum}</cbc:IssueDate>
${wenn(!gutschrift, `  <cbc:DueDate>${rechnung.faelligAm}</cbc:DueDate>\n`)}  ${typ}
${notizen.map((h) => `  ${element("cbc:Note", h)}\n`).join("")}  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${xml(referenz)}</cbc:BuyerReference>
${wenn(
  rechnung.leistungVon || rechnung.leistungBis,
  `  <cac:InvoicePeriod>
${wenn(rechnung.leistungVon, `    <cbc:StartDate>${rechnung.leistungVon}</cbc:StartDate>\n`)}${wenn(rechnung.leistungBis, `    <cbc:EndDate>${rechnung.leistungBis}</cbc:EndDate>\n`)}  </cac:InvoicePeriod>
`,
)}  <cac:AccountingSupplierParty>
    ${verkaeufer}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    ${kaeufer}
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
${wenn(gutschrift, `    <cbc:PaymentDueDate>${rechnung.faelligAm}</cbc:PaymentDueDate>\n`)}    <cbc:PaymentID>${xml(rechnung.nummer)}</cbc:PaymentID>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${xml(iban)}</cbc:ID>
      ${element("cbc:Name", firma.name)}
${wenn(bic, `      <cac:FinancialInstitutionBranch><cbc:ID>${xml(bic)}</cbc:ID></cac:FinancialInstitutionBranch>\n`)}    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:PaymentTerms>
    ${element("cbc:Note", zahlungsbedingung)}
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${betrag(ust)}</cbc:TaxAmount>
${steuerteile}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${betrag(netto)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${betrag(netto)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${betrag(brutto)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${betrag(brutto)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${positionen}
</${wurzel}>
`;
}

export function xrechnungDateiname(rechnung: Rechnung): string {
  return `XRechnung_${rechnung.nummer.replace(/[^A-Za-z0-9-]+/g, "_")}.xml`;
}
