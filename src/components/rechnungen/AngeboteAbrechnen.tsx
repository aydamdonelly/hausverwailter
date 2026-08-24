"use client";

import { useMemo, useState } from "react";
import type { Angebot, Einstellungen, Objekt, Rechnung } from "@/lib/domain/schema";
import { angebotsObjektText, rechnungAusAngebot } from "@/lib/rechnungen/aus_angebot";
import { rechnungAnlegen } from "@/lib/rechnungen/speichern";
import { betrag, datum as datumFmt, eur, heuteIso, monatName, monatVon } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Auswahl, Eingabe, Feld } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Stempel } from "@/components/ui/Stempel";
import { monatsListe } from "./Honorarlauf";

function norm(s: string): string {
  return s.toLowerCase().replace(/straße|strasse/g, "str").replace(/[^a-z0-9äöü]/g, "");
}

/** Das schon angelegte Objekt zu einem Angebot, über Straße und PLZ. */
export function passendesObjekt(angebot: Angebot, objekte: Objekt[]): Objekt | null {
  const strasse = norm(angebot.objekt.strasse);
  if (!strasse) return null;
  return objekte.find((o) => norm(o.adresse.strasse) === strasse && (!angebot.objekt.plz || !o.adresse.plz || o.adresse.plz === angebot.objekt.plz)) ?? null;
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export function AngeboteAbrechnen({ einstellungen, objekte, angebote, rechnungen }: { einstellungen: Einstellungen; objekte: Objekt[]; angebote: Angebot[]; rechnungen: Rechnung[] }) {
  const heute = heuteIso();
  const [datum, setDatum] = useState(heute);
  const [monat, setMonat] = useState(monatVon(heute));
  const [zuordnung, setZuordnung] = useState<Record<string, string>>({});
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<{ angebotId: string; nummer: string; brutto: number } | null>(null);
  const [fehler, setFehler] = useState("");

  const offen = useMemo(
    () =>
      angebote
        .filter((a) => a.status === "angenommen" && !rechnungen.some((r) => r.angebotId === a.id && r.status !== "storniert"))
        .sort((a, b) => b.datum.localeCompare(a.datum)),
    [angebote, rechnungen],
  );
  const aktive = useMemo(() => objekte.filter((o) => o.aktiv).sort((a, b) => a.kurzname.localeCompare(b.kurzname, "de")), [objekte]);
  if (!offen.length && !ergebnis) return null;

  const rechnungsdatum = DATUM.test(datum) ? datum : heute;

  function objektFuer(a: Angebot): Objekt | null {
    const id = zuordnung[a.id] ?? passendesObjekt(a, aktive)?.id ?? "";
    return aktive.find((o) => o.id === id) ?? null;
  }

  async function erzeugen(a: Angebot) {
    const objekt = objektFuer(a);
    let entwurf;
    try {
      entwurf = rechnungAusAngebot(a, { objekt, datum: rechnungsdatum, monat, einstellungen });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Das Angebot lässt sich nicht abrechnen.");
      return;
    }
    const frage =
      a.turnus === "monatlich"
        ? `Erste Rechnung zum Angebot ${a.nummer} für ${monatName(monat)} über ${eur(entwurf.brutto)} an ${entwurf.empfaenger.name} erzeugen?`
        : `Rechnung zum Angebot ${a.nummer} über ${eur(entwurf.brutto)} an ${entwurf.empfaenger.name} erzeugen?`;
    if (!window.confirm(`${frage}\n\nSie bekommt eine fortlaufende Nummer und einen Buchungssatz.`)) return;
    setBeschaeftigt(a.id);
    setFehler("");
    try {
      const r = await rechnungAnlegen(entwurf, "Rechnung aus Angebot erstellt");
      setErgebnis({ angebotId: a.id, nummer: r.nummer, brutto: r.brutto });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Die Rechnung konnte nicht erstellt werden.");
    } finally {
      setBeschaeftigt(null);
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.375rem]">Angenommene Angebote</h2>
          <p className="mt-1 max-w-2xl text-tinte-2">
            Die erste Rechnung zu einem angenommenen Angebot. Bei monatlichem Turnus für den ersten Monat, danach übernimmt der Honorarlauf, sobald das Objekt angelegt ist.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Feld label="Erster Monat" className="w-44">
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
        </div>
      </div>
      {ergebnis ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Stempel text="Erstellt" ton="gruen" neu />
          <Hinweis ton="ok">
            Rechnung <span className="zahl">{ergebnis.nummer}</span> über {eur(ergebnis.brutto)} erstellt. Sie steht unten in der Liste.
          </Hinweis>
        </div>
      ) : null}
      {fehler ? (
        <div className="mb-3">
          <Hinweis ton="fehler">{fehler}</Hinweis>
        </div>
      ) : null}
      {offen.length ? (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Angebot</th>
                <th>Empfänger</th>
                <th>Objekt</th>
                <th>Turnus</th>
                <th className="zahl">Netto €</th>
                <th className="zahl">Brutto €</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offen.map((a) => {
                const objekt = objektFuer(a);
                return (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">
                      <span className="zahl font-medium">{a.nummer}</span>
                      <div className="text-sm text-tinte-2">vom {datumFmt(a.datum)}</div>
                    </td>
                    <td>
                      {a.empfaenger.name}
                      <div className="text-sm text-tinte-2">{angebotsObjektText(a)}</div>
                    </td>
                    <td className="min-w-52">
                      <Auswahl value={objekt?.id ?? ""} onChange={(e) => setZuordnung((z) => ({ ...z, [a.id]: e.target.value }))} aria-label={`Objekt für Angebot ${a.nummer}`}>
                        <option value="">(noch nicht angelegt)</option>
                        {aktive.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.kurzname}
                          </option>
                        ))}
                      </Auswahl>
                    </td>
                    <td className="whitespace-nowrap">{a.turnus === "monatlich" ? "monatlich" : "einmalig"}</td>
                    <td className="zahl whitespace-nowrap">{betrag(a.netto)}</td>
                    <td className="zahl whitespace-nowrap">{betrag(a.brutto)}</td>
                    <td className="whitespace-nowrap text-right">
                      <Button variante="sekundaer" klein onClick={() => erzeugen(a)} disabled={beschaeftigt !== null}>
                        {beschaeftigt === a.id ? "Wird erzeugt…" : a.turnus === "monatlich" ? "Erste Rechnung erzeugen" : "Rechnung erzeugen"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
