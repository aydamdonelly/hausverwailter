"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Objekt } from "@/lib/domain/schema";
import { betrag, datum, kurz, monatName } from "@/lib/format";
import { lokalesDatum, monateImJournal, QUELLE_TEXT, summeBetraege, summenJeKostenart, type Betragssumme, type JournalFilter, type JournalZeile, type KostenartSumme } from "@/lib/export/journal";
import { Auswahl } from "@/components/ui/Feld";

export function Buchungsjournal({
  zeilen,
  gefiltert,
  filter,
  onFilter,
  objekte,
}: {
  zeilen: JournalZeile[];
  gefiltert: JournalZeile[];
  filter: JournalFilter;
  onFilter: (f: JournalFilter) => void;
  objekte: Objekt[];
}) {
  const monate = useMemo(() => monateImJournal(zeilen), [zeilen]);
  const summe = useMemo(() => summeBetraege(gefiltert), [gefiltert]);
  const kostenarten = useMemo(() => summenJeKostenart(gefiltert), [gefiltert]);
  const objektNamen = useMemo(() => objekte.filter((o) => zeilen.some((z) => z.objektId === o.id)), [objekte, zeilen]);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="block w-48">
            <span className="mb-1 block text-sm text-tinte-2">Monat</span>
            <Auswahl value={filter.monat} onChange={(e) => onFilter({ ...filter, monat: e.target.value })}>
              <option value="">Alle Monate</option>
              {monate.map((m) => (
                <option key={m} value={m}>
                  {monatName(m)}
                </option>
              ))}
            </Auswahl>
          </label>
          <label className="block w-56">
            <span className="mb-1 block text-sm text-tinte-2">Objekt</span>
            <Auswahl value={filter.objektId} onChange={(e) => onFilter({ ...filter, objektId: e.target.value })}>
              <option value="">Alle Objekte</option>
              {objektNamen.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kurzname}
                </option>
              ))}
            </Auswahl>
          </label>
          <label className="block w-40">
            <span className="mb-1 block text-sm text-tinte-2">Quelle</span>
            <Auswahl value={filter.quelle} onChange={(e) => onFilter({ ...filter, quelle: e.target.value as JournalFilter["quelle"] })}>
              <option value="">Alle Quellen</option>
              {(Object.keys(QUELLE_TEXT) as (keyof typeof QUELLE_TEXT)[]).map((q) => (
                <option key={q} value={q}>
                  {QUELLE_TEXT[q]}
                </option>
              ))}
            </Auswahl>
          </label>
          <label className="block w-52">
            <span className="mb-1 block text-sm text-tinte-2">Export</span>
            <Auswahl value={filter.exportiert} onChange={(e) => onFilter({ ...filter, exportiert: e.target.value as JournalFilter["exportiert"] })}>
              <option value="">Alle</option>
              <option value="nein">Noch nicht exportiert</option>
              <option value="ja">Exportiert</option>
            </Auswahl>
          </label>
          <span className="pb-2 text-sm text-tinte-2">
            {gefiltert.length} von {zeilen.length} Buchungen
          </span>
        </div>

        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Beleg / Nr.</th>
                <th>Text</th>
                <th>Objekt</th>
                <th>Kostenart</th>
                <th>Umlagefähig</th>
                <th>Konto</th>
                <th className="zahl">Netto</th>
                <th className="zahl">USt</th>
                <th className="zahl">Brutto</th>
                <th>S/H</th>
                <th>Exportiert</th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((z) => (
                <tr key={z.id}>
                  <td className="whitespace-nowrap">{datum(z.datum)}</td>
                  <td className="whitespace-nowrap">
                    {z.dokumentId ? (
                      <Link href={`/belege/${z.dokumentId}`} className="font-medium hover:underline">
                        {z.belegnummer || "(ohne Nummer)"}
                      </Link>
                    ) : (
                      <span className="font-medium">{z.belegnummer || "(ohne Nummer)"}</span>
                    )}
                    <div className="text-xs text-tinte-3">{QUELLE_TEXT[z.quelle]}</div>
                  </td>
                  <td>
                    <div title={z.text}>{kurz(z.text, 48)}</div>
                    {z.partner && z.partner !== z.text ? <div className="text-xs text-tinte-3">{kurz(z.partner, 40)}</div> : null}
                  </td>
                  <td>{z.objekt}</td>
                  <td>
                    {z.kostenart}
                    {z.betrkv ? <div className="text-xs text-tinte-3">{z.betrkv}</div> : null}
                  </td>
                  <td>{z.umlagefaehig === null ? "" : z.umlagefaehig ? "Ja" : "Nein"}</td>
                  <td className="zahl whitespace-nowrap !text-left">
                    {z.konto || "–"}
                    {z.gegenkonto ? <span className="text-tinte-3"> / {z.gegenkonto}</span> : null}
                  </td>
                  <td className="zahl whitespace-nowrap">{betrag(z.netto)}</td>
                  <td className="zahl whitespace-nowrap">
                    {betrag(z.ust)}
                    {z.ustSatz ? <span className="ml-1 text-xs text-tinte-3">{z.ustSatz} %</span> : null}
                  </td>
                  <td className="zahl whitespace-nowrap">{betrag(z.brutto)}</td>
                  <td>{z.sollHaben}</td>
                  <td className="whitespace-nowrap text-tinte-2">{z.exportiertAm ? datum(lokalesDatum(z.exportiertAm)) : ""}</td>
                </tr>
              ))}
            </tbody>
            {gefiltert.length ? (
              <tfoot>
                <tr>
                  <td colSpan={7}>Summe {gefiltert.length === zeilen.length ? "aller" : "der gefilterten"} Buchungen</td>
                  <td className="zahl whitespace-nowrap">{betrag(summe.netto)}</td>
                  <td className="zahl whitespace-nowrap">{betrag(summe.ust)}</td>
                  <td className="zahl whitespace-nowrap">{betrag(summe.brutto)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            ) : null}
          </table>
          {gefiltert.length === 0 ? <p className="p-5 text-tinte-2">Keine Buchung in dieser Auswahl. Filter zurücksetzen oder einen anderen Monat wählen.</p> : null}
        </div>
      </div>

      {gefiltert.length ? (
        <div>
          <h2 className="mb-1 text-xl">Summen je Kostenart</h2>
          <p className="mb-3 max-w-2xl text-tinte-2">
            Aufwand der Auswahl, getrennt nach umlagefähig (§ 2 BetrKV, geht in die Betriebskostenabrechnung) und nicht umlagefähig (trägt der Eigentümer). Erlöse und Zahlungen zu Belegen zählen nicht mit.
          </p>
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Kostenart</th>
                  <th>BetrKV</th>
                  <th className="zahl">Buchungen</th>
                  <th className="zahl">Netto</th>
                  <th className="zahl">USt</th>
                  <th className="zahl">Brutto</th>
                </tr>
              </thead>
              <tbody>
                <Gruppe titel="Umlagefähig" zeilen={kostenarten.umlagefaehig} summe={kostenarten.summeUmlagefaehig} leer="Keine umlagefähigen Kosten in dieser Auswahl." />
                <Gruppe titel="Nicht umlagefähig" zeilen={kostenarten.nichtUmlagefaehig} summe={kostenarten.summeNichtUmlagefaehig} leer="Keine nicht umlagefähigen Kosten in dieser Auswahl." />
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Aufwand gesamt</td>
                  <td className="zahl">{kostenarten.umlagefaehig.concat(kostenarten.nichtUmlagefaehig).reduce((n, g) => n + g.anzahl, 0)}</td>
                  <td className="zahl whitespace-nowrap">{betrag(kostenarten.gesamt.netto)}</td>
                  <td className="zahl whitespace-nowrap">{betrag(kostenarten.gesamt.ust)}</td>
                  <td className="zahl whitespace-nowrap">{betrag(kostenarten.gesamt.brutto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Gruppe({ titel, zeilen, summe, leer }: { titel: string; zeilen: KostenartSumme[]; summe: Betragssumme; leer: string }) {
  return (
    <>
      <tr>
        <td colSpan={6} className="bg-blatt-2 font-display font-semibold">
          {titel}
        </td>
      </tr>
      {zeilen.length === 0 ? (
        <tr>
          <td colSpan={6} className="text-tinte-3">
            {leer}
          </td>
        </tr>
      ) : null}
      {zeilen.map((g) => (
        <tr key={g.code || "ohne"}>
          <td>{g.bezeichnung}</td>
          <td className="text-tinte-2">{g.betrkv}</td>
          <td className="zahl">{g.anzahl}</td>
          <td className="zahl whitespace-nowrap">{betrag(g.netto)}</td>
          <td className="zahl whitespace-nowrap">{betrag(g.ust)}</td>
          <td className="zahl whitespace-nowrap">{betrag(g.brutto)}</td>
        </tr>
      ))}
      {zeilen.length ? (
        <tr className="font-semibold">
          <td colSpan={2}>Summe {titel.toLowerCase()}</td>
          <td className="zahl">{zeilen.reduce((n, g) => n + g.anzahl, 0)}</td>
          <td className="zahl whitespace-nowrap">{betrag(summe.netto)}</td>
          <td className="zahl whitespace-nowrap">{betrag(summe.ust)}</td>
          <td className="zahl whitespace-nowrap">{betrag(summe.brutto)}</td>
        </tr>
      ) : null}
    </>
  );
}
