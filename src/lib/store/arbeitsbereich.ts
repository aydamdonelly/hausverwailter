import { db, TABELLEN, type Datei } from "./db";
import { Arbeitsbereich, Einstellungen } from "../domain/schema";

const VERSION = 1;

function blobZuBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function base64ZuBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Alles aus der Datenbank als eine JSON-Datei (Dateien base64). */
export async function exportiereArbeitsbereich(): Promise<Arbeitsbereich> {
  const dateien = await db.dateien.toArray();
  const dateienB64 = await Promise.all(
    dateien.map(async (d) => ({ id: d.id, mime: d.mime, base64: await blobZuBase64(d.blob) })),
  );
  return {
    format: "hausverwailter-arbeitsbereich",
    version: VERSION,
    exportiertAm: new Date().toISOString(),
    einstellungen: Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {}),
    objekte: await db.objekte.toArray(),
    einheiten: await db.einheiten.toArray(),
    personen: await db.personen.toArray(),
    kostenarten: await db.kostenarten.toArray(),
    leistungen: await db.leistungen.toArray(),
    dokumente: await db.dokumente.toArray(),
    dateien: dateienB64,
    belege: await db.belege.toArray(),
    buchungen: await db.buchungen.toArray(),
    bankkonten: await db.bankkonten.toArray(),
    bankumsaetze: await db.bankumsaetze.toArray(),
    anfragen: await db.anfragen.toArray(),
    angebote: await db.angebote.toArray(),
    rechnungen: await db.rechnungen.toArray(),
    mahnungen: await db.mahnungen.toArray(),
    protokoll: await db.protokoll.toArray(),
  };
}

/** Ersetzt den kompletten Inhalt der Datenbank durch die Datei. */
export async function importiereArbeitsbereich(roh: unknown): Promise<void> {
  const ab = Arbeitsbereich.parse(roh);
  const dateien: Datei[] = ab.dateien.map((d) => ({ id: d.id, mime: d.mime, blob: base64ZuBlob(d.base64, d.mime) }));
  await db.transaction("rw", TABELLEN.map((t) => db.table(t)), async () => {
    for (const t of TABELLEN) await db.table(t).clear();
    await db.einstellungen.put(ab.einstellungen);
    await db.objekte.bulkPut(ab.objekte);
    await db.einheiten.bulkPut(ab.einheiten);
    await db.personen.bulkPut(ab.personen);
    await db.kostenarten.bulkPut(ab.kostenarten);
    await db.leistungen.bulkPut(ab.leistungen);
    await db.dokumente.bulkPut(ab.dokumente);
    await db.dateien.bulkPut(dateien);
    await db.belege.bulkPut(ab.belege);
    await db.buchungen.bulkPut(ab.buchungen);
    await db.bankkonten.bulkPut(ab.bankkonten);
    await db.bankumsaetze.bulkPut(ab.bankumsaetze);
    await db.anfragen.bulkPut(ab.anfragen);
    await db.angebote.bulkPut(ab.angebote);
    await db.rechnungen.bulkPut(ab.rechnungen);
    await db.mahnungen.bulkPut(ab.mahnungen);
    await db.protokoll.bulkPut(ab.protokoll);
  });
}

export async function leereArbeitsbereich(): Promise<void> {
  await db.transaction("rw", TABELLEN.map((t) => db.table(t)), async () => {
    for (const t of TABELLEN) await db.table(t).clear();
  });
}

export async function ladeEinstellungen(): Promise<Einstellungen> {
  return Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {});
}

export async function speichereEinstellungen(e: Einstellungen): Promise<void> {
  await db.einstellungen.put(Einstellungen.parse(e));
}
