"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { Einstellungen } from "@/lib/domain/schema";
import type { Buchungsdaten } from "./exporte";

/** Alle Tabellen, die Journal, Zahlungsvorschlag und offene Posten brauchen; lebt mit der Datenbank mit. */
export function useBuchungsdaten(): Buchungsdaten | undefined {
  return useLiveQuery(async () => {
    const [einstellungen, buchungen, belege, dokumente, rechnungen, bankumsaetze, bankkonten, objekte, kostenarten, personen] = await Promise.all([
      db.einstellungen.get("einstellungen"),
      db.buchungen.toArray(),
      db.belege.toArray(),
      db.dokumente.toArray(),
      db.rechnungen.toArray(),
      db.bankumsaetze.toArray(),
      db.bankkonten.toArray(),
      db.objekte.toArray(),
      db.kostenarten.toArray(),
      db.personen.toArray(),
    ]);
    return {
      einstellungen: Einstellungen.parse(einstellungen ?? {}),
      buchungen,
      belege,
      dokumente,
      rechnungen,
      bankumsaetze,
      bankkonten,
      objekte,
      kostenarten,
      personen,
    };
  }, []);
}
