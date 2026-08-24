"use client";

import { useMemo, useState } from "react";
import type { Bankkonto, Bankumsatz, Einheit, Objekt, Person } from "@/lib/domain/schema";
import { betrag, monatName } from "@/lib/format";
import { summe } from "@/lib/geld";
import { istDoppelzahlung, monateZwischen, sollstellungen } from "@/lib/bank/sollstellungen";
import { faelligkeit } from "@/lib/bank/verzugszinsen";
import { datum } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Auswahl, Eingabe } from "@/components/ui/Feld";
import { Stempel } from "@/components/ui/Stempel";
import { Leer } from "@/components/ui/Leer";
import { Hinweis } from "@/components/ui/Hinweis";
import { mahnvorschlaegeAnlegen } from "./aktionen";
import { SOLL_STATUS, type Meldung } from "./texte";

/** Soll/Ist je Person für einen Monat: die Mieteingangs- bzw. Hausgeldliste. */
export function Mieteingang({
  objekte,
  konten,
  personen,
  einheiten,
  umsaetze,
  toleranz,
  objektId,
  onObjekt,
  monat,
  onMonat,
  heute,
  onMeldung,
  onZuMahnungen,
}: {
  objekte: Objekt[];
  konten: Bankkonto[];
  personen: Person[];
  einheiten: Einheit[];
  umsaetze: Bankumsatz[];
  toleranz: number;
  objektId: string;
  onObjekt: (id: string) => void;
  monat: string;
  onMonat: (m: string) => void;
  heute: string;
  onMeldung: (m: Meldung | null) => void;
  onZuMahnungen: () => void;
}) {
  const [laufend, setLaufend] = useState(false);
  const objekt = objekte.find((o) => o.id === objektId);
  const personenObjekt = useMemo(() => personen.filter((p) => p.objektId === objektId), [personen, objektId]);
  const kontenObjekt = useMemo(() => new Set(konten.filter((k) => k.objektId === objektId).map((k) => k.id)), [konten, objektId]);
  const umsaetzeObjekt = useMemo(() => umsaetze.filter((u) => kontenObjekt.has(u.bankkontoId)), [umsaetze, kontenObjekt]);
  const liste = useMemo(() => {
    const einheitName = new Map(einheiten.map((e) => [e.id, e.bezeichnung]));
    return sollstellungen(personenObjekt, umsaetzeObjekt, monat, toleranz)
      .map((s) => {
        const p = personenObjekt.find((x) => x.id === s.personId)!;
        return { s, p, einheit: p.einheitId ? einheitName.get(p.einheitId) ?? "" : "" };
      })
      .sort((a, b) => (a.einheit || a.p.name).localeCompare(b.einheit || b.p.name, "de", { numeric: true }));
  }, [personenObjekt, umsaetzeObjekt, monat, toleranz, einheiten]);

  const summen = { soll: summe(liste.map((x) => x.s.soll)), ist: summe(liste.map((x) => x.s.ist)), offen: summe(liste.filter((x) => x.s.differenz > 0).map((x) => x.s.differenz)) };
  const offene = liste.filter((x) => x.s.status === "offen" || x.s.status === "teilweise").length;
  const faellig = faelligkeit(monat, 3);
  const istWeg = objekt?.art === "WEG";

  /** Erster Monat, für den Umsätze importiert sind: davor kann niemand fehlenden Zahlungen nachgehen. */
  const erster = useMemo(() => umsaetzeObjekt.reduce((min, u) => (u.buchungstag < min ? u.buchungstag : min), "9999").slice(0, 7), [umsaetzeObjekt]);

  async function vorschlagen() {
    setLaufend(true);
    try {
      const zwoelf = monateZwischen(`${Number(monat.slice(0, 4)) - 1}-${monat.slice(5, 7)}`, monat).slice(-12)[0] ?? monat;
      const von = erster > zwoelf && erster <= monat ? erster : zwoelf;
      const n = await mahnvorschlaegeAnlegen(objektId, von, monat);
      onMeldung({
        ton: n ? "ok" : "hinweis",
        text: n
          ? `${n} Zahlungserinnerung${n > 1 ? "en" : ""} vorgeschlagen (Rückstände ${monatName(von)} bis ${monatName(monat)}). Bitte prüfen, dann als PDF erzeugen und als versendet markieren.`
          : "Nichts vorzuschlagen: entweder ist alles bezahlt, die Fälligkeit liegt noch in der Zukunft, oder es gibt schon einen offenen Vorschlag je Person.",
      });
      if (n) onZuMahnungen();
    } finally {
      setLaufend(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-sm text-tinte-2">Objekt</span>
            <Auswahl value={objektId} onChange={(e) => onObjekt(e.target.value)} className="min-w-64">
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kurzname}
                </option>
              ))}
            </Auswahl>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-tinte-2">Monat</span>
            <div className="w-44">
              <Eingabe type="month" value={monat} onChange={(e) => e.target.value && onMonat(e.target.value)} />
            </div>
          </label>
          <span className="pb-2 text-sm text-tinte-3">fällig bis {datum(faellig)} (3. Werktag)</span>
        </div>
        <Button onClick={vorschlagen} disabled={laufend || !offene || faellig >= heute || erster > monat}>
          {laufend ? "Wird geprüft…" : "Zahlungserinnerungen vorschlagen"}
        </Button>
      </div>

      {!personenObjekt.length ? (
        <Leer titel="Keine Mieter oder Eigentümer mit Soll">Legen Sie unter Stammdaten die Personen dieses Objekts mit Kaltmiete und Nebenkosten (bzw. Hausgeld) an. Dann steht hier je Monat, wer gezahlt hat.</Leer>
      ) : !kontenObjekt.size ? (
        <Leer titel="Kein Bankkonto für dieses Objekt">Ordnen Sie unter Stammdaten ein Bankkonto diesem Objekt zu und importieren Sie den Kontoauszug.</Leer>
      ) : (
        <>
          {!umsaetzeObjekt.some((u) => u.buchungstag.startsWith(monat)) ? (
            <div className="mb-3">
              <Hinweis ton="hinweis">Für {monatName(monat)} sind noch keine Umsätze importiert; die Liste zeigt deshalb alles als offen.</Hinweis>
            </div>
          ) : null}
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>{istWeg ? "Eigentümer" : "Mieter"}</th>
                  <th>Einheit</th>
                  <th className="zahl">Soll</th>
                  <th className="zahl">Ist</th>
                  <th className="zahl">Differenz</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {liste.map(({ s, p, einheit }) => {
                  const doppelt = istDoppelzahlung(s, toleranz);
                  const st = SOLL_STATUS[s.status];
                  return (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td className="text-tinte-2">{einheit}</td>
                      <td className="zahl whitespace-nowrap">{betrag(s.soll)} €</td>
                      <td className="zahl whitespace-nowrap">{betrag(s.ist)} €</td>
                      <td className={`zahl whitespace-nowrap ${s.differenz > toleranz ? "text-stempel-2" : s.differenz < -toleranz ? "text-ocker" : "text-tinte-3"}`}>{betrag(s.differenz)} €</td>
                      <td className="whitespace-nowrap">
                        <Stempel text={doppelt ? "Doppelt gezahlt" : st.text} ton={st.ton} groesse="klein" />
                        {s.umsatzIds.length > 1 ? <span className="ml-2 text-xs text-tinte-3">{s.umsatzIds.length} Zahlungen</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Summe {monatName(monat)}</td>
                  <td className="zahl whitespace-nowrap">{betrag(summen.soll)} €</td>
                  <td className="zahl whitespace-nowrap">{betrag(summen.ist)} €</td>
                  <td className={`zahl whitespace-nowrap ${summen.offen > 0 ? "text-stempel-2" : ""}`}>{betrag(summen.offen)} €</td>
                  <td className="text-sm font-normal text-tinte-2">{offene ? `${offene} offen` : "alles bezahlt"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
