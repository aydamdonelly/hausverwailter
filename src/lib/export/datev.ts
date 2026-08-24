/**
 * DATEV-Buchungsstapel im DATEV-Format (EXTF, Header-Version 700, Formatkategorie 21,
 * Formatversion 13): Zeile 1 Header mit 31 Feldern, Zeile 2 die 125 offiziellen
 * Spaltenüberschriften, danach eine Buchung je Zeile. Semikolon, Textfelder in
 * Anführungszeichen, CRLF, Windows-1252. Quelle: Recherche-Notizen (DATEV Dok. 1036228,
 * ledermann/datev-Beispiele, verifiziert).
 *
 * Buchungslogik (Personenkonto oder Bank steht im Feld "Konto", das Sachkonto mit dem
 * BU-Schlüssel im Feld "Gegenkonto", so wie DATEV es in den Beispielen zeigt; das
 * Soll/Haben-Kennzeichen bezieht sich auf das Feld "Konto"):
 *   Eingangsrechnung   Kreditor (H)  an Aufwandskonto (BU 9/8)    Brutto
 *   Eingangsgutschrift Kreditor (S)  an Aufwandskonto             Brutto
 *   Ausgangsrechnung   Debitor  (S)  an Erlöskonto (Automatik)    Brutto
 *   Bankumsatz         Bank (S/H)    an Kreditor/Debitor/Aufwand  Betrag
 *
 * BU-Schlüssel: DATEV lehnt einen Steuerschlüssel auf Automatikkonten ab ("Steuerschlüssel bei
 * Automatikkonto nicht zulässig"). Entscheidung hier: Die üblichen Automatikkonten (8400/4400,
 * 8300/4300, 3400/5400, 3300/5300 ...) bekommen keinen BU-Schlüssel, alle anderen Konten
 * bekommen bei Umsatzsteuer den passenden Schlüssel: Vorsteuer 9 (19 %) / 8 (7 %), Umsatzsteuer
 * 3 (19 %) / 2 (7 %), Reverse Charge nach § 13b UStG 94. Die Aufwandskonten der Kostenarten
 * (4260, 4250, 4240 ...) sind keine Automatikkonten, deshalb tragen sie den Schlüssel; gebucht
 * wird immer der Bruttobetrag, DATEV rechnet die Steuer heraus. Diese Liste ist ein Auszug und
 * muss mit dem Steuerberater abgeglichen werden; unbekannte Konten gelten als Nicht-Automatik.
 */
import type { Bankkonto, Bankumsatz, Beleg, Buchung, Einstellungen, Kostenart, Objekt, Person, Rechnung } from "../domain/schema";
import { cp1252Kodieren } from "./cp1252";
import { personenkonten } from "./personenkonten";

export const DATEV_FORMAT = { kennzeichen: "EXTF", version: 700, kategorie: 21, name: "Buchungsstapel", formatversion: 13 } as const;

const BELEGINFO = Array.from({ length: 8 }, (_, i) => [`Beleginfo – Art ${i + 1}`, `Beleginfo – Inhalt ${i + 1}`]).flat();
const ZUSATZINFO = Array.from({ length: 20 }, (_, i) => [`Zusatzinformation – Art ${i + 1}`, `Zusatzinformation – Inhalt ${i + 1}`]).flat();

/** Die 125 Spaltenüberschriften in der von DATEV vorgegebenen Reihenfolge. */
export const DATEV_SPALTEN: readonly string[] = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basisumsatz",
  "WKZ Basisumsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
  ...BELEGINFO,
  "KOST1 – Kostenstelle",
  "KOST2 – Kostenstelle",
  "Kost Menge",
  "EU-Land u. USt-IdNr.",
  "EU-Steuersatz",
  "Abw. Versteuerungsart",
  "Sachverhalt L+L",
  "Funktionsergänzung L+L",
  "BU 49 Hauptfunktionstyp",
  "BU 49 Hauptfunktionsnummer",
  "BU 49 Funktionsergänzung",
  ...ZUSATZINFO,
  "Stück",
  "Gewicht",
  "Zahlweise",
  "Forderungsart",
  "Veranlagungsjahr",
  "Zugeordnete Fälligkeit",
  "Skontotyp",
  "Auftragsnummer",
  "Buchungstyp",
  "USt-Schlüssel (Anzahlungen)",
  "EU-Mitgliedstaat (Anzahlungen)",
  "Sachverhalt L+L (Anzahlungen)",
  "EU-Steuersatz (Anzahlungen)",
  "Erlöskonto (Anzahlungen)",
  "Herkunft-Kz",
  "Leerfeld",
  "KOST-Datum",
  "SEPA-Mandatsreferenz",
  "Skontosperre",
  "Gesellschaftername",
  "Beteiligtennummer",
  "Identifikationsnummer",
  "Zeichnernummer",
  "Postensperre bis",
  "Bezeichnung",
  "Kennzeichen",
  "Festschreibung",
  "Leistungsdatum",
  "Datum Zuord.",
  "Fälligkeit",
  "Generalumkehr",
  "Steuersatz",
  "Land",
  "Abrechnungsreferent",
  "BVV-Position",
  "EU-Mitgliedstaat u. UStID (Ursprung)",
  "EU-Steuersatz (Ursprung)",
  "Abw. Skontokonto",
];

/** Spaltenindex (0-basiert) der Felder, die wir befüllen. */
const SP = {
  umsatz: 0,
  sollHaben: 1,
  wkz: 2,
  konto: 6,
  gegenkonto: 7,
  bu: 8,
  belegdatum: 9,
  belegfeld1: 10,
  belegfeld2: 11,
  buchungstext: 13,
  kost1: 36,
  festschreibung: 113,
  leistungsdatum: 114,
  faelligkeit: 116,
} as const;

/** Automatikkonten (Auszug): kennen ihren Steuersatz selbst, deshalb ohne BU-Schlüssel. */
export const AUTOMATIKKONTEN: Record<Einstellungen["kontenrahmen"], ReadonlySet<string>> = {
  SKR03: new Set(["8400", "8300", "8100", "8150", "8337", "2752", "3106", "3120", "3160", "3300", "3400"]),
  SKR04: new Set(["4400", "4300", "4100", "4150", "4337", "4862", "5906", "5920", "5960", "5300", "5400"]),
};

export interface DatevKontext {
  einstellungen: Einstellungen;
  belege: Beleg[];
  rechnungen: Rechnung[];
  bankumsaetze: Bankumsatz[];
  bankkonten: Bankkonto[];
  objekte: Objekt[];
  kostenarten: Kostenart[];
  personen: Person[];
}

export interface DatevOptionen {
  /** Erzeugungszeitpunkt als ISO-Zeit ohne Zone (2026-08-23T14:30:00), wird nicht umgerechnet. */
  erzeugtAm: string;
  bezeichnung?: string;
  exportiertVon?: string;
  /** 1 = Buchungen werden beim Import festgeschrieben (GoBD). Standard 0: Vorschlagsstapel. */
  festschreibung?: boolean;
  datumVon?: string;
  datumBis?: string;
}

export interface DatevZeile {
  buchungId: string;
  umsatz: number;
  sollHaben: "S" | "H";
  konto: string;
  gegenkonto: string;
  buSchluessel: string;
  belegdatum: string;
  belegfeld1: string;
  belegfeld2: string;
  buchungstext: string;
  kost1: string;
  leistungsdatum: string;
  faelligkeit: string;
}

export interface DatevErgebnis {
  text: string;
  bytes: Uint8Array;
  dateiname: string;
  header: string[];
  zeilen: DatevZeile[];
  kreditoren: Record<string, string>;
  debitoren: Record<string, string>;
  neueKreditoren: string[];
  neueDebitoren: string[];
  warnungen: string[];
  datumVon: string;
  datumBis: string;
}

// ---------- Feldformate ----------

export function datevBetrag(n: number): string {
  return Math.abs(n).toFixed(2).replace(".", ",");
}

function tt(iso: string): string {
  return iso.slice(8, 10);
}
function mm(iso: string): string {
  return iso.slice(5, 7);
}
function jjjj(iso: string): string {
  return iso.slice(0, 4);
}

/** Belegdatum: TTMM ohne Jahr (das Jahr kommt aus Datum vom/bis im Header). */
export function datevTTMM(iso: string): string {
  return `${tt(iso)}${mm(iso)}`;
}
export function datevTTMMJJ(iso: string): string {
  return `${tt(iso)}${mm(iso)}${jjjj(iso).slice(2)}`;
}
export function datevTTMMJJJJ(iso: string): string {
  return `${tt(iso)}${mm(iso)}${jjjj(iso)}`;
}
export function datevJJJJMMTT(iso: string): string {
  return `${jjjj(iso)}${mm(iso)}${tt(iso)}`;
}

/** Erzeugt am: JJJJMMTThhmmssfff aus einer ISO-Zeit, Ziffern werden übernommen, nicht umgerechnet. */
export function datevZeitstempel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/.exec(iso);
  if (!m) throw new Error("erzeugtAm muss eine ISO-Zeit sein (JJJJ-MM-TTThh:mm:ss).");
  return `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}${(m[7] ?? "").padEnd(3, "0")}`;
}

/** Textfeld: gekürzt, Anführungszeichen verdoppelt, in Anführungszeichen. */
export function datevText(text: string, max: number): string {
  const t = text.replace(/[\r\n\t]+/g, " ").trim().slice(0, max).trim();
  return `"${t.replace(/"/g, '""')}"`;
}

/** Belegfeld 1: max. 36 Zeichen, erlaubt sind Ziffern, Buchstaben und $ & % * + - /. */
export function datevBelegfeld1(text: string): string {
  return text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9$&%*+\-/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 36)
    .replace(/^-|-$/g, "");
}

export function istAutomatikkonto(konto: string, kontenrahmen: Einstellungen["kontenrahmen"]): boolean {
  return AUTOMATIKKONTEN[kontenrahmen].has(konto);
}

export function istPersonenkonto(konto: string, sachkontenlaenge: number): boolean {
  return /^\d+$/.test(konto) && konto.length === sachkontenlaenge + 1;
}

export function vorsteuerSchluessel(ustSatz: number): string {
  return { 19: "9", 7: "8", 16: "7" }[ustSatz] ?? "";
}
export function umsatzsteuerSchluessel(ustSatz: number): string {
  return { 19: "3", 7: "2", 16: "5" }[ustSatz] ?? "";
}

/**
 * Sachkonto der Bank: das Konto der Verwaltung ist Einstellungen.datev.bankkonto (1200/1800),
 * jedes weitere Bankkonto (Objektkonten) bekommt der Reihe nach +10 (1210, 1220 ...), so wie
 * DATEV weitere Bankkonten im SKR vorsieht. Mit dem Steuerberater abstimmen.
 */
export function bankSachkonto(bankkontoId: string | null, bankkonten: Bankkonto[], datev: Einstellungen["datev"]): string {
  const basis = Number(datev.bankkonto) || 1200;
  const konto = bankkontoId ? bankkonten.find((k) => k.id === bankkontoId) : undefined;
  if (!konto || konto.objektId === null) return String(basis);
  const weitere = bankkonten.filter((k) => k.objektId !== null).sort((a, b) => a.id.localeCompare(b.id));
  const i = weitere.findIndex((k) => k.id === konto.id);
  return String(basis + 10 * (i + 1));
}

/** Wirtschaftsjahresbeginn für ein Datum: aus den Einstellungen (Monat/Tag) oder 1. Januar. */
export function wirtschaftsjahrBeginn(datumIso: string, einstellung: string | null): string {
  const jahr = Number(jjjj(datumIso));
  const tagMonat = einstellung ? einstellung.slice(5, 10) : "01-01";
  const kandidat = `${jahr}-${tagMonat}`;
  return kandidat <= datumIso ? kandidat : `${jahr - 1}-${tagMonat}`;
}

// ---------- Buchungssätze ----------

interface Nachschlag {
  kontext: DatevKontext;
  belege: Map<string, Beleg>;
  rechnungen: Map<string, Rechnung>;
  umsaetze: Map<string, Bankumsatz>;
  objekte: Map<string, Objekt>;
  kostenarten: Map<string, Kostenart>;
  personen: Map<string, Person>;
  konten: ReturnType<typeof personenkonten>;
  warnungen: string[];
}

function kontoAusKostenart(code: string | null, n: Nachschlag): string {
  if (!code) return "";
  const k = n.kostenarten.get(code);
  if (!k) return "";
  return n.kontext.einstellungen.kontenrahmen === "SKR04" ? k.kontoSkr04 : k.kontoSkr03;
}

function sonstigesAufwandskonto(n: Nachschlag): string {
  return kontoAusKostenart("SONSTIGES_NICHT_UMLAGEFAEHIG", n) || (n.kontext.einstellungen.kontenrahmen === "SKR04" ? "6300" : "4900");
}

function geldtransit(n: Nachschlag): string {
  return n.kontext.einstellungen.kontenrahmen === "SKR04" ? "1460" : "1360";
}

function bezeichne(b: Buchung): string {
  return `${b.belegnummer || b.buchungstext || b.id} (${b.datum})`;
}

function zeileFuerBuchung(b: Buchung, n: Nachschlag): DatevZeile | null {
  const e = n.kontext.einstellungen;
  const objekt = b.objektId ? n.objekte.get(b.objektId) : undefined;
  if (Math.abs(b.brutto) < 0.005) {
    n.warnungen.push(`Buchung ${bezeichne(b)} hat den Betrag 0 und wird nicht exportiert.`);
    return null;
  }
  const zeile: DatevZeile = {
    buchungId: b.id,
    umsatz: Math.abs(b.brutto),
    sollHaben: "S",
    konto: "",
    gegenkonto: "",
    buSchluessel: "",
    belegdatum: datevTTMM(b.datum),
    belegfeld1: datevBelegfeld1(b.belegnummer),
    belegfeld2: "",
    buchungstext: b.buchungstext,
    kost1: objekt?.kurzname ?? "",
    leistungsdatum: "",
    faelligkeit: "",
  };
  const steuerschluessel = (sachkonto: string, vorsteuer: boolean): string => {
    if (Math.abs(b.ust) < 0.005 || !sachkonto) return "";
    if (istAutomatikkonto(sachkonto, e.kontenrahmen) || istPersonenkonto(sachkonto, e.datev.sachkontenlaenge)) return "";
    const s = vorsteuer ? vorsteuerSchluessel(b.ustSatz) : umsatzsteuerSchluessel(b.ustSatz);
    if (!s) n.warnungen.push(`Buchung ${bezeichne(b)}: für ${b.ustSatz} % gibt es keinen BU-Schlüssel, bitte im Stapel nachtragen.`);
    return s;
  };

  if (b.quelle === "beleg") {
    const beleg = b.belegId ? n.belege.get(b.belegId) : undefined;
    if (!beleg) {
      n.warnungen.push(`Buchung ${bezeichne(b)}: der Beleg fehlt, Kreditor "Unbekannt" verwendet.`);
    }
    const name = beleg?.lieferant.name || "Unbekannt";
    let aufwand = b.konto || kontoAusKostenart(b.kostenartCode, n);
    if (!aufwand) {
      aufwand = sonstigesAufwandskonto(n);
      n.warnungen.push(`Buchung ${bezeichne(b)}: Kostenart ohne Konto im ${e.kontenrahmen}, ${aufwand} (Sonstiges) verwendet.`);
    }
    zeile.konto = n.konten.kreditor(name);
    zeile.gegenkonto = aufwand;
    zeile.sollHaben = b.brutto >= 0 ? "H" : "S";
    if (beleg?.reverseCharge) {
      zeile.buSchluessel = istAutomatikkonto(aufwand, e.kontenrahmen) ? "" : "94";
      n.warnungen.push(`Buchung ${bezeichne(b)}: Reverse Charge (§ 13b UStG) mit BU 94, Sachverhalt L+L bitte mit dem Steuerberater klären.`);
    } else {
      zeile.buSchluessel = steuerschluessel(aufwand, true);
    }
    zeile.belegfeld1 = datevBelegfeld1(beleg?.rechnungsnummer || b.belegnummer);
    zeile.belegfeld2 = beleg?.faelligAm ? datevTTMMJJ(beleg.faelligAm) : "";
    zeile.faelligkeit = beleg?.faelligAm ? datevTTMMJJJJ(beleg.faelligAm) : "";
    const leistung = beleg?.leistungBis ?? beleg?.leistungVon;
    zeile.leistungsdatum = leistung ? datevTTMMJJJJ(leistung) : "";
    return zeile;
  }

  if (b.quelle === "rechnung") {
    const rechnung = b.rechnungId ? n.rechnungen.get(b.rechnungId) : undefined;
    if (!rechnung) n.warnungen.push(`Buchung ${bezeichne(b)}: die Rechnung fehlt, Debitor "Unbekannt" verwendet.`);
    let erloes = b.gegenkonto || b.konto;
    if (!erloes || erloes === e.datev.bankkonto || istPersonenkonto(erloes, e.datev.sachkontenlaenge)) erloes = e.datev.erloeskonto;
    zeile.konto = n.konten.debitor(rechnung?.empfaenger.kundennummer ?? "", rechnung?.empfaenger.name ?? "Unbekannt");
    zeile.gegenkonto = erloes;
    zeile.sollHaben = b.brutto < 0 || rechnung?.art === "gutschrift" ? "H" : "S";
    zeile.buSchluessel = steuerschluessel(erloes, false);
    zeile.belegfeld1 = datevBelegfeld1(rechnung?.nummer || b.belegnummer);
    zeile.belegfeld2 = rechnung?.faelligAm ? datevTTMMJJ(rechnung.faelligAm) : "";
    zeile.faelligkeit = rechnung?.faelligAm ? datevTTMMJJJJ(rechnung.faelligAm) : "";
    const leistung = rechnung?.leistungBis ?? rechnung?.leistungVon;
    zeile.leistungsdatum = leistung ? datevTTMMJJJJ(leistung) : "";
    return zeile;
  }

  if (b.quelle === "bank") {
    const umsatz = b.bankumsatzId ? n.umsaetze.get(b.bankumsatzId) : undefined;
    if (!umsatz) n.warnungen.push(`Buchung ${bezeichne(b)}: der Bankumsatz fehlt, Bankkonto ${e.datev.bankkonto} angenommen.`);
    const bank = bankSachkonto(umsatz?.bankkontoId ?? null, n.kontext.bankkonten, e.datev);
    const bankkonto = umsatz ? n.kontext.bankkonten.find((k) => k.id === umsatz.bankkontoId) : undefined;
    if (!zeile.kost1 && bankkonto?.objektId) zeile.kost1 = n.objekte.get(bankkonto.objektId)?.kurzname ?? "";
    zeile.konto = bank;
    zeile.sollHaben = b.brutto >= 0 ? "S" : "H";
    const z = umsatz?.zuordnung;
    let gegen = b.gegenkonto || (b.konto && b.konto !== bank ? b.konto : "");
    let personenkonto = false;
    if (!gegen) {
      const beleg = (z?.belegId ?? b.belegId) ? n.belege.get(z?.belegId ?? b.belegId ?? "") : undefined;
      const rechnung = (z?.rechnungId ?? b.rechnungId) ? n.rechnungen.get(z?.rechnungId ?? b.rechnungId ?? "") : undefined;
      const person = z?.personId ? n.personen.get(z.personId) : undefined;
      if (beleg) {
        gegen = n.konten.kreditor(beleg.lieferant.name);
        personenkonto = true;
        zeile.belegfeld1 = datevBelegfeld1(beleg.rechnungsnummer);
      } else if (rechnung) {
        gegen = n.konten.debitor(rechnung.empfaenger.kundennummer, rechnung.empfaenger.name);
        personenkonto = true;
        zeile.belegfeld1 = datevBelegfeld1(rechnung.nummer);
      } else if (person && (z?.art === "mieteingang" || z?.art === "hausgeld")) {
        gegen = n.konten.debitor(person.id, person.name);
        personenkonto = true;
      } else if (z?.art === "gebuehr") {
        gegen = kontoAusKostenart(b.kostenartCode ?? "BANKGEBUEHREN", n) || kontoAusKostenart("BANKGEBUEHREN", n) || (e.kontenrahmen === "SKR04" ? "6855" : "4970");
      } else {
        gegen = kontoAusKostenart(b.kostenartCode, n);
        if (!gegen) {
          gegen = geldtransit(n);
          n.warnungen.push(`Buchung ${bezeichne(b)}: kein Gegenkonto bekannt, Geldtransit ${gegen} verwendet, bitte prüfen.`);
        }
      }
    }
    zeile.gegenkonto = gegen;
    zeile.buSchluessel = personenkonto ? "" : steuerschluessel(gegen, b.brutto < 0);
    if (!zeile.belegfeld1 && umsatz?.endToEndId) zeile.belegfeld1 = datevBelegfeld1(umsatz.endToEndId);
    if (!zeile.buchungstext && umsatz) zeile.buchungstext = `${umsatz.name} ${umsatz.verwendungszweck}`.trim();
    return zeile;
  }

  // manuell
  zeile.konto = b.konto;
  zeile.gegenkonto = b.gegenkonto;
  zeile.sollHaben = b.sollHaben;
  if (!b.konto || !b.gegenkonto) n.warnungen.push(`Buchung ${bezeichne(b)}: Konto oder Gegenkonto fehlt, bitte im Stapel nachtragen.`);
  zeile.buSchluessel = steuerschluessel(b.gegenkonto, b.sollHaben === "S");
  return zeile;
}

// ---------- Datei ----------

function stapelZeile(z: DatevZeile, festschreibung: boolean): string {
  const felder: string[] = new Array<string>(DATEV_SPALTEN.length).fill("");
  felder[SP.umsatz] = datevBetrag(z.umsatz);
  felder[SP.sollHaben] = `"${z.sollHaben}"`;
  felder[SP.wkz] = '"EUR"';
  felder[SP.konto] = z.konto;
  felder[SP.gegenkonto] = z.gegenkonto;
  felder[SP.bu] = z.buSchluessel ? `"${z.buSchluessel}"` : "";
  felder[SP.belegdatum] = z.belegdatum;
  felder[SP.belegfeld1] = z.belegfeld1 ? `"${z.belegfeld1}"` : "";
  felder[SP.belegfeld2] = z.belegfeld2 ? `"${z.belegfeld2}"` : "";
  felder[SP.buchungstext] = z.buchungstext ? datevText(z.buchungstext, 60) : "";
  felder[SP.kost1] = z.kost1 ? datevText(z.kost1, 36) : "";
  felder[SP.festschreibung] = festschreibung ? "1" : "0";
  felder[SP.leistungsdatum] = z.leistungsdatum;
  felder[SP.faelligkeit] = z.faelligkeit;
  return felder.join(";");
}

export function datevHeader(e: Einstellungen, o: DatevOptionen, datumVon: string, datumBis: string): string[] {
  const d = e.datev;
  const wj = wirtschaftsjahrBeginn(datumVon, d.wirtschaftsjahrBeginn);
  const bezeichnung =
    o.bezeichnung ?? (datumVon.slice(0, 7) === datumBis.slice(0, 7) ? `Buchungen ${mm(datumVon)}/${jjjj(datumVon)}` : `Buchungen ${tt(datumVon)}.${mm(datumVon)}.-${tt(datumBis)}.${mm(datumBis)}.${jjjj(datumBis)}`);
  return [
    `"${DATEV_FORMAT.kennzeichen}"`,
    String(DATEV_FORMAT.version),
    String(DATEV_FORMAT.kategorie),
    `"${DATEV_FORMAT.name}"`,
    String(DATEV_FORMAT.formatversion),
    datevZeitstempel(o.erzeugtAm),
    "", // Importiert
    '"HV"', // Herkunft
    datevText(o.exportiertVon ?? "Hausverwailter", 25),
    "", // Importiert von
    d.beraternummer.trim(),
    d.mandantennummer.trim(),
    datevJJJJMMTT(wj),
    String(d.sachkontenlaenge),
    datevJJJJMMTT(datumVon),
    datevJJJJMMTT(datumBis),
    datevText(bezeichnung, 30),
    "", // Diktatkürzel
    "1", // Buchungstyp Finanzbuchführung
    "", // Rechnungslegungszweck
    o.festschreibung ? "1" : "0",
    '"EUR"',
    "", // reserviert
    "", // Derivatskennzeichen
    "", // reserviert
    "", // reserviert
    `"${e.kontenrahmen === "SKR04" ? "04" : "03"}"`,
    "", // Branchenlösung-Id
    "", // reserviert
    "", // reserviert
    "", // Anwendungsinformation
  ];
}

/** Baut den Stapel. Wirft, wenn keine Buchung dabei ist. */
export function datevBuchungsstapel(buchungen: Buchung[], kontext: DatevKontext, optionen: DatevOptionen): DatevErgebnis {
  if (!buchungen.length) throw new Error("Keine Buchungen für den DATEV-Export.");
  const e = kontext.einstellungen;
  const n: Nachschlag = {
    kontext,
    belege: new Map(kontext.belege.map((x) => [x.id, x])),
    rechnungen: new Map(kontext.rechnungen.map((x) => [x.id, x])),
    umsaetze: new Map(kontext.bankumsaetze.map((x) => [x.id, x])),
    objekte: new Map(kontext.objekte.map((x) => [x.id, x])),
    kostenarten: new Map(kontext.kostenarten.map((x) => [x.code, x])),
    personen: new Map(kontext.personen.map((x) => [x.id, x])),
    konten: personenkonten(e.datev),
    warnungen: [],
  };
  const sortiert = [...buchungen].sort((a, b) => a.datum.localeCompare(b.datum) || a.belegnummer.localeCompare(b.belegnummer) || a.erstelltAm.localeCompare(b.erstelltAm));
  const zeilen = sortiert.map((b) => zeileFuerBuchung(b, n)).filter((z): z is DatevZeile => z !== null);
  if (!zeilen.length) throw new Error("Keine exportierbare Buchung (alle Beträge 0).");

  const datumVon = optionen.datumVon ?? sortiert[0].datum;
  const datumBis = optionen.datumBis ?? sortiert[sortiert.length - 1].datum;
  const wj = wirtschaftsjahrBeginn(datumVon, e.datev.wirtschaftsjahrBeginn);
  const naechstesWj = `${Number(jjjj(wj)) + 1}${wj.slice(4)}`;
  if (datumBis >= naechstesWj) n.warnungen.unshift("Der Stapel reicht über das Wirtschaftsjahr hinaus; DATEV importiert nur ein Wirtschaftsjahr je Stapel. Bitte den Zeitraum enger filtern.");
  if (!e.datev.beraternummer.trim() || !e.datev.mandantennummer.trim()) n.warnungen.unshift("Beraternummer und Mandantennummer fehlen in den Stammdaten; DATEV verlangt beide im Header.");

  const header = datevHeader(e, optionen, datumVon, datumBis);
  const text = [header.join(";"), DATEV_SPALTEN.join(";"), ...zeilen.map((z) => stapelZeile(z, optionen.festschreibung ?? false))].join("\r\n") + "\r\n";
  return {
    text,
    bytes: cp1252Kodieren(text),
    dateiname: `EXTF_Buchungsstapel_${datevJJJJMMTT(datumVon)}_${datevJJJJMMTT(datumBis)}.csv`,
    header,
    zeilen,
    kreditoren: n.konten.kreditoren,
    debitoren: n.konten.debitoren,
    neueKreditoren: n.konten.neueKreditoren,
    neueDebitoren: n.konten.neueDebitoren,
    warnungen: n.warnungen,
    datumVon,
    datumBis,
  };
}
