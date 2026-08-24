import type { Sollstellung, Zuordnung, ZuordnungArt } from "@/lib/domain/schema";

export const ART_TEXT: Record<ZuordnungArt, string> = {
  mieteingang: "Mieteingang",
  hausgeld: "Hausgeld",
  belegzahlung: "Belegzahlung",
  honorar: "Eigene Rechnung",
  gebuehr: "Bankentgelt",
  auszahlung_eigentuemer: "Auszahlung Eigentümer",
  kaution: "Kaution",
  sonstiges: "Sonstiges",
  offen: "offen",
};

export const ARTEN_REIHENFOLGE: ZuordnungArt[] = ["offen", "mieteingang", "hausgeld", "belegzahlung", "honorar", "gebuehr", "auszahlung_eigentuemer", "kaution", "sonstiges"];

export const QUELLE_TEXT: Record<Zuordnung["quelle"], string> = { regel: "Regel", ki: "KI", manuell: "manuell" };

export const SICHERHEIT_TEXT: Record<Zuordnung["sicherheit"], string> = { sicher: "sicher", wahrscheinlich: "wahrscheinlich", unsicher: "unsicher" };

export const SOLL_STATUS: Record<Sollstellung["status"], { text: string; ton: "rot" | "gruen" | "tinte" | "ocker" }> = {
  bezahlt: { text: "Bezahlt", ton: "gruen" },
  teilweise: { text: "Teilzahlung", ton: "ocker" },
  offen: { text: "Offen", ton: "rot" },
  ueberzahlt: { text: "Überzahlt", ton: "ocker" },
};

export const MAHN_STATUS: Record<"vorschlag" | "erstellt" | "versendet" | "erledigt", { text: string; ton: "rot" | "gruen" | "tinte" | "ocker" }> = {
  vorschlag: { text: "Vorschlag", ton: "tinte" },
  erstellt: { text: "Erstellt", ton: "tinte" },
  versendet: { text: "Versendet", ton: "gruen" },
  erledigt: { text: "Erledigt", ton: "gruen" },
};

export type Meldung = { ton: "ok" | "warnung" | "fehler" | "hinweis"; text: string };
