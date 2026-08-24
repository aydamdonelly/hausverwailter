"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Dokument, Objekt } from "@/lib/domain/schema";
import { vergleicheHandwerkerangebote } from "@/lib/angebote/handwerkerangebote";
import { betrag, datum, kurz, prozent } from "@/lib/format";
import { Stempel } from "@/components/ui/Stempel";

/** Handwerkerangebote aus dem Posteingang nebeneinander: wer, was, Netto, Brutto, Bedingungen, was auffiel. */
export function HandwerkerVergleich({ dokumente, objekte }: { dokumente: Dokument[]; objekte: Objekt[] }) {
  const zeilen = useMemo(() => vergleicheHandwerkerangebote(dokumente.map((d) => ({ dokumentId: d.id, dateiname: d.dateiname, notizen: d.notizen }))), [dokumente]);
  const objektName = useMemo(() => new Map(objekte.map((o) => [o.id, o.kurzname])), [objekte]);
  if (!zeilen.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-1 text-xl">Handwerkerangebote im Vergleich</h2>
      <p className="mb-3 text-tinte-2">
        Gelesene Angebote und Kostenvoranschläge aus dem Posteingang, sortiert nach Bruttobetrag. Die Zahlen stammen aus den Dokumenten; ob die Leistung vergleichbar ist, entscheiden Sie.
      </p>
      <div className="blatt overflow-x-auto">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Anbieter</th>
              <th>Leistung</th>
              <th>Objekt</th>
              <th className="zahl">Netto</th>
              <th className="zahl">Brutto</th>
              <th className="zahl">Abweichung</th>
              <th className="zahl">Pos.</th>
              <th>Bedingungen</th>
              <th>Auffälligkeiten</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.dokumentId}>
                <td>
                  <Link href={`/belege/${z.dokumentId}`} className="font-medium hover:underline">
                    {z.anbieter}
                  </Link>
                  <div className="text-sm text-tinte-3">
                    {z.datum ? `vom ${datum(z.datum)}` : ""}
                    {z.gueltigBis ? `, gültig bis ${datum(z.gueltigBis)}` : ""}
                  </div>
                  {z.guenstigstes && zeilen.length > 1 ? (
                    <div className="mt-1">
                      <Stempel text="Günstigstes" ton="gruen" groesse="klein" />
                    </div>
                  ) : null}
                </td>
                <td className="max-w-[16rem]">{kurz(z.leistungKurz, 90)}</td>
                <td className="whitespace-nowrap">{z.objektId ? objektName.get(z.objektId) ?? z.objektHinweis : z.objektHinweis ? <span className="text-tinte-3">{kurz(z.objektHinweis, 30)}</span> : ""}</td>
                <td className="zahl whitespace-nowrap">{z.netto ? betrag(z.netto) : ""}</td>
                <td className="zahl whitespace-nowrap font-medium">{z.brutto ? betrag(z.brutto) : ""}</td>
                <td className="zahl whitespace-nowrap">{z.brutto && zeilen.length > 1 ? (z.abweichungProzent === 0 ? "–" : `+${prozent(z.abweichungProzent)}`) : ""}</td>
                <td className="zahl">{z.anzahlPositionen}</td>
                <td className="max-w-[16rem] text-sm">
                  {z.bedingungen.length ? (
                    <ul className="list-disc space-y-0.5 pl-4">
                      {z.bedingungen.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-tinte-3">keine genannt</span>
                  )}
                </td>
                <td className="max-w-[16rem] text-sm">
                  {z.auffaelligkeiten.length ? (
                    <ul className="list-disc space-y-0.5 pl-4">
                      {z.auffaelligkeiten.map((a, i) => (
                        <li key={i} className="text-ocker">
                          {a}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-tinte-3">keine</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
