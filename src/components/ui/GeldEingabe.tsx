"use client";

import { useState } from "react";
import { betrag as fmt, parseDeZahl } from "@/lib/format";

/** Textfeld für Euro-Beträge in deutscher Schreibweise (1.234,56). Übernimmt beim Verlassen. */
export function GeldEingabe({
  wert,
  onWert,
  className = "",
  disabled = false,
  ariaLabel,
}: {
  wert: number;
  onWert: (n: number) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(fmt(wert));
  const [letzterWert, setLetzterWert] = useState(wert);
  // Kommt von außen ein neuer Wert, wird die Anzeige während des Renderns angepasst
  // (empfohlenes Muster statt eines Effekts).
  if (wert !== letzterWert) {
    setLetzterWert(wert);
    setText(fmt(wert));
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
        if (n === null) {
          setText(fmt(wert));
          return;
        }
        const gerundet = Math.round(n * 100) / 100;
        setText(fmt(gerundet));
        if (gerundet !== wert) onWert(gerundet);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
