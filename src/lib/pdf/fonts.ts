/**
 * Schriften für die PDF-Erzeugung. Dieselben Familien wie in der Oberfläche (Vollkorn für
 * Wortmarke und Titel, Source Sans 3 für alles andere), aber als statische Schnitte, weil
 * react-pdf keine variablen Fonts einbetten kann. Die Dateien liegen in public/fonts/static
 * und werden zur Laufzeit vom Dateisystem gelesen (next.config.ts: outputFileTracingIncludes).
 */
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const SCHRIFT_TEXT = "Source Sans 3";
export const SCHRIFT_DISPLAY = "Vollkorn";

const SCHNITTE = [400, 500, 600, 700] as const;

function schriftpfad(datei: string): string {
  return path.join(process.cwd(), "public", "fonts", "static", datei);
}

const MERKER = Symbol.for("hausverwailter.pdf.fonts");
type GlobalMitMerker = typeof globalThis & { [MERKER]?: boolean };

/**
 * Registriert beide Familien genau einmal pro Prozess (auch bei Hot Reload im Dev-Server).
 * Silbentrennung wird abgeschaltet: Geschäftsbriefe trennen keine Wörter.
 */
export function schriftenRegistrieren(): void {
  const g = globalThis as GlobalMitMerker;
  if (g[MERKER]) return;
  g[MERKER] = true;

  Font.register({
    family: SCHRIFT_DISPLAY,
    fonts: SCHNITTE.flatMap((gewicht) => [
      { src: schriftpfad(`Vollkorn-${gewicht}.ttf`), fontWeight: gewicht, fontStyle: "normal" as const },
      { src: schriftpfad(`Vollkorn-Italic-${gewicht}.ttf`), fontWeight: gewicht, fontStyle: "italic" as const },
    ]),
  });
  Font.register({
    family: SCHRIFT_TEXT,
    fonts: SCHNITTE.flatMap((gewicht) => [
      { src: schriftpfad(`SourceSans3-${gewicht}.ttf`), fontWeight: gewicht, fontStyle: "normal" as const },
      { src: schriftpfad(`SourceSans3-Italic-${gewicht}.ttf`), fontWeight: gewicht, fontStyle: "italic" as const },
    ]),
  });
  Font.registerHyphenationCallback((wort) => [wort]);
}
