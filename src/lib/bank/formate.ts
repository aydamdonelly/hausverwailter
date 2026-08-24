/**
 * CSV-Exporte deutscher Banken erkennen und lesen.
 *
 * Jedes Profil beschreibt ein Format über die Namen seiner Kopfzeile (Signatur) und eine
 * Spaltenzuordnung; Sonderfälle (Commerzbank packt Name, IBAN und Zweck in ein Feld, DKB
 * wählt die Gegenpartei nach Umsatztyp, Targobank hat keine Kopfzeile) laufen über kleine
 * Nachbearbeitungen. Greift kein Profil, sucht eine Heuristik nach bekannten Spaltennamen;
 * bleibt auch das erfolglos, bekommt die KI die ersten Zeilen (spalten-ki.ts) und liefert
 * ein Spaltenprofil, das hier genauso verarbeitet wird wie ein festes.
 *
 * Belege je Bank: Recherche datenformate-import-export.md 3.1 und
 * nachrecherche-bankabgleich--fehlende-beispielzeilen-der-csv-layouts.md.
 */
import { betragLesen, csvParsen, csvZeile, datumLesen, ibanImText, istBic, rohzeilen, spaltenname, trennerErkennen } from "./csv";
import { referenzBereinigt, sepaTags } from "./sepa";
import type { GemerktesProfil, LeseErgebnis, Spaltenprofil, Spaltenzuordnung, UmsatzRoh } from "./typen";
import { ibanGueltig } from "../iban";

type Zeile = Record<string, string>;

interface Profil {
  id: string;
  name: string;
  /** Normalisierte Spaltennamen, die alle in der Kopfzeile stehen müssen */
  signatur: string[];
  trennzeichen?: string;
  dezimal?: "," | ".";
  spalten: Spaltenzuordnung;
  sollHabenKennzeichen?: string;
  kontoIbanSpalte?: string;
  /** IBAN des eigenen Kontos steht im Vorspann vor der Kopfzeile */
  vorspannIban?: boolean;
  /** Nur Zeilen übernehmen, für die das gilt (z. B. gebuchte statt vorgemerkte) */
  filter?: (z: Zeile) => boolean;
  /** Zeilen mit fehlendem Feld reparieren (ING lässt bei manchen Gutschriften eine Spalte weg) */
  reparieren?: (felder: string[], kopf: string[]) => string[];
  /** Nachbearbeitung eines gelesenen Umsatzes */
  nach?: (u: UmsatzRoh, z: Zeile) => UmsatzRoh;
  /** Formate ohne Kopfzeile: erkennt eine Datenzeile und liefert die synthetischen Spaltennamen */
  ohneKopf?: { erkenne: (zeile: string) => boolean; kopf: string[]; trennzeichen: string };
}

const leerSpalten: Spaltenzuordnung = {
  buchungstag: "", valuta: "", betrag: "", betragSoll: "", betragHaben: "", waehrung: "", name: "", iban: "", bic: "",
  verwendungszweck: [], buchungstext: "", endToEndId: "", mandatsreferenz: "",
};

function sp(teil: Partial<Spaltenzuordnung>): Spaltenzuordnung {
  return { ...leerSpalten, ...teil };
}

/** Wert einer Spalte; mehrere Namen mit "|" als Alternativen. */
function wert(z: Zeile, name: string): string {
  if (!name) return "";
  for (const alt of name.split("|")) {
    const v = z[spaltenname(alt)];
    if (v !== undefined) return v;
  }
  return "";
}

function saeubern(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Commerzbank: "Name BIC IBAN Zweck End-to-End-Ref.: … Mandatsref: … Gläubiger-ID: … SEPA-BASISLASTSCHRIFT wiederholend" */
function commerzbankZerlegen(u: UmsatzRoh): UmsatzRoh {
  let text = saeubern(u.verwendungszweck);
  const eref = /End-to-End-Ref\.?:\s*(\S+)/i.exec(text);
  const mref = /Mandatsref\.?:\s*(\S+)/i.exec(text);
  if (eref) u.endToEndId = referenzBereinigt(eref[1]);
  if (mref) u.mandatsreferenz = mref[1];
  text = text
    .replace(/\s*End-to-End-Ref\.?:\s*\S+/i, "")
    .replace(/\s*Mandatsref\.?:\s*\S+/i, "")
    .replace(/\s*Gläubiger-ID:\s*\S+/i, "")
    .replace(/\s*(SEPA-BASISLASTSCHRIFT|SEPA-FIRMENLASTSCHRIFT)\s*(wiederholend|einmalig|erstmalig)?\s*$/i, "")
    .replace(/\s*(Dauerauftrag|Überweisung|Echtzeitüberweisung)\s*$/i, "")
    .trim();
  const m = /^(.+?)\s+([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\s+([A-Z]{2}\d{2}[A-Z0-9]{11,30})\s+(.*)$/.exec(text);
  if (m) {
    u.name = m[1].trim();
    u.bic = m[2];
    u.iban = m[3];
    u.verwendungszweck = m[4].trim();
  } else {
    const iban = ibanImText(text);
    if (iban) {
      const teile = text.split(iban);
      u.name = teile[0].replace(/\s+[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\s*$/, "").trim();
      u.iban = iban;
      u.verwendungszweck = (teile[1] ?? "").trim();
    } else {
      u.verwendungszweck = text;
    }
  }
  return u;
}

/** comdirect: "Auftraggeber: X Buchungstext: Y Ref. Z/1" bzw. "Empfänger: XKto/IBAN: DE… BLZ/BIC: … Buchungstext: Y Ref. Z/1" */
function comdirectZerlegen(u: UmsatzRoh): UmsatzRoh {
  const text = saeubern(u.verwendungszweck);
  const muster = /(Auftraggeber:|Empfänger:|Kto\/IBAN:|BLZ\/BIC:|Buchungstext:|Ref\.)/g;
  const teile: { schluessel: string; start: number; ende: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = muster.exec(text))) teile.push({ schluessel: m[1], start: m.index, ende: m.index + m[0].length });
  if (!teile.length) return u;
  const werte = new Map<string, string>();
  for (let i = 0; i < teile.length; i++) {
    const v = text.slice(teile[i].ende, i + 1 < teile.length ? teile[i + 1].start : text.length).trim();
    werte.set(teile[i].schluessel, v);
  }
  u.name = werte.get("Auftraggeber:") ?? werte.get("Empfänger:") ?? "";
  const iban = werte.get("Kto/IBAN:") ?? "";
  if (/^[A-Z]{2}\d{2}/.test(iban)) u.iban = iban.replace(/\s+/g, "");
  const bic = werte.get("BLZ/BIC:") ?? "";
  if (istBic(bic)) u.bic = bic;
  u.verwendungszweck = werte.get("Buchungstext:") ?? text.slice(0, teile[0].start).trim();
  const ref = werte.get("Ref.") ?? "";
  if (ref) u.endToEndId = referenzBereinigt(ref.split("/")[0]);
  return u;
}

/** Targobank: Vorgang, Name, IBAN, BIC, Zweck, Referenzen durch drei Leerzeichen getrennt, ohne Kopfzeile. */
function targobankZerlegen(u: UmsatzRoh, z: Zeile): UmsatzRoh {
  const teile = wert(z, "Buchungstext").split(/\s{3,}/).map((t) => t.trim()).filter(Boolean);
  if (teile.length < 2) {
    u.buchungstext = teile[0] ?? "";
    u.verwendungszweck = teile.slice(1).join(" ");
    return u;
  }
  u.buchungstext = teile[0];
  const rest: string[] = [];
  let name = "";
  for (const t of teile.slice(1)) {
    if (!u.iban && /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(t)) u.iban = t;
    else if (!u.bic && istBic(t)) u.bic = t;
    else if (!name) name = t;
    else rest.push(t);
  }
  u.name = name;
  u.verwendungszweck = rest.join(" ");
  return u;
}

/** VR-Format (neu): "Zweck EREF: … MREF: … CRED: … IBAN: … BIC: …" */
function vrTags(u: UmsatzRoh): UmsatzRoh {
  const tags = sepaTags(u.verwendungszweck);
  u.verwendungszweck = tags.zweck;
  if (!u.endToEndId) u.endToEndId = referenzBereinigt(tags.eref);
  if (!u.mandatsreferenz) u.mandatsreferenz = tags.mref;
  if (!u.iban && tags.iban) u.iban = tags.iban.replace(/\s+/g, "");
  if (!u.bic && tags.bic) u.bic = tags.bic;
  if (!u.name && tags.abwa) u.name = tags.abwa;
  return u;
}

/** VR-Format (alt): erste Zeile des Feldes ist der Vorgang, danach 27er-Zeilen ohne Leerzeichen zusammenfügen. */
function vrAltZerlegen(u: UmsatzRoh, z: Zeile): UmsatzRoh {
  const roh = wert(z, "Vorgang/Verwendungszweck");
  const zeilen = roh.split(/\r\n|\n|\r/);
  u.buchungstext = (zeilen[0] ?? "").trim();
  u.verwendungszweck = zeilen.slice(1).join("").trim();
  return vrTags(u);
}

/** Sparkasse CSV-MT940: SEPA-Bezeichner ohne Trenner im Verwendungszweck. */
function sparkasseMt940Tags(u: UmsatzRoh): UmsatzRoh {
  const tags = sepaTags(u.verwendungszweck);
  u.verwendungszweck = tags.zweck;
  if (!u.endToEndId) u.endToEndId = referenzBereinigt(tags.eref);
  if (!u.mandatsreferenz) u.mandatsreferenz = tags.mref;
  return u;
}

function ingReparieren(felder: string[], kopf: string[]): string[] {
  if (felder.length === kopf.length - 1) {
    const i = kopf.findIndex((k) => spaltenname(k) === "buchungstext");
    if (i > 0) return [...felder.slice(0, i), "", ...felder.slice(i)];
  }
  return felder;
}

export const PROFILE: Profil[] = [
  {
    id: "sparkasse-camt-csv",
    name: "Sparkasse CSV-CAMT",
    signatur: ["auftragskonto", "buchungstag", "valutadatum", "beguenstigter/zahlungspflichtiger", "kontonummer/iban", "betrag"],
    dezimal: ",",
    kontoIbanSpalte: "Auftragskonto",
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Valutadatum", betrag: "Betrag", waehrung: "Waehrung", name: "Beguenstigter/Zahlungspflichtiger", iban: "Kontonummer/IBAN", bic: "BIC (SWIFT-Code)", verwendungszweck: ["Verwendungszweck"], buchungstext: "Buchungstext", endToEndId: "Kundenreferenz (End-to-End)", mandatsreferenz: "Mandatsreferenz" }),
    filter: (z) => !/vorgemerkt/i.test(wert(z, "Info")),
  },
  {
    id: "sparkasse-mt940-csv",
    name: "Sparkasse CSV-MT940",
    signatur: ["auftragskonto", "buchungstag", "valutadatum", "beguenstigter/zahlungspflichtiger", "kontonummer", "blz", "betrag"],
    dezimal: ",",
    kontoIbanSpalte: "Auftragskonto",
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Valutadatum", betrag: "Betrag", waehrung: "Waehrung", name: "Beguenstigter/Zahlungspflichtiger", iban: "Kontonummer", bic: "BLZ", verwendungszweck: ["Verwendungszweck"], buchungstext: "Buchungstext" }),
    filter: (z) => !/vorgemerkt/i.test(wert(z, "Info")),
    nach: sparkasseMt940Tags,
  },
  {
    id: "vr-csv",
    name: "Volksbank/Raiffeisenbank CSV (VR, GLS, Sparda, PSD)",
    signatur: ["bezeichnung auftragskonto", "iban auftragskonto", "buchungstag", "valutadatum", "name zahlungsbeteiligter", "iban zahlungsbeteiligter", "verwendungszweck", "betrag"],
    dezimal: ",",
    kontoIbanSpalte: "IBAN Auftragskonto",
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Valutadatum", betrag: "Betrag", waehrung: "Waehrung", name: "Name Zahlungsbeteiligter", iban: "IBAN Zahlungsbeteiligter", bic: "BIC (SWIFT-Code) Zahlungsbeteiligter", verwendungszweck: ["Verwendungszweck"], buchungstext: "Buchungstext", mandatsreferenz: "Mandatsreferenz" }),
    nach: vrTags,
  },
  {
    id: "vr-alt-csv",
    name: "Volksbank/Raiffeisenbank CSV (altes Format)",
    signatur: ["buchungstag", "valuta", "auftraggeber/zahlungsempfänger", "empfänger/zahlungspflichtiger", "vorgang/verwendungszweck", "umsatz"],
    dezimal: ",",
    sollHabenKennzeichen: "$letzte",
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Valuta", betrag: "Umsatz", waehrung: "Währung", name: "Empfänger/Zahlungspflichtiger", iban: "IBAN", bic: "BIC", verwendungszweck: ["Vorgang/Verwendungszweck"], endToEndId: "Kundenreferenz" }),
    filter: (z) => !/anfangssaldo|endsaldo/i.test(`${wert(z, "Kundenreferenz")} ${wert(z, "Vorgang/Verwendungszweck")}`),
    nach: vrAltZerlegen,
  },
  {
    id: "deutsche-bank-csv",
    name: "Deutsche Bank / Postbank / norisbank CSV",
    signatur: ["buchungstag", "wert", "umsatzart", "begünstigter / auftraggeber", "verwendungszweck", "soll", "haben"],
    dezimal: ",",
    vorspannIban: true,
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Wert", betrag: "Betrag", betragSoll: "Soll", betragHaben: "Haben", waehrung: "Währung", name: "Begünstigter / Auftraggeber", iban: "IBAN / Kontonummer|IBAN", bic: "BIC", verwendungszweck: ["Verwendungszweck"], buchungstext: "Umsatzart", endToEndId: "Kundenreferenz", mandatsreferenz: "Mandatsreferenz" }),
    nach: (u, z) => {
      const abw = wert(z, "Abweichender Empfänger|Abweichender Auftraggeber");
      if (!u.name && abw) u.name = abw;
      return u;
    },
  },
  {
    id: "commerzbank-csv",
    name: "Commerzbank CSV",
    signatur: ["buchungstag", "wertstellung", "umsatzart", "buchungstext", "betrag", "iban kontoinhaber"],
    dezimal: ",",
    kontoIbanSpalte: "IBAN Kontoinhaber",
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Wertstellung", betrag: "Betrag", waehrung: "Währung", verwendungszweck: ["Buchungstext"], buchungstext: "Umsatzart" }),
    nach: commerzbankZerlegen,
  },
  {
    id: "comdirect-csv",
    name: "comdirect CSV",
    signatur: ["buchungstag", "wertstellung (valuta)", "vorgang", "buchungstext", "umsatz in eur"],
    dezimal: ",",
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Wertstellung (Valuta)", betrag: "Umsatz in EUR", verwendungszweck: ["Buchungstext"], buchungstext: "Vorgang" }),
    nach: comdirectZerlegen,
  },
  {
    id: "ing-csv",
    name: "ING CSV",
    signatur: ["buchung", "auftraggeber/empfänger", "buchungstext", "verwendungszweck", "betrag", "währung"],
    dezimal: ",",
    vorspannIban: true,
    spalten: sp({ buchungstag: "Buchung", valuta: "Wertstellungsdatum|Valuta", betrag: "Betrag", waehrung: "Währung", name: "Auftraggeber/Empfänger", verwendungszweck: ["Verwendungszweck"], buchungstext: "Buchungstext", endToEndId: "Kundenreferenz", mandatsreferenz: "Mandatsreferenz" }),
    reparieren: ingReparieren,
  },
  {
    id: "dkb-csv",
    name: "DKB CSV",
    signatur: ["buchungsdatum", "wertstellung", "status", "zahlungspflichtige*r", "zahlungsempfänger*in", "umsatztyp"],
    dezimal: ",",
    vorspannIban: true,
    spalten: sp({ buchungstag: "Buchungsdatum", valuta: "Wertstellung", betrag: "Betrag (€)|Betrag", iban: "IBAN", verwendungszweck: ["Verwendungszweck"], buchungstext: "Umsatztyp", endToEndId: "Kundenreferenz", mandatsreferenz: "Mandatsreferenz" }),
    filter: (z) => !/vorgemerkt/i.test(wert(z, "Status")),
    nach: (u, z) => {
      u.name = /eingang/i.test(wert(z, "Umsatztyp")) ? wert(z, "Zahlungspflichtige*r") : wert(z, "Zahlungsempfänger*in");
      return u;
    },
  },
  {
    id: "dkb-alt-csv",
    name: "DKB CSV (altes Format)",
    signatur: ["buchungstag", "wertstellung", "buchungstext", "auftraggeber / begünstigter", "verwendungszweck", "kontonummer", "blz", "betrag (eur)"],
    dezimal: ",",
    vorspannIban: true,
    spalten: sp({ buchungstag: "Buchungstag", valuta: "Wertstellung", betrag: "Betrag (EUR)", name: "Auftraggeber / Begünstigter", iban: "Kontonummer", bic: "BLZ", verwendungszweck: ["Verwendungszweck"], buchungstext: "Buchungstext", endToEndId: "Kundenreferenz", mandatsreferenz: "Mandatsreferenz" }),
  },
  {
    id: "n26-csv",
    name: "N26 CSV",
    signatur: ["booking date", "partner name", "partner iban", "payment reference", "amount (eur)"],
    trennzeichen: ",",
    dezimal: ".",
    spalten: sp({ buchungstag: "Booking Date", valuta: "Value Date", betrag: "Amount (EUR)", name: "Partner Name", iban: "Partner Iban", verwendungszweck: ["Payment Reference"], buchungstext: "Type" }),
  },
  {
    id: "n26-alt-csv",
    name: "N26 CSV (altes Format)",
    signatur: ["date", "payee", "account number", "transaction type", "payment reference", "amount (eur)"],
    trennzeichen: ",",
    dezimal: ".",
    spalten: sp({ buchungstag: "Date", betrag: "Amount (EUR)", name: "Payee", iban: "Account number", verwendungszweck: ["Payment reference"], buchungstext: "Transaction type" }),
  },
  {
    id: "consorsbank-csv",
    name: "Consorsbank CSV",
    signatur: ["buchung", "valuta", "sender / empfänger", "iban / konto-nr.", "verwendungszweck", "betrag in eur"],
    dezimal: ",",
    spalten: sp({ buchungstag: "Buchung", valuta: "Valuta", betrag: "Betrag in EUR", name: "Sender / Empfänger", iban: "IBAN / Konto-Nr.", bic: "BIC / BLZ", verwendungszweck: ["Verwendungszweck"], buchungstext: "Buchungstext" }),
  },
  {
    id: "hypovereinsbank-csv",
    name: "HypoVereinsbank CSV",
    signatur: ["kontonummer", "buchungsdatum", "valuta", "empfaenger 1", "verwendungszweck", "betrag", "waehrung"],
    dezimal: ",",
    spalten: sp({ buchungstag: "Buchungsdatum", valuta: "Valuta", betrag: "Betrag", waehrung: "Waehrung", name: "Empfaenger 1", verwendungszweck: ["Verwendungszweck"] }),
    nach: (u, z) => {
      const zwei = wert(z, "Empfaenger 2");
      if (zwei) u.name = `${u.name} ${zwei}`.trim();
      return u;
    },
  },
  {
    id: "qonto-csv",
    name: "Qonto CSV",
    signatur: ["counterparty name", "total amount (incl. vat)"],
    dezimal: ".",
    spalten: sp({ buchungstag: "Settlement date (UTC)|Settlement date (local)|Emitted date", valuta: "Value date", betrag: "Total amount (incl. VAT)", waehrung: "Currency", name: "Counterparty name", iban: "Counterparty IBAN", verwendungszweck: ["Reference"], buchungstext: "Payment method" }),
    filter: (z) => !/declined|canceled|cancelled|reversed/i.test(wert(z, "Status")),
  },
  {
    id: "finom-csv",
    name: "Finom CSV",
    signatur: ["buchungsdatum", "time completed", "status", "transaktionsart", "auftraggeber/empfänger", "counterparty iban", "verwendungszweck", "zahlungsbetrag"],
    trennzeichen: ",",
    dezimal: ".",
    kontoIbanSpalte: "Wallet-IBAN",
    spalten: sp({ buchungstag: "Buchungsdatum", betrag: "Zahlungsbetrag", waehrung: "Zahlungswährung", name: "Auftraggeber/Empfänger", iban: "Counterparty IBAN", bic: "Counterparty BIC", verwendungszweck: ["Verwendungszweck"], buchungstext: "Transaktionsart" }),
    filter: (z) => !wert(z, "Status") || /completed/i.test(wert(z, "Status")),
  },
  {
    id: "vivid-csv",
    name: "Vivid CSV",
    signatur: ["completed date", "counterparty name", "reference", "payment amount", "payment currency"],
    trennzeichen: ",",
    dezimal: ".",
    spalten: sp({ buchungstag: "Completed date", betrag: "Payment amount", waehrung: "Payment currency", name: "Counterparty name", verwendungszweck: ["Reference"] }),
  },
  {
    id: "hibiscus-csv",
    name: "Hibiscus CSV",
    signatur: ["kontonummer", "blz", "gegenkonto", "gegenkonto inhaber", "betrag", "valuta", "datum", "verwendungszweck"],
    dezimal: ",",
    spalten: sp({ buchungstag: "Datum", valuta: "Valuta", betrag: "Betrag", name: "Gegenkonto Inhaber", iban: "Gegenkonto", bic: "Gegenkonto BLZ", verwendungszweck: ["Verwendungszweck", "Verwendungszweck 2", "Weitere Verwendungszwecke"], buchungstext: "Art", endToEndId: "End-to-End ID" }),
  },
  {
    id: "targobank-csv",
    name: "Targobank CSV",
    signatur: [],
    ohneKopf: {
      erkenne: (zeile) => /^\d{1,2}\.\d{1,2}\.\d{4};.*;'?[A-Z]{2}\d{2}[A-Z0-9]{11,30}'?\s*$/.test(zeile.trim()),
      kopf: ["Datum", "Buchungstext", "Soll", "Haben", "Leer1", "Leer2", "Konto"],
      trennzeichen: ";",
    },
    kontoIbanSpalte: "Konto",
    spalten: sp({ buchungstag: "Datum", betragSoll: "Soll", betragHaben: "Haben", verwendungszweck: ["Buchungstext"] }),
    nach: targobankZerlegen,
  },
];

/** Feste Profile nach Kennung, für Namen in der Oberfläche. */
export function formatName(id: string): string {
  const p = PROFILE.find((x) => x.id === id);
  if (p) return p.name;
  return { generisch: "Allgemeines CSV (Spalten erkannt)", ki: "CSV (Spalten von der KI erkannt)", camt053: "CAMT.053 XML", camt052: "CAMT.052 XML", mt940: "MT940" }[id] ?? id;
}

// ---------- Generische Heuristik ----------

const HEURISTIK: { feld: keyof Spaltenzuordnung; muster: RegExp; nicht?: RegExp }[] = [
  { feld: "buchungstag", muster: /^(buchungstag|buchungsdatum|buchung|datum|date|booking date|belegdatum|completed date|settlement date|transaction date|buchungs-datum)/ },
  { feld: "valuta", muster: /^(valuta|valutadatum|wertstellung|wertstellungsdatum|wert|value date)/ },
  { feld: "betragSoll", muster: /^soll$/ },
  { feld: "betragHaben", muster: /^haben$/ },
  { feld: "betrag", muster: /^(betrag|umsatz|amount|payment amount|total amount|zahlungsbetrag|betrag \(|umsatz in)/, nicht: /ursprung|original|fremd|foreign|saldo|balance|vat amount|lastschrift ursprungsbetrag/ },
  { feld: "waehrung", muster: /^(währung|waehrung|currency|zahlungswährung|payment currency)/, nicht: /ursprung|original/ },
  { feld: "name", muster: /(auftraggeber|empfänger|empfaenger|begünstigter|beguenstigter|zahlungspflichtiger|zahlungsbeteiligter|partner name|counterparty name|payee|gegenkonto inhaber|^name$)/, nicht: /abweichend|konto$|iban/ },
  { feld: "iban", muster: /iban|kontonummer|account number|gegenkonto$/, nicht: /auftragskonto|kontoinhaber|wallet|eigene|^kontonummer$/ },
  { feld: "bic", muster: /\bbic\b|blz/, nicht: /auftragskonto|gegenkonto blz/ },
  { feld: "buchungstext", muster: /^(buchungstext|umsatzart|vorgang|type|transaktionsart|transaction type|umsatztyp|art)$/ },
  { feld: "endToEndId", muster: /(end-to-end|endtoend|end to end|kundenreferenz|^eref)/ },
  { feld: "mandatsreferenz", muster: /mandatsreferenz|mandatsref|mandate/ },
];

/** Baut aus einer Kopfzeile ein Spaltenprofil, wenn Datum und Betrag erkennbar sind. */
export function heuristischesProfil(kopf: string[], trennzeichen: string, kopfzeile: number): Spaltenprofil | null {
  const spalten = { ...leerSpalten, verwendungszweck: [] as string[] };
  const belegt = new Set<string>();
  for (const roh of kopf) {
    const n = spaltenname(roh);
    if (!n || belegt.has(n)) continue;
    if (/verwendungszweck|zweck|reference|referenz|payment reference/.test(n) && !/kundenreferenz|mandatsreferenz|end-to-end|sammlerreferenz/.test(n)) {
      spalten.verwendungszweck.push(roh);
      belegt.add(n);
      continue;
    }
    for (const h of HEURISTIK) {
      if (h.feld === "verwendungszweck") continue;
      if (!h.muster.test(n) || (h.nicht && h.nicht.test(n))) continue;
      if (spalten[h.feld]) continue;
      (spalten as Record<string, string | string[]>)[h.feld] = roh;
      belegt.add(n);
      break;
    }
  }
  if (!spalten.buchungstag) return null;
  if (!spalten.betrag && !(spalten.betragSoll || spalten.betragHaben)) return null;
  if (!spalten.verwendungszweck.length && spalten.buchungstext) spalten.verwendungszweck = [spalten.buchungstext];
  return { trennzeichen, kopfzeile, spalten, datumsformat: "", dezimaltrennzeichen: ",", bankVermutung: "" };
}

// ---------- Lesen ----------

function dezimalErmitteln(rohwerte: string[]): "," | "." {
  let komma = 0;
  let punkt = 0;
  for (const w of rohwerte) {
    if (/,\d{1,2}$/.test(w.trim())) komma++;
    else if (/\.\d{1,2}$/.test(w.trim())) punkt++;
  }
  return punkt > komma ? "." : ",";
}

function zeilenLesen(
  zeilen: string[][],
  kopf: string[],
  spalten: Spaltenzuordnung,
  optionen: { dezimal?: "," | "."; sollHabenKennzeichen?: string; filter?: (z: Zeile) => boolean; reparieren?: (felder: string[], kopf: string[]) => string[]; nach?: (u: UmsatzRoh, z: Zeile) => UmsatzRoh; kontoIbanSpalte?: string },
): { umsaetze: UmsatzRoh[]; uebersprungen: number; kontoIban: string; excelVerdacht: boolean } {
  const kopfNormiert = kopf.map(spaltenname);
  const umsaetze: UmsatzRoh[] = [];
  let uebersprungen = 0;
  let kontoIban = "";
  let excelVerdacht = false;
  const betragSpalte = spalten.betrag || spalten.betragSoll || spalten.betragHaben;
  const dezimal = optionen.dezimal ?? dezimalErmitteln(zeilen.map((f) => {
    const i = kopfNormiert.indexOf(spaltenname(betragSpalte.split("|")[0]));
    return i >= 0 ? f[i] ?? "" : "";
  }));
  for (let felderRoh of zeilen) {
    if (felderRoh.every((f) => !f.trim())) continue;
    if (optionen.reparieren) felderRoh = optionen.reparieren(felderRoh, kopf);
    const z: Zeile = {};
    kopfNormiert.forEach((n, i) => {
      if (z[n] !== undefined) return;
      const v = (felderRoh[i] ?? "").trim();
      z[n] = v === "N/A" ? "" : v;
    });
    if (optionen.sollHabenKennzeichen === "$letzte") z.$letzte = (felderRoh[kopf.length - 1] ?? "").trim();
    if (optionen.filter && !optionen.filter(z)) {
      uebersprungen++;
      continue;
    }
    const buchungstag = datumLesen(wert(z, spalten.buchungstag));
    if (!buchungstag) {
      uebersprungen++;
      continue;
    }
    let betrag: number | null = null;
    const signiert = wert(z, spalten.betrag);
    if (signiert) betrag = betragLesen(signiert, dezimal);
    if (betrag === null && spalten.betragSoll) {
      const s = betragLesen(wert(z, spalten.betragSoll), dezimal);
      if (s !== null && s !== 0) betrag = -Math.abs(s);
    }
    if (betrag === null && spalten.betragHaben) {
      const h = betragLesen(wert(z, spalten.betragHaben), dezimal);
      if (h !== null) betrag = Math.abs(h);
    }
    if (betrag !== null && optionen.sollHabenKennzeichen) {
      const kz = optionen.sollHabenKennzeichen === "$letzte" ? z.$letzte : wert(z, optionen.sollHabenKennzeichen);
      if (/^s$/i.test(kz)) betrag = -Math.abs(betrag);
      else if (/^h$/i.test(kz)) betrag = Math.abs(betrag);
    }
    if (betrag === null) {
      uebersprungen++;
      continue;
    }
    if (felderRoh.some((f) => /\d,\d+E\+\d+/.test(f))) excelVerdacht = true;
    const iban = wert(z, spalten.iban).replace(/\s+/g, "").toUpperCase();
    let u: UmsatzRoh = {
      buchungstag,
      valuta: datumLesen(wert(z, spalten.valuta)),
      betrag,
      waehrung: wert(z, spalten.waehrung) || "EUR",
      name: saeubern(wert(z, spalten.name)),
      iban: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban) ? iban : "",
      bic: istBic(wert(z, spalten.bic)) ? wert(z, spalten.bic).trim() : "",
      verwendungszweck: saeubern(spalten.verwendungszweck.map((s) => wert(z, s)).filter(Boolean).join(" ")),
      buchungstext: saeubern(wert(z, spalten.buchungstext)),
      endToEndId: referenzBereinigt(wert(z, spalten.endToEndId)),
      mandatsreferenz: wert(z, spalten.mandatsreferenz).trim(),
    };
    if (optionen.nach) u = optionen.nach(u, z);
    if (!kontoIban && optionen.kontoIbanSpalte) {
      const k = wert(z, optionen.kontoIbanSpalte).replace(/[\s']/g, "").toUpperCase();
      if (ibanGueltig(k)) kontoIban = k;
    }
    umsaetze.push(u);
  }
  return { umsaetze, uebersprungen, kontoIban, excelVerdacht };
}

function ergebnis(
  format: string,
  name: string,
  gelesen: { umsaetze: UmsatzRoh[]; uebersprungen: number; kontoIban: string; excelVerdacht: boolean },
  vorspann: string,
  vorspannIban: boolean,
  extra: Partial<LeseErgebnis> = {},
): LeseErgebnis {
  const warnungen: string[] = [];
  let kontoIban = gelesen.kontoIban;
  if (!kontoIban && (vorspannIban || !extra.profilJson)) {
    const k = ibanImText(vorspann);
    if (k && ibanGueltig(k)) kontoIban = k;
  }
  if (gelesen.excelVerdacht) warnungen.push("Die Datei sieht aus, als wäre sie in Excel geöffnet und neu gespeichert worden (Referenzen als 6,17E+25). Bitte die Datei direkt aus dem Online-Banking verwenden; Beträge könnten verändert sein.");
  if (!gelesen.umsaetze.length) warnungen.push("Es wurden keine lesbaren Umsätze gefunden.");
  return { format, formatName: name, kontoIban, umsaetze: gelesen.umsaetze, warnungen, uebersprungen: gelesen.uebersprungen, ...extra };
}

/** Liest eine CSV-Datei mit einem Spaltenprofil (generisch oder von der KI). */
export function leseMitProfil(text: string, profilRoh: Spaltenprofil, format: "generisch" | "ki", name?: string): LeseErgebnis {
  const zeilen = rohzeilen(text);
  const profil = { ...profilRoh };
  // Die Kopfzeile muss die Datumsspalte enthalten; sonst (z. B. Index der KI um Leerzeilen verschoben) wird sie gesucht.
  if (profil.kopfzeile >= 0) {
    const gesucht = spaltenname(profil.spalten.buchungstag.split("|")[0]);
    const passt = (i: number) => csvZeile(zeilen[i] ?? "", profil.trennzeichen).map(spaltenname).includes(gesucht);
    if (gesucht && !passt(profil.kopfzeile)) {
      const gefunden = zeilen.slice(0, 60).findIndex((_, i) => passt(i));
      if (gefunden >= 0) profil.kopfzeile = gefunden;
    }
  }
  const kopf = profil.kopfzeile >= 0 ? csvZeile(zeilen[profil.kopfzeile] ?? "", profil.trennzeichen) : (profil.kopfSynthetisch ?? []);
  const start = profil.kopfzeile >= 0 ? profil.kopfzeile + 1 : 0;
  const daten = csvParsen(zeilen.slice(start).join("\n"), profil.trennzeichen);
  const gelesen = zeilenLesen(daten, kopf, profil.spalten, { dezimal: profil.dezimaltrennzeichen, sollHabenKennzeichen: profil.sollHabenKennzeichen, kontoIbanSpalte: profil.kontoIbanSpalte });
  const gemerkt: GemerktesProfil = { id: format, name: name ?? formatName(format), profil };
  return ergebnis(format, gemerkt.name, gelesen, zeilen.slice(0, Math.max(0, profil.kopfzeile)).join("\n"), true, { profilJson: JSON.stringify(gemerkt) });
}

/** Ein gemerktes Profil (JSON aus Bankkonto.format) lesen; null, wenn es keins ist. */
export function gemerktesProfil(format: string): GemerktesProfil | null {
  if (!format || !format.trim().startsWith("{")) return null;
  try {
    const g = JSON.parse(format) as GemerktesProfil;
    if (g && g.profil && g.profil.spalten) return g;
  } catch {
    /* kein JSON */
  }
  return null;
}

/**
 * Erkennt das Format einer CSV-Datei und liest sie. Reihenfolge: gemerktes Profil des Kontos,
 * feste Bankprofile, Formate ohne Kopfzeile, generische Heuristik. Ergebnis "unbekannt" trägt
 * die ersten Zeilen als Vorschau für die KI.
 */
export function leseCsv(text: string, gemerkt?: GemerktesProfil | null): LeseErgebnis {
  const zeilen = rohzeilen(text);
  if (gemerkt) {
    const e = leseMitProfil(text, gemerkt.profil, gemerkt.id, gemerkt.name);
    if (e.umsaetze.length) return e;
  }
  const trenner = trennerErkennen(zeilen);
  const grenze = Math.min(zeilen.length, 60);
  const profileSortiert = [...PROFILE].filter((p) => p.signatur.length).sort((a, b) => b.signatur.length - a.signatur.length);

  for (let i = 0; i < grenze; i++) {
    const roh = zeilen[i];
    if (!roh.trim()) continue;
    for (const p of profileSortiert) {
      const t = p.trennzeichen ?? trenner;
      const kopf = csvZeile(roh, t);
      const namen = kopf.map(spaltenname);
      if (!p.signatur.every((s) => namen.includes(s))) continue;
      const daten = csvParsen(zeilen.slice(i + 1).join("\n"), t);
      const gelesen = zeilenLesen(daten, kopf, p.spalten, { dezimal: p.dezimal, sollHabenKennzeichen: p.sollHabenKennzeichen, filter: p.filter, reparieren: p.reparieren, nach: p.nach, kontoIbanSpalte: p.kontoIbanSpalte });
      return ergebnis(p.id, p.name, gelesen, zeilen.slice(0, i).join("\n"), Boolean(p.vorspannIban));
    }
  }

  // Formate ohne Kopfzeile (Targobank)
  const ersteDaten = zeilen.find((z) => z.trim());
  for (const p of PROFILE) {
    if (!p.ohneKopf || !ersteDaten || !p.ohneKopf.erkenne(ersteDaten)) continue;
    const daten = csvParsen(zeilen.join("\n"), p.ohneKopf.trennzeichen);
    const gelesen = zeilenLesen(daten, p.ohneKopf.kopf, p.spalten, { filter: p.filter, nach: p.nach, kontoIbanSpalte: p.kontoIbanSpalte });
    return ergebnis(p.id, p.name, gelesen, "", false);
  }

  // Generische Heuristik über die Spaltennamen
  for (let i = 0; i < grenze; i++) {
    const roh = zeilen[i];
    if (!roh.trim()) continue;
    const kopf = csvZeile(roh, trenner);
    if (kopf.length < 3) continue;
    const profil = heuristischesProfil(kopf, trenner, i);
    if (!profil) continue;
    const daten = csvParsen(zeilen.slice(i + 1).join("\n"), trenner);
    const betragIndex = kopf.map(spaltenname).indexOf(spaltenname((profil.spalten.betrag || profil.spalten.betragSoll || profil.spalten.betragHaben).split("|")[0]));
    profil.dezimaltrennzeichen = dezimalErmitteln(daten.map((f) => f[betragIndex] ?? ""));
    const e = leseMitProfil(text, profil, "generisch");
    if (e.umsaetze.length) return e;
  }

  return {
    format: "unbekannt",
    formatName: "Unbekanntes Format",
    kontoIban: ibanImText(zeilen.slice(0, 20).join("\n")),
    umsaetze: [],
    warnungen: ["Kein bekanntes Bankformat. Die KI kann die Spalten erkennen."],
    uebersprungen: 0,
    // Rohzeilen mit ihrem echten Index (auch Leerzeilen), damit die KI die Kopfzeile korrekt benennt
    vorschau: zeilen.slice(0, 20).map((z) => z.slice(0, 600)),
  };
}
