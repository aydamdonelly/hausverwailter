/** Deutsche Formatierung und das Gegenstück: deutsche Eingaben lesen. */

const eurFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const zahlFormat = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function eur(betrag: number | null | undefined): string {
  if (betrag === null || betrag === undefined || Number.isNaN(betrag)) return "";
  return eurFormat.format(betrag);
}

/** Betrag ohne Währungszeichen, z. B. für Tabellen mit EUR-Spaltenkopf. */
export function betrag(wert: number | null | undefined): string {
  if (wert === null || wert === undefined || Number.isNaN(wert)) return "";
  return zahlFormat.format(wert);
}

export function prozent(wert: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(wert)} %`;
}

/** ISO-Datum (YYYY-MM-DD) oder Zeitstempel → 23.08.2026 */
export function datum(iso: string | null | undefined): string {
  if (!iso) return "";
  // Zeitstempel (mit Uhrzeit) werden in die lokale Zeit umgerechnet, reine Daten bleiben wie sie sind.
  if (iso.includes("T")) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function zeit(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** YYYY-MM → "August 2026" */
export function monatName(monat: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monat);
  if (!m) return monat;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** IBAN in Vierergruppen. */
export function iban(wert: string | null | undefined): string {
  if (!wert) return "";
  return wert.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export function ibanNormalisiert(wert: string | null | undefined): string {
  return (wert ?? "").replace(/\s+/g, "").toUpperCase();
}

/** "1.234,56" | "1234,56" | "1234.56" | "-12,00" | "12,00-" → Zahl. Gibt null bei Unlesbarem. */
export function parseDeZahl(text: string | number | null | undefined): number | null {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  if (!text) return null;
  let t = String(text).trim().replace(/\s|€|EUR/gi, "");
  if (!t) return null;
  let negativ = false;
  if (t.endsWith("-")) { negativ = true; t = t.slice(0, -1); }
  if (t.startsWith("-")) { negativ = true; t = t.slice(1); }
  if (t.startsWith("+")) t = t.slice(1);
  const hatKomma = t.includes(",");
  const hatPunkt = t.includes(".");
  if (hatKomma && hatPunkt) {
    // Deutsch (1.234,56) wenn das Komma nach dem Punkt kommt, sonst englisch (1,234.56)
    t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (hatKomma) {
    t = t.replace(",", ".");
  } else if (hatPunkt) {
    // "1.234" ist deutsch tausend, "12.5" englisch: Punkt gefolgt von genau 3 Ziffern am Ende = Tausender
    if (/\.\d{3}$/.test(t) && !/\.\d{1,2}$/.test(t)) t = t.replace(/\./g, "");
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return negativ ? -n : n;
}

/** "23.08.2026" | "23.08.26" | "2026-08-23" | "23/08/2026" → "2026-08-23" */
export function parseDeDatum(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = String(text).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/.exec(t);
  if (m) {
    const jahr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${jahr}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

/** Lokales Datum (nicht UTC): abends in Deutschland ist es hier noch heute. */
export function heuteIso(): string {
  return lokalesDatum(new Date());
}

export function lokalesDatum(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function jetztIso(): string {
  return new Date().toISOString();
}

/** Addiert Tage zu einem ISO-Datum. */
export function plusTage(isoDatum: string, tage: number): string {
  const d = new Date(`${isoDatum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/** Erster und letzter Tag eines Monats (YYYY-MM). */
export function monatsGrenzen(monat: string): { von: string; bis: string } {
  const [j, m] = monat.split("-").map(Number);
  const letzter = new Date(Date.UTC(j, m, 0)).getUTCDate();
  return { von: `${monat}-01`, bis: `${monat}-${String(letzter).padStart(2, "0")}` };
}

export function monatVon(isoDatum: string): string {
  return isoDatum.slice(0, 7);
}

/** Kürzt lange Texte für Tabellen. */
export function kurz(text: string, max = 60): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
