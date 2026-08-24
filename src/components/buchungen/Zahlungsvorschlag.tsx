"use client";

import Link from "next/link";
import { useState } from "react";
import { betrag, datum, eur, iban as ibanFmt, plusTage } from "@/lib/format";
import { summe } from "@/lib/geld";
import type { OffenerPosten, Zahlungsgruppe, Zahlungsvorschlag as Vorschlag } from "@/lib/export/offene-posten";
import { sepaExportieren } from "./exporte";
import { Button } from "@/components/ui/Button";
import { Eingabe } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Stempel } from "@/components/ui/Stempel";

export function Zahlungsvorschlag({ vorschlag, heute }: { vorschlag: Vorschlag | null; heute: string }) {
  const [ausfuehrungAm, setAusfuehrungAm] = useState(plusTage(heute, 1));
  const [abgewaehlt, setAbgewaehlt] = useState<Set<string>>(new Set());
  const [meldung, setMeldung] = useState<{ ton: "ok" | "fehler"; text: string } | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);

  if (!vorschlag) return null;
  const { gruppen, lastschrift, ohneIban } = vorschlag;
  if (!gruppen.length && !lastschrift.length && !ohneIban.length) {
    return <Leer titel="Nichts zu zahlen">Freigegebene oder gebuchte Belege, die noch nicht bezahlt sind, erscheinen hier je Auftraggeberkonto als Sammelüberweisung (SEPA pain.001).</Leer>;
  }

  function umschalten(id: string) {
    setAbgewaehlt((s) => {
      const neu = new Set(s);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  async function sepa(g: Zahlungsgruppe) {
    const posten = g.posten.filter((p) => !abgewaehlt.has(p.id));
    if (!posten.length) return;
    setBeschaeftigt(g.konto.bankkontoId ?? g.konto.iban);
    setMeldung(null);
    try {
      const datei = await sepaExportieren(g, posten, ausfuehrungAm);
      setMeldung({ ton: "ok", text: `${datei} gespeichert: ${posten.length} Überweisung${posten.length === 1 ? "" : "en"} über ${eur(summe(posten.map((p) => p.betrag)))} von ${g.konto.bezeichnung}. Im Online-Banking hochladen und freigeben; der Zahlungseingang wird beim nächsten Kontoauszug zugeordnet.` });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "SEPA-Datei konnte nicht erzeugt werden" });
    } finally {
      setBeschaeftigt(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-48">
          <span className="mb-1 block text-sm text-tinte-2">Ausführung am</span>
          <Eingabe type="date" value={ausfuehrungAm} min={heute} onChange={(e) => setAusfuehrungAm(e.target.value || plusTage(heute, 1))} />
        </label>
        <p className="max-w-xl pb-2 text-sm text-tinte-2">Je Auftraggeberkonto eine Datei im Format pain.001.001.09. Nichts wird von hier aus gesendet; die Freigabe passiert in Ihrem Online-Banking.</p>
      </div>

      {meldung ? <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis> : null}

      {gruppen.map((g) => {
        const gewaehlt = g.posten.filter((p) => !abgewaehlt.has(p.id));
        const schluessel = g.konto.bankkontoId ?? g.konto.iban;
        return (
          <div key={schluessel} className="blatt">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-linie px-4 py-3">
              <div>
                <h2 className="text-lg">{g.konto.bezeichnung}</h2>
                <p className="text-sm text-tinte-2">
                  {g.konto.name} · <span className="zahl">{ibanFmt(g.konto.iban)}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-tinte-2">
                  {gewaehlt.length} von {g.posten.length} gewählt, <span className="zahl font-semibold text-tinte">{eur(summe(gewaehlt.map((p) => p.betrag)))}</span>
                </span>
                <Button onClick={() => sepa(g)} disabled={beschaeftigt !== null || gewaehlt.length === 0}>
                  {beschaeftigt === schluessel ? "Wird erzeugt…" : "SEPA-Datei herunterladen"}
                </Button>
              </div>
            </div>
            <table className="tabelle">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Fällig</th>
                  <th>Zahlungsempfänger</th>
                  <th>Rechnung</th>
                  <th>Objekt</th>
                  <th>IBAN</th>
                  <th className="zahl">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {g.posten.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input type="checkbox" checked={!abgewaehlt.has(p.id)} onChange={() => umschalten(p.id)} aria-label={`${p.name} ${p.nummer} zahlen`} className="accent-tinte" />
                    </td>
                    <td className="whitespace-nowrap">
                      <Faelligkeit p={p} />
                    </td>
                    <td>{p.name}</td>
                    <td className="whitespace-nowrap">
                      {p.dokumentId ? (
                        <Link href={`/belege/${p.dokumentId}`} className="font-medium hover:underline">
                          {p.nummer}
                        </Link>
                      ) : (
                        p.nummer
                      )}
                      <div className="text-xs text-tinte-3">vom {datum(p.datum)}</div>
                    </td>
                    <td>{p.objekt}</td>
                    <td className="zahl whitespace-nowrap !text-left text-tinte-2">{ibanFmt(p.iban)}</td>
                    <td className="zahl whitespace-nowrap">{betrag(p.betrag)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>Summe der gewählten Überweisungen</td>
                  <td className="zahl whitespace-nowrap">{betrag(summe(gewaehlt.map((p) => p.betrag)))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {lastschrift.length ? (
        <Nebenliste titel="Wird per Lastschrift eingezogen" text="Keine Überweisung nötig; der Lieferant bucht ab. Der Abgang wird beim Kontoauszug dem Beleg zugeordnet." posten={lastschrift} />
      ) : null}
      {ohneIban.length ? <Nebenliste titel="Ohne gültige IBAN" text="Diese Belege können erst überwiesen werden, wenn im Beleg eine IBAN eingetragen ist." posten={ohneIban} /> : null}
    </div>
  );
}

function Faelligkeit({ p }: { p: OffenerPosten }) {
  if (!p.faelligAm) return <span className="text-tinte-3">kein Datum</span>;
  return (
    <span className="flex items-center gap-2">
      {datum(p.faelligAm)}
      {p.ueberfaellig ? <Stempel text="Überfällig" ton="rot" groesse="klein" title={`seit ${p.tageUeberfaellig} Tag${p.tageUeberfaellig === 1 ? "" : "en"}`} /> : null}
    </span>
  );
}

function Nebenliste({ titel, text, posten }: { titel: string; text: string; posten: OffenerPosten[] }) {
  return (
    <div>
      <h2 className="mb-1 text-lg">{titel}</h2>
      <p className="mb-2 text-sm text-tinte-2">{text}</p>
      <div className="blatt">
        <table className="tabelle">
          <tbody>
            {posten.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap">
                  <Faelligkeit p={p} />
                </td>
                <td>{p.name}</td>
                <td className="whitespace-nowrap">
                  {p.dokumentId ? (
                    <Link href={`/belege/${p.dokumentId}`} className="font-medium hover:underline">
                      {p.nummer}
                    </Link>
                  ) : (
                    p.nummer
                  )}
                </td>
                <td>{p.objekt}</td>
                <td className="zahl whitespace-nowrap">{betrag(p.betrag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
