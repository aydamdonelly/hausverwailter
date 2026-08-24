/**
 * Gemeinsame Typen des Bankmoduls. Alle Leser (CSV-Profile, CAMT.053, MT940) liefern dieselbe
 * Rohstruktur `UmsatzRoh`; erst der Import macht daraus einen gespeicherten `Bankumsatz`.
 */

export interface UmsatzRoh {
  /** YYYY-MM-DD */
  buchungstag: string;
  /** YYYY-MM-DD oder null */
  valuta: string | null;
  /** Signiert: Eingang positiv, Ausgang negativ, in Euro */
  betrag: number;
  waehrung: string;
  /** Gegenpartei: Auftraggeber bei Eingang, Empfänger bei Ausgang */
  name: string;
  iban: string;
  bic: string;
  verwendungszweck: string;
  /** Buchungsart der Bank, z. B. "GUTSCHRIFT UEBERWEISUNG", "Basislastschrift" */
  buchungstext: string;
  endToEndId: string;
  mandatsreferenz: string;
}

/** Welche Spalte welches Feld liefert. Spaltennamen wie in der Kopfzeile; "" = nicht vorhanden. Alternativen mit "|". */
export interface Spaltenzuordnung {
  buchungstag: string;
  valuta: string;
  /** Signierte Betragsspalte; leer, wenn Soll und Haben getrennt sind */
  betrag: string;
  betragSoll: string;
  betragHaben: string;
  waehrung: string;
  name: string;
  iban: string;
  bic: string;
  /** Eine oder mehrere Spalten, die zusammen den Verwendungszweck ergeben */
  verwendungszweck: string[];
  buchungstext: string;
  endToEndId: string;
  mandatsreferenz: string;
}

/**
 * Ein Spaltenprofil beschreibt ein CSV-Format vollständig und ist als JSON speicherbar
 * (Bankkonto.format), damit ein einmal erkanntes Format beim nächsten Import ohne KI läuft.
 */
export interface Spaltenprofil {
  trennzeichen: string;
  /** 0-basierter Index der Kopfzeile; -1 = keine Kopfzeile (Spaltennamen kommen aus `kopfSynthetisch`) */
  kopfzeile: number;
  spalten: Spaltenzuordnung;
  datumsformat: string;
  dezimaltrennzeichen: "," | ".";
  /** Spalte mit S/H-Kennzeichen (unsignierter Betrag), nur alte VR-Formate; "$letzte" = letzte Spalte */
  sollHabenKennzeichen?: string;
  /** Spalte mit der IBAN des eigenen Kontos */
  kontoIbanSpalte?: string;
  kopfSynthetisch?: string[];
  bankVermutung?: string;
}

/** Was am Bankkonto in `format` als JSON gemerkt wird, wenn kein festes Profil greift. */
export interface GemerktesProfil {
  id: "ki" | "generisch";
  name: string;
  profil: Spaltenprofil;
}

export interface LeseErgebnis {
  /** Kennung des Formats, z. B. "sparkasse-camt-csv"; "unbekannt", wenn nichts griff */
  format: string;
  formatName: string;
  /** IBAN des eigenen Kontos aus der Datei, "" wenn nicht enthalten */
  kontoIban: string;
  umsaetze: UmsatzRoh[];
  warnungen: string[];
  /** Zeilen, die nicht übernommen wurden (vorgemerkt, Saldozeilen, unlesbar) */
  uebersprungen: number;
  /** Bei "unbekannt": die ersten Zeilen für die KI-Spaltenerkennung */
  vorschau?: string[];
  /** Nur für generische/KI-Profile: das Profil als JSON zum Merken am Konto */
  profilJson?: string;
}
