"use client";

import { useMemo, useState } from "react";
import type { Einstellungen, Leistung, Objekt, Rechnung } from "@/lib/domain/schema";
import { honorarlauf } from "@/lib/rechnungen/honorar";
import { fehlendePflichtangaben } from "@/lib/rechnungen/entwurf";
import { honorarlaufAnlegen } from "@/lib/rechnungen/speichern";
import { positionenKurz } from "@/lib/rechnungen/text";
import { betrag, datum as datumFmt, heuteIso, monatName, monatVon } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Auswahl, Eingabe, Feld } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Stempel } from "@/components/ui/Stempel";

/** Elf Monate zurück, einen voraus: mehr braucht niemand für den Lauf. */
export function monatsListe(mitte: string): string[] {
  const [j, m] = mitte.split("-").map(Number);
  const liste: string[] = [];
  for (let k = -11; k <= 1; k++) {
    const d = new Date(Date.UTC(j, m - 1 + k, 1));
    liste.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return liste.reverse();
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export function Honorarlauf({ einstellungen, objekte, leistungen, rechnungen }: { einstellungen: Einstellungen; objekte: Objekt[]; leistungen: Leistung[]; rechnungen: Rechnung[] }) {
  const heute = heuteIso();
  const [monat, setMonat] = useState(monatVon(heute));
  const [datum, setDatum] = useState(heute);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ nummern: string[]; monat: string } | null>(null);
  const [fehler, setFehler] = useState("");

  const rechnungsdatum = DATUM.test(datum) ? datum : heute;
  const lauf = useMemo(
    () => honorarlauf({ monat, objekte, leistungen, einstellungen, datum: rechnungsdatum, vorhandene: rechnungen }),
    [monat, objekte, leistungen, einstellungen, rechnungsdatum, rechnungen],
  );
  const fehlt = fehlendePflichtangaben(einstellungen.firma);
  const n = lauf.zuErzeugen.length;
  const dienstleister = einstellungen.firma.branche === "dienstleister";

  async function erzeugen() {
    if (!n) return;
    const was = n === 1 ? "1 Rechnung" : `${n} Rechnungen`;
    const frage = `${was} für ${monatName(monat)} mit Rechnungsdatum ${datumFmt(rechnungsdatum)} erzeugen?\n\nJede bekommt eine fortlaufende Nummer und einen Buchungssatz. Das lässt sich nur durch Storno zurücknehmen.`;
    if (!window.confirm(frage)) return;
    setBeschaeftigt(true);
    setFehler("");
    try {
      const neue = await honorarlaufAnlegen(lauf.zuErzeugen, monat);
      setErgebnis({ nummern: neue.map((r) => r.nummer), monat });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Der Honorarlauf ist fehlgeschlagen.");
    } finally {
      setBeschaeftigt(false);
    }
  }

  const nummernText = ergebnis
    ? ergebnis.nummern.length === 1
      ? ergebnis.nummern[0]
      : `${ergebnis.nummern[0]} bis ${ergebnis.nummern[ergebnis.nummern.length - 1]}`
    : "";

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.375rem]">Honorarlauf</h2>
          <p className="mt-1 max-w-2xl text-tinte-2">
            {dienstleister
              ? "Alle aktiven Objekte mit ihren Monatspauschalen. Jede Rechnung bekommt Nummer, Buchungssatz, PDF und XRechnung."
              : "Alle aktiven Objekte mit ihrem Grundhonorar oder ihrer Pauschale. Jede Rechnung bekommt Nummer, Buchungssatz, PDF und XRechnung."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Feld label="Abrechnungsmonat" className="w-44">
            <Auswahl value={monat} onChange={(e) => setMonat(e.target.value)}>
              {monatsListe(monatVon(heute)).map((m) => (
                <option key={m} value={m}>
                  {monatName(m)}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Rechnungsdatum" className="w-40">
            <Eingabe type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </Feld>
          <div className="flex items-center gap-3 pb-px">
            <Button onClick={erzeugen} disabled={beschaeftigt || n === 0} title={n === 0 ? "Für diesen Monat gibt es nichts mehr zu erzeugen" : undefined}>
              {beschaeftigt ? "Wird erzeugt…" : n === 0 ? "Nichts zu erzeugen" : n === 1 ? "1 Rechnung erzeugen" : `${n} Rechnungen erzeugen`}
            </Button>
            {ergebnis ? <Stempel text="Erstellt" ton="gruen" neu /> : null}
          </div>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        {fehlt.length ? (
          <Hinweis ton="warnung">
            In den Stammdaten fehlt: {fehlt.join(", ")}. Ohne diese Angaben ist keine Rechnung ordnungsgemäß (§ 14 Abs. 4 UStG).
          </Hinweis>
        ) : null}
        {ergebnis ? (
          <Hinweis ton="ok">
            {ergebnis.nummern.length === 1 ? "1 Rechnung" : `${ergebnis.nummern.length} Rechnungen`} für {monatName(ergebnis.monat)} erstellt: <span className="zahl">{nummernText}</span>. Sie stehen unten in der Liste,
            mit PDF, XRechnung und Buchungssatz.
          </Hinweis>
        ) : null}
        {fehler ? <Hinweis ton="fehler">{fehler}</Hinweis> : null}
      </div>

      <div className="blatt overflow-x-auto">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Objekt</th>
              <th>Positionen</th>
              <th className="zahl">Netto €</th>
              <th className="zahl">USt €</th>
              <th className="zahl">Brutto €</th>
              <th>Stand</th>
            </tr>
          </thead>
          <tbody>
            {lauf.zeilen.map((z) => (
              <tr key={z.objekt.id} className={z.grund ? "text-tinte-3" : ""}>
                <td className="whitespace-nowrap">
                  <span className="font-medium">{z.objekt.kurzname}</span>
                  <div className={`text-sm ${z.grund ? "" : "text-tinte-2"}`}>{z.objekt.auftraggeber.name}</div>
                </td>
                <td className="text-sm">{z.entwurf ? positionenKurz(z.entwurf.positionen) : "–"}</td>
                <td className="zahl whitespace-nowrap">{z.entwurf ? betrag(z.entwurf.netto) : ""}</td>
                <td className="zahl whitespace-nowrap">{z.entwurf ? betrag(z.entwurf.ust) : ""}</td>
                <td className="zahl whitespace-nowrap">{z.entwurf ? betrag(z.entwurf.brutto) : ""}</td>
                <td className="whitespace-nowrap text-sm">
                  {z.grund === "" ? (
                    <span className="text-gruen">wird erzeugt</span>
                  ) : z.grund === "bereits_abgerechnet" && z.vorhanden ? (
                    <>
                      abgerechnet mit <span className="zahl">{z.vorhanden.nummer}</span>
                    </>
                  ) : (
                    <span className="text-stempel-2">nichts abrechenbar, Leistungskatalog prüfen</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{n === 0 ? "Keine neuen Rechnungen" : n === 1 ? "1 neue Rechnung" : `${n} neue Rechnungen`}</td>
              <td className="zahl whitespace-nowrap">{betrag(lauf.netto)}</td>
              <td className="zahl whitespace-nowrap">{betrag(lauf.ust)}</td>
              <td className="zahl whitespace-nowrap">{betrag(lauf.brutto)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {lauf.zeilen.length === 0 ? <p className="p-5 text-tinte-2">Kein aktives Objekt. Objekte werden unter Stammdaten angelegt.</p> : null}
      </div>
    </section>
  );
}
