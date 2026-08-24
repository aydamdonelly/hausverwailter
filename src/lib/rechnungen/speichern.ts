/**
 * Datenbankschritte des Rechnungsmoduls: Nummer holen, Rechnung und Buchungssätze speichern,
 * Zahlung und Storno festhalten. Jeder Schritt steht im Protokoll. Läuft im Browser.
 */
import { db, neueId } from "../store/db";
import { naechsteNummer } from "../store/nummern";
import { protokolliere } from "../store/protokoll";
import { ladeEinstellungen } from "../store/arbeitsbereich";
import { Rechnung } from "../domain/schema";
import { datum as datumFmt, heuteIso, jetztIso, monatName } from "../format";
import { summe } from "../geld";
import { buchungenAusRechnung, stornoBuchungen } from "./buchung";
import type { RechnungsEntwurf } from "./entwurf";

/**
 * Eine Rechnung endgültig anlegen: fortlaufende Nummer (§ 14 Abs. 4 Nr. 4 UStG), Status
 * "gestellt", je Steuersatz ein Buchungssatz. Nummer, Rechnung und Buchungen in einer
 * Transaktion, damit keine Nummer ohne Rechnung verbraucht wird.
 */
export async function rechnungAnlegen(entwurf: RechnungsEntwurf, aktion = "Rechnung erstellt"): Promise<Rechnung> {
  const einstellungen = await ladeEinstellungen();
  return db.transaction("rw", [db.einstellungen, db.rechnungen, db.buchungen, db.protokoll], async () => {
    const nummer = await naechsteNummer("rechnung", entwurf.datum);
    const rechnung = Rechnung.parse({ ...entwurf, id: neueId(), nummer, status: "gestellt", erstelltAm: jetztIso() });
    await db.rechnungen.add(rechnung);
    const buchungen = buchungenAusRechnung(rechnung, einstellungen, rechnung.erstelltAm, neueId);
    await db.buchungen.bulkAdd(buchungen);
    await protokolliere("nutzer", aktion, `rechnung:${rechnung.id}`, {
      nummer,
      art: rechnung.art,
      empfaenger: rechnung.empfaenger.name,
      objektId: rechnung.objektId,
      leistungszeitraum: rechnung.leistungVon && rechnung.leistungBis ? `${datumFmt(rechnung.leistungVon)} bis ${datumFmt(rechnung.leistungBis)}` : "",
      netto: rechnung.netto,
      brutto: rechnung.brutto,
      buchungssaetze: buchungen.length,
    });
    return rechnung;
  });
}

/** Der Honorarlauf: alle Entwürfe nacheinander anlegen, am Ende ein Protokolleintrag für den Lauf. */
export async function honorarlaufAnlegen(entwuerfe: RechnungsEntwurf[], monat: string): Promise<Rechnung[]> {
  const neue: Rechnung[] = [];
  for (const e of entwuerfe) neue.push(await rechnungAnlegen(e, "Honorarrechnung erstellt"));
  if (neue.length) {
    await protokolliere("nutzer", "Honorarlauf ausgeführt", `honorarlauf:${monat}`, {
      monat: monatName(monat),
      rechnungen: neue.length,
      nummern: neue.length === 1 ? neue[0].nummer : `${neue[0].nummer} bis ${neue[neue.length - 1].nummer}`,
      netto: summe(neue.map((r) => r.netto)),
      brutto: summe(neue.map((r) => r.brutto)),
    });
  }
  return neue;
}

/** Zahlung eintragen (Datum) oder zurücknehmen (null). */
export async function rechnungBezahltSetzen(id: string, bezahltAm: string | null): Promise<void> {
  const r = await db.rechnungen.get(id);
  if (!r) throw new Error("Rechnung nicht gefunden.");
  if (r.status === "storniert") throw new Error("Eine stornierte Rechnung kann nicht als bezahlt gelten.");
  if (bezahltAm) {
    await db.rechnungen.update(id, { status: "bezahlt", bezahltAm });
    await protokolliere("nutzer", "Rechnung als bezahlt markiert", `rechnung:${id}`, { nummer: r.nummer, bezahltAm: datumFmt(bezahltAm), brutto: r.brutto });
  } else {
    await db.rechnungen.update(id, { status: "gestellt", bezahltAm: null });
    await protokolliere("nutzer", "Zahlung zurückgenommen", `rechnung:${id}`, { nummer: r.nummer });
  }
}

/**
 * Stornieren: Status "storniert" und zu jedem Buchungssatz eine Gegenbuchung mit umgekehrtem
 * Vorzeichen. Die Rechnung selbst bleibt (Aufbewahrungspflicht § 14b UStG), die Nummer bleibt vergeben.
 */
export async function rechnungStornieren(id: string, grund: string): Promise<void> {
  const heute = heuteIso();
  await db.transaction("rw", [db.rechnungen, db.buchungen, db.protokoll], async () => {
    const r = await db.rechnungen.get(id);
    if (!r) throw new Error("Rechnung nicht gefunden.");
    if (r.status === "storniert") return;
    const vorhandene = await db.buchungen.where("rechnungId").equals(id).toArray();
    const storno = stornoBuchungen(r, vorhandene, heute, jetztIso(), neueId);
    await db.buchungen.bulkAdd(storno);
    await db.rechnungen.update(id, {
      status: "storniert",
      bezahltAm: null,
      hinweise: [...r.hinweise, `Storniert am ${datumFmt(heute)}${grund.trim() ? `: ${grund.trim()}` : ""}.`],
    });
    await protokolliere("nutzer", "Rechnung storniert", `rechnung:${id}`, { nummer: r.nummer, grund: grund.trim(), gegenbuchungen: storno.length, brutto: r.brutto });
  });
}
