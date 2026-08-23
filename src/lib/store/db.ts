/**
 * Lokaler Speicher im Browser (IndexedDB über Dexie).
 *
 * Bewusste Entscheidung: Es gibt keine Server-Datenbank. Alle Daten des Nutzers liegen in
 * seinem Browser (bzw. auf seinem Rechner, wenn die App lokal läuft). Der Server ist nur
 * ein zustandsloser Rechenknecht (KI-Aufrufe, PDF-Erzeugung). Dadurch läuft die App auf
 * Vercel und lokal identisch, und Belege verlassen den Rechner nur für den KI-Aufruf.
 * Sichern und Umziehen: Stammdaten → "Arbeitsbereich exportieren" (eine JSON-Datei).
 */
import Dexie, { type EntityTable } from "dexie";
import type {
  Anfrage, Angebot, Bankkonto, Bankumsatz, Beleg, Buchung, Dokument, Einheit, Einstellungen,
  Kostenart, Leistung, Mahnung, Objekt, Person, Protokoll, Rechnung,
} from "../domain/schema";

export interface Datei {
  id: string; // = Dokument.id
  mime: string;
  blob: Blob;
}

export class HausverwailterDB extends Dexie {
  einstellungen!: EntityTable<Einstellungen, "id">;
  objekte!: EntityTable<Objekt, "id">;
  einheiten!: EntityTable<Einheit, "id">;
  personen!: EntityTable<Person, "id">;
  kostenarten!: EntityTable<Kostenart, "code">;
  leistungen!: EntityTable<Leistung, "id">;
  dokumente!: EntityTable<Dokument, "id">;
  dateien!: EntityTable<Datei, "id">;
  belege!: EntityTable<Beleg, "id">;
  buchungen!: EntityTable<Buchung, "id">;
  bankkonten!: EntityTable<Bankkonto, "id">;
  bankumsaetze!: EntityTable<Bankumsatz, "id">;
  anfragen!: EntityTable<Anfrage, "id">;
  angebote!: EntityTable<Angebot, "id">;
  rechnungen!: EntityTable<Rechnung, "id">;
  mahnungen!: EntityTable<Mahnung, "id">;
  protokoll!: EntityTable<Protokoll, "id">;

  constructor() {
    super("hausverwailter");
    this.version(1).stores({
      einstellungen: "id",
      objekte: "id, kurzname, art, aktiv",
      einheiten: "id, objektId",
      personen: "id, objektId, einheitId, rolle, name",
      kostenarten: "code, umlagefaehig",
      leistungen: "id, code, gilt, kategorie",
      dokumente: "id, hash, status, typ, hochgeladenAm, belegId, anfrageId",
      dateien: "id",
      belege: "id, dokumentId, objektId, rechnungsnummer, rechnungsdatum, kostenartCode, bankumsatzId",
      buchungen: "id, datum, belegId, bankumsatzId, rechnungId, objektId, quelle, exportiertAm",
      bankkonten: "id, objektId, iban",
      bankumsaetze: "id, bankkontoId, buchungstag, hash, zuordnung.art, zuordnung.personId, zuordnung.belegId",
      anfragen: "id, dokumentId, eingangAm, angebotId",
      angebote: "id, nummer, datum, anfrageId, status",
      rechnungen: "id, nummer, datum, objektId, status, art, angebotId",
      mahnungen: "id, nummer, personId, rechnungId, objektId, status",
      protokoll: "id, zeit, akteur, bezug",
    });
  }
}

export const db = new HausverwailterDB();

export const TABELLEN = [
  "einstellungen", "objekte", "einheiten", "personen", "kostenarten", "leistungen", "dokumente",
  "dateien", "belege", "buchungen", "bankkonten", "bankumsaetze", "anfragen", "angebote",
  "rechnungen", "mahnungen", "protokoll",
] as const;

export function neueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function sha256(daten: ArrayBuffer | Blob): Promise<string> {
  const buf = daten instanceof Blob ? await daten.arrayBuffer() : daten;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
