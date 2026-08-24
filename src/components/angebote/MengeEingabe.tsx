"use client";

import { useState } from "react";
import { parseDeZahl } from "@/lib/format";

const format = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 });

/** Textfeld für Mengen und Stückzahlen (deutsche Schreibweise, bis zu drei Nachkommastellen). Übernimmt beim Verlassen. */
export function MengeEingabe({
  wert,
  onWert,
  className = "",
  disabled = false,
  ariaLabel,
  ganzzahl = false,
}: {
  wert: number;
  onWert: (n: number) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ganzzahl?: boolean;
}) {
  const [text, setText] = useState(format.format(wert));
  const [letzterWert, setLetzterWert] = useState(wert);
  if (wert !== letzterWert) {
    setLetzterWert(wert);
    setText(format.format(wert));
  }
  return (
    <input
      className={`feld zahl ${className}`}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = parseDeZahl(text);
        if (n === null || n < 0) {
          setText(format.format(wert));
          return;
        }
        const bereinigt = ganzzahl ? Math.round(n) : Math.round(n * 1000) / 1000;
        setText(format.format(bereinigt));
        if (bereinigt !== wert) onWert(bereinigt);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
