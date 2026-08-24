"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { Protokoll } from "@/lib/domain/schema";
import { jetztIso, zeit } from "@/lib/format";
import { herunterladen } from "@/lib/api";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Button } from "@/components/ui/Button";
import { Eingabe } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { AKTEUR_TEXTE, bezugZiel, csvDateiname, detailsKurz, detailsLesbar, leererNachschlag, passtZuSuche, protokollCsv, type Nachschlag } from "./logik";

type Filter = "alle" | Protokoll["akteur"];
const FILTER: { id: Filter; text: string }[] = [
  { id: "alle", text: "Alle" },
  { id: "nutzer", text: "Nutzer" },
  { id: "ki", text: "KI" },
  { id: "regel", text: "Regel" },
  { id: "system", text: "System" },
];
const SEITE = 200;

export function ProtokollAnsicht() {
  const eintraege = useLiveQuery(() => db.protokoll.orderBy("zeit").reverse().toArray(), []);
  const nachschlag = useLiveQuery<Nachschlag>(async () => {
    const n = leererNachschlag();
    for (const b of await db.belege.toArray()) n.belege.set(b.id, { dokumentId: b.dokumentId, text: `${b.lieferant.name} ${b.rechnungsnummer}`.trim() });
    for (const d of await db.dokumente.toArray()) n.dokumente.set(d.id, d.dateiname);
    for (const o of await db.objekte.toArray()) n.objekte.set(o.id, o.kurzname);
    for (const p of await db.personen.toArray()) n.personen.set(p.id, { name: p.name, objektId: p.objektId });
    for (const e of await db.einheiten.toArray()) n.einheiten.set(e.id, { bezeichnung: e.bezeichnung, objektId: e.objektId });
    for (const k of await db.kostenarten.toArray()) n.kostenarten.set(k.code, k.bezeichnung);
    for (const l of await db.leistungen.toArray()) n.leistungen.set(l.id, l.code);
    for (const a of await db.angebote.toArray()) n.angebote.set(a.id, a.nummer);
    for (const r of await db.rechnungen.toArray()) n.rechnungen.set(r.id, r.nummer);
    for (const m of await db.mahnungen.toArray()) n.mahnungen.set(m.id, m.nummer);
    for (const a of await db.anfragen.toArray()) n.anfragen.set(a.id, a.kontakt.name || a.kontakt.firma || a.strasse);
    return n;
  }, []);
  const [filter, setFilter] = useState<Filter>("alle");
  const [suche, setSuche] = useState("");
  const [sichtbar, setSichtbar] = useState(SEITE);
  const [offen, setOffen] = useState<Set<string>>(new Set());

  const n = nachschlag ?? leererNachschlag();
  const zaehler = useMemo(() => {
    const z: Record<Filter, number> = { alle: 0, nutzer: 0, ki: 0, regel: 0, system: 0 };
    for (const e of eintraege ?? []) {
      z.alle++;
      z[e.akteur]++;
    }
    return z;
  }, [eintraege]);
  const liste = useMemo(
    () => (eintraege ?? []).filter((e) => (filter === "alle" || e.akteur === filter) && passtZuSuche(e, suche, bezugZiel(e.bezug, n)?.text ?? "")),
    [eintraege, filter, suche, n],
  );

  function exportieren() {
    const csv = protokollCsv(liste, (b) => bezugZiel(b, n)?.text ?? b);
    herunterladen(new Blob([csv], { type: "text/csv;charset=utf-8" }), csvDateiname(jetztIso()));
  }

  function umschalten(id: string) {
    setOffen((s) => {
      const neu = new Set(s);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  if (!eintraege) return <Seitenkopf titel="Protokoll" text="Wer hat wann was gemacht: Nutzer, KI, Regeln, System." />;

  return (
    <>
      <Seitenkopf
        titel="Protokoll"
        text="Das Journal der App: jeder fachliche Schritt mit Zeit, Akteur und Details, neueste zuerst. Einträge werden nur angefügt, nie geändert."
        aktionen={
          <Button variante="sekundaer" onClick={exportieren} disabled={liste.length === 0}>
            Als CSV exportieren{liste.length && liste.length !== eintraege.length ? ` (${liste.length})` : ""}
          </Button>
        }
      />
      <div className="mb-5">
        <Hinweis>
          Das Protokoll ist der Laufzettel der Buchhaltung im Sinne der GoBD: nachvollziehbar, wer (ein Mensch, die KI, eine Prüfregel oder das System) wann was getan hat und welcher Wert
          vorher galt. Belege, Buchungen und Stammdaten werden damit erklärbar, auch Jahre später gegenüber Steuerberater oder Prüfer.
        </Hinweis>
      </div>

      {eintraege.length === 0 ? (
        <Leer titel="Noch nichts passiert">Der erste Eintrag erscheint, sobald ein Dokument abgelegt oder ein Stammdatum geändert wird.</Leer>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-5 text-[0.9375rem]">
              {FILTER.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    setSichtbar(SEITE);
                  }}
                  className={`transition-colors ${filter === f.id ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}
                >
                  {f.text} <span className="zahl text-tinte-3">{zaehler[f.id]}</span>
                </button>
              ))}
            </div>
            <Eingabe
              type="search"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value);
                setSichtbar(SEITE);
              }}
              placeholder="Suchen in Aktion, Bezug, Details"
              aria-label="Im Protokoll suchen"
              className="!w-72"
            />
          </div>
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Akteur</th>
                  <th>Aktion</th>
                  <th>Bezug</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {liste.slice(0, sichtbar).map((e) => {
                  const ziel = bezugZiel(e.bezug, n);
                  const zeilen = detailsLesbar(e.details);
                  const istOffen = offen.has(e.id);
                  const kurz = detailsKurz(e.details);
                  const laenger = zeilen.length > 1 || zeilen.some((z) => z.wert.length > 90) || kurz.endsWith("…");
                  return (
                    <tr key={e.id} className="align-top">
                      <td className="zahl !text-left whitespace-nowrap text-tinte-2">{zeit(e.zeit)}</td>
                      <td className="whitespace-nowrap">{AKTEUR_TEXTE[e.akteur]}</td>
                      <td className="font-medium">{e.aktion}</td>
                      <td>
                        {ziel ? (
                          ziel.href ? (
                            <Link href={ziel.href} className="underline decoration-linie-2 underline-offset-2 hover:decoration-tinte">
                              {ziel.text}
                            </Link>
                          ) : (
                            <span className="text-tinte-3">{ziel.text}</span>
                          )
                        ) : null}
                      </td>
                      <td className="max-w-[34rem] text-sm">
                        {zeilen.length === 0 ? null : istOffen ? (
                          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                            {zeilen.map((z, i) => (
                              <div key={i} className="contents">
                                <dt className="text-tinte-2">{z.schluessel || ""}</dt>
                                <dd className="break-words">{z.wert}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <span className="break-words text-tinte-2">{kurz}</span>
                        )}
                        {laenger ? (
                          <button type="button" onClick={() => umschalten(e.id)} className="mt-0.5 block text-xs text-tinte-3 hover:text-tinte" aria-expanded={istOffen}>
                            {istOffen ? "weniger" : "alles anzeigen"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {liste.length === 0 ? <p className="p-5 text-tinte-2">Kein Eintrag passt zu Filter und Suche.</p> : null}
            {liste.length > sichtbar ? (
              <div className="flex items-center justify-between p-4 text-sm text-tinte-2">
                <span>
                  {sichtbar} von {liste.length} Einträgen
                </span>
                <Button variante="text" onClick={() => setSichtbar((s) => s + SEITE)}>
                  Weitere {Math.min(SEITE, liste.length - sichtbar)} anzeigen
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
