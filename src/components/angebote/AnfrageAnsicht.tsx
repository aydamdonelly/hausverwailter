"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { Anfrage } from "@/lib/domain/schema";
import { datum, zeit } from "@/lib/format";
import { ART_TEXT } from "@/lib/angebote/leistungsumfang";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Kontierungsstempel, KontierungsZelle } from "@/components/ui/Kontierungsstempel";
import { Auswahl, Eingabe } from "@/components/ui/Feld";
import { DokumentViewer } from "@/components/DokumentViewer";
import { AngebotStempel } from "./AngebotStempel";
import { ListenEditor } from "./ListenEditor";
import { anfrageSpeichern, angebotErstellen } from "./aktionen";

function zahlOderNull(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Eine erkannte Anfrage: Original links, erkannte Daten rechts (editierbar), dann der Knopf zum Angebot. */
export function AnfrageAnsicht({ anfrageId }: { anfrageId: string }) {
  const router = useRouter();
  const gespeichert = useLiveQuery(() => db.anfragen.get(anfrageId), [anfrageId]);
  const angebot = useLiveQuery(() => (gespeichert?.angebotId ? db.angebote.get(gespeichert.angebotId) : undefined), [gespeichert?.angebotId]);
  const dokument = useLiveQuery(() => (gespeichert?.dokumentId ? db.dokumente.get(gespeichert.dokumentId) : undefined), [gespeichert?.dokumentId]);
  const [anfrage, setAnfrage] = useState<Anfrage | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [fehler, setFehler] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geaendert = useRef<Set<string>>(new Set());

  if (gespeichert && (!anfrage || anfrage.id !== gespeichert.id)) setAnfrage(gespeichert);

  function aendere(feld: string, patch: Partial<Anfrage>) {
    if (!anfrage) return;
    const neu = { ...anfrage, ...patch };
    setAnfrage(neu);
    geaendert.current.add(feld);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const felder = [...geaendert.current];
      geaendert.current.clear();
      await anfrageSpeichern(neu, felder);
    }, 500);
  }

  function kontakt(feld: keyof Anfrage["kontakt"], wert: string) {
    if (!anfrage) return;
    aendere(`kontakt.${feld}`, { kontakt: { ...anfrage.kontakt, [feld]: wert } });
  }

  async function erstellen() {
    if (!anfrage) return;
    setBeschaeftigt(true);
    setFehler("");
    try {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        await anfrageSpeichern(anfrage, [...geaendert.current]);
        geaendert.current.clear();
      }
      const neu = await angebotErstellen(anfrage);
      router.push(`/angebote?angebot=${neu.id}`);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Angebot konnte nicht erstellt werden");
      setBeschaeftigt(false);
    }
  }

  if (gespeichert === undefined) return null;
  if (!gespeichert || !anfrage) {
    return (
      <Leer titel="Anfrage nicht gefunden">
        Vielleicht wurde sie gelöscht. <Link href="/angebote" className="underline">Zurück zu den Angeboten</Link>
      </Leer>
    );
  }

  const fehltZahl = anfrage.einheitenWohnen === null && anfrage.einheitenGewerbe === null;
  const objekt = [anfrage.strasse, [anfrage.plz, anfrage.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const titel = objekt ? `${anfrage.verwaltungsart === "UNKLAR" ? "Anfrage" : ART_TEXT[anfrage.verwaltungsart]} ${objekt}` : "Anfrage";
  // Text und Mails zeigen sich in ihrer eigenen Höhe; PDFs und Fotos brauchen einen festen Rahmen.
  const dateiname = dokument?.dateiname.toLowerCase() ?? "";
  const istText = !dokument || dokument.mime.startsWith("text/") || dokument.mime === "message/rfc822" || dateiname.endsWith(".txt") || dateiname.endsWith(".eml");

  return (
    <>
      <p className="mb-2 text-sm text-tinte-2">
        <Link href="/angebote" className="hover:text-tinte">Angebote</Link> / Anfrage vom {datum(anfrage.eingangAm)}
      </p>
      <Seitenkopf
        titel={titel}
        text={
          <>
            {anfrage.zusammenfassung ? <>{anfrage.zusammenfassung}<br /></> : null}
            {[anfrage.kontakt.name, anfrage.kontakt.rolle, anfrage.kontakt.firma].filter(Boolean).join(", ") || "Kontakt unbekannt"} · eingegangen {zeit(anfrage.eingangAm)}
          </>
        }
        aktionen={
          <>
            {angebot ? (
              <>
                <Button onClick={() => router.push(`/angebote?angebot=${angebot.id}`)}>Angebot {angebot.nummer} öffnen</Button>
                <Button variante="text" onClick={erstellen} disabled={beschaeftigt}>
                  {beschaeftigt ? "Wird erstellt…" : "Neues Angebot erstellen"}
                </Button>
              </>
            ) : (
              <Button onClick={erstellen} disabled={beschaeftigt}>
                {beschaeftigt ? "Wird erstellt…" : "Angebot erstellen"}
              </Button>
            )}
            {anfrage.dokumentId ? (
              <Link href={`/belege/${anfrage.dokumentId}`} className="px-1 text-[0.9375rem] font-medium text-tinte-2 hover:text-tinte">
                Im Posteingang
              </Link>
            ) : null}
          </>
        }
      />

      {fehler ? (
        <div className="mb-4">
          <Hinweis ton="fehler">{fehler}</Hinweis>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-4">
          {anfrage.dokumentId ? (
            <DokumentViewer dokumentId={anfrage.dokumentId} className={istText ? "max-h-[70vh] min-h-[10rem]" : "h-[70vh] min-h-[420px]"} />
          ) : (
            <div className="blatt max-h-[70vh] overflow-auto">
              <pre className="whitespace-pre-wrap p-5 font-sans text-[0.9375rem] leading-relaxed">{anfrage.text}</pre>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            {angebot ? (
              <>
                <AngebotStempel status={angebot.status} groesse="normal" />
                <span className="text-sm text-tinte-3">Angebot {angebot.nummer} vom {datum(angebot.datum)}</span>
              </>
            ) : (
              <span className="text-sm text-tinte-3">Noch kein Angebot. Erkannte Daten prüfen, dann „Angebot erstellen“.</span>
            )}
          </div>

          {!anfrage.istAnfrage ? <Hinweis ton="warnung">Die KI ist sich nicht sicher, ob das eine Anfrage ist. Prüfen Sie den Text, bevor Sie ein Angebot erstellen.</Hinweis> : null}
          {fehltZahl ? <Hinweis ton="warnung">Die Anzahl der Einheiten fehlt. Tragen Sie sie hier ein, sonst rechnet das Angebot mit 0 Einheiten und nennt das als Annahme.</Hinweis> : null}

          <Kontierungsstempel titel="Erkannte Daten" spalten={3}>
            <KontierungsZelle label="Verwaltungsart">
              <Auswahl value={anfrage.verwaltungsart} onChange={(e) => aendere("verwaltungsart", { verwaltungsart: e.target.value as Anfrage["verwaltungsart"] })}>
                {(["WEG", "MIET", "GEWERBE", "UNKLAR"] as const).map((a) => (
                  <option key={a} value={a}>
                    {a === "UNKLAR" ? "unklar" : ART_TEXT[a]}
                  </option>
                ))}
              </Auswahl>
            </KontierungsZelle>
            <KontierungsZelle label="Straße" breit>
              <Eingabe value={anfrage.strasse} onChange={(e) => aendere("strasse", { strasse: e.target.value })} />
            </KontierungsZelle>
            <KontierungsZelle label="PLZ">
              <Eingabe value={anfrage.plz} onChange={(e) => aendere("plz", { plz: e.target.value })} className="zahl !text-left" />
            </KontierungsZelle>
            <KontierungsZelle label="Ort" breit>
              <Eingabe value={anfrage.ort} onChange={(e) => aendere("ort", { ort: e.target.value })} />
            </KontierungsZelle>
            <KontierungsZelle label="Wohneinheiten" hinweis={anfrage.einheitenWohnen === null ? "nicht genannt" : undefined}>
              <Eingabe type="number" min={0} step={1} className="zahl" value={anfrage.einheitenWohnen ?? ""} onChange={(e) => aendere("einheitenWohnen", { einheitenWohnen: zahlOderNull(e.target.value) })} />
            </KontierungsZelle>
            <KontierungsZelle label="Gewerbeeinheiten" hinweis={anfrage.einheitenGewerbe === null ? "nicht genannt" : undefined}>
              <Eingabe type="number" min={0} step={1} className="zahl" value={anfrage.einheitenGewerbe ?? ""} onChange={(e) => aendere("einheitenGewerbe", { einheitenGewerbe: zahlOderNull(e.target.value) })} />
            </KontierungsZelle>
            <KontierungsZelle label="Stellplätze" hinweis={anfrage.stellplaetze === null ? "nicht genannt" : undefined}>
              <Eingabe type="number" min={0} step={1} className="zahl" value={anfrage.stellplaetze ?? ""} onChange={(e) => aendere("stellplaetze", { stellplaetze: zahlOderNull(e.target.value) })} />
            </KontierungsZelle>
            <KontierungsZelle label="Baujahr">
              <Eingabe type="number" min={1800} max={2100} step={1} className="zahl" value={anfrage.baujahr ?? ""} onChange={(e) => aendere("baujahr", { baujahr: zahlOderNull(e.target.value) })} />
            </KontierungsZelle>
            <KontierungsZelle label="Gewünschter Beginn" breit hinweis={anfrage.gewuenschterBeginn === null ? "nicht genannt, das Angebot setzt einen Termin an" : undefined}>
              <Eingabe type="date" value={anfrage.gewuenschterBeginn ?? ""} onChange={(e) => aendere("gewuenschterBeginn", { gewuenschterBeginn: e.target.value || null })} />
            </KontierungsZelle>
          </Kontierungsstempel>

          <Kontierungsstempel titel="Kontakt" spalten={3}>
            <KontierungsZelle label="Name">
              <Eingabe value={anfrage.kontakt.name} onChange={(e) => kontakt("name", e.target.value)} />
            </KontierungsZelle>
            <KontierungsZelle label="Rolle">
              <Eingabe value={anfrage.kontakt.rolle} onChange={(e) => kontakt("rolle", e.target.value)} placeholder="Beirat, Eigentümer, Makler" />
            </KontierungsZelle>
            <KontierungsZelle label="Firma">
              <Eingabe value={anfrage.kontakt.firma} onChange={(e) => kontakt("firma", e.target.value)} />
            </KontierungsZelle>
            <KontierungsZelle label="E-Mail" breit>
              <Eingabe type="email" value={anfrage.kontakt.email} onChange={(e) => kontakt("email", e.target.value)} />
            </KontierungsZelle>
            <KontierungsZelle label="Telefon">
              <Eingabe value={anfrage.kontakt.telefon} onChange={(e) => kontakt("telefon", e.target.value)} />
            </KontierungsZelle>
          </Kontierungsstempel>

          <div className="blatt p-5">
            <h2 className="text-lg">Besonderheiten</h2>
            <p className="mb-3 text-sm text-tinte-2">Was die Anfrage über das Objekt sagt. Das Anschreiben geht darauf ein.</p>
            <ListenEditor eintraege={anfrage.besonderheiten} onChange={(neu) => aendere("besonderheiten", { besonderheiten: neu })} hinzufuegenText="Besonderheit ergänzen" leerText="Keine genannt." />
          </div>

          <div className="blatt p-5">
            <h2 className="text-lg">Leistungswünsche</h2>
            <p className="mb-3 text-sm text-tinte-2">Ausdrücklich gewünschte Leistungen. Beim Dienstleister bestimmen sie die Positionen.</p>
            <ListenEditor eintraege={anfrage.leistungswuensche} onChange={(neu) => aendere("leistungswuensche", { leistungswuensche: neu })} hinzufuegenText="Wunsch ergänzen" leerText="Keine genannt." />
          </div>

          <div className="blatt p-5">
            <h2 className="text-lg">
              Offene Fragen <span className="zahl text-base font-normal text-tinte-3">{anfrage.offeneFragen.length}</span>
            </h2>
            <p className="mb-3 text-sm text-tinte-2">Was fehlt, um belastbar anzubieten. Das Angebot übernimmt sie als Annahmen, die Sie streichen können, sobald es geklärt ist.</p>
            <ListenEditor eintraege={anfrage.offeneFragen} onChange={(neu) => aendere("offeneFragen", { offeneFragen: neu })} hinzufuegenText="Frage ergänzen" leerText="Nichts offen." />
          </div>
        </div>
      </div>
    </>
  );
}
