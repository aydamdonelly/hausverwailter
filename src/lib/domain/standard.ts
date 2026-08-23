/**
 * Standard-Stammdaten, mit denen jede neue Installation startet. Alles davon ist in der
 * Oberfläche änderbar; die Kontonummern sind übliche SKR03/SKR04-Konten und müssen mit dem
 * Steuerberater abgeglichen werden (jede Kanzlei hat eigene Konventionen).
 */
import type { Kostenart, Leistung } from "./schema";

/** Kostenarten nach § 2 BetrKV (Nr. 1 bis 17) plus die nicht umlagefähigen Kosten. */
export const STANDARD_KOSTENARTEN: Kostenart[] = [
  { code: "GRUNDSTEUER", bezeichnung: "Grundsteuer", betrkv: "§ 2 Nr. 1 BetrKV", umlagefaehig: true, kontoSkr03: "4320", kontoSkr04: "6310", hinweis: "Grundsteuerbescheid der Gemeinde.", aktiv: true },
  { code: "WASSER", bezeichnung: "Wasserversorgung", betrkv: "§ 2 Nr. 2 BetrKV", umlagefaehig: true, kontoSkr03: "4240", kontoSkr04: "6325", hinweis: "Trinkwasser, Wasserzähler, Grundgebühren; 7 % USt.", aktiv: true },
  { code: "ENTWAESSERUNG", bezeichnung: "Entwässerung", betrkv: "§ 2 Nr. 3 BetrKV", umlagefaehig: true, kontoSkr03: "4240", kontoSkr04: "6325", hinweis: "Abwasser, Niederschlagswasser; meist ohne USt (hoheitlich).", aktiv: true },
  { code: "HEIZUNG", bezeichnung: "Heizung", betrkv: "§ 2 Nr. 4 BetrKV", umlagefaehig: true, kontoSkr03: "4230", kontoSkr04: "6320", hinweis: "Brennstoff, Fernwärme, Wartung der Heizung, Messdienst; nicht: Reparaturen.", aktiv: true },
  { code: "WARMWASSER", bezeichnung: "Warmwasserversorgung", betrkv: "§ 2 Nr. 5 BetrKV", umlagefaehig: true, kontoSkr03: "4230", kontoSkr04: "6320", hinweis: "Zentrale Warmwasserversorgung, Wartung, Messdienst.", aktiv: true },
  { code: "HEIZUNG_WARMWASSER_VERBUND", bezeichnung: "Verbundene Heizungs- und Warmwasseranlage", betrkv: "§ 2 Nr. 6 BetrKV", umlagefaehig: true, kontoSkr03: "4230", kontoSkr04: "6320", hinweis: "Wenn Heizung und Warmwasser gemeinsam abgerechnet werden.", aktiv: true },
  { code: "AUFZUG", bezeichnung: "Aufzug", betrkv: "§ 2 Nr. 7 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Betriebsstrom, Wartung, Prüfung (TÜV), Notruf. Reparaturen sind Instandhaltung.", aktiv: true },
  { code: "STRASSENREINIGUNG_MUELL", bezeichnung: "Straßenreinigung und Müllbeseitigung", betrkv: "§ 2 Nr. 8 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Gebührenbescheide, Müllabfuhr, Sperrmüll, Containerdienst.", aktiv: true },
  { code: "GEBAEUDEREINIGUNG", bezeichnung: "Gebäudereinigung und Ungezieferbekämpfung", betrkv: "§ 2 Nr. 9 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Treppenhausreinigung, Fensterreinigung Gemeinschaftsflächen, Schädlingsbekämpfung.", aktiv: true },
  { code: "GARTENPFLEGE", bezeichnung: "Gartenpflege", betrkv: "§ 2 Nr. 10 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Rasen, Hecken, Bäume, Spielplatz; nicht: Neuanlage.", aktiv: true },
  { code: "BELEUCHTUNG", bezeichnung: "Beleuchtung / Allgemeinstrom", betrkv: "§ 2 Nr. 11 BetrKV", umlagefaehig: true, kontoSkr03: "4240", kontoSkr04: "6325", hinweis: "Strom für Treppenhaus, Keller, Außenanlagen, Aufzug.", aktiv: true },
  { code: "SCHORNSTEINFEGER", bezeichnung: "Schornsteinreinigung", betrkv: "§ 2 Nr. 12 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Kehrgebühren, Immissionsmessung.", aktiv: true },
  { code: "VERSICHERUNG", bezeichnung: "Sach- und Haftpflichtversicherung", betrkv: "§ 2 Nr. 13 BetrKV", umlagefaehig: true, kontoSkr03: "4360", kontoSkr04: "6400", hinweis: "Gebäude-, Haftpflicht-, Glas-, Elementarversicherung. Versicherungsteuer, keine Vorsteuer.", aktiv: true },
  { code: "HAUSWART", bezeichnung: "Hauswart / Hausmeister", betrkv: "§ 2 Nr. 14 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Hausmeisterdienst; nicht: Reparaturen und Verwaltungstätigkeiten des Hausmeisters.", aktiv: true },
  { code: "ANTENNE_KABEL", bezeichnung: "Gemeinschaftsantenne / Breitband", betrkv: "§ 2 Nr. 15 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Seit 2024 nur noch eingeschränkt umlagefähig (Ende des Nebenkostenprivilegs).", aktiv: true },
  { code: "WAESCHEPFLEGE", bezeichnung: "Einrichtungen für die Wäschepflege", betrkv: "§ 2 Nr. 16 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Waschküche: Strom, Wartung, Reinigung.", aktiv: true },
  { code: "SONSTIGE_BETRIEBSKOSTEN", bezeichnung: "Sonstige Betriebskosten", betrkv: "§ 2 Nr. 17 BetrKV", umlagefaehig: true, kontoSkr03: "4250", kontoSkr04: "6330", hinweis: "Nur, wenn im Mietvertrag ausdrücklich vereinbart (z. B. Dachrinnenreinigung, Feuerlöscherwartung).", aktiv: true },
  { code: "INSTANDHALTUNG", bezeichnung: "Instandhaltung und Instandsetzung", betrkv: "", umlagefaehig: false, kontoSkr03: "4260", kontoSkr04: "6335", hinweis: "Reparaturen, Sanierung, Ersatz. Bei WEG oft aus der Erhaltungsrücklage.", aktiv: true },
  { code: "VERWALTUNG", bezeichnung: "Verwaltungskosten", betrkv: "", umlagefaehig: false, kontoSkr03: "4900", kontoSkr04: "6300", hinweis: "Verwalterhonorar, Porto, Kontoführung der Verwaltung.", aktiv: true },
  { code: "BANKGEBUEHREN", bezeichnung: "Bankgebühren", betrkv: "", umlagefaehig: false, kontoSkr03: "4970", kontoSkr04: "6855", hinweis: "Kontoführung, Buchungsposten des Objektkontos.", aktiv: true },
  { code: "RUECKLAGE", bezeichnung: "Zuführung Erhaltungsrücklage", betrkv: "", umlagefaehig: false, kontoSkr03: "", kontoSkr04: "", hinweis: "Nur WEG (§ 19 Abs. 2 Nr. 4 WEG).", aktiv: true },
  { code: "RECHT_BERATUNG", bezeichnung: "Rechts- und Beratungskosten", betrkv: "", umlagefaehig: false, kontoSkr03: "4950", kontoSkr04: "6825", hinweis: "Anwalt, Gutachter, Steuerberater.", aktiv: true },
  { code: "SONSTIGES_NICHT_UMLAGEFAEHIG", bezeichnung: "Sonstiges (nicht umlagefähig)", betrkv: "", umlagefaehig: false, kontoSkr03: "4900", kontoSkr04: "6300", hinweis: "Alles, was in keine andere Kostenart passt und nicht auf Mieter umgelegt werden darf.", aktiv: true },
];

/** Leistungskatalog einer Hausverwaltung (Preise netto, übliche Marktspanne 2026, bitte anpassen). */
export const STANDARD_LEISTUNGEN_HAUSVERWALTUNG: Omit<Leistung, "id">[] = [
  { code: "WEG_GRUND", bezeichnung: "WEG-Verwaltung, Grundhonorar", beschreibung: "Kaufmännische, technische und rechtliche Verwaltung des Gemeinschaftseigentums nach § 27 WEG.", einheit: "einheit_monat", preisNetto: 27.5, gilt: "WEG", kategorie: "grundleistung", aktiv: true },
  { code: "MIET_GRUND", bezeichnung: "Mietverwaltung, Grundhonorar", beschreibung: "Mietinkasso, Betriebskostenabrechnung, Mieterbetreuung, Instandhaltungskoordination.", einheit: "einheit_monat", preisNetto: 32, gilt: "MIET", kategorie: "grundleistung", aktiv: true },
  { code: "GEWERBE_ZUSCHLAG", bezeichnung: "Zuschlag Gewerbeeinheit", beschreibung: "Mehraufwand für Gewerbemietverträge und Indexierung.", einheit: "einheit_monat", preisNetto: 12, gilt: "ALLE", kategorie: "grundleistung", aktiv: true },
  { code: "STELLPLATZ", bezeichnung: "Stellplatz / Garage", beschreibung: "", einheit: "stellplatz_monat", preisNetto: 3.5, gilt: "ALLE", kategorie: "grundleistung", aktiv: true },
  { code: "ETV_ZUSATZ", bezeichnung: "Zusätzliche Eigentümerversammlung", beschreibung: "Über die jährliche ordentliche Versammlung hinaus, inkl. Einladung und Protokoll.", einheit: "pauschal", preisNetto: 350, gilt: "WEG", kategorie: "sonderleistung", aktiv: true },
  { code: "MAHNUNG", bezeichnung: "Mahnung (Hausgeld/Miete)", beschreibung: "", einheit: "stueck", preisNetto: 15, gilt: "ALLE", kategorie: "sonderleistung", aktiv: true },
  { code: "UEBERGABE", bezeichnung: "Wohnungsübergabe / -abnahme", beschreibung: "Termin vor Ort inkl. Protokoll und Zählerstände.", einheit: "stueck", preisNetto: 120, gilt: "MIET", kategorie: "sonderleistung", aktiv: true },
  { code: "NEUVERMIETUNG", bezeichnung: "Neuvermietung", beschreibung: "Besichtigungen, Bonitätsprüfung, Mietvertrag.", einheit: "pauschal", preisNetto: 250, gilt: "MIET", kategorie: "sonderleistung", aktiv: true },
  { code: "SANIERUNG_BEGLEITUNG", bezeichnung: "Baubegleitung größerer Maßnahmen", beschreibung: "Prozent der Bausumme oder nach Stunden, ab 10.000 € Auftragsvolumen.", einheit: "stunde", preisNetto: 75, gilt: "ALLE", kategorie: "sonderleistung", aktiv: true },
  { code: "STUNDE", bezeichnung: "Sonstige Leistungen nach Aufwand", beschreibung: "", einheit: "stunde", preisNetto: 75, gilt: "ALLE", kategorie: "sonderleistung", aktiv: true },
];

/** Leistungskatalog eines Gebäudedienstleisters (Hausmeister, Reinigung, Winterdienst). */
export const STANDARD_LEISTUNGEN_DIENSTLEISTER: Omit<Leistung, "id">[] = [
  { code: "HAUSMEISTER", bezeichnung: "Hausmeisterdienst", beschreibung: "Wöchentliche Objektkontrolle, Kleinreparaturen, Ansprechpartner vor Ort.", einheit: "pauschal_monat", preisNetto: 240, gilt: "ALLE", kategorie: "grundleistung", aktiv: true },
  { code: "TREPPENHAUS", bezeichnung: "Treppenhausreinigung", beschreibung: "Wöchentlich, inkl. Eingangsbereich und Keller monatlich.", einheit: "pauschal_monat", preisNetto: 190, gilt: "ALLE", kategorie: "grundleistung", aktiv: true },
  { code: "GARTEN", bezeichnung: "Gartenpflege", beschreibung: "Rasenschnitt, Hecken, Laub, 14-täglich in der Saison.", einheit: "pauschal_monat", preisNetto: 160, gilt: "ALLE", kategorie: "grundleistung", aktiv: true },
  { code: "WINTERDIENST", bezeichnung: "Winterdienst", beschreibung: "Bereitschaft November bis März, Räumen und Streuen nach Satzung.", einheit: "pauschal_monat", preisNetto: 140, gilt: "ALLE", kategorie: "grundleistung", aktiv: true },
  { code: "STUNDE_HANDWERK", bezeichnung: "Handwerkerstunde", beschreibung: "Kleinreparaturen, Montagen.", einheit: "stunde", preisNetto: 58, gilt: "ALLE", kategorie: "sonderleistung", aktiv: true },
  { code: "ANFAHRT", bezeichnung: "Anfahrtspauschale", beschreibung: "", einheit: "stueck", preisNetto: 25, gilt: "ALLE", kategorie: "sonderleistung", aktiv: true },
  { code: "SPERRMUELL", bezeichnung: "Sperrmüll / Entrümpelung", beschreibung: "Nach Aufwand, zzgl. Entsorgungskosten.", einheit: "stunde", preisNetto: 48, gilt: "ALLE", kategorie: "sonderleistung", aktiv: true },
];

export const STANDARD_STAFFEL = [
  { abEinheiten: 30, rabattProzent: 5 },
  { abEinheiten: 60, rabattProzent: 10 },
];
