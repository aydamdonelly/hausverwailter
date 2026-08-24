"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { dokumentAblegen, dokumentLesen, unauffaelligeBuchen } from "@/lib/store/dokumente";
import { ladeBeispieldaten } from "@/lib/beispiel/laden";
import { bildVorbereiten, istBild } from "@/lib/client/bilder";
import { betrag, datum, kurz } from "@/lib/format";
import type { Dokument } from "@/lib/domain/schema";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Ablagekorb } from "@/components/ui/Ablagekorb";
import { StatusStempel } from "@/components/ui/Stempel";
import { Button } from "@/components/ui/Button";
import { Leer } from "@/components/ui/Leer";
import { Hinweis } from "@/components/ui/Hinweis";

type Filter = "alle" | "pruefen" | "gebucht" | "abgelehnt";

const TYP_TEXT: Record<string, string> = {
  eingangsrechnung: "Rechnung",
  gutschrift: "Gutschrift",
  anfrage: "Anfrage",
  handwerkerangebot: "Angebot (extern)",
  kontoauszug: "Kontoauszug",
  mahnung: "Mahnung",
  vertrag: "Vertrag",
  sonstiges: "Sonstiges",
};

export default function Posteingang() {
  const router = useRouter();
  const dokumente = useLiveQuery(() => db.dokumente.orderBy("hochgeladenAm").reverse().toArray(), []);
  const belege = useLiveQuery(() => db.belege.toArray(), []);
  const objekte = useLiveQuery(() => db.objekte.toArray(), []);
  const anzahlObjekte = objekte?.length ?? 0;
  const [filter, setFilter] = useState<Filter>("alle");
  const [laufend, setLaufend] = useState<{ fertig: number; gesamt: number } | null>(null);
  const [meldung, setMeldung] = useState<{ ton: "ok" | "warnung" | "fehler"; text: string } | null>(null);
  const [neuGestempelt, setNeuGestempelt] = useState<Set<string>>(new Set());
  const warteschlange = useRef<Promise<void>>(Promise.resolve());

  const belegProDokument = useMemo(() => new Map((belege ?? []).map((b) => [b.dokumentId, b])), [belege]);
  const objektName = useMemo(() => new Map((objekte ?? []).map((o) => [o.id, o.kurzname])), [objekte]);

  /** Liest eine Liste von Dokumenten, zwei gleichzeitig (mehr belastet den API-Rate-Limit ohne Gewinn). */
  async function lesenLassen(zuLesen: Dokument[]) {
    const liste = zuLesen.filter((d) => d.typ !== "kontoauszug");
    if (!liste.length) return;
    setLaufend({ fertig: 0, gesamt: liste.length });
    let fertig = 0;
    const arbeiter = [0, 1].map(async (i) => {
      for (let k = i; k < liste.length; k += 2) {
        const d = await dokumentLesen(liste[k].id);
        fertig++;
        setLaufend({ fertig, gesamt: liste.length });
        setNeuGestempelt((s) => new Set(s).add(d.id));
      }
    });
    warteschlange.current = warteschlange.current.then(() => Promise.all(arbeiter).then(() => undefined));
    await warteschlange.current;
    setLaufend(null);
  }

  async function aufnehmen(dateien: File[]) {
    setMeldung(null);
    const vorbereitet: File[] = [];
    for (const d of dateien) {
      try {
        vorbereitet.push(istBild(d) ? await bildVorbereiten(d) : d);
      } catch (e) {
        setMeldung({ ton: "fehler", text: `${d.name}: ${e instanceof Error ? e.message : "konnte nicht gelesen werden"}` });
      }
    }
    const neue: Dokument[] = [];
    let doppelt = 0;
    for (const d of vorbereitet) {
      const { dokument, doppelt: istDoppelt } = await dokumentAblegen(d);
      if (istDoppelt) doppelt++;
      else neue.push(dokument);
    }
    if (doppelt) setMeldung({ ton: "warnung", text: `${doppelt} Datei(en) waren schon da (gleicher Inhalt) und wurden nicht erneut abgelegt.` });
    await lesenLassen(neue);
  }

  async function alleBuchen() {
    const n = await unauffaelligeBuchen();
    setMeldung({ ton: "ok", text: n ? `${n} Beleg(e) ohne Befund gebucht.` : "Nichts zu buchen: alle offenen Belege haben Befunde oder fehlende Zuordnungen." });
  }

  const liste = (dokumente ?? []).filter((d) => {
    if (filter === "pruefen") return d.status === "erkannt" || d.status === "freigabe" || d.status === "neu" || d.status === "fehler";
    if (filter === "gebucht") return d.status === "gebucht" || d.status === "freigegeben";
    if (filter === "abgelehnt") return d.status === "abgelehnt";
    return true;
  });
  const zaehler = {
    alle: dokumente?.length ?? 0,
    pruefen: (dokumente ?? []).filter((d) => ["erkannt", "freigabe", "neu", "fehler"].includes(d.status)).length,
    gebucht: (dokumente ?? []).filter((d) => d.status === "gebucht" || d.status === "freigegeben").length,
    abgelehnt: (dokumente ?? []).filter((d) => d.status === "abgelehnt").length,
  };
  const unauffaellig = (dokumente ?? []).filter((d) => d.status === "erkannt" && d.belegId).length;
  const ungelesen = (dokumente ?? []).filter((d) => d.status === "neu" && d.typ !== "kontoauszug");

  function ziel(d: Dokument): string {
    if (d.typ === "anfrage" && d.anfrageId) return `/angebote?anfrage=${d.anfrageId}`;
    if (d.typ === "kontoauszug") return `/bank?dokument=${d.id}`;
    return `/belege/${d.id}`;
  }

  return (
    <>
      <Seitenkopf
        titel="Posteingang"
        text="Belege, Fotos, Mails und Kontoauszüge hier ablegen. Die App liest sie, prüft sie und schlägt die Buchung vor. Gebucht wird erst, wenn Sie es sagen."
        aktionen={
          <>
            {ungelesen.length > 0 ? (
              <Button onClick={() => lesenLassen([...ungelesen].reverse())} disabled={laufend !== null} title="Älteste zuerst, damit ein später eingegangenes Duplikat als solches erkannt wird">
                {laufend ? "Wird gelesen…" : ungelesen.length === 1 ? "1 Dokument lesen lassen" : `${ungelesen.length} Dokumente lesen lassen`}
              </Button>
            ) : null}
            {unauffaellig > 0 ? (
              <Button variante="sekundaer" onClick={alleBuchen}>
                {unauffaellig === 1 ? "1 Beleg ohne Befund buchen" : `${unauffaellig} Belege ohne Befund buchen`}
              </Button>
            ) : null}
          </>
        }
      />

      <Ablagekorb onDateien={aufnehmen} laufend={laufend} />

      {meldung ? (
        <div className="mt-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {dokumente && dokumente.length === 0 ? (
        <div className="mt-8">
          <Leer
            titel="Der Posteingang ist leer"
            aktion={
              anzahlObjekte === 0 ? (
                <Button
                  onClick={async () => {
                    await ladeBeispieldaten();
                    router.refresh();
                  }}
                >
                  Beispielbetrieb laden
                </Button>
              ) : null
            }
          >
            {anzahlObjekte === 0
              ? "Zum Ausprobieren gibt es einen Beispielbetrieb mit fünf Objekten, Mietern und einem Stapel Belege. Oder Sie legen unter Stammdaten Ihre eigenen Objekte an und werfen den ersten Beleg hinein."
              : "Legen Sie den ersten Beleg in den Ablagekorb."}
          </Leer>
        </div>
      ) : null}

      {dokumente && dokumente.length > 0 ? (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap gap-5 text-[0.9375rem]">
            {(["alle", "pruefen", "gebucht", "abgelehnt"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`transition-colors ${filter === f ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}
              >
                {{ alle: "Alle", pruefen: "Zu prüfen", gebucht: "Gebucht", abgelehnt: "Abgelehnt" }[f]} <span className="zahl text-tinte-3">{zaehler[f]}</span>
              </button>
            ))}
          </div>
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Dokument</th>
                  <th>Von</th>
                  <th className="zahl">Betrag</th>
                  <th>Objekt</th>
                  <th>Prüfung</th>
                  <th>Eingang</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((d) => {
                  const b = belegProDokument.get(d.id);
                  const fehler = b?.befunde.filter((x) => x.stufe === "fehler").length ?? 0;
                  const warnungen = b?.befunde.filter((x) => x.stufe === "warnung").length ?? 0;
                  const hinweise = b?.befunde.filter((x) => x.stufe === "hinweis").length ?? 0;
                  return (
                    <tr key={d.id} className="klickbar" onClick={() => router.push(ziel(d))}>
                      <td className="whitespace-nowrap">
                        <StatusStempel status={d.status} neu={neuGestempelt.has(d.id)} />
                      </td>
                      <td>
                        <Link href={ziel(d)} className="font-medium" onClick={(e) => e.stopPropagation()}>
                          {d.dateiname}
                        </Link>
                        <div className="text-sm text-tinte-2">
                          {d.typ ? <span>{TYP_TEXT[d.typ] ?? d.typ}</span> : null}
                          {d.notizen && d.typ ? " · " : ""}
                          {d.status === "fehler" ? <span className="text-stempel-2">{d.fehler}</span> : kurz(d.notizen, 90)}
                          {d.status === "wird_gelesen" ? <div className="lesebalken mt-2 max-w-[200px]" /> : null}
                        </div>
                      </td>
                      <td>{b ? b.lieferant.name : ""}</td>
                      <td className="zahl whitespace-nowrap">{b ? `${betrag(b.bruttoGesamt)} €` : ""}</td>
                      <td>{b?.objektId ? objektName.get(b.objektId) ?? b.objektId : b?.objektHinweis ? <span className="text-tinte-3">{kurz(b.objektHinweis, 30)}</span> : ""}</td>
                      <td className="whitespace-nowrap text-sm">
                        {b ? (
                          fehler + warnungen + hinweise === 0 ? (
                            <span className="text-gruen">ohne Befund</span>
                          ) : (
                            <>
                              {fehler ? <span className="text-stempel-2">{fehler} Fehler</span> : null}
                              {fehler && (warnungen || hinweise) ? ", " : ""}
                              {warnungen ? <span className="text-ocker">{warnungen} Warnung{warnungen > 1 ? "en" : ""}</span> : null}
                              {warnungen && hinweise ? ", " : ""}
                              {hinweise ? <span className="text-tinte-2">{hinweise} Hinweis{hinweise > 1 ? "e" : ""}</span> : null}
                            </>
                          )
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap text-tinte-2">{datum(d.hochgeladenAm)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {liste.length === 0 ? <p className="p-5 text-tinte-2">Nichts in dieser Ansicht.</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
