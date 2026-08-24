"use client";

import { useCallback, useState, type ReactNode } from "react";

/** Textreiter: der aktive ist fett, sonst nichts. Wie die Filter im Posteingang. */
export function Reiter<T extends string>({ eintraege, aktiv, onWechsel }: { eintraege: { id: T; text: string }[]; aktiv: T; onWechsel: (id: T) => void }) {
  return (
    <div role="tablist" className="mb-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-linie text-[0.9375rem]">
      {eintraege.map((e) => (
        <button
          key={e.id}
          type="button"
          role="tab"
          aria-selected={e.id === aktiv}
          onClick={() => onWechsel(e.id)}
          className={`pb-2.5 transition-colors ${e.id === aktiv ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}
        >
          {e.text}
        </button>
      ))}
    </div>
  );
}

/** Kopf eines Reiters: Titel, ein Satz, rechts Aktionen und die Bestätigung "Gespeichert 16:42". */
export function ReiterKopf({ titel, text, aktionen, gespeichert }: { titel: string; text?: ReactNode; aktionen?: ReactNode; gespeichert?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl">{titel}</h2>
        {text ? <p className="mt-1 max-w-2xl text-sm text-tinte-2">{text}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {gespeichert ? (
          <span className="text-sm text-tinte-3" role="status" aria-live="polite">
            {gespeichert}
          </span>
        ) : null}
        {aktionen}
      </div>
    </div>
  );
}

/** Merkt sich die Uhrzeit der letzten Speicherung eines Reiters. */
export function useGespeichert() {
  const [text, setText] = useState("");
  const markiere = useCallback(() => {
    setText(`Gespeichert ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`);
  }, []);
  return { gespeichert: text, markiere };
}
