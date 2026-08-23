import localFont from "next/font/local";

/**
 * Zwei Schriften, beide Open Font License, beide liegen im Repo (public/fonts):
 * Vollkorn (Friedrich Althausen) für Wortmarke, Titel und Stempel: eine kräftige deutsche
 * Buchschrift mit Charakter. Source Sans 3 für alles andere: ruhig, gut lesbar, mit
 * Tabellenziffern für Geldbeträge. Dieselben Dateien nutzt der PDF-Renderer (lib/pdf).
 */
export const vollkorn = localFont({
  src: [
    { path: "../../public/fonts/Vollkorn-Variable.ttf", weight: "400 900", style: "normal" },
    { path: "../../public/fonts/Vollkorn-Italic-Variable.ttf", weight: "400 900", style: "italic" },
  ],
  variable: "--font-vollkorn",
  display: "swap",
});

export const sourceSans = localFont({
  src: [
    { path: "../../public/fonts/SourceSans3-Variable.ttf", weight: "200 900", style: "normal" },
    { path: "../../public/fonts/SourceSans3-Italic-Variable.ttf", weight: "200 900", style: "italic" },
  ],
  variable: "--font-source",
  display: "swap",
});
