"use client";

import Link from "next/link";
import { betrag, datum } from "@/lib/format";
import { summe } from "@/lib/geld";
import type { OffenerPosten as Posten } from "@/lib/export/offene-posten";
import { Leer } from "@/components/ui/Leer";
import { Stempel } from "@/components/ui/Stempel";

export function OffenePosten({ verbindlichkeiten, forderungen }: { verbindlichkeiten: Posten[]; forderungen: Posten[] }) {
  if (!verbindlichkeiten.length && !forderungen.length) {
    return <Leer titel="Keine offenen Posten">Alles bezahlt. Unbezahlte Belege (Verbindlichkeiten) und gestellte Rechnungen ohne Zahlungseingang (Forderungen) stehen hier mit Fälligkeit.</Leer>;
  }
  const ueberfaellig = [...verbindlichkeiten, ...forderungen].filter((p) => p.ueberfaellig);
  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-tinte-2">
        {verbindlichkeiten.length} Verbindlichkeit{verbindlichkeiten.length === 1 ? "" : "en"} über {betrag(summe(verbindlichkeiten.map((p) => p.betrag)))} € und {forderungen.length} Forderung
        {forderungen.length === 1 ? "" : "en"} über {betrag(summe(forderungen.map((p) => p.betrag)))} €{ueberfaellig.length ? `, davon ${ueberfaellig.length} überfällig` : ""}. Bezahlt wird ein Posten,
        sobald der Kontoauszug die Zahlung zeigt oder im Beleg ein Zahlungsdatum steht.
      </p>
      <Liste titel="Verbindlichkeiten" text="Freigegebene und gebuchte Eingangsrechnungen, die noch nicht bezahlt sind." posten={verbindlichkeiten} partner="Lieferant" leer="Keine unbezahlten Eingangsrechnungen." />
      <Liste titel="Forderungen" text="Gestellte Ausgangsrechnungen ohne Zahlungseingang." posten={forderungen} partner="Rechnungsempfänger" leer="Keine offenen Ausgangsrechnungen." />
    </div>
  );
}

function Liste({ titel, text, posten, partner, leer }: { titel: string; text: string; posten: Posten[]; partner: string; leer: string }) {
  return (
    <div>
      <h2 className="mb-1 text-xl">{titel}</h2>
      <p className="mb-3 text-sm text-tinte-2">{text}</p>
      <div className="blatt overflow-x-auto">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Fällig am</th>
              <th>Status</th>
              <th>{partner}</th>
              <th>Nummer</th>
              <th>Datum</th>
              <th>Objekt</th>
              <th className="zahl">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {posten.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap">{p.faelligAm ? datum(p.faelligAm) : <span className="text-tinte-3">kein Datum</span>}</td>
                <td className="whitespace-nowrap">
                  {p.ueberfaellig ? (
                    <span className="flex items-center gap-2">
                      <Stempel text="Überfällig" ton="rot" groesse="klein" />
                      <span className="text-sm text-tinte-2">
                        seit {p.tageUeberfaellig} Tag{p.tageUeberfaellig === 1 ? "" : "en"}
                      </span>
                    </span>
                  ) : p.faelligAm ? (
                    <span className="text-sm text-tinte-2">offen</span>
                  ) : (
                    <span className="text-sm text-tinte-3">Fälligkeit im Beleg nachtragen</span>
                  )}
                </td>
                <td>{p.name}</td>
                <td className="whitespace-nowrap">
                  {p.art === "verbindlichkeit" && p.dokumentId ? (
                    <Link href={`/belege/${p.dokumentId}`} className="font-medium hover:underline">
                      {p.nummer}
                    </Link>
                  ) : p.art === "forderung" ? (
                    <Link href="/rechnungen" className="font-medium hover:underline">
                      {p.nummer}
                    </Link>
                  ) : (
                    p.nummer
                  )}
                </td>
                <td className="whitespace-nowrap">{datum(p.datum)}</td>
                <td>{p.objekt}</td>
                <td className="zahl whitespace-nowrap">{betrag(p.betrag)}</td>
              </tr>
            ))}
          </tbody>
          {posten.length ? (
            <tfoot>
              <tr>
                <td colSpan={6}>Summe</td>
                <td className="zahl whitespace-nowrap">{betrag(summe(posten.map((p) => p.betrag)))}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
        {posten.length === 0 ? <p className="p-5 text-tinte-2">{leer}</p> : null}
      </div>
    </div>
  );
}
