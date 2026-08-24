"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { herunterladen } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Gruppe } from "./Felder";
import { ReiterKopf } from "./Reiter";
import {
  allesLoeschen, arbeitsbereichAlsDatei, arbeitsbereichAusDatei, beispielbetriebLaden, bestandZaehlen, persistentenSpeicherAnfordern, speicherStatus,
  type Bestand, type SpeicherStatus,
} from "./speicher";
import { speicherGroesse } from "./logik";

type Meldung = { ton: "ok" | "fehler" | "warnung"; text: string };

const BESTAND_TEXTE: [keyof Bestand, string][] = [
  ["objekte", "Objekte"],
  ["einheiten", "Einheiten"],
  ["personen", "Personen"],
  ["kostenarten", "Kostenarten"],
  ["leistungen", "Leistungen"],
  ["dokumente", "Dokumente"],
  ["belege", "Belege"],
  ["buchungen", "Buchungen"],
  ["bankkonten", "Bankkonten"],
  ["bankumsaetze", "Bankumsätze"],
  ["angebote", "Angebote"],
  ["rechnungen", "Rechnungen"],
  ["mahnungen", "Mahnungen"],
  ["protokoll", "Protokolleinträge"],
];

export function DatenReiter() {
  const bestand = useLiveQuery(() => bestandZaehlen(), []);
  const einstellungen = useLiveQuery(() => db.einstellungen.get("einstellungen"), []);
  const [speicher, setSpeicher] = useState<SpeicherStatus | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const importEingabe = useRef<HTMLInputElement>(null);

  useEffect(() => {
    speicherStatus().then(setSpeicher);
  }, [bestand]);

  async function beispiel() {
    if (einstellungen?.beispielGeladen && !window.confirm("Der Beispielbetrieb ist schon geladen. Noch einmal laden setzt Firma, Objekte und Personen des Beispiels zurück; eigene Daten bleiben.")) return;
    setLaeuft("beispiel");
    try {
      await beispielbetriebLaden();
      setMeldung({ ton: "ok", text: "Der Beispielbetrieb ist da: Hausverwaltung Mustermann mit fünf Objekten, Mietern und Bankkonten." });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Laden fehlgeschlagen." });
    } finally {
      setLaeuft(null);
    }
  }

  async function exportieren() {
    setLaeuft("export");
    try {
      const { blob, dateiname } = await arbeitsbereichAlsDatei();
      herunterladen(blob, dateiname);
      setMeldung({ ton: "ok", text: `„${dateiname}“ (${speicherGroesse(blob.size)}) wurde gespeichert. Die Datei enthält alles, auch die Belegbilder.` });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Export fehlgeschlagen." });
    } finally {
      setLaeuft(null);
    }
  }

  async function importieren(datei: File | undefined) {
    if (!datei) return;
    if (!window.confirm(`„${datei.name}“ importieren? Das ersetzt ALLES, was gerade in dieser App liegt: Stammdaten, Belege, Buchungen, Protokoll. Vorher exportieren, wenn Sie etwas behalten wollen.`)) return;
    setLaeuft("import");
    try {
      await arbeitsbereichAusDatei(datei);
      setMeldung({ ton: "ok", text: `„${datei.name}“ ist eingelesen. Der Arbeitsbereich ist jetzt der aus der Datei.` });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Import fehlgeschlagen." });
    } finally {
      setLaeuft(null);
    }
  }

  async function loeschen() {
    if (!window.confirm("Wirklich alles löschen? Stammdaten, Belege, Buchungen, Bank, Protokoll. Das lässt sich nur mit einer Exportdatei rückgängig machen.")) return;
    const antwort = window.prompt("Zur Sicherheit: Tippen Sie LÖSCHEN, um den kompletten Arbeitsbereich zu leeren.");
    if (antwort !== "LÖSCHEN") {
      setMeldung({ ton: "warnung", text: "Nichts gelöscht." });
      return;
    }
    setLaeuft("loeschen");
    try {
      await allesLoeschen();
      setMeldung({ ton: "ok", text: "Der Arbeitsbereich ist leer. Beim nächsten Öffnen der Stammdaten werden Standard-Kostenarten und Leistungskatalog wieder angelegt; alles andere bleibt leer." });
    } finally {
      setLaeuft(null);
    }
  }

  async function persistent() {
    const ok = await persistentenSpeicherAnfordern();
    setSpeicher(await speicherStatus());
    setMeldung(
      ok
        ? { ton: "ok", text: "Der Browser hält die Daten jetzt dauerhaft, auch wenn der Speicher knapp wird." }
        : { ton: "warnung", text: "Der Browser hat die Anfrage abgelehnt oder still entschieden. Chrome und Safari gewähren das erst nach regelmäßiger Nutzung; Firefox fragt nach. Ein Export bleibt die sichere Kopie." },
    );
  }

  const belegtProzent = speicher?.belegt && speicher.verfuegbar ? Math.max(0.5, (speicher.belegt / speicher.verfuegbar) * 100) : 0;

  return (
    <>
      <ReiterKopf
        titel="Daten"
        text="Alle Daten liegen in diesem Browser, nicht auf einem Server. Sichern heißt exportieren; umziehen heißt die Datei woanders importieren."
      />
      {meldung ? (
        <div className="mb-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Gruppe titel="Was gerade hier liegt" spalten={1}>
          {bestand ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              {BESTAND_TEXTE.map(([k, text]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-linie py-1">
                  <dt className="text-tinte-2">{text}</dt>
                  <dd className="zahl">{new Intl.NumberFormat("de-DE").format(bestand[k])}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Gruppe>

        <Gruppe titel="Speicher im Browser" spalten={1}>
          {speicher && speicher.unterstuetzt ? (
            <>
              <p className="text-sm">
                Belegt: <span className="zahl font-medium">{speicherGroesse(speicher.belegt) || "unbekannt"}</span>
                {speicher.verfuegbar ? (
                  <>
                    {" "}
                    von etwa <span className="zahl">{speicherGroesse(speicher.verfuegbar)}</span>, die der Browser dieser App einräumt.
                  </>
                ) : null}
              </p>
              {speicher.verfuegbar ? (
                <div className="h-1.5 w-full rounded-[2px] bg-linie" aria-hidden="true">
                  <div className="h-full rounded-[2px] bg-tinte-2" style={{ width: `${Math.min(100, belegtProzent)}%` }} />
                </div>
              ) : null}
              <p className="text-sm">
                Dauerhafter Speicher:{" "}
                {speicher.persistent === null ? (
                  <span className="text-tinte-3">nicht abfragbar</span>
                ) : speicher.persistent ? (
                  <span className="text-gruen">gewährt</span>
                ) : (
                  <span className="text-ocker">nicht gewährt</span>
                )}
              </p>
              <p className="text-xs text-tinte-3">
                Ohne dauerhaften Speicher darf der Browser die Daten löschen, wenn der Platz knapp wird; Safari tut das nach sieben Tagen ohne Nutzung. Ein Export ist die einzige echte Sicherung.
              </p>
              {speicher.persistent !== true ? (
                <div>
                  <Button variante="sekundaer" klein onClick={persistent}>
                    Dauerhaften Speicher anfordern
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-tinte-3">Dieser Browser gibt keine Auskunft über seinen Speicher.</p>
          )}
        </Gruppe>

        <Gruppe titel="Sichern" text="Eine JSON-Datei mit allem: Einstellungen, Stammdaten, Dokumente samt Dateien, Buchungen, Bank, Protokoll." spalten={1}>
          <div>
            <Button onClick={exportieren} disabled={laeuft !== null}>
              {laeuft === "export" ? "Wird gepackt…" : "Arbeitsbereich exportieren"}
            </Button>
          </div>
          <p className="text-xs text-tinte-3">Dateiname mit Datum, z. B. hausverwailter-arbeitsbereich-2026-08-23.json. Am besten wöchentlich und vor jedem Umzug.</p>
        </Gruppe>

        <Gruppe titel="Umziehen" text="Eine Exportdatei auf einem anderen Rechner oder in einem anderen Browser einlesen." spalten={1}>
          <div>
            <Button variante="sekundaer" onClick={() => importEingabe.current?.click()} disabled={laeuft !== null}>
              {laeuft === "import" ? "Wird eingelesen…" : "Datei wählen und importieren"}
            </Button>
            <input
              ref={importEingabe}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const datei = e.target.files?.[0];
                e.target.value = "";
                importieren(datei);
              }}
            />
          </div>
          <p className="text-xs text-tinte-3">Der Import ersetzt den gesamten Inhalt dieser App; er wird vorher bestätigt.</p>
        </Gruppe>

        <Gruppe titel="Beispielbetrieb" text="Zum Ausprobieren und Vorführen." spalten={1}>
          <p className="text-sm text-tinte-2">
            Lädt die fiktive „Hausverwaltung Mustermann GmbH“ aus Köln: Firma und Briefkopf, fünf Objekte (drei WEGs, zwei Mietobjekte) mit Einheiten, acht Mieter und zwei Eigentümer mit Soll und IBANs, drei Bankkonten und der Leistungskatalog. Vorhandene Kostenarten und Leistungen bleiben, wie sie sind; eigene Objekte und Personen auch.
          </p>
          <div>
            <Button variante="sekundaer" onClick={beispiel} disabled={laeuft !== null}>
              {laeuft === "beispiel" ? "Wird geladen…" : einstellungen?.beispielGeladen ? "Beispielbetrieb erneut laden" : "Beispielbetrieb laden"}
            </Button>
          </div>
        </Gruppe>

        <Gruppe titel="Alles löschen" text="Leert den kompletten Arbeitsbereich in diesem Browser. Wird zweimal bestätigt." spalten={1}>
          <div>
            <Button variante="gefaehrlich" onClick={loeschen} disabled={laeuft !== null}>
              {laeuft === "loeschen" ? "Wird gelöscht…" : "Arbeitsbereich löschen"}
            </Button>
          </div>
          <p className="text-xs text-tinte-3">Vorher exportieren. Der Löschvorgang selbst steht danach als erster Eintrag im neuen Protokoll.</p>
        </Gruppe>
      </div>
    </>
  );
}
