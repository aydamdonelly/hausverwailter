/**
 * Grundwerkzeuge für Bank-CSV-Dateien: Zeichensatz erkennen, Trennzeichen erkennen, Zeilen
 * nach RFC 4180 lesen (Anführungszeichen, verdoppelte Anführungszeichen, Zeilenumbrüche im
 * Feld, wie sie das alte VR-Format hat), Beträge und Daten in allen Schreibweisen lesen.
 */
import { parseDeDatum, parseDeZahl } from "../format";

export type Zeichensatz = "utf-8" | "windows-1252" | "utf-16le" | "utf-16be";

/**
 * Bytes → Text. UTF-8 mit BOM oder gültiges UTF-8 wird als UTF-8 gelesen, alles andere als
 * Windows-1252 (deckt ISO-8859-1/-15 ab; Umlaute liegen dort an denselben Stellen).
 */
export function dekodiere(buf: ArrayBuffer): { text: string; zeichensatz: Zeichensatz } {
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), zeichensatz: "utf-8" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), zeichensatz: "utf-16le" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), zeichensatz: "utf-16be" };
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), zeichensatz: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), zeichensatz: "windows-1252" };
  }
}

/** Text in Rohzeilen (ohne Rücksicht auf Anführungszeichen), für Kopfzeilensuche und Vorschau. */
export function rohzeilen(text: string): string[] {
  return text.replace(/^﻿/, "").split(/\r\n|\n|\r/);
}

/**
 * Trennzeichen erkennen: das Zeichen, das in den ersten Zeilen außerhalb von Anführungszeichen
 * am häufigsten vorkommt. Bei Gleichstand gewinnt das Semikolon (deutsche Banken).
 */
export function trennerErkennen(zeilen: string[]): string {
  const kandidaten = [";", ",", "\t", "|"];
  const zaehler = new Map<string, number>(kandidaten.map((k) => [k, 0]));
  for (const zeile of zeilen.slice(0, 40)) {
    let inQuote = false;
    for (const c of zeile) {
      if (c === '"') inQuote = !inQuote;
      else if (!inQuote && zaehler.has(c)) zaehler.set(c, (zaehler.get(c) ?? 0) + 1);
    }
  }
  let bester = ";";
  let max = -1;
  for (const k of kandidaten) {
    const n = zaehler.get(k) ?? 0;
    if (n > max) {
      max = n;
      bester = k;
    }
  }
  return bester;
}

/** RFC-4180-Leser: Felder in Anführungszeichen dürfen Trennzeichen, "" und Zeilenumbrüche enthalten. */
export function csvParsen(text: string, trenner: string): string[][] {
  const zeilen: string[][] = [];
  let felder: string[] = [];
  let feld = "";
  let inQuote = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          feld += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      feld += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (c === trenner) {
      felder.push(feld);
      feld = "";
      i++;
      continue;
    }
    if (c === "\r" || c === "\n") {
      felder.push(feld);
      zeilen.push(felder);
      felder = [];
      feld = "";
      if (c === "\r" && text[i + 1] === "\n") i++;
      i++;
      continue;
    }
    feld += c;
    i++;
  }
  if (feld.length || felder.length) {
    felder.push(feld);
    zeilen.push(felder);
  }
  return zeilen;
}

/** Eine einzelne Zeile lesen (für Kopfzeilen). */
export function csvZeile(zeile: string, trenner: string): string[] {
  return csvParsen(zeile, trenner)[0] ?? [];
}

/** Spaltenname normalisieren: BOM und Anführungszeichen weg, Leerraum, Kleinschreibung. */
export function spaltenname(s: string): string {
  return s.replace(/﻿/g, "").replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Betrag lesen. Deutsche Banken schreiben "1.234,56", "-1143,41", "750" (ohne Nachkommanullen),
 * DKB "1.000" (= 1000,00), frühe DKB-Exporte "100.000,00 €"; Neobanken "-60.00", "1,234.56".
 * `dezimal` legt fest, wie ein einzelner Punkt zu lesen ist, wenn das Profil es weiß.
 */
export function betragLesen(text: string | null | undefined, dezimal?: "," | "."): number | null {
  if (text === null || text === undefined) return null;
  let t = String(text).trim();
  if (!t || t === "N/A" || t === "-" || t === "--") return null;
  t = t.replace(/\s|€|EUR|'/gi, "");
  if (!t) return null;
  if (dezimal === ".") {
    let negativ = false;
    if (t.endsWith("-")) { negativ = true; t = t.slice(0, -1); }
    if (t.startsWith("-")) { negativ = true; t = t.slice(1); }
    if (t.startsWith("+")) t = t.slice(1);
    const n = Number(t.replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return negativ ? -n : n;
  }
  if (dezimal === ",") {
    let negativ = false;
    if (t.endsWith("-")) { negativ = true; t = t.slice(0, -1); }
    if (t.startsWith("-")) { negativ = true; t = t.slice(1); }
    if (t.startsWith("+")) t = t.slice(1);
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return negativ ? -n : n;
  }
  return parseDeZahl(t);
}

/**
 * Datum lesen: "23.08.2026", "23.08.26", "1.6.2026", "2026-08-23", "2026-08-23T10:00:00",
 * "05-08-2026 09:57:00" (Qonto), "20260823". Alles andere (z. B. "offen", "--", "Kontostand") → null.
 */
function plausibel(isoDatum: string): string | null {
  const monat = Number(isoDatum.slice(5, 7));
  const tag = Number(isoDatum.slice(8, 10));
  return monat >= 1 && monat <= 12 && tag >= 1 && tag <= 31 ? isoDatum : null;
}

export function datumLesen(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = String(text).trim().replace(/\s+Neu$/i, "");
  if (!t) return null;
  const direkt = parseDeDatum(t);
  if (direkt) return plausibel(direkt);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?:[ T]|$)/.exec(t);
  if (m) {
    const jahr = m[3].length === 2 ? `20${m[3]}` : m[3];
    const monat = Number(m[2]);
    const tag = Number(m[1]);
    if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
    return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
  }
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

const IBAN_MUSTER = /\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?)\b/g;

/** Erste IBAN in einem Text (auch in Vierergruppen geschrieben), ohne Leerzeichen; "" wenn keine. */
export function ibanImText(text: string): string {
  IBAN_MUSTER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IBAN_MUSTER.exec(text))) {
    const kandidat = m[1].replace(/\s+/g, "").toUpperCase();
    if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(kandidat)) return kandidat;
  }
  return "";
}

/** Sieht ein Text wie eine BIC aus? */
export function istBic(text: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(text.trim());
}
