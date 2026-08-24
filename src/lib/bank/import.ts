/**
 * Aus gelesenen Umsätzen (UmsatzRoh) werden gespeicherte Bankumsätze. Der Hash aus Konto,
 * Buchungstag, Betrag, Verwendungszweck und Name erkennt Doppelimporte (dieselbe Datei
 * zweimal, überlappende Zeiträume). Reiner Code ohne Datenbank; das Schreiben macht
 * components/bank/aktionen.ts.
 */
import { Bankumsatz, type Bankkonto } from "../domain/schema";
import { rundeGeld } from "../geld";
import { ibanNormalisiert } from "../format";
import type { UmsatzRoh } from "./typen";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stabiler Hash eines Umsatzes; Leerraum und Groß-/Kleinschreibung im Zweck spielen keine Rolle. */
export async function umsatzHash(kontoId: string, u: Pick<UmsatzRoh, "buchungstag" | "betrag" | "verwendungszweck" | "name">): Promise<string> {
  const zweck = u.verwendungszweck.replace(/\s+/g, " ").trim().toLowerCase();
  const name = u.name.replace(/\s+/g, " ").trim().toLowerCase();
  return sha256Hex(`${kontoId}|${u.buchungstag}|${rundeGeld(u.betrag).toFixed(2)}|${zweck}|${name}`);
}

export interface ImportVorbereitung {
  neue: Bankumsatz[];
  /** Zahl der Umsätze, die schon in der Datenbank waren */
  doppelt: number;
  /** Zahl der Umsätze, die in der Datei selbst doppelt vorkamen */
  doppeltInDatei: number;
}

/**
 * Wandelt Rohumsätze in Bankumsätze und lässt weg, was es schon gibt (`vorhandeneHashes`)
 * oder in der Datei doppelt vorkommt. `neueId` kommt vom Aufrufer, damit der Code testbar bleibt.
 */
export async function bereiteImport(
  umsaetze: UmsatzRoh[],
  kontoId: string,
  vorhandeneHashes: Set<string>,
  neueId: () => string,
  jetzt: string,
): Promise<ImportVorbereitung> {
  const neue: Bankumsatz[] = [];
  const gesehen = new Set<string>();
  let doppelt = 0;
  let doppeltInDatei = 0;
  for (const u of umsaetze) {
    const hash = await umsatzHash(kontoId, u);
    if (vorhandeneHashes.has(hash)) {
      doppelt++;
      continue;
    }
    if (gesehen.has(hash)) {
      doppeltInDatei++;
      continue;
    }
    gesehen.add(hash);
    neue.push(
      Bankumsatz.parse({
        id: neueId(),
        bankkontoId: kontoId,
        buchungstag: u.buchungstag,
        valuta: u.valuta,
        betrag: rundeGeld(u.betrag),
        waehrung: u.waehrung || "EUR",
        name: u.name,
        iban: ibanNormalisiert(u.iban),
        bic: u.bic,
        verwendungszweck: u.verwendungszweck,
        buchungstext: u.buchungstext,
        endToEndId: u.endToEndId,
        mandatsreferenz: u.mandatsreferenz,
        hash,
        importiertAm: jetzt,
        zuordnung: {},
      }),
    );
  }
  return { neue, doppelt, doppeltInDatei };
}

/**
 * Welches Bankkonto gehört zur Datei? Erst die IBAN aus der Datei, dann das Konto des
 * Objekts (Objekt.bankIban), sonst null (der Nutzer wählt).
 */
export function kontoFuerIban(konten: Bankkonto[], kontoIban: string, objekte: { id: string; bankIban: string }[] = []): Bankkonto | null {
  const iban = ibanNormalisiert(kontoIban);
  if (!iban) return null;
  const direkt = konten.find((k) => ibanNormalisiert(k.iban) === iban);
  if (direkt) return direkt;
  const objekt = objekte.find((o) => ibanNormalisiert(o.bankIban) === iban);
  if (objekt) return konten.find((k) => k.objektId === objekt.id) ?? null;
  return null;
}
