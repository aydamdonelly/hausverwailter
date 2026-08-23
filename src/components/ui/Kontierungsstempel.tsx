import type { ReactNode } from "react";

/**
 * Das Raster, in das die erkannten Daten eines Belegs eingetragen werden. Optisch der
 * Kontierungsstempel, den Buchhaltungen auf Papierbelege drücken: Felder mit Versal-Labels
 * in einem Rahmen. Spaltenzahl per `spalten`; Zellen können mit `breit` zwei Spalten belegen.
 */
export function Kontierungsstempel({
  titel,
  spalten = 3,
  children,
  className = "",
}: {
  titel?: string;
  spalten?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  // Feste Klassennamen, damit Tailwind sie beim Bauen findet.
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[spalten];
  const volleBreite = { 2: "col-span-2", 3: "col-span-3", 4: "col-span-4" }[spalten];
  return (
    <div className={`kontierung ${cols} ${className}`}>
      {titel ? <div className={`kontierung-titel ${volleBreite}`}>{titel}</div> : null}
      {children}
    </div>
  );
}

export function KontierungsZelle({
  label,
  breit = false,
  children,
  hinweis,
}: {
  label: string;
  breit?: boolean;
  children: ReactNode;
  /** kleiner Text unter dem Wert, z. B. "aus Beleg gelesen" */
  hinweis?: string;
}) {
  return (
    <div className={`kontierung-zelle ${breit ? "col-span-2" : ""}`}>
      <span className="kontierung-label">{label}</span>
      <div className="kontierung-wert">{children}</div>
      {hinweis ? <div className="mt-1 text-xs text-tinte-3">{hinweis}</div> : null}
    </div>
  );
}
