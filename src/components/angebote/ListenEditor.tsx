"use client";

import { Textbereich } from "@/components/ui/Feld";
import { Button } from "@/components/ui/Button";

/**
 * Eine Liste von Textzeilen (Leistungsumfang, Annahmen, Absätze), jede Zeile editierbar,
 * Zeilen können entfernt und angefügt werden. Die Felder wachsen mit dem Text.
 */
export function ListenEditor({
  eintraege,
  onChange,
  hinzufuegenText,
  nummeriert = false,
  disabled = false,
  leerText,
}: {
  eintraege: string[];
  onChange: (neu: string[]) => void;
  hinzufuegenText: string;
  nummeriert?: boolean;
  disabled?: boolean;
  leerText?: string;
}) {
  function setze(i: number, text: string) {
    onChange(eintraege.map((e, k) => (k === i ? text : e)));
  }
  function entferne(i: number) {
    onChange(eintraege.filter((_, k) => k !== i));
  }
  return (
    <div>
      {eintraege.length === 0 && leerText ? <p className="text-sm text-tinte-3">{leerText}</p> : null}
      <ol className="space-y-2">
        {eintraege.map((text, i) => (
          <li key={i} className="flex items-start gap-2">
            {nummeriert ? <span className="zahl w-6 shrink-0 pt-2 text-sm text-tinte-3">{i + 1}.</span> : null}
            <Textbereich
              rows={1}
              value={text}
              disabled={disabled}
              onChange={(e) => setze(i, e.target.value)}
              className="field-sizing-content !min-h-0 leading-snug"
              aria-label={`Eintrag ${i + 1}`}
            />
            {!disabled ? (
              <Button variante="text" klein className="mt-1 shrink-0" onClick={() => entferne(i)} aria-label={`Eintrag ${i + 1} entfernen`}>
                entfernen
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      {!disabled ? (
        <Button variante="text" klein className="mt-2 -ml-1" onClick={() => onChange([...eintraege, ""])}>
          {hinzufuegenText}
        </Button>
      ) : null}
    </div>
  );
}
