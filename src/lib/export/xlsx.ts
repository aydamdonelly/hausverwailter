/**
 * Excel-Arbeitsmappe "Buchungsjournal" (exceljs): Blätter Buchungen, Belege, Bankumsätze,
 * Mieteingang. Kopfzeile fett und fixiert, Autofilter, Spaltenbreiten, echte Datums- und
 * Zahlenzellen (Excel-DE zeigt "#,##0.00" als 1.234,56), Summenzeile mit Formeln.
 * Läuft im Browser (exceljs bringt einen Browser-Build mit) und in Node (Tests).
 */
import ExcelJS from "exceljs";
import type { Bankkonto, Bankumsatz, Beleg, Dokument, Kostenart, Objekt, Person, Rechnung, Zuordnung } from "../domain/schema";
import { lokalesDatum, QUELLE_TEXT, type JournalZeile } from "./journal";
import type { MieteingangZeile } from "./mieteingang";

export interface BelegZeile {
  datum: string | null;
  nummer: string;
  lieferant: string;
  iban: string;
  objekt: string;
  kostenart: string;
  umlagefaehig: boolean | null;
  netto: number;
  ust: number;
  brutto: number;
  faelligAm: string | null;
  bezahltAm: string | null;
  status: string;
}

const STATUS_TEXT: Record<Dokument["status"], string> = {
  neu: "Eingegangen",
  wird_gelesen: "Wird gelesen",
  erkannt: "Erkannt",
  freigabe: "Freigabe nötig",
  freigegeben: "Freigegeben",
  gebucht: "Gebucht",
  abgelehnt: "Abgelehnt",
  fehler: "Fehler",
};

export const ZUORDNUNG_TEXT: Record<Zuordnung["art"], string> = {
  mieteingang: "Mieteingang",
  hausgeld: "Hausgeld",
  belegzahlung: "Belegzahlung",
  honorar: "Honorar",
  gebuehr: "Gebühr",
  auszahlung_eigentuemer: "Auszahlung Eigentümer",
  kaution: "Kaution",
  sonstiges: "Sonstiges",
  offen: "Offen",
};

const SICHERHEIT_TEXT = { sicher: "sicher", wahrscheinlich: "wahrscheinlich", unsicher: "unsicher" } as const;

export function belegZeilen(belege: Beleg[], dokumente: Dokument[], objekte: Objekt[], kostenarten: Kostenart[]): BelegZeile[] {
  const status = new Map(dokumente.map((d) => [d.id, d.status]));
  const objekt = new Map(objekte.map((o) => [o.id, o.kurzname]));
  const kostenart = new Map(kostenarten.map((k) => [k.code, k]));
  return [...belege]
    .sort((a, b) => (b.rechnungsdatum ?? "").localeCompare(a.rechnungsdatum ?? ""))
    .map((b) => {
      const k = b.kostenartCode ? kostenart.get(b.kostenartCode) : undefined;
      const s = status.get(b.dokumentId);
      return {
        datum: b.rechnungsdatum,
        nummer: b.rechnungsnummer,
        lieferant: b.lieferant.name,
        iban: b.lieferant.iban,
        objekt: b.objektId ? objekt.get(b.objektId) ?? b.objektId : "",
        kostenart: k?.bezeichnung ?? (b.kostenartCode ?? ""),
        umlagefaehig: k?.umlagefaehig ?? null,
        netto: b.nettoGesamt,
        ust: b.ustGesamt,
        brutto: b.bruttoGesamt,
        faelligAm: b.faelligAm,
        bezahltAm: b.bezahltAm,
        status: s ? STATUS_TEXT[s] : "",
      };
    });
}

export interface BankumsatzZeile {
  buchungstag: string;
  konto: string;
  name: string;
  iban: string;
  verwendungszweck: string;
  betrag: number;
  zuordnung: string;
  bezug: string;
  monat: string;
  sicherheit: string;
}

export function bankumsatzZeilen(umsaetze: Bankumsatz[], bankkonten: Bankkonto[], personen: Person[], belege: Beleg[], rechnungen: Rechnung[]): BankumsatzZeile[] {
  const konto = new Map(bankkonten.map((k) => [k.id, k.bezeichnung]));
  const person = new Map(personen.map((p) => [p.id, p.name]));
  const beleg = new Map(belege.map((b) => [b.id, `${b.lieferant.name} ${b.rechnungsnummer}`.trim()]));
  const rechnung = new Map(rechnungen.map((r) => [r.id, r.nummer]));
  return [...umsaetze]
    .sort((a, b) => b.buchungstag.localeCompare(a.buchungstag))
    .map((u) => {
      const z = u.zuordnung;
      const bezug = (z.personId && person.get(z.personId)) || (z.belegId && beleg.get(z.belegId)) || (z.rechnungId && rechnung.get(z.rechnungId)) || "";
      return {
        buchungstag: u.buchungstag,
        konto: konto.get(u.bankkontoId) ?? u.bankkontoId,
        name: u.name,
        iban: u.iban,
        verwendungszweck: u.verwendungszweck,
        betrag: u.betrag,
        zuordnung: ZUORDNUNG_TEXT[z.art],
        bezug,
        monat: z.monat ?? "",
        sicherheit: z.art === "offen" ? "" : SICHERHEIT_TEXT[z.sicherheit],
      };
    });
}

export interface Journalmappe {
  buchungen: JournalZeile[];
  belege: BelegZeile[];
  bankumsaetze: BankumsatzZeile[];
  mieteingang: MieteingangZeile[];
  /** Erstellzeitpunkt (ISO), landet in den Dokumenteigenschaften. */
  erstelltAm: string;
}

interface Spalte {
  header: string;
  key: string;
  breite: number;
  typ?: "geld" | "datum" | "jaNein";
}

const GELD = "#,##0.00";
const DATUM = "dd.mm.yyyy";

function datumZelle(iso: string | null | undefined): Date | "" {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

function blatt(wb: ExcelJS.Workbook, name: string, spalten: Spalte[], zeilen: Record<string, unknown>[], summen: string[]): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = spalten.map((s) => ({ header: s.header, key: s.key, width: s.breite }));
  ws.getRow(1).font = { bold: true };
  for (const z of zeilen) {
    const werte: Record<string, unknown> = {};
    for (const s of spalten) {
      const w = z[s.key];
      if (s.typ === "datum") werte[s.key] = datumZelle(typeof w === "string" ? w : null);
      else if (s.typ === "jaNein") werte[s.key] = w === null || w === undefined ? "" : w ? "Ja" : "Nein";
      else werte[s.key] = w ?? "";
    }
    ws.addRow(werte);
  }
  for (const s of spalten) {
    const spalte = ws.getColumn(s.key);
    if (s.typ === "geld") spalte.numFmt = GELD;
    if (s.typ === "datum") spalte.numFmt = DATUM;
    if (s.typ === "geld") spalte.alignment = { horizontal: "right" };
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spalten.length } };
  if (zeilen.length && summen.length) {
    const letzte = zeilen.length + 1;
    const summe: Record<string, unknown> = { [spalten[0].key]: "Summe" };
    for (const key of summen) {
      const buchstabe = ws.getColumn(key).letter;
      summe[key] = { formula: `SUM(${buchstabe}2:${buchstabe}${letzte})` };
    }
    const zeile = ws.addRow(summe);
    zeile.font = { bold: true };
    for (const key of summen) zeile.getCell(key).numFmt = GELD;
  }
  return ws;
}

export async function buchungsjournalXlsx(m: Journalmappe): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hausverwailter";
  wb.title = "Buchungsjournal";
  wb.created = new Date(m.erstelltAm);
  wb.modified = wb.created;

  blatt(
    wb,
    "Buchungen",
    [
      { header: "Datum", key: "datum", breite: 12, typ: "datum" },
      { header: "Beleg-Nr.", key: "belegnummer", breite: 18 },
      { header: "Buchungstext", key: "text", breite: 44 },
      { header: "Partner", key: "partner", breite: 30 },
      { header: "Objekt", key: "objekt", breite: 24 },
      { header: "Kostenart", key: "kostenart", breite: 30 },
      { header: "BetrKV", key: "betrkv", breite: 18 },
      { header: "Umlagefähig", key: "umlagefaehig", breite: 12, typ: "jaNein" },
      { header: "Konto", key: "konto", breite: 9 },
      { header: "Gegenkonto", key: "gegenkonto", breite: 11 },
      { header: "Netto", key: "netto", breite: 13, typ: "geld" },
      { header: "USt", key: "ust", breite: 11, typ: "geld" },
      { header: "Brutto", key: "brutto", breite: 13, typ: "geld" },
      { header: "USt-Satz", key: "ustSatz", breite: 9 },
      { header: "S/H", key: "sollHaben", breite: 5 },
      { header: "Quelle", key: "quelle", breite: 10 },
      { header: "Exportiert am", key: "exportiertAm", breite: 14, typ: "datum" },
    ],
    m.buchungen.map((z) => ({ ...z, quelle: QUELLE_TEXT[z.quelle], exportiertAm: lokalesDatum(z.exportiertAm) })),
    ["netto", "ust", "brutto"],
  );

  blatt(
    wb,
    "Belege",
    [
      { header: "Rechnungsdatum", key: "datum", breite: 15, typ: "datum" },
      { header: "Rechnungsnummer", key: "nummer", breite: 20 },
      { header: "Lieferant", key: "lieferant", breite: 32 },
      { header: "IBAN", key: "iban", breite: 26 },
      { header: "Objekt", key: "objekt", breite: 24 },
      { header: "Kostenart", key: "kostenart", breite: 30 },
      { header: "Umlagefähig", key: "umlagefaehig", breite: 12, typ: "jaNein" },
      { header: "Netto", key: "netto", breite: 13, typ: "geld" },
      { header: "USt", key: "ust", breite: 11, typ: "geld" },
      { header: "Brutto", key: "brutto", breite: 13, typ: "geld" },
      { header: "Fällig am", key: "faelligAm", breite: 12, typ: "datum" },
      { header: "Bezahlt am", key: "bezahltAm", breite: 12, typ: "datum" },
      { header: "Status", key: "status", breite: 14 },
    ],
    m.belege.map((z) => ({ ...z })),
    ["netto", "ust", "brutto"],
  );

  blatt(
    wb,
    "Bankumsätze",
    [
      { header: "Buchungstag", key: "buchungstag", breite: 12, typ: "datum" },
      { header: "Konto", key: "konto", breite: 30 },
      { header: "Name", key: "name", breite: 30 },
      { header: "IBAN", key: "iban", breite: 26 },
      { header: "Verwendungszweck", key: "verwendungszweck", breite: 50 },
      { header: "Betrag", key: "betrag", breite: 13, typ: "geld" },
      { header: "Zuordnung", key: "zuordnung", breite: 16 },
      { header: "Bezug", key: "bezug", breite: 30 },
      { header: "Monat", key: "monat", breite: 9 },
      { header: "Sicherheit", key: "sicherheit", breite: 14 },
    ],
    m.bankumsaetze.map((z) => ({ ...z })),
    ["betrag"],
  );

  blatt(
    wb,
    "Mieteingang",
    [
      { header: "Monat", key: "monat", breite: 9 },
      { header: "Objekt", key: "objekt", breite: 24 },
      { header: "Person", key: "person", breite: 30 },
      { header: "Rolle", key: "rolle", breite: 12 },
      { header: "Soll", key: "soll", breite: 13, typ: "geld" },
      { header: "Ist", key: "ist", breite: 13, typ: "geld" },
      { header: "Differenz", key: "differenz", breite: 13, typ: "geld" },
      { header: "Status", key: "status", breite: 12 },
    ],
    m.mieteingang.map((z) => ({
      ...z,
      rolle: { mieter: "Mieter", eigentuemer: "Eigentümer", sonstige: "Sonstige" }[z.rolle],
      status: { bezahlt: "bezahlt", teilweise: "teilweise", offen: "offen", ueberzahlt: "überzahlt" }[z.status],
    })),
    ["soll", "ist", "differenz"],
  );

  const puffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(puffer as ArrayBuffer);
}

export function xlsxDateiname(von: string, bis: string): string {
  return `Buchungsjournal_${von}_${bis}.xlsx`;
}
