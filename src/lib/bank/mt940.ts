/**
 * MT940 (SWIFT-Kontoauszug in der DK-Ausprägung) lesen: :61: Umsatzzeile, :86: Mehrzweckfeld
 * mit ?nn-Subfeldern (?00 Buchungstext, ?20–?29 und ?60–?63 Verwendungszweck mit SEPA-Bezeichnern,
 * ?30 BIC, ?31 IBAN, ?32/?33 Name). Quelle: DK Anlage 3 V3.8 Kap. 8.2 und Omikron-Beschreibung
 * (Recherche datenformate-import-export.md 3.3). Vorzeichen nur aus C/D in :61:, nie aus dem GVC.
 */
import type { LeseErgebnis, UmsatzRoh } from "./typen";
import { referenzBereinigt, sepaTags } from "./sepa";
import { ibanImText } from "./csv";
import { ibanGueltig } from "../iban";

export function istMt940(text: string): boolean {
  const kopf = text.slice(0, 6000);
  return /^:20:/m.test(kopf) && /^:61:/m.test(kopf);
}

interface Feld {
  tag: string;
  inhalt: string[];
}

/** Zerlegt den Text in Felder (":61:", ":86:" …) mit ihren Fortsetzungszeilen. */
function felder(text: string): Feld[] {
  const ergebnis: Feld[] = [];
  let aktuell: Feld | null = null;
  for (const roh of text.split(/\r\n|\n|\r/)) {
    const zeile = roh.replace(/\s+$/, "");
    if (!zeile) continue;
    const m = /^:(\d{2}[A-Z]?):(.*)$/.exec(zeile);
    if (m) {
      aktuell = { tag: m[1], inhalt: [m[2]] };
      ergebnis.push(aktuell);
    } else if (zeile === "-") {
      aktuell = null;
    } else if (aktuell) {
      aktuell.inhalt.push(zeile);
    }
  }
  return ergebnis;
}

interface Umsatzzeile {
  valuta: string;
  buchungstag: string;
  betrag: number;
  buchungsschluessel: string;
  kundenreferenz: string;
}

function jjmmtt(s: string): string {
  return `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

/** :61: Valuta JJMMTT, optional Buchung MMTT, C/D/RC/RD, optional Währungsbuchstabe, Betrag, N+Schlüssel, Referenz//Bankreferenz */
function umsatzzeile(s: string): Umsatzzeile | null {
  const m = /^(\d{6})(\d{4})?(RC|RD|C|D)([A-Z])?(\d+(?:,\d*)?)(N[A-Z0-9]{3}|F[A-Z0-9]{3}|S\d{3})?(.*)$/.exec(s.trim());
  if (!m) return null;
  const valuta = jjmmtt(m[1]);
  let buchungstag = valuta;
  if (m[2]) {
    let jahr = Number(valuta.slice(0, 4));
    const monatValuta = Number(valuta.slice(5, 7));
    const monatBuchung = Number(m[2].slice(0, 2));
    // Jahreswechsel: Buchung im Dezember, Valuta im Januar (oder umgekehrt)
    if (monatBuchung - monatValuta > 6) jahr -= 1;
    if (monatValuta - monatBuchung > 6) jahr += 1;
    buchungstag = `${jahr}-${m[2].slice(0, 2)}-${m[2].slice(2, 4)}`;
  }
  const roh = Number(m[5].replace(",", "."));
  if (!Number.isFinite(roh)) return null;
  const richtung = m[3];
  // D = Belastung, C = Gutschrift; RC = Storno einer Gutschrift (also Belastung), RD = Storno einer Belastung
  const betrag = richtung === "D" || richtung === "RC" ? -roh : roh;
  const referenz = (m[7] ?? "").split("//")[0].trim();
  return { valuta, buchungstag, betrag, buchungsschluessel: m[6] ?? "", kundenreferenz: referenzBereinigt(referenz) };
}

interface Mehrzweck {
  gvc: string;
  buchungstext: string;
  zweck: string;
  bic: string;
  iban: string;
  name: string;
  eref: string;
  mref: string;
}

/** :86: Subfelder lesen. Zeilen werden ohne Trenner aneinandergehängt (ein Subfeld darf umbrechen). */
function mehrzweckfeld(zeilen: string[]): Mehrzweck {
  const ganz = zeilen.join("");
  const ergebnis: Mehrzweck = { gvc: "", buchungstext: "", zweck: "", bic: "", iban: "", name: "", eref: "", mref: "" };
  const m = /^(\d{3})([\s\S]*)$/.exec(ganz);
  if (!m || !ganz.includes("?")) {
    // Unstrukturiert (GVC 999 oder Freitext)
    ergebnis.gvc = m ? m[1] : "";
    ergebnis.zweck = (m ? m[2] : ganz).replace(/\s+/g, " ").trim();
    return ergebnis;
  }
  ergebnis.gvc = m[1];
  const teile = m[2].split(/\?(\d{2})/);
  // teile: ["", "00", "…", "20", "…", …]
  const sub = new Map<string, string>();
  for (let i = 1; i + 1 < teile.length; i += 2) sub.set(teile[i], (sub.get(teile[i]) ?? "") + teile[i + 1]);
  ergebnis.buchungstext = (sub.get("00") ?? "").trim();
  ergebnis.bic = (sub.get("30") ?? "").trim();
  ergebnis.iban = (sub.get("31") ?? "").trim();
  ergebnis.name = `${sub.get("32") ?? ""}${sub.get("33") ?? ""}`.replace(/\s+/g, " ").trim();
  let zweckRoh = "";
  for (const k of ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "60", "61", "62", "63"]) zweckRoh += sub.get(k) ?? "";
  const tags = sepaTags(zweckRoh);
  ergebnis.zweck = tags.zweck.trim();
  ergebnis.eref = referenzBereinigt(tags.eref);
  ergebnis.mref = tags.mref;
  if (!ergebnis.iban && tags.iban) ergebnis.iban = tags.iban;
  if (!ergebnis.bic && tags.bic) ergebnis.bic = tags.bic;
  if (tags.abwa && !ergebnis.name) ergebnis.name = tags.abwa;
  return ergebnis;
}

/** Deutsche IBAN aus BLZ und Kontonummer (Prüfziffer nach ISO 7064), "" wenn nicht plausibel. */
export function ibanAusBlzKonto(blz: string, konto: string): string {
  const b = blz.replace(/\D/g, "");
  const k = konto.replace(/\D/g, "");
  if (b.length !== 8 || !k.length || k.length > 10) return "";
  const bban = b + k.padStart(10, "0");
  // "DE00" als Ziffern: D = 13, E = 14
  const ziffern = `${bban}131400`;
  let rest = 0;
  for (let i = 0; i < ziffern.length; i += 7) rest = Number(String(rest) + ziffern.slice(i, i + 7)) % 97;
  const pruef = String(98 - rest).padStart(2, "0");
  const iban = `DE${pruef}${bban}`;
  return ibanGueltig(iban) ? iban : "";
}

/** :25: enthält "BLZ/Konto", "/IBAN", "IBAN" oder "BIC/Konto[Währung]". */
function kontoAusFeld25(inhalt: string): string {
  const direkt = ibanImText(inhalt.replace(/\//g, " "));
  if (direkt) return direkt;
  const m = /^(\d{8})\/(\d{1,10})/.exec(inhalt.trim());
  if (m) return ibanAusBlzKonto(m[1], m[2]);
  return "";
}

export function leseMt940(text: string): LeseErgebnis {
  const alle = felder(text);
  const umsaetze: UmsatzRoh[] = [];
  const warnungen: string[] = [];
  let uebersprungen = 0;
  let kontoIban = "";
  let waehrung = "EUR";
  for (let i = 0; i < alle.length; i++) {
    const f = alle[i];
    if (f.tag === "25" && !kontoIban) kontoIban = kontoAusFeld25(f.inhalt.join(""));
    if (f.tag === "60F" || f.tag === "60M") {
      const w = /^[CD]\d{6}([A-Z]{3})/.exec(f.inhalt[0] ?? "");
      if (w) waehrung = w[1];
    }
    if (f.tag !== "61") continue;
    const u = umsatzzeile(f.inhalt.join(""));
    if (!u) {
      uebersprungen++;
      continue;
    }
    const naechstes = alle[i + 1];
    const info = naechstes && naechstes.tag === "86" ? mehrzweckfeld(naechstes.inhalt) : mehrzweckfeld([]);
    umsaetze.push({
      buchungstag: u.buchungstag,
      valuta: u.valuta,
      betrag: u.betrag,
      waehrung,
      name: info.name,
      iban: info.iban.replace(/\s+/g, "").toUpperCase(),
      bic: info.bic,
      verwendungszweck: info.zweck,
      buchungstext: info.buchungstext,
      endToEndId: info.eref || u.kundenreferenz,
      mandatsreferenz: info.mref,
    });
  }
  if (!umsaetze.length) warnungen.push("Keine :61:-Umsatzzeilen gefunden.");
  return { format: "mt940", formatName: "MT940 (SWIFT-Kontoauszug)", kontoIban, umsaetze, warnungen, uebersprungen };
}
