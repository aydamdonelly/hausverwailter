"use client";

import { useRef, useState, type DragEvent } from "react";
import { Button } from "./Button";

/**
 * Der Ablagekorb: Dateien hineinziehen oder auswählen. Zeigt beim Lesen einen Balken.
 * Bewusst schlicht: ein gestrichelter Rahmen, ein Satz, ein Knopf.
 */
export function Ablagekorb({
  onDateien,
  laufend,
  akzeptiert = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.eml,.txt,.csv,.xml,.sta,.mt940",
  text = "Belege, Fotos, E-Mails (.eml) oder Kontoauszüge (CSV) hier ablegen",
  klein = false,
}: {
  onDateien: (dateien: File[]) => void;
  laufend?: { fertig: number; gesamt: number } | null;
  akzeptiert?: string;
  text?: string;
  klein?: boolean;
}) {
  const [aktiv, setAktiv] = useState(false);
  const eingabe = useRef<HTMLInputElement>(null);

  function drop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setAktiv(false);
    const dateien = [...e.dataTransfer.files];
    if (dateien.length) onDateien(dateien);
  }

  return (
    <div
      className={`ablage ${aktiv ? "aktiv" : ""} ${klein ? "px-4 py-4" : "px-6 py-8"} text-center`}
      onDragOver={(e) => {
        e.preventDefault();
        setAktiv(true);
      }}
      onDragLeave={() => setAktiv(false)}
      onDrop={drop}
      role="group"
      aria-label="Ablagekorb"
    >
      <p className={klein ? "text-[0.9375rem]" : "text-lg"}>{text}</p>
      {!klein ? <p className="mt-1 text-sm text-tinte-3">PDF, JPG, PNG, HEIC, EML, TXT, CSV. Mehrere auf einmal sind in Ordnung.</p> : null}
      <div className="mt-4">
        <Button variante="sekundaer" klein={klein} onClick={() => eingabe.current?.click()}>
          Dateien wählen
        </Button>
        <input
          ref={eingabe}
          type="file"
          multiple
          accept={akzeptiert}
          className="hidden"
          onChange={(e) => {
            const dateien = [...(e.target.files ?? [])];
            e.target.value = "";
            if (dateien.length) onDateien(dateien);
          }}
        />
      </div>
      {laufend && laufend.gesamt > 0 && laufend.fertig < laufend.gesamt ? (
        <div className="mx-auto mt-5 max-w-sm">
          <p className="mb-2 text-sm text-tinte-2">
            {laufend.fertig} von {laufend.gesamt} gelesen
          </p>
          <div className="lesebalken" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}
