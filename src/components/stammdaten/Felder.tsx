"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Auswahl, Eingabe, Feld, Textbereich } from "@/components/ui/Feld";
import { GeldEingabe } from "@/components/ui/GeldEingabe";
import { Hinweis } from "@/components/ui/Hinweis";

/**
 * Formularfelder, die beim Verlassen speichern (onBlur bzw. Enter), nicht bei jedem Tastendruck.
 * Jedes Feld hält den Text lokal und meldet nur, wenn sich der Wert wirklich geändert hat.
 * `kompakt` ist die Variante für Tabellenzellen (ohne Label, kleiner).
 */

export const KOMPAKT = "!px-2 !py-1 text-sm";

export function Fehlertext({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Hinweis ton="fehler" className="mt-1 !text-sm">
      {text}
    </Hinweis>
  );
}

/**
 * Hülle um jedes Feld: Label, Hinweis, Fehler. Der Fehler verschwindet, sobald der Nutzer tippt,
 * nicht erst beim Verlassen des Feldes. Sonst rutscht das Formular genau zwischen Mousedown und
 * Mouseup auf „Speichern“ zusammen und der Klick geht ins Leere. Beim Verlassen und bei jeder
 * neuen Prüfung erscheint ein noch bestehender Fehler wieder.
 */
function Huelle({ label, hinweis, fehler, children, className }: { label?: string; hinweis?: string; fehler?: string; children: ReactNode; className?: string }) {
  const [versteckt, setVersteckt] = useState(false);
  const [letzterFehler, setLetzterFehler] = useState(fehler);
  if (fehler !== letzterFehler) {
    setLetzterFehler(fehler);
    setVersteckt(false);
  }
  const sichtbar = versteckt ? undefined : fehler;
  const ereignisse = {
    onInput: () => {
      if (fehler && !versteckt) setVersteckt(true);
    },
    onBlur: () => {
      if (versteckt) setVersteckt(false);
    },
  };
  if (!label) {
    return (
      <div className={className} {...ereignisse}>
        {children}
        <Fehlertext text={sichtbar} />
      </div>
    );
  }
  return (
    <div className={className} {...ereignisse}>
      <Feld label={label} hinweis={hinweis}>
        {children}
      </Feld>
      <Fehlertext text={sichtbar} />
    </div>
  );
}

export function TextFeld({
  label,
  wert,
  onSpeichern,
  hinweis,
  fehler,
  type = "text",
  placeholder,
  kompakt = false,
  mehrzeilig = false,
  ariaLabel,
  className,
  feldClassName = "",
  inputMode,
  autoFocus,
}: {
  label?: string;
  wert: string;
  onSpeichern: (wert: string) => void;
  hinweis?: string;
  fehler?: string;
  type?: "text" | "date" | "email" | "tel" | "url";
  placeholder?: string;
  kompakt?: boolean;
  mehrzeilig?: boolean;
  ariaLabel?: string;
  className?: string;
  feldClassName?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "url";
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(wert);
  const [letzter, setLetzter] = useState(wert);
  if (wert !== letzter) {
    setLetzter(wert);
    setText(wert);
  }
  const uebernehmen = useCallback(() => {
    if (text !== wert) onSpeichern(text);
  }, [text, wert, onSpeichern]);
  const klassen = `${kompakt ? KOMPAKT : ""} ${feldClassName}`;
  return (
    <Huelle label={label} hinweis={hinweis} fehler={fehler} className={className}>
      {mehrzeilig ? (
        <Textbereich value={text} onChange={(e) => setText(e.target.value)} onBlur={uebernehmen} placeholder={placeholder} aria-label={ariaLabel} className={klassen} aria-invalid={fehler ? true : undefined} />
      ) : (
        <Eingabe
          type={type}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={uebernehmen}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={fehler ? true : undefined}
          className={klassen}
          inputMode={inputMode}
          autoFocus={autoFocus}
        />
      )}
    </Huelle>
  );
}

/** Ganze oder Dezimalzahl in deutscher Schreibweise; leer = null, wenn `leerErlaubt`. */
export function ZahlFeld({
  label,
  wert,
  onSpeichern,
  hinweis,
  fehler,
  ganzzahl = true,
  leerErlaubt = false,
  kompakt = false,
  gruppierung = true,
  ariaLabel,
  className,
  einheit,
}: {
  label?: string;
  wert: number | null;
  onSpeichern: (wert: number | null) => void;
  hinweis?: string;
  fehler?: string;
  ganzzahl?: boolean;
  leerErlaubt?: boolean;
  kompakt?: boolean;
  /** Tausenderpunkte; aus für Jahreszahlen, Kontonummern und Zähler. */
  gruppierung?: boolean;
  ariaLabel?: string;
  className?: string;
  einheit?: string;
}) {
  const anzeige = (n: number | null) => (n === null ? "" : new Intl.NumberFormat("de-DE", { maximumFractionDigits: ganzzahl ? 0 : 2, useGrouping: gruppierung }).format(n));
  const [text, setText] = useState(anzeige(wert));
  const [letzter, setLetzter] = useState(wert);
  if (wert !== letzter) {
    setLetzter(wert);
    setText(anzeige(wert));
  }
  function uebernehmen() {
    const t = text.trim().replace(/\./g, "").replace(",", ".");
    if (!t) {
      if (leerErlaubt) {
        if (wert !== null) onSpeichern(null);
      } else setText(anzeige(wert));
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n) || (ganzzahl && !Number.isInteger(n))) {
      setText(anzeige(wert));
      return;
    }
    setText(anzeige(n));
    if (n !== wert) onSpeichern(n);
  }
  const feld = (
    <Eingabe
      inputMode={ganzzahl ? "numeric" : "decimal"}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={uebernehmen}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      aria-label={ariaLabel}
      aria-invalid={fehler ? true : undefined}
      className={`zahl ${kompakt ? KOMPAKT : ""}`}
    />
  );
  return (
    <Huelle label={label} hinweis={hinweis} fehler={fehler} className={className}>
      {einheit ? (
        <span className="flex items-center gap-2">
          {feld}
          <span className="shrink-0 text-sm text-tinte-2">{einheit}</span>
        </span>
      ) : (
        feld
      )}
    </Huelle>
  );
}

export function GeldFeld({
  label,
  wert,
  onSpeichern,
  hinweis,
  fehler,
  kompakt = false,
  ariaLabel,
  className,
}: {
  label?: string;
  wert: number;
  onSpeichern: (wert: number) => void;
  hinweis?: string;
  fehler?: string;
  kompakt?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Huelle label={label} hinweis={hinweis} fehler={fehler} className={className}>
      <span className="flex items-center gap-2">
        <GeldEingabe wert={wert} onWert={onSpeichern} ariaLabel={ariaLabel ?? label} className={kompakt ? KOMPAKT : ""} />
        <span className="shrink-0 text-sm text-tinte-2">€</span>
      </span>
    </Huelle>
  );
}

export function AuswahlFeld<T extends string>({
  label,
  wert,
  optionen,
  onSpeichern,
  hinweis,
  fehler,
  kompakt = false,
  ariaLabel,
  className,
}: {
  label?: string;
  wert: T;
  optionen: { wert: T; text: string }[];
  onSpeichern: (wert: T) => void;
  hinweis?: string;
  fehler?: string;
  kompakt?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Huelle label={label} hinweis={hinweis} fehler={fehler} className={className}>
      <Auswahl value={wert} onChange={(e) => onSpeichern(e.target.value as T)} aria-label={ariaLabel} className={kompakt ? KOMPAKT : ""}>
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.text}
          </option>
        ))}
      </Auswahl>
    </Huelle>
  );
}

/** Ein Häkchen mit Satz daneben. */
export function SchalterFeld({
  text,
  wert,
  onSpeichern,
  hinweis,
  ariaLabel,
  className = "",
}: {
  text?: string;
  wert: boolean;
  onSpeichern: (wert: boolean) => void;
  hinweis?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-2 ${className}`}>
      <input type="checkbox" checked={wert} onChange={(e) => onSpeichern(e.target.checked)} aria-label={ariaLabel} className="mt-1 h-4 w-4 shrink-0 accent-tinte" />
      {text ? (
        <span>
          <span className="block">{text}</span>
          {hinweis ? <span className="block text-xs text-tinte-3">{hinweis}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

/** Eine Gruppe von Feldern auf einem Blatt, mit Titel und einem erklärenden Satz. */
export function Gruppe({ titel, text, children, spalten = 2, className = "" }: { titel: string; text?: ReactNode; children: ReactNode; spalten?: 1 | 2 | 3; className?: string }) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[spalten];
  return (
    <section className={`blatt p-5 ${className}`}>
      <h2 className="text-lg">{titel}</h2>
      {text ? <p className="mt-1 text-sm text-tinte-2">{text}</p> : null}
      <div className={`mt-4 grid gap-x-5 gap-y-4 ${cols}`}>{children}</div>
    </section>
  );
}
