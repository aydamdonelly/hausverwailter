"use client";

import Link from "next/link";
import type { Bankkonto, Bankumsatz, Objekt } from "@/lib/domain/schema";
import { datum, iban as ibanFmt } from "@/lib/format";
import { formatName, gemerktesProfil } from "@/lib/bank/formate";
import { Leer } from "@/components/ui/Leer";

/** Die Bankkonten aus den Stammdaten mit Stand des Imports. Ein Klick wählt das Konto für die Listen darunter. */
export function Kontenuebersicht({
  konten,
  objekte,
  umsaetze,
  aktiv,
  onWaehlen,
}: {
  konten: Bankkonto[];
  objekte: Objekt[];
  umsaetze: Bankumsatz[];
  aktiv: string | null;
  onWaehlen: (kontoId: string) => void;
}) {
  if (!konten.length) {
    return (
      <Leer titel="Noch kein Bankkonto angelegt">
        Legen Sie unter <Link href="/stammdaten" className="underline">Stammdaten</Link> die Konten an (Mietkonto, Gemeinschaftskonto, Geschäftskonto). Der Import erkennt das Konto danach an der IBAN in der Datei.
      </Leer>
    );
  }
  const objektName = new Map(objekte.map((o) => [o.id, o.kurzname]));
  return (
    <div className="blatt overflow-x-auto">
      <table className="tabelle">
        <thead>
          <tr>
            <th>Konto</th>
            <th>Objekt</th>
            <th>IBAN</th>
            <th className="zahl">Umsätze</th>
            <th className="zahl">Offen</th>
            <th>Letzter Umsatz</th>
            <th>Format</th>
          </tr>
        </thead>
        <tbody>
          {konten.map((k) => {
            const eigene = umsaetze.filter((u) => u.bankkontoId === k.id);
            const offen = eigene.filter((u) => u.zuordnung.art === "offen").length;
            const letzter = eigene.reduce((max, u) => (u.buchungstag > max ? u.buchungstag : max), "");
            const gemerkt = gemerktesProfil(k.format);
            const format = gemerkt ? gemerkt.name : k.format ? formatName(k.format) : "";
            const istAktiv = k.id === aktiv;
            return (
              <tr key={k.id} className={`klickbar ${istAktiv ? "bg-blatt-2" : ""}`} onClick={() => onWaehlen(k.id)} aria-selected={istAktiv}>
                <td>
                  <span className={istAktiv ? "font-semibold" : "font-medium"}>{k.bezeichnung}</span>
                  {k.bankname ? <div className="text-sm text-tinte-2">{k.bankname}</div> : null}
                </td>
                <td>{k.objektId ? objektName.get(k.objektId) ?? k.objektId : <span className="text-tinte-2">Verwaltung</span>}</td>
                <td className="whitespace-nowrap zahl !text-left">{ibanFmt(k.iban)}</td>
                <td className="zahl">{eigene.length}</td>
                <td className="zahl">{offen ? <span className="text-stempel-2">{offen}</span> : eigene.length ? <span className="text-gruen">0</span> : ""}</td>
                <td className="whitespace-nowrap text-tinte-2">{letzter ? datum(letzter) : "noch kein Import"}</td>
                <td className="text-sm text-tinte-2">{format}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
