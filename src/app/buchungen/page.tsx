"use client";

import { useMemo, useState } from "react";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { useBuchungsdaten } from "@/components/buchungen/daten";
import { csvExportieren, datevExportieren, excelExportieren } from "@/components/buchungen/exporte";
import { Buchungsjournal } from "@/components/buchungen/Buchungsjournal";
import { Zahlungsvorschlag } from "@/components/buchungen/Zahlungsvorschlag";
import { OffenePosten } from "@/components/buchungen/OffenePosten";
import { filtereJournal, journalZeilen, LEERER_FILTER, type JournalFilter } from "@/lib/export/journal";
import { offeneForderungen, offeneVerbindlichkeiten, zahlungsvorschlag } from "@/lib/export/offene-posten";
import { heuteIso, monatsGrenzen } from "@/lib/format";

type Ansicht = "journal" | "zahlungen" | "offen";

interface Meldung {
  ton: "ok" | "warnung" | "fehler";
  text: string;
  details?: string[];
}

export default function Seite() {
  const daten = useBuchungsdaten();
  const [ansicht, setAnsicht] = useState<Ansicht>("journal");
  const [filter, setFilter] = useState<JournalFilter>(LEERER_FILTER);
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const heute = heuteIso();

  const zeilen = useMemo(
    () => (daten ? journalZeilen(daten.buchungen, { objekte: daten.objekte, kostenarten: daten.kostenarten, belege: daten.belege, rechnungen: daten.rechnungen, bankumsaetze: daten.bankumsaetze }) : []),
    [daten],
  );
  const gefiltert = useMemo(() => filtereJournal(zeilen, filter), [zeilen, filter]);
  const verbindlichkeiten = useMemo(() => (daten ? offeneVerbindlichkeiten(daten.belege, daten.dokumente, daten.objekte, heute) : []), [daten, heute]);
  const forderungen = useMemo(() => (daten ? offeneForderungen(daten.rechnungen, daten.objekte, heute) : []), [daten, heute]);
  const vorschlag = useMemo(() => (daten ? zahlungsvorschlag(verbindlichkeiten, daten.bankkonten, daten.objekte, daten.einstellungen.firma) : null), [daten, verbindlichkeiten]);
  const zahlbar = vorschlag ? vorschlag.gruppen.reduce((n, g) => n + g.posten.length, 0) : 0;
  const nichtExportiert = gefiltert.filter((z) => !z.exportiertAm).length;

  /** Zeitraum der gefilterten Zeilen für Dateinamen und Mieteingang. */
  const zeitraum = useMemo(() => {
    if (filter.monat) return monatsGrenzen(filter.monat);
    if (!gefiltert.length) return { von: heute, bis: heute };
    const daten = gefiltert.map((z) => z.datum).sort();
    return { von: daten[0], bis: daten[daten.length - 1] };
  }, [filter.monat, gefiltert, heute]);

  async function aktion(name: string, lauf: () => Promise<Meldung>) {
    setBeschaeftigt(name);
    setMeldung(null);
    try {
      setMeldung(await lauf());
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Export fehlgeschlagen" });
    } finally {
      setBeschaeftigt(null);
    }
  }

  function datev() {
    if (!daten) return;
    const ids = new Set(gefiltert.map((z) => z.id));
    const buchungen = daten.buchungen.filter((b) => ids.has(b.id));
    const bereits = gefiltert.length - nichtExportiert;
    if (bereits > 0 && !window.confirm(`${bereits} der ${gefiltert.length} Buchungen wurden schon einmal exportiert. Trotzdem alle ${gefiltert.length} in den Stapel aufnehmen?`)) return;
    void aktion("datev", async () => {
      const e = await datevExportieren(buchungen, daten);
      const neue = [...e.neueKreditoren.map((n) => `Kreditor ${n}`), ...e.neueDebitoren.map((n) => `Debitor ${n}`)];
      return {
        ton: e.warnungen.length ? "warnung" : "ok",
        text: `${e.zeilen.length} Buchung${e.zeilen.length === 1 ? "" : "en"} als ${e.dateiname} gespeichert${neue.length ? `, ${neue.length} neue Personenkonten vergeben (${neue.join(", ")})` : ""}.`,
        details: e.warnungen,
      };
    });
  }

  function excel() {
    if (!daten) return;
    void aktion("excel", async () => ({ ton: "ok", text: `${await excelExportieren(gefiltert, daten, zeitraum.von, zeitraum.bis)} gespeichert: Buchungen, Belege, Bankumsätze, Mieteingang.` }));
  }

  function csv() {
    void aktion("csv", async () => ({ ton: "ok", text: `${await csvExportieren(gefiltert, zeitraum.von, zeitraum.bis)} gespeichert (UTF-8, Semikolon, für Excel).` }));
  }

  const zaehler = { journal: zeilen.length, zahlungen: zahlbar, offen: verbindlichkeiten.length + forderungen.length };

  return (
    <>
      <Seitenkopf
        titel="Buchungen"
        text="Alles, was gebucht ist, so wie Steuerberater und Verwaltungssoftware es einlesen: DATEV-Buchungsstapel, Excel, CSV. Dazu der Zahlungsvorschlag als SEPA-Datei und die offenen Posten."
        aktionen={
          ansicht === "journal" && zeilen.length > 0 ? (
            <>
              <Button onClick={datev} disabled={beschaeftigt !== null || gefiltert.length === 0} title="Buchungsstapel im DATEV-Format für die gefilterten Buchungen">
                {beschaeftigt === "datev" ? "Wird erzeugt…" : `DATEV-Buchungsstapel (${gefiltert.length})`}
              </Button>
              <Button variante="sekundaer" onClick={excel} disabled={beschaeftigt !== null || gefiltert.length === 0}>
                {beschaeftigt === "excel" ? "Wird erzeugt…" : "Excel"}
              </Button>
              <Button variante="text" onClick={csv} disabled={beschaeftigt !== null || gefiltert.length === 0}>
                CSV
              </Button>
            </>
          ) : null
        }
      />

      {daten ? (
        <div className="mb-4 flex flex-wrap gap-5 text-[0.9375rem]">
          {(["journal", "zahlungen", "offen"] as Ansicht[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAnsicht(a);
                setMeldung(null);
              }}
              className={`transition-colors ${ansicht === a ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}>
              {{ journal: "Journal", zahlungen: "Zahlungsvorschlag", offen: "Offene Posten" }[a]} <span className="zahl text-tinte-3">{zaehler[a]}</span>
            </button>
          ))}
        </div>
      ) : null}

      {meldung ? (
        <div className="mb-4 space-y-1">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
          {meldung.details?.map((d, i) => (
            <Hinweis key={i} ton="warnung">
              {d}
            </Hinweis>
          ))}
        </div>
      ) : null}

      {!daten ? null : ansicht === "journal" ? (
        zeilen.length === 0 ? (
          <Leer titel="Noch nichts gebucht">Belege im Posteingang freigeben und buchen; jede Buchung erscheint hier mit Konto, Kostenart und Objekt und geht von hier an den Steuerberater.</Leer>
        ) : (
          <Buchungsjournal zeilen={zeilen} gefiltert={gefiltert} filter={filter} onFilter={setFilter} objekte={daten.objekte} />
        )
      ) : ansicht === "zahlungen" ? (
        <Zahlungsvorschlag vorschlag={vorschlag} heute={heute} />
      ) : (
        <OffenePosten verbindlichkeiten={verbindlichkeiten} forderungen={forderungen} />
      )}
    </>
  );
}
