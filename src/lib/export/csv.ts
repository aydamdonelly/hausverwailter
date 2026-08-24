/**
 * CSV für Excel (deutsch): UTF-8 mit BOM, Semikolon, Zahlen mit Komma, Datum TT.MM.JJJJ.
 * Excel-DE öffnet so eine Datei per Doppelklick richtig, ohne Importassistent.
 */
import { betrag as betragFmt, datum as datumFmt } from "../format";
import { lokalesDatum, QUELLE_TEXT, type JournalZeile } from "./journal";

export type CsvWert = string | number | boolean | null | undefined;

export const CSV_BOM = "\uFEFF";

function csvFeld(wert: CsvWert): string {
  if (wert === null || wert === undefined) return "";
  if (typeof wert === "number") return betragFmt(wert);
  if (typeof wert === "boolean") return wert ? "Ja" : "Nein";
  const text = String(wert);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Zahlen sind hier schon Beträge (zwei Nachkommastellen); Texte werden nur bei Bedarf eingerahmt. */
export function csvText(kopf: string[], zeilen: CsvWert[][]): string {
  const alle = [kopf, ...zeilen].map((z) => z.map(csvFeld).join(";"));
  return CSV_BOM + alle.join("\r\n") + "\r\n";
}

export const JOURNAL_SPALTEN = [
  "Datum",
  "Beleg-Nr.",
  "Buchungstext",
  "Partner",
  "Objekt",
  "Kostenart",
  "BetrKV",
  "Umlagefähig",
  "Konto",
  "Gegenkonto",
  "Netto",
  "USt",
  "Brutto",
  "USt-Satz",
  "S/H",
  "Quelle",
  "Exportiert am",
];

export function journalZeileAlsWerte(z: JournalZeile): CsvWert[] {
  return [
    datumFmt(z.datum),
    z.belegnummer,
    z.text,
    z.partner,
    z.objekt,
    z.kostenart,
    z.betrkv,
    z.umlagefaehig === null ? "" : z.umlagefaehig,
    z.konto,
    z.gegenkonto,
    z.netto,
    z.ust,
    z.brutto,
    `${z.ustSatz} %`,
    z.sollHaben,
    QUELLE_TEXT[z.quelle],
    datumFmt(lokalesDatum(z.exportiertAm)),
  ];
}

export function buchungsjournalCsv(zeilen: JournalZeile[]): string {
  return csvText(JOURNAL_SPALTEN, zeilen.map(journalZeileAlsWerte));
}
