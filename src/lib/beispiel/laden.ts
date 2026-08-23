/**
 * Beispieldaten: eine fiktive Hausverwaltung mit fünf Objekten, Mietern, Kostenarten,
 * Leistungskatalog und einem Satz Beispieldokumente (Belege, Anfrage, Kontoauszug).
 * Wird in Stammdaten → "Beispieldaten laden" und vom leeren Posteingang aufgerufen.
 * Die Dokumente selbst liegen unter public/beispiel/ und werden von dort geholt.
 */
import { db } from "../store/db";
import { protokolliere } from "../store/protokoll";
import { Einstellungen } from "../domain/schema";
import { STANDARD_KOSTENARTEN, STANDARD_LEISTUNGEN_HAUSVERWALTUNG, STANDARD_STAFFEL } from "../domain/standard";
import { neueId } from "../store/db";

/** Nur Stammdaten-Grundausstattung (Kostenarten, Leistungskatalog), ohne Beispielobjekte. */
export async function grundausstattungAnlegen(): Promise<void> {
  if ((await db.kostenarten.count()) === 0) await db.kostenarten.bulkPut(STANDARD_KOSTENARTEN);
  if ((await db.leistungen.count()) === 0) {
    await db.leistungen.bulkPut(STANDARD_LEISTUNGEN_HAUSVERWALTUNG.map((l) => ({ ...l, id: neueId() })));
  }
  const e = Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {});
  if (!e.staffel.length) e.staffel = STANDARD_STAFFEL;
  await db.einstellungen.put(e);
}

/** Wird von lib/beispiel/daten.ts (Beispielbetrieb) überschrieben; hier nur die Signatur. */
export async function ladeBeispieldaten(): Promise<void> {
  const modul = await import("./daten");
  await modul.beispielbetriebAnlegen();
  await protokolliere("system", "Beispieldaten geladen");
}
