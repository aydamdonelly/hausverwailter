/**
 * Maße, Farben und Typografie der Geschäftsbriefe. Alles in Punkt (1 pt = 1/72 Zoll);
 * die DIN-Maße stehen in Millimetern und werden mit `mm()` umgerechnet.
 *
 * Grundlage: DIN 5008 Form B (hoher Briefkopf 45 mm, Anschriftfeld ab 45 mm, Informationsblock
 * ab 50 mm bei 125 mm von links, Falzmarken 105 / 210 mm, Lochmarke 148,5 mm, Textbeginn
 * ca. 98 mm, Ränder links 25 mm und rechts 20 mm). Quelle: docs der Recherche
 * (rechtliche-pflichten-und-fristen.md, Abschnitt 7).
 */

export const PT_PRO_MM = 72 / 25.4;

/** Millimeter → Punkt (react-pdf rechnet in Punkt). */
export function mm(millimeter: number): number {
  return Math.round(millimeter * PT_PRO_MM * 100) / 100;
}

/** Alle Maße in Millimetern, vom oberen bzw. linken Blattrand. */
export const DIN = {
  blattBreite: 210,
  blattHoehe: 297,
  randLinks: 25,
  randRechts: 20,
  textBreite: 165,
  kopfHoehe: 45,
  /** Anschriftfeld: 85 × 45 mm ab 20 mm von links, Text linksbündig bei 25 mm. */
  anschriftOben: 45,
  anschriftBreite: 85,
  anschriftHoehe: 45,
  /** Zusatz- und Vermerkzone (Rücksendeangabe) 45,0 bis 62,7 mm, Anschriftzone 62,7 bis 90 mm. */
  vermerkzoneHoehe: 17.7,
  anschriftzoneHoehe: 27.3,
  /** Informationsblock: ab 50 mm, 125 mm von links, 65 mm breit (endet 10 mm vor dem rechten Rand). */
  infoblockOben: 50,
  infoblockLinks: 125,
  infoblockBreite: 65,
  /** Betreff und Text beginnen ab 98 mm. */
  textBeginn: 98,
  falzmarke1: 105,
  lochmarke: 148.5,
  falzmarke2: 210,
  /** Der Brieffuß: Geschäftsangaben in den unteren 25 mm. */
  fussOben: 272,
  fussUnten: 10,
} as const;

/** Die Tinte der Oberfläche (globals.css), damit Bildschirm und Papier dieselbe Sprache sprechen. */
export const FARBEN = {
  tinte: "#15201b",
  tinte2: "#4b544f",
  tinte3: "#6b736e",
  linie: "#d9dbd2",
  linie2: "#b9bdb2",
  blatt2: "#f3f2ec",
  weiss: "#ffffff",
} as const;

export const SCHRIFTGRAD = {
  wortmarke: 17,
  titel: 15,
  text: 10.5,
  klein: 9,
  winzig: 7.5,
  anschrift: 10.5,
  ruecksende: 7,
} as const;

/** Zeilenhöhe des Fließtexts als Faktor (DIN: einfacher Zeilenabstand, hier etwas luftiger). */
export const ZEILENHOEHE = 1.35;

/**
 * Liest einen Hex-Farbwert (#rgb oder #rrggbb) und liefert ihn normalisiert zurück.
 * Ungültige Werte ergeben null.
 */
export function hexNormalisiert(wert: string | null | undefined): string | null {
  if (!wert) return null;
  const t = wert.trim();
  const kurz = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(t);
  if (kurz) return `#${kurz[1]}${kurz[1]}${kurz[2]}${kurz[2]}${kurz[3]}${kurz[3]}`.toLowerCase();
  const lang = /^#?([0-9a-f]{6})$/i.exec(t);
  if (lang) return `#${lang[1]}`.toLowerCase();
  return null;
}

/** Relative Leuchtdichte (0 = schwarz, 1 = weiß) nach WCAG. */
export function leuchtdichte(hex: string): number {
  const n = hexNormalisiert(hex);
  if (!n) return 0;
  const kanal = (i: number) => {
    const c = parseInt(n.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(0) + 0.7152 * kanal(1) + 0.0722 * kanal(2);
}

/**
 * Die Akzentfarbe des Briefkopfs: firma.farbe, wenn sie gültig und auf weißem Papier lesbar
 * ist; sonst die Tinte. Sie wird nur für Wortmarke und Linien verwendet, nie für Fließtext.
 */
export function akzentFarbe(wert: string | null | undefined): string {
  const n = hexNormalisiert(wert);
  if (!n) return FARBEN.tinte;
  // Kontrast zu Weiß mindestens 3:1, sonst ist die Wortmarke nicht mehr lesbar.
  const kontrast = (1 + 0.05) / (leuchtdichte(n) + 0.05);
  return kontrast >= 3 ? n : FARBEN.tinte;
}
