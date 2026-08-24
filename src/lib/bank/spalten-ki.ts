/**
 * Spaltenerkennung durch die KI für CSV-Formate, die kein Profil kennt. Hier liegen nur die
 * Anweisung (Prompt) und die Umwandlung der Antwort in ein Spaltenprofil; der Aufruf selbst
 * passiert serverseitig in app/api/bank/spalten/route.ts. Die KI liest nur Spaltennamen und
 * Beispielzeilen, sie rechnet nichts.
 */
import type { KiSpalten } from "../belege/schema-ki";
import type { GemerktesProfil, Spaltenprofil } from "./typen";

export const SYSTEM_SPALTEN = `Du bist die Buchhaltung einer deutschen Hausverwaltung und kennst die CSV-Exporte aller deutschen Banken (Sparkasse, Volksbank, Deutsche Bank, Postbank, Commerzbank, comdirect, ING, DKB, N26, Qonto, Finom u. a.).

Du bekommst die ersten Zeilen eines Kontoauszugs als CSV. Bestimme:
1. Das Trennzeichen (";", ",", Tab).
2. Den 0-basierten Index der Zeile mit den Spaltennamen (Vorspannzeilen wie "Umsatzanzeige", "IBAN;DE…", "Kontostand vom …" zählen mit).
3. Welche Spalte welches Feld liefert. Spaltennamen exakt so übernehmen, wie sie in der Kopfzeile stehen (Groß-/Kleinschreibung, Sonderzeichen). Leer lassen, wenn es keine passende Spalte gibt.
   - betrag: die signierte Betragsspalte (Eingang positiv, Ausgang negativ). Sind Soll und Haben getrennte Spalten, betrag leer lassen und betragSoll/betragHaben füllen.
   - name: die Gegenpartei (Auftraggeber bei Eingang, Empfänger bei Ausgang). Nicht die Spalte mit dem eigenen Konto.
   - iban: die IBAN der Gegenpartei, nicht die des eigenen Kontos.
   - verwendungszweck: eine oder mehrere Spalten in Leserichtung.
4. Datumsformat (DD.MM.YYYY, DD.MM.YY, YYYY-MM-DD, D.M.YYYY, DD-MM-YYYY) und Dezimaltrennzeichen (Komma bei deutschen Banken, Punkt bei Neobanken).
5. Welche Bank das Format vermutlich ist (leer, wenn unklar).

Nichts erfinden: Wenn eine Spalte fehlt, bleibt das Feld leer.`;

export function auftragSpalten(zeilen: string[], dateiname: string): string {
  return `Dateiname: ${dateiname || "unbekannt"}\n\nErste Zeilen der Datei (jede Zeile mit ihrem Index):\n${zeilen.map((z, i) => `${i}: ${z}`).join("\n")}`;
}

function trennzeichenNormalisiert(t: string): string {
  const s = (t ?? "").trim().toLowerCase();
  if (s === "tab" || s === "\\t" || s === "tabulator") return "\t";
  if (s === "semikolon" || s === "semicolon") return ";";
  if (s === "komma" || s === "comma") return ",";
  if (s.length === 1) return s;
  return ";";
}

/** KI-Antwort → Spaltenprofil, das formate.ts direkt lesen kann. */
export function profilAusKiSpalten(ki: KiSpalten): Spaltenprofil {
  const s = ki.spalten;
  return {
    trennzeichen: trennzeichenNormalisiert(ki.trennzeichen),
    kopfzeile: Math.max(0, Math.floor(ki.kopfzeile)),
    spalten: {
      buchungstag: s.buchungstag ?? "",
      valuta: s.valuta ?? "",
      betrag: s.betrag ?? "",
      betragSoll: s.betragSoll ?? "",
      betragHaben: s.betragHaben ?? "",
      waehrung: s.waehrung ?? "",
      name: s.name ?? "",
      iban: s.iban ?? "",
      bic: s.bic ?? "",
      verwendungszweck: (s.verwendungszweck ?? []).filter(Boolean),
      buchungstext: s.buchungstext ?? "",
      endToEndId: s.endToEndId ?? "",
      mandatsreferenz: s.mandatsreferenz ?? "",
    },
    datumsformat: ki.datumsformat ?? "",
    dezimaltrennzeichen: ki.dezimaltrennzeichen === "." ? "." : ",",
    bankVermutung: ki.bankVermutung ?? "",
  };
}

export function gemerktesKiProfil(profil: Spaltenprofil): GemerktesProfil {
  const bank = profil.bankVermutung ? ` (${profil.bankVermutung})` : "";
  return { id: "ki", name: `CSV, Spalten von der KI erkannt${bank}`, profil };
}

/** Antwort der Route /api/bank/spalten */
export interface SpaltenAntwort {
  profil: Spaltenprofil;
  modell: string;
}
