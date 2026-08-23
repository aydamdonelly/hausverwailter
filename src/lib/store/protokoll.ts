import { db, neueId } from "./db";
import type { Protokoll } from "../domain/schema";

/**
 * Jeder fachliche Schritt landet im Protokoll: wer (Nutzer, KI, Regel, System) hat was
 * womit gemacht. Das ist die GoBD-Denkweise (nachvollziehbar, unveränderbar in der Sache)
 * und zugleich die Antwort auf "warum steht da 1.234,56?".
 */
export async function protokolliere(
  akteur: Protokoll["akteur"],
  aktion: string,
  bezug = "",
  details: string | object = "",
): Promise<void> {
  await db.protokoll.add({
    id: neueId(),
    zeit: new Date().toISOString(),
    akteur,
    aktion,
    bezug,
    details: typeof details === "string" ? details : JSON.stringify(details),
  });
}
