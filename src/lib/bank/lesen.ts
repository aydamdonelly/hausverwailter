/**
 * Der Einstieg: eine Kontoauszugsdatei (CSV, CAMT-XML, MT940) → Umsätze. Entscheidet an
 * Inhalt und Dateiname, welcher Leser zuständig ist. Reiner Code, läuft im Browser und in Tests.
 */
import { dekodiere } from "./csv";
import { istCamt, leseCamt } from "./camt053";
import { istMt940, leseMt940 } from "./mt940";
import { gemerktesProfil, leseCsv } from "./formate";
import type { LeseErgebnis } from "./typen";

/** Liest eine Datei. `kontoFormat` ist der gemerkte Wert aus Bankkonto.format (Kennung oder Profil-JSON). */
export function leseKontoauszug(buf: ArrayBuffer, dateiname = "", kontoFormat = ""): LeseErgebnis {
  const { text, zeichensatz } = dekodiere(buf);
  const name = dateiname.toLowerCase();
  let e: LeseErgebnis;
  if (name.endsWith(".xml") || istCamt(text)) e = leseCamt(text);
  else if (name.endsWith(".sta") || name.endsWith(".mt940") || name.endsWith(".mta") || istMt940(text)) e = leseMt940(text);
  else e = leseCsv(text, gemerktesProfil(kontoFormat));
  if (zeichensatz !== "utf-8" && e.format !== "unbekannt") e.warnungen.push(`Zeichensatz ${zeichensatz === "windows-1252" ? "ISO-8859-1/Windows-1252" : zeichensatz} erkannt, Umlaute wurden umgesetzt.`);
  return e;
}

/** Sortiert Umsätze aufsteigend nach Buchungstag (Banken exportieren oft absteigend). */
export function chronologisch<T extends { buchungstag: string }>(umsaetze: T[]): T[] {
  return [...umsaetze].sort((a, b) => (a.buchungstag < b.buchungstag ? -1 : a.buchungstag > b.buchungstag ? 1 : 0));
}

/** Zeitraum einer Umsatzliste, für die Formatvorschau ("01.07.2026 bis 31.07.2026"). */
export function zeitraum(umsaetze: { buchungstag: string }[]): { von: string; bis: string } | null {
  if (!umsaetze.length) return null;
  let von = umsaetze[0].buchungstag;
  let bis = von;
  for (const u of umsaetze) {
    if (u.buchungstag < von) von = u.buchungstag;
    if (u.buchungstag > bis) bis = u.buchungstag;
  }
  return { von, bis };
}
