"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { betrag, datum, kurz } from "@/lib/format";
import type { Anfrage } from "@/lib/domain/schema";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Button } from "@/components/ui/Button";
import { Textbereich } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Ablagekorb } from "@/components/ui/Ablagekorb";
import { AngebotStempel } from "./AngebotStempel";
import { HandwerkerVergleich } from "./HandwerkerVergleich";
import { anfrageAusDateien, anfrageAusText } from "./aktionen";
import { ART_TEXT } from "@/lib/angebote/leistungsumfang";

const TYP_TEXT: Record<string, string> = {
  eingangsrechnung: "eine Rechnung",
  gutschrift: "eine Gutschrift",
  handwerkerangebot: "ein Handwerkerangebot",
  kontoauszug: "einen Kontoauszug",
  mahnung: "eine Mahnung",
  vertrag: "einen Vertrag",
  sonstiges: "etwas anderes",
};

function kontaktText(a: Anfrage): string {
  return [a.kontakt.name, a.kontakt.firma].filter(Boolean).join(", ") || a.kontakt.email || "unbekannt";
}

function objektText(a: { strasse: string; plz: string; ort: string }): string {
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function Uebersicht() {
  const router = useRouter();
  const anfragen = useLiveQuery(() => db.anfragen.orderBy("eingangAm").reverse().toArray(), []);
  const angebote = useLiveQuery(() => db.angebote.orderBy("datum").reverse().toArray(), []);
  const handwerker = useLiveQuery(() => db.dokumente.where("typ").equals("handwerkerangebot").toArray(), []);
  const objekte = useLiveQuery(() => db.objekte.toArray(), []);
  const [text, setText] = useState("");
  const [laufend, setLaufend] = useState(false);
  const [meldung, setMeldung] = useState<{ ton: "ok" | "warnung" | "fehler"; text: string } | null>(null);

  const angebotProId = useMemo(() => new Map((angebote ?? []).map((a) => [a.id, a])), [angebote]);

  async function lesen() {
    const t = text.trim();
    if (!t) return;
    setLaufend(true);
    setMeldung(null);
    try {
      const { dokument, doppelt } = await anfrageAusText(t);
      if (dokument.anfrageId) {
        setText("");
        router.push(`/angebote?anfrage=${dokument.anfrageId}`);
        return;
      }
      if (doppelt) setMeldung({ ton: "warnung", text: "Dieser Text liegt schon im Posteingang, wurde dort aber nicht als Anfrage erkannt." });
      else if (dokument.status === "fehler") setMeldung({ ton: "fehler", text: dokument.fehler || "Der Text konnte nicht gelesen werden." });
      else setMeldung({ ton: "warnung", text: `Die KI hat den Text als ${TYP_TEXT[dokument.typ ?? "sonstiges"] ?? "etwas anderes"} eingestuft, nicht als Anfrage. Das Dokument liegt im Posteingang.` });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Lesen fehlgeschlagen" });
    } finally {
      setLaufend(false);
    }
  }

  async function dateien(liste: File[]) {
    setLaufend(true);
    setMeldung(null);
    try {
      const { dokumente, doppelt } = await anfrageAusDateien(liste);
      const mitAnfrage = dokumente.find((d) => d.anfrageId);
      if (mitAnfrage?.anfrageId) {
        router.push(`/angebote?anfrage=${mitAnfrage.anfrageId}`);
        return;
      }
      const fehler = dokumente.find((d) => d.status === "fehler");
      if (fehler) setMeldung({ ton: "fehler", text: fehler.fehler || "Eine Datei konnte nicht gelesen werden." });
      else if (doppelt === liste.length) setMeldung({ ton: "warnung", text: "Diese Datei(en) liegen schon im Posteingang." });
      else setMeldung({ ton: "warnung", text: "Keine der Dateien wurde als Anfrage erkannt. Sie liegen im Posteingang." });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Lesen fehlgeschlagen" });
    } finally {
      setLaufend(false);
    }
  }

  const geladen = anfragen !== undefined && angebote !== undefined;
  const leer = geladen && anfragen.length === 0 && angebote.length === 0;

  return (
    <>
      <Seitenkopf
        titel="Angebote"
        text="Aus einer Anfrage wird in einer Minute ein Angebot: Positionen aus dem Leistungskatalog, Annahmen für alles, was fehlt, ein Anschreiben und die Antwortmail."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="blatt p-5">
          <h2 className="text-lg">Anfrage einfügen</h2>
          <p className="mt-1 text-sm text-tinte-2">Text aus einer Mail, aus WhatsApp oder einem Kontaktformular hier einfügen. Die KI liest Objekt, Kontakt und Wünsche heraus.</p>
          <Textbereich
            className="mt-3 min-h-[9rem]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Guten Tag, wir sind eine WEG mit 24 Wohnungen in Köln und suchen ab Januar eine neue Verwaltung …"
            disabled={laufend}
            aria-label="Text der Anfrage"
          />
          <div className="mt-3 flex items-center gap-4">
            <Button onClick={lesen} disabled={laufend || !text.trim()}>
              {laufend ? "Wird gelesen…" : "Anfrage lesen"}
            </Button>
            {laufend ? <div className="lesebalken w-40" aria-hidden="true" /> : null}
          </div>
        </div>
        <Ablagekorb onDateien={dateien} klein akzeptiert=".eml,.txt,.pdf,.jpg,.jpeg,.png" text="Oder die Mail als .eml, ein PDF oder Foto der Anfrage hier ablegen" />
      </div>

      {meldung ? (
        <div className="mt-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {leer ? (
        <div className="mt-8">
          <Leer titel="Noch keine Anfrage">Fügen Sie oben den Text einer Anfrage ein oder legen Sie eine Mail in den Posteingang. Erkannte Anfragen erscheinen hier.</Leer>
        </div>
      ) : null}

      {geladen && anfragen.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl">
            Anfragen <span className="zahl text-base font-normal text-tinte-3">{anfragen.length}</span>
          </h2>
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Eingang</th>
                  <th>Anfrage</th>
                  <th>Kontakt</th>
                  <th>Objekt</th>
                  <th className="zahl">Offene Fragen</th>
                  <th>Angebot</th>
                </tr>
              </thead>
              <tbody>
                {anfragen.map((a) => {
                  const angebot = a.angebotId ? angebotProId.get(a.angebotId) : undefined;
                  return (
                    <tr key={a.id} className="klickbar" onClick={() => router.push(`/angebote?anfrage=${a.id}`)}>
                      <td className="whitespace-nowrap text-tinte-2">{datum(a.eingangAm)}</td>
                      <td>
                        <Link href={`/angebote?anfrage=${a.id}`} className="font-medium" onClick={(e) => e.stopPropagation()}>
                          {a.zusammenfassung || kurz(a.text, 80) || "Anfrage"}
                        </Link>
                        <div className="text-sm text-tinte-2">{ART_TEXT[a.verwaltungsart]}{a.besonderheiten.length ? ` · ${kurz(a.besonderheiten.join(", "), 70)}` : ""}</div>
                      </td>
                      <td>{kontaktText(a)}</td>
                      <td>
                        {objektText(a) || <span className="text-tinte-3">ohne Adresse</span>}
                        <div className="text-sm text-tinte-2">
                          {[a.einheitenWohnen !== null ? `${a.einheitenWohnen} WE` : "", a.einheitenGewerbe ? `${a.einheitenGewerbe} GE` : "", a.stellplaetze ? `${a.stellplaetze} Stellpl.` : ""].filter(Boolean).join(", ")}
                        </div>
                      </td>
                      <td className="zahl">{a.offeneFragen.length ? <span className="text-ocker">{a.offeneFragen.length}</span> : <span className="text-tinte-3">0</span>}</td>
                      <td className="whitespace-nowrap">
                        {angebot ? (
                          <span className="inline-flex items-center gap-2">
                            <Link href={`/angebote?angebot=${angebot.id}`} className="zahl hover:underline" onClick={(e) => e.stopPropagation()}>
                              {angebot.nummer}
                            </Link>
                            <AngebotStempel status={angebot.status} />
                          </span>
                        ) : (
                          <span className="text-tinte-3">ohne Angebot</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {geladen && angebote.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl">
            Angebote <span className="zahl text-base font-normal text-tinte-3">{angebote.length}</span>
          </h2>
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nummer</th>
                  <th>Empfänger</th>
                  <th>Objekt</th>
                  <th className="zahl">Netto</th>
                  <th className="zahl">Brutto</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {angebote.map((a) => (
                  <tr key={a.id} className="klickbar" onClick={() => router.push(`/angebote?angebot=${a.id}`)}>
                    <td className="whitespace-nowrap">
                      <AngebotStempel status={a.status} />
                    </td>
                    <td className="zahl whitespace-nowrap !text-left">
                      <Link href={`/angebote?angebot=${a.id}`} className="font-medium" onClick={(e) => e.stopPropagation()}>
                        {a.nummer}
                      </Link>
                    </td>
                    <td>
                      {a.empfaenger.name}
                      {a.empfaenger.zusatz ? <div className="text-sm text-tinte-2">{a.empfaenger.zusatz}</div> : null}
                    </td>
                    <td>
                      {objektText(a.objekt) || <span className="text-tinte-3">ohne Adresse</span>}
                      <div className="text-sm text-tinte-2">{ART_TEXT[a.objekt.art]}</div>
                    </td>
                    <td className="zahl whitespace-nowrap">
                      {betrag(a.netto)} €<div className="text-xs text-tinte-3">{a.turnus === "monatlich" ? "im Monat" : "einmalig"}</div>
                    </td>
                    <td className="zahl whitespace-nowrap">{betrag(a.brutto)} €</td>
                    <td className="whitespace-nowrap text-tinte-2">{datum(a.datum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {handwerker && handwerker.length ? <HandwerkerVergleich dokumente={handwerker} objekte={objekte ?? []} /> : null}
    </>
  );
}
