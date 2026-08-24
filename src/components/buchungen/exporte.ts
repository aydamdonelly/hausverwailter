/**
 * Die Exporte aus Sicht der Seite: Daten aus der lokalen Datenbank holen, die reinen
 * Export-Funktionen aufrufen, die Datei herunterladen, Folgen speichern (exportiertAm,
 * Kreditoren/Debitoren) und alles protokollieren.
 */
import { db } from "@/lib/store/db";
import { ladeEinstellungen, speichereEinstellungen } from "@/lib/store/arbeitsbereich";
import { protokolliere } from "@/lib/store/protokoll";
import { herunterladen } from "@/lib/api";
import { jetztIso } from "@/lib/format";
import type { Bankkonto, Bankumsatz, Beleg, Buchung, Dokument, Einstellungen, Kostenart, Objekt, Person, Rechnung } from "@/lib/domain/schema";
import { datevBuchungsstapel, type DatevErgebnis } from "@/lib/export/datev";
import { buchungsjournalCsv } from "@/lib/export/csv";
import { mieteingang, monateZwischen } from "@/lib/export/mieteingang";
import { sepaDateiname, sepaUeberweisung, zahlungAusPosten } from "@/lib/export/sepa";
import type { JournalZeile } from "@/lib/export/journal";
import type { OffenerPosten, Zahlungsgruppe } from "@/lib/export/offene-posten";

export interface Buchungsdaten {
  einstellungen: Einstellungen;
  buchungen: Buchung[];
  belege: Beleg[];
  dokumente: Dokument[];
  rechnungen: Rechnung[];
  bankumsaetze: Bankumsatz[];
  bankkonten: Bankkonto[];
  objekte: Objekt[];
  kostenarten: Kostenart[];
  personen: Person[];
}

/** Lokale Uhrzeit als ISO ohne Zone (2026-08-23T14:30:00), so wie sie in DATEV- und SEPA-Datei stehen soll. */
export function lokaleZeitIso(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function blobAusBytes(bytes: Uint8Array, typ: string): Blob {
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: typ });
}

/** DATEV-Stapel für die übergebenen Buchungen: Datei speichern, exportiertAm setzen, Personenkonten merken. */
export async function datevExportieren(buchungen: Buchung[], daten: Buchungsdaten, festschreibung = false): Promise<DatevErgebnis> {
  const ergebnis = datevBuchungsstapel(
    buchungen,
    {
      einstellungen: daten.einstellungen,
      belege: daten.belege,
      rechnungen: daten.rechnungen,
      bankumsaetze: daten.bankumsaetze,
      bankkonten: daten.bankkonten,
      objekte: daten.objekte,
      kostenarten: daten.kostenarten,
      personen: daten.personen,
    },
    { erzeugtAm: lokaleZeitIso(), exportiertVon: daten.einstellungen.firma.name.slice(0, 25), festschreibung },
  );
  herunterladen(blobAusBytes(ergebnis.bytes, "text/csv;charset=windows-1252"), ergebnis.dateiname);

  const jetzt = jetztIso();
  const ids = ergebnis.zeilen.map((z) => z.buchungId);
  await db.buchungen.where("id").anyOf(ids).modify({ exportiertAm: jetzt });
  // Einstellungen frisch laden, damit parallele Änderungen nicht überschrieben werden.
  const aktuell = await ladeEinstellungen();
  await speichereEinstellungen({ ...aktuell, datev: { ...aktuell.datev, kreditoren: ergebnis.kreditoren, debitoren: ergebnis.debitoren } });
  await protokolliere("nutzer", "DATEV-Buchungsstapel exportiert", "export:datev", {
    datei: ergebnis.dateiname,
    buchungen: ids.length,
    zeitraum: `${ergebnis.datumVon} bis ${ergebnis.datumBis}`,
    neueKreditoren: ergebnis.neueKreditoren.length,
    neueDebitoren: ergebnis.neueDebitoren.length,
    festschreibung,
    warnungen: ergebnis.warnungen.length,
  });
  return ergebnis;
}

export async function csvExportieren(zeilen: JournalZeile[], von: string, bis: string): Promise<string> {
  const dateiname = `Buchungsjournal_${von}_${bis}.csv`;
  herunterladen(new Blob([buchungsjournalCsv(zeilen)], { type: "text/csv;charset=utf-8" }), dateiname);
  await protokolliere("nutzer", "CSV-Journal exportiert", "export:csv", { datei: dateiname, buchungen: zeilen.length });
  return dateiname;
}

/** Excel-Mappe mit vier Blättern. exceljs wird erst hier geladen, damit die Seite leicht bleibt. */
export async function excelExportieren(zeilen: JournalZeile[], daten: Buchungsdaten, von: string, bis: string): Promise<string> {
  const { bankumsatzZeilen, belegZeilen, buchungsjournalXlsx, xlsxDateiname } = await import("@/lib/export/xlsx");
  const monate = monateZwischen(von, bis);
  const bytes = await buchungsjournalXlsx({
    buchungen: zeilen,
    belege: belegZeilen(daten.belege, daten.dokumente, daten.objekte, daten.kostenarten),
    bankumsaetze: bankumsatzZeilen(daten.bankumsaetze, daten.bankkonten, daten.personen, daten.belege, daten.rechnungen),
    mieteingang: mieteingang(daten.personen, daten.bankumsaetze, daten.objekte, monate, daten.einstellungen.mahnwesen.toleranzEuro),
    erstelltAm: jetztIso(),
  });
  const dateiname = xlsxDateiname(von, bis);
  herunterladen(blobAusBytes(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), dateiname);
  await protokolliere("nutzer", "Excel-Journal exportiert", "export:xlsx", { datei: dateiname, buchungen: zeilen.length, monate: monate.length });
  return dateiname;
}

/** SEPA-Sammelüberweisung für eine Kontogruppe des Zahlungsvorschlags. */
export async function sepaExportieren(gruppe: Zahlungsgruppe, posten: OffenerPosten[], ausfuehrungAm: string): Promise<string> {
  const auftrag = {
    auftraggeber: { name: gruppe.konto.name, iban: gruppe.konto.iban, bic: gruppe.konto.bic || undefined },
    zahlungen: posten.map(zahlungAusPosten),
    ausfuehrungAm,
    erstelltAm: lokaleZeitIso(),
  };
  const xml = sepaUeberweisung(auftrag);
  const dateiname = sepaDateiname(auftrag);
  herunterladen(new Blob([xml], { type: "application/xml" }), dateiname);
  await protokolliere("nutzer", "SEPA-Zahlungsvorschlag erzeugt", gruppe.konto.bankkontoId ? `bankkonto:${gruppe.konto.bankkontoId}` : "export:sepa", {
    datei: dateiname,
    zahlungen: posten.length,
    summe: posten.reduce((s, p) => s + p.betrag, 0),
    ausfuehrungAm,
    belege: posten.map((p) => p.nummer).join(", "),
  });
  return dateiname;
}
