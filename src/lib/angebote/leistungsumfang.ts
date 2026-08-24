/**
 * Leistungsumfang, Laufzeit und Sonderleistungen je Verwaltungsart. Reiner Text und reine
 * Auswahl, ohne React und ohne Datenbank. Die Formulierungen folgen den Musterverträgen von
 * VDIV und Haus & Grund (Grundleistungen gegen besondere Leistungen) und dem Wortlaut des WEG
 * (§§ 24, 26, 27, 28) und des BGB (§ 556 Abs. 3).
 */
import type { Leistung } from "../domain/schema";
import { datum } from "../format";

export type AngebotsArt = "WEG" | "MIET" | "GEWERBE" | "UNKLAR";

export const ART_TEXT: Record<AngebotsArt, string> = {
  WEG: "WEG-Verwaltung",
  MIET: "Mietverwaltung",
  GEWERBE: "Gewerbeverwaltung",
  UNKLAR: "Verwaltung",
};

const WEG_UMFANG: string[] = [
  // kaufmännisch
  "Aufstellung des Wirtschaftsplans für jedes Kalenderjahr mit den Vorschüssen zur Kostentragung und zur Erhaltungsrücklage (§ 28 Abs. 1 WEG)",
  "Jahresabrechnung über den Wirtschaftsplan nach Ablauf des Kalenderjahres mit Einzelabrechnungen je Einheit und Beschlussvorlage zu Nachschüssen und angepassten Vorschüssen (§ 28 Abs. 2 WEG)",
  "Vermögensbericht nach Ablauf des Kalenderjahres mit dem Stand der Rücklagen und dem wesentlichen Gemeinschaftsvermögen (§ 28 Abs. 4 WEG)",
  "Führung der Gemeinschaftskonten, Hausgeldinkasso mit monatlicher Sollstellung, Überwachung der Zahlungseingänge und Mahnwesen",
  "Verwaltung der Erhaltungsrücklage getrennt vom laufenden Konto, Anlage nach Beschluss der Eigentümer",
  "Prüfung und Zahlung aller Rechnungen des Gemeinschaftseigentums, objektbezogene Buchhaltung mit Kostenarten nach BetrKV und Vorbereitung der Heizkostenabrechnung mit dem Messdienst",
  "Abschluss und Überwachung von Versorgungs-, Wartungs- und Versicherungsverträgen im Namen der Gemeinschaft, Meldung und Abwicklung von Versicherungsschäden",
  // technisch
  "Objektbegehung mindestens einmal jährlich mit Protokoll und Vorschlägen zur Erhaltung des Gemeinschaftseigentums",
  "Veranlassung von Wartung und Prüfung der technischen Anlagen (Heizung, Aufzug, Brandschutz, Trinkwasser) und der laufenden Instandhaltung",
  "Einholung und Prüfung von Angeboten, Beauftragung von Handwerkern innerhalb der beschlossenen Wertgrenzen (§ 27 Abs. 2 WEG), Abnahme und Rechnungsprüfung",
  "Notmaßnahmen bei Gefahr im Verzug und zur Wahrung von Fristen (§ 27 Abs. 1 Nr. 2 WEG)",
  // rechtlich und organisatorisch
  "Einberufung und Leitung der ordentlichen Eigentümerversammlung einmal jährlich mit Ladungsfrist von drei Wochen, Niederschrift der Beschlüsse",
  "Führung der Beschluss-Sammlung (§ 24 Abs. 7 WEG) und Umsetzung der gefassten Beschlüsse",
  "Vertretung der Gemeinschaft gegenüber Dritten (§ 9b WEG), Schriftverkehr mit Eigentümern, Verwaltungsbeirat, Behörden und Versorgern",
  "Belegeinsicht für die Eigentümer und Rechnungsprüfung gemeinsam mit dem Verwaltungsbeirat",
];

const MIET_UMFANG: string[] = [
  "Mietinkasso einschließlich Betriebskostenvorauszahlungen, monatliche Sollstellung, Überwachung der Mieteingänge und Mahnwesen",
  "Betriebskostenabrechnung nach BetrKV und HeizkostenV, dem Mieter spätestens bis zum Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums zugestellt (§ 556 Abs. 3 BGB), mit Belegeinsicht und Ausweis der haushaltsnahen Dienstleistungen nach § 35a EStG",
  "Mieterwechsel: Abwicklung der Kündigung, Wohnungsabnahme und -übergabe mit Protokoll und Zählerständen, Kautionsabrechnung",
  "Mieterhöhungen nach Staffel- oder Indexvereinbarung; Mieterhöhungen zur ortsüblichen Vergleichsmiete und nach Modernisierung als besondere Leistung",
  "Koordination der Instandhaltung: Schadensaufnahme, Einholung von Angeboten, Beauftragung innerhalb der vereinbarten Wertgrenzen, Abnahme und Rechnungsprüfung",
  "Objektbezogene Buchhaltung mit Kostenarten nach BetrKV, Prüfung und Zahlung aller Rechnungen über das Mietkonto",
  "Monatliche Abrechnung gegenüber dem Eigentümer als Einnahmen-/Ausgabenrechnung mit Kontostand, Auszahlung des Überschusses zum 10. des Folgemonats",
  "Jährliche Objektbegehung, Verkehrssicherung, Überwachung der Wartungs- und Versorgungsverträge",
  "Ansprechpartner der Mieter in allen Fragen des Mietverhältnisses, Bearbeitung von Schadensmeldungen und Beschwerden",
];

const GEWERBE_UMFANG: string[] = [
  "Mietinkasso einschließlich Nebenkostenvorauszahlungen und Umsatzsteuer bei Option nach § 9 UStG, monatliche Sollstellung und Mahnwesen",
  "Nebenkostenabrechnung nach den gewerblichen Mietverträgen, einschließlich der dort vereinbarten erweiterten Umlagen (etwa Verwaltungskosten, Instandhaltung Gemeinflächen)",
  "Überwachung und Durchführung der Indexanpassungen nach den Wertsicherungsklauseln der Mietverträge",
  "Überwachung von Laufzeiten, Optionsrechten und Kündigungsfristen der Gewerbemietverträge, Erinnerung an Entscheidungstermine",
  "Koordination der Instandhaltung: Einholung von Angeboten, Beauftragung innerhalb der Wertgrenzen, Abnahme und Rechnungsprüfung",
  "Objektbezogene Buchhaltung, Prüfung und Zahlung aller Rechnungen, monatliches Reporting an den Eigentümer mit Einnahmen-/Ausgabenrechnung und offenen Posten",
  "Jährliche Objektbegehung, Verkehrssicherung, Überwachung der technischen Wartungsverträge",
];

/** Der Leistungsumfang einer Hausverwaltung je Verwaltungsart. UNKLAR wird wie WEG behandelt. */
export function leistungsumfangFuer(art: AngebotsArt): string[] {
  switch (art) {
    case "MIET":
      return [...MIET_UMFANG];
    case "GEWERBE":
      return [...GEWERBE_UMFANG];
    default:
      return [...WEG_UMFANG];
  }
}

/** Der Leistungsumfang eines Gebäudedienstleisters: je gewählter Katalogleistung eine Zeile. */
export function leistungsumfangDienstleister(leistungen: Leistung[], codes: string[]): string[] {
  const zeilen: string[] = [];
  for (const code of codes) {
    const l = leistungen.find((x) => x.code === code);
    if (!l) continue;
    zeilen.push(l.beschreibung ? `${l.bezeichnung}: ${l.beschreibung}` : l.bezeichnung);
  }
  zeilen.push("Alle Arbeiten mit eigenem Personal, eigenen Geräten und eigenem Material, versichert über unsere Betriebshaftpflicht");
  zeilen.push("Rechnungen monatlich, nach Betriebskostenarten getrennt (§ 2 BetrKV) und mit Ausweis des Lohnanteils nach § 35a EStG");
  return zeilen;
}

/** Erster Tag des übernächsten Monats: realistischer Beginn, wenn die Anfrage keinen nennt. */
export function standardBeginn(datumIso: string): string {
  const jahr = Number(datumIso.slice(0, 4));
  const monat = Number(datumIso.slice(5, 7));
  const d = new Date(Date.UTC(jahr, monat - 1 + 2, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Laufzeittext je Art. WEG nach § 26 Abs. 2 und 3 WEG (höchstens fünf Jahre, bei Erstbestellung
 * nach Begründung des Wohnungseigentums höchstens drei Jahre; Wiederbestellung frühestens ein
 * Jahr vor Ablauf; Vertragsende spätestens sechs Monate nach Abberufung). Mietverwaltung nach
 * dem VDIV-Muster mit fester Laufzeit und Verlängerung.
 */
export function laufzeitText(art: AngebotsArt, beginn: string, branche: "hausverwaltung" | "dienstleister" | "sonstige" = "hausverwaltung"): string {
  const ab = datum(beginn);
  if (branche === "dienstleister") {
    return `Laufzeit zwölf Monate ab dem ${ab}. Der Vertrag verlängert sich um jeweils zwölf Monate, wenn er nicht drei Monate vor Ablauf schriftlich gekündigt wird. Saisonleistungen (Winterdienst, Gartenpflege) gelten für die jeweilige Saison.`;
  }
  if (art === "WEG" || art === "UNKLAR") {
    return `Bestellung zum Verwalter für drei Jahre ab dem ${ab}. Nach § 26 Abs. 2 WEG ist die Bestellung auf höchstens fünf Jahre möglich, bei der ersten Bestellung nach Begründung des Wohnungseigentums auf höchstens drei Jahre. Eine Wiederbestellung um bis zu fünf Jahre ist durch erneuten Beschluss möglich, frühestens ein Jahr vor Ablauf. Der Verwaltervertrag endet spätestens sechs Monate nach einer Abberufung (§ 26 Abs. 3 WEG).`;
  }
  return `Vertragslaufzeit zwei Jahre ab dem ${ab}. Danach verlängert sich der Vertrag um jeweils ein Jahr, wenn er nicht mit einer Frist von drei Monaten zum Vertragsende schriftlich gekündigt wird. Bei Verkauf des Objekts besteht ein Sonderkündigungsrecht mit drei Monaten zum Monatsende.`;
}

/** Passt eine Katalogleistung zur Verwaltungsart? Gewerbe ist eine Mietverwaltung mit Zusatzaufgaben. */
export function giltFuer(leistung: Pick<Leistung, "gilt">, art: AngebotsArt): boolean {
  if (leistung.gilt === "ALLE") return true;
  if (art === "GEWERBE") return leistung.gilt === "GEWERBE" || leistung.gilt === "MIET";
  if (art === "UNKLAR") return leistung.gilt === "WEG";
  return leistung.gilt === art;
}

/** Sonderleistungen aus dem Katalog, die zur Art passen (Preisliste im Angebot). */
export function sonderleistungenFuer(art: AngebotsArt, leistungen: Leistung[]): { bezeichnung: string; preisNetto: number; einheit: string }[] {
  return leistungen
    .filter((l) => l.aktiv && l.kategorie === "sonderleistung" && giltFuer(l, art))
    .map((l) => ({ bezeichnung: l.bezeichnung, preisNetto: l.preisNetto, einheit: einheitKurz(l.einheit) }));
}

const EINHEIT_KURZ: Record<Leistung["einheit"], string> = {
  einheit_monat: "je Einheit und Monat",
  stellplatz_monat: "je Stellplatz und Monat",
  pauschal_monat: "pauschal je Monat",
  qm_monat: "je m² und Monat",
  stunde: "je Stunde",
  stueck: "je Stück",
  pauschal: "pauschal",
};

export function einheitKurz(einheit: Leistung["einheit"]): string {
  return EINHEIT_KURZ[einheit];
}
