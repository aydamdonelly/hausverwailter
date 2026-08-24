/**
 * Reine Hilfsfunktionen der Stammdatenpflege: ohne React, ohne Datenbank, damit sie testbar
 * sind. Validierung mit deutschen Meldungen, Unterschiede zweier Datensätze fürs Protokoll
 * (GoBD: wer hat was von welchem auf welchen Wert geändert), Formatierung der Speicherbelegung.
 */
import type { Einheit, Kostenart, Leistung, Objekt, Person, Soll } from "@/lib/domain/schema";
import { ibanGueltig } from "@/lib/iban";
import { ibanNormalisiert } from "@/lib/format";
import { summe } from "@/lib/geld";

export type Feldfehler = Record<string, string>;

function istObjekt(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function kuerze(wert: unknown, maxLaenge: number): unknown {
  if (typeof wert === "string" && wert.length > maxLaenge) return `${wert.slice(0, maxLaenge)}… (${wert.length} Zeichen)`;
  return wert;
}

/**
 * Flache Liste aller Felder, die sich zwischen zwei Datensätzen unterscheiden, mit Punktpfad
 * ("adresse.plz"), altem und neuem Wert. Lange Texte (z. B. ein Logo als data-URL) werden gekürzt.
 */
export function unterschiede(alt: unknown, neu: unknown, praefix = "", maxLaenge = 120): Record<string, { alt: unknown; neu: unknown }> {
  const aus: Record<string, { alt: unknown; neu: unknown }> = {};
  if (istObjekt(alt) && istObjekt(neu)) {
    const schluessel = new Set([...Object.keys(alt), ...Object.keys(neu)]);
    for (const k of schluessel) Object.assign(aus, unterschiede(alt[k], neu[k], praefix ? `${praefix}.${k}` : k, maxLaenge));
    return aus;
  }
  if (JSON.stringify(alt ?? null) !== JSON.stringify(neu ?? null)) {
    aus[praefix || "wert"] = { alt: kuerze(alt ?? null, maxLaenge), neu: kuerze(neu ?? null, maxLaenge) };
  }
  return aus;
}

/** Bytes lesbar in deutscher Schreibweise: 12,4 MB. */
export function speicherGroesse(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "";
  const einheiten = ["Bytes", "KB", "MB", "GB", "TB"];
  let wert = bytes;
  let i = 0;
  while (wert >= 1024 && i < einheiten.length - 1) {
    wert /= 1024;
    i++;
  }
  const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: i === 0 ? 0 : 1 }).format(wert);
  return `${zahl} ${einheiten[i]}`;
}

/** Lokales Datum (nicht UTC) als YYYY-MM-DD, damit Dateinamen zum Kalender des Nutzers passen. */
export function lokalesDatum(zeitstempelIso: string): string {
  const d = new Date(zeitstempelIso);
  if (Number.isNaN(d.getTime())) return zeitstempelIso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function exportDateiname(zeitstempelIso: string): string {
  return `hausverwailter-arbeitsbereich-${lokalesDatum(zeitstempelIso)}.json`;
}

/** Monatliches Soll einer Person: Kaltmiete + Nebenkosten + Hausgeld. */
export function sollGesamt(soll: Soll): number {
  return summe([soll.kalt, soll.nebenkosten, soll.hausgeld]);
}

/** IBAN-Liste: Leerzeichen raus, Großschreibung, leere und doppelte Einträge entfernt. */
export function ibansBereinigen(ibans: string[]): string[] {
  const aus: string[] = [];
  for (const roh of ibans) {
    const n = ibanNormalisiert(roh);
    if (n && !aus.includes(n)) aus.push(n);
  }
  return aus;
}

/** Einträge eines Standardkatalogs, deren Code noch nicht vorhanden ist. */
export function fehlendeNachCode<T extends { code: string }>(vorhandeneCodes: string[], standard: T[]): T[] {
  const da = new Set(vorhandeneCodes.map((c) => c.toUpperCase()));
  return standard.filter((s) => !da.has(s.code.toUpperCase()));
}

/** "3 Belege, 2 Buchungen und 8 Personen" aus einer Zählung; leer, wenn nichts verwendet. */
export function verwendungText(zaehlung: Record<string, number>, namen: Record<string, [string, string]>): string {
  const teile: string[] = [];
  for (const [k, n] of Object.entries(zaehlung)) {
    if (!n || !namen[k]) continue;
    teile.push(`${n} ${n === 1 ? namen[k][0] : namen[k][1]}`);
  }
  if (teile.length <= 1) return teile.join("");
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

const PLZ = /^\d{5}$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function ganzzahlAb(wert: unknown, min: number): boolean {
  return typeof wert === "number" && Number.isInteger(wert) && wert >= min;
}

/** Prüft ein Objekt vor dem Speichern. Liefert je Feld eine deutsche Meldung. */
export function pruefeObjekt(o: Objekt): Feldfehler {
  const f: Feldfehler = {};
  if (!o.kurzname.trim()) f.kurzname = "Ein Kurzname ist nötig, er steht in jeder Tabelle und auf jeder Rechnung.";
  if (o.adresse.plz && !PLZ.test(o.adresse.plz.trim())) f["adresse.plz"] = "Die Postleitzahl hat fünf Ziffern.";
  if (!ganzzahlAb(o.einheitenWohnen, 0)) f.einheitenWohnen = "Ganze Zahl, mindestens 0.";
  if (!ganzzahlAb(o.einheitenGewerbe, 0)) f.einheitenGewerbe = "Ganze Zahl, mindestens 0.";
  if (!ganzzahlAb(o.stellplaetze, 0)) f.stellplaetze = "Ganze Zahl, mindestens 0.";
  if (o.baujahr !== null && (!Number.isInteger(o.baujahr) || o.baujahr < 1500 || o.baujahr > 2100)) f.baujahr = "Ein vierstelliges Jahr, z. B. 1962.";
  if (!o.auftraggeber.name.trim()) f["auftraggeber.name"] = "Der Auftraggeber ist der Rechnungsempfänger: bei einer WEG die Gemeinschaft, sonst der Eigentümer.";
  if (o.auftraggeber.adresse.plz && !PLZ.test(o.auftraggeber.adresse.plz.trim())) f["auftraggeber.adresse.plz"] = "Die Postleitzahl hat fünf Ziffern.";
  if (o.honorarNettoMonat !== null && (!Number.isFinite(o.honorarNettoMonat) || o.honorarNettoMonat < 0)) f.honorarNettoMonat = "Ein Betrag ab 0,00 € oder leer (dann wird aus dem Katalog gerechnet).";
  if (o.verwaltungSeit !== null && !DATUM.test(o.verwaltungSeit)) f.verwaltungSeit = "Ein Datum im Format TT.MM.JJJJ.";
  if (o.bankIban && !ibanGueltig(o.bankIban)) f.bankIban = "Diese IBAN besteht die Prüfziffernkontrolle nicht.";
  return f;
}

export function pruefePerson(p: Person): Feldfehler {
  const f: Feldfehler = {};
  if (!p.name.trim()) f.name = "Ein Name ist nötig.";
  if (!p.objektId) f.objektId = "Jede Person gehört zu einem Objekt.";
  if (p.adresse?.plz && !PLZ.test(p.adresse.plz.trim())) f["adresse.plz"] = "Die Postleitzahl hat fünf Ziffern.";
  p.ibans.forEach((i, n) => {
    if (i && !ibanGueltig(i)) f[`ibans.${n}`] = "Diese IBAN besteht die Prüfziffernkontrolle nicht.";
  });
  for (const feld of ["kalt", "nebenkosten", "hausgeld"] as const) {
    const wert = p.soll[feld];
    if (!Number.isFinite(wert) || wert < 0) f[`soll.${feld}`] = "Ein Betrag ab 0,00 €.";
  }
  if (!Number.isInteger(p.soll.faelligTag) || p.soll.faelligTag < 1 || p.soll.faelligTag > 31) f["soll.faelligTag"] = "Ein Tag zwischen 1 und 31 (§ 556b BGB: bis zum 3. Werktag).";
  if (p.seit !== null && !DATUM.test(p.seit)) f.seit = "Ein Datum im Format TT.MM.JJJJ.";
  if (p.bis !== null && !DATUM.test(p.bis)) f.bis = "Ein Datum im Format TT.MM.JJJJ.";
  if (p.seit && p.bis && p.bis < p.seit) f.bis = "Das Ende liegt vor dem Beginn.";
  return f;
}

export function pruefeEinheit(e: Einheit): Feldfehler {
  const f: Feldfehler = {};
  if (!e.bezeichnung.trim()) f.bezeichnung = "Eine Bezeichnung ist nötig, z. B. „Whg 3“ oder „Laden EG“.";
  if (e.flaecheQm !== null && (!Number.isFinite(e.flaecheQm) || e.flaecheQm < 0)) f.flaecheQm = "Eine Fläche ab 0 m² oder leer.";
  return f;
}

/** Ein Kostenart-Code: Großbuchstaben, Ziffern und Unterstrich, wie die Standardcodes. */
export function kostenartCodeAusText(text: string): string {
  return text
    .trim()
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function pruefeKostenart(k: Kostenart, vorhandeneCodes: string[] = []): Feldfehler {
  const f: Feldfehler = {};
  if (!k.code.trim()) f.code = "Ein Code ist nötig, z. B. HEIZUNG. Er ändert sich später nicht mehr.";
  else if (!/^[A-Z0-9_]+$/.test(k.code)) f.code = "Nur Großbuchstaben, Ziffern und Unterstrich.";
  else if (vorhandeneCodes.includes(k.code)) f.code = "Diesen Code gibt es schon.";
  if (!k.bezeichnung.trim()) f.bezeichnung = "Eine Bezeichnung ist nötig.";
  if (k.kontoSkr03 && !/^\d{4,8}$/.test(k.kontoSkr03)) f.kontoSkr03 = "Kontonummer mit 4 bis 8 Ziffern.";
  if (k.kontoSkr04 && !/^\d{4,8}$/.test(k.kontoSkr04)) f.kontoSkr04 = "Kontonummer mit 4 bis 8 Ziffern.";
  return f;
}

export function pruefeLeistung(l: Leistung, andereCodes: string[] = []): Feldfehler {
  const f: Feldfehler = {};
  if (!l.code.trim()) f.code = "Ein Code ist nötig, z. B. WEG_GRUND.";
  else if (andereCodes.includes(l.code)) f.code = "Diesen Code gibt es schon.";
  if (!l.bezeichnung.trim()) f.bezeichnung = "Eine Bezeichnung ist nötig.";
  if (!Number.isFinite(l.preisNetto) || l.preisNetto < 0) f.preisNetto = "Ein Preis ab 0,00 €.";
  return f;
}

/** Text zur Branche: entscheidet über Katalog und Wortwahl. */
export const BRANCHEN: { wert: "hausverwaltung" | "dienstleister" | "sonstige"; text: string; erklaerung: string }[] = [
  { wert: "hausverwaltung", text: "Hausverwaltung", erklaerung: "Sie verwalten WEGs und Mietobjekte im Auftrag. Honorar je Einheit, Hausgeld und Miete, Betriebskosten nach BetrKV." },
  { wert: "dienstleister", text: "Gebäudedienstleister", erklaerung: "Hausmeister, Reinigung, Winterdienst, Garten. Pauschalen je Objekt und Monat, Rechnungen an Verwaltungen und Eigentümer." },
  { wert: "sonstige", text: "Sonstiges", erklaerung: "Weder noch. Kostenarten und Katalog bleiben frei belegbar." },
];

export const EINHEIT_TEXTE: Record<Leistung["einheit"], string> = {
  einheit_monat: "je Einheit und Monat",
  stellplatz_monat: "je Stellplatz und Monat",
  pauschal_monat: "pauschal je Monat",
  qm_monat: "je m² und Monat",
  stunde: "je Stunde",
  stueck: "je Stück",
  pauschal: "pauschal",
};

export const VERWALTUNGSART_TEXTE: Record<Objekt["art"], string> = {
  WEG: "WEG",
  MIET: "Mietverwaltung",
  GEWERBE: "Gewerbe",
  SONSTIG: "Sonstiges",
};

/** Kurzform für enge Tabellenspalten. */
export const VERWALTUNGSART_KURZ: Record<Objekt["art"], string> = {
  WEG: "WEG",
  MIET: "Miete",
  GEWERBE: "Gewerbe",
  SONSTIG: "Sonstig",
};

export const ROLLE_TEXTE: Record<Person["rolle"], string> = {
  mieter: "Mieter",
  eigentuemer: "Eigentümer",
  sonstige: "Sonstige",
};

export const EINHEIT_ART_TEXTE: Record<Einheit["art"], string> = {
  wohnung: "Wohnung",
  gewerbe: "Gewerbe",
  stellplatz: "Stellplatz",
  sonstige: "Sonstige",
};
