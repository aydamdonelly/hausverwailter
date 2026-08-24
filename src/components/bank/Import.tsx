"use client";

import { useEffect, useRef, useState } from "react";
import type { Bankkonto, Objekt } from "@/lib/domain/schema";
import { betrag, datum, iban as ibanFmt, kurz } from "@/lib/format";
import { chronologisch, zeitraum } from "@/lib/bank/lesen";
import { ApiFehler } from "@/lib/api";
import { Ablagekorb } from "@/components/ui/Ablagekorb";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Auswahl, Feld } from "@/components/ui/Feld";
import { kontoauszugAusDokument, kontoauszugLesen, spaltenErkennenLassen, umsaetzeUebernehmen, type Importvorschau } from "./aktionen";
import type { Meldung } from "./texte";

/**
 * Import: Datei in den Ablagekorb oder aus dem Posteingang (?dokument=…). Zeigt, was erkannt
 * wurde, lässt das Konto wählen und übernimmt die Umsätze erst auf Klick.
 */
export function Import({
  konten,
  objekte,
  dokumentId,
  onFertig,
  onMeldung,
}: {
  konten: Bankkonto[];
  objekte: Objekt[];
  dokumentId: string | null;
  onFertig: (kontoId: string, letzterMonat: string | null) => void;
  onMeldung: (m: Meldung | null) => void;
}) {
  const [vorschau, setVorschau] = useState<Importvorschau | null>(null);
  const [kontoId, setKontoId] = useState<string>("");
  const [laufend, setLaufend] = useState<"lesen" | "ki" | "uebernehmen" | null>(null);
  const geladenesDokument = useRef<string | null>(null);

  useEffect(() => {
    if (!dokumentId || geladenesDokument.current === dokumentId) return;
    geladenesDokument.current = dokumentId;
    setLaufend("lesen");
    kontoauszugAusDokument(dokumentId)
      .then((v) => {
        if (!v) {
          onMeldung({ ton: "fehler", text: "Das Dokument aus dem Posteingang wurde nicht gefunden." });
          return;
        }
        setVorschau(v);
        setKontoId(v.konto?.id ?? "");
      })
      .finally(() => setLaufend(null));
  }, [dokumentId, onMeldung]);

  async function dateien(liste: File[]) {
    const datei = liste[0];
    if (!datei) return;
    if (liste.length > 1) onMeldung({ ton: "hinweis", text: `Nur die erste Datei (${datei.name}) wird gelesen. Weitere bitte nacheinander ablegen.` });
    else onMeldung(null);
    setLaufend("lesen");
    try {
      const v = await kontoauszugLesen(await datei.arrayBuffer(), datei.name);
      setVorschau(v);
      setKontoId(v.konto?.id ?? "");
    } catch (e) {
      onMeldung({ ton: "fehler", text: `${datei.name} konnte nicht gelesen werden: ${e instanceof Error ? e.message : "unbekannter Fehler"}` });
    } finally {
      setLaufend(null);
    }
  }

  async function spaltenErkennen() {
    if (!vorschau) return;
    setLaufend("ki");
    try {
      const v = await spaltenErkennenLassen(vorschau);
      setVorschau(v);
      setKontoId(v.konto?.id ?? kontoId);
      if (!v.ergebnis.umsaetze.length) onMeldung({ ton: "warnung", text: "Die KI hat Spalten benannt, aber es ließen sich keine Umsätze lesen. Bitte die Datei prüfen." });
    } catch (e) {
      onMeldung({ ton: "fehler", text: e instanceof ApiFehler ? `Spaltenerkennung fehlgeschlagen: ${e.message}` : "Spaltenerkennung fehlgeschlagen." });
    } finally {
      setLaufend(null);
    }
  }

  async function uebernehmen() {
    if (!vorschau) return;
    const konto = konten.find((k) => k.id === kontoId);
    if (!konto) return;
    setLaufend("uebernehmen");
    try {
      const { neu, doppelt, zugeordnet } = await umsaetzeUebernehmen(vorschau, konto);
      const monate = zeitraum(vorschau.ergebnis.umsaetze);
      onMeldung({
        ton: "ok",
        text: neu
          ? `${neu} Umsätze auf „${konto.bezeichnung}“ übernommen${doppelt ? `, ${doppelt} waren schon da` : ""}. ${zugeordnet} davon haben die Regeln direkt zugeordnet.`
          : `Nichts Neues: alle ${doppelt} Umsätze der Datei waren schon vorhanden.`,
      });
      setVorschau(null);
      onFertig(konto.id, monate ? monate.bis.slice(0, 7) : null);
    } catch (e) {
      onMeldung({ ton: "fehler", text: `Übernahme fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannter Fehler"}` });
    } finally {
      setLaufend(null);
    }
  }

  const e = vorschau?.ergebnis;
  const objektName = new Map(objekte.map((o) => [o.id, o.kurzname]));
  const unbekannt = e?.format === "unbekannt";
  const bereich = e ? zeitraum(e.umsaetze) : null;
  const beispiele = e ? chronologisch(e.umsaetze).slice(-6).reverse() : [];

  return (
    <div className="space-y-4">
      {!vorschau ? (
        <Ablagekorb
          klein
          onDateien={dateien}
          akzeptiert=".csv,.txt,.xml,.sta,.mt940,.mta,.tsv"
          text="Kontoauszug hier ablegen: CSV jeder Bank, CAMT.053-XML oder MT940"
          laufend={laufend === "lesen" ? { fertig: 0, gesamt: 1 } : null}
        />
      ) : null}

      {vorschau && e ? (
        <div className="blatt p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-xl">{vorschau.dateiname}</h2>
              <p className="mt-1 text-tinte-2">
                {unbekannt ? (
                  "Kein bekanntes Bankformat."
                ) : (
                  <>
                    Erkannt: <span className="text-tinte">{e.formatName}</span>, {e.umsaetze.length} Umsätze
                    {vorschau.konto && vorschau.schonVorhanden ? `, ${vorschau.schonVorhanden} schon vorhanden` : ""}
                    {e.uebersprungen ? `, ${e.uebersprungen} Zeilen übersprungen (vorgemerkt oder Saldo)` : ""}
                    {bereich ? `, ${datum(bereich.von)} bis ${datum(bereich.bis)}` : ""}
                    {e.kontoIban ? `, Konto ${ibanFmt(e.kontoIban)}` : ", keine Konto-IBAN in der Datei"}
                  </>
                )}
              </p>
            </div>
            <Button variante="text" onClick={() => setVorschau(null)} disabled={laufend !== null}>
              Verwerfen
            </Button>
          </div>

          {e.warnungen.filter((w) => !/Zeichensatz/.test(w) || unbekannt).map((w) => (
            <div key={w} className="mt-3">
              <Hinweis ton={unbekannt ? "warnung" : "hinweis"}>{w}</Hinweis>
            </div>
          ))}

          {unbekannt ? (
            <div className="mt-4 space-y-3">
              <pre className="max-h-48 overflow-auto rounded-[2px] bg-blatt-2 p-3 text-xs">{(e.vorschau ?? []).join("\n")}</pre>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={spaltenErkennen} disabled={laufend !== null}>
                  {laufend === "ki" ? "Die KI liest die Spalten…" : "Spalten von der KI erkennen lassen"}
                </Button>
                {laufend === "ki" ? <div className="lesebalken w-40" aria-hidden="true" /> : null}
                <span className="text-sm text-tinte-3">Die KI sieht nur diese Zeilen und benennt die Spalten. Das Profil wird am Konto gemerkt.</span>
              </div>
            </div>
          ) : (
            <>
              {beispiele.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="tabelle">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Name</th>
                        <th>Verwendungszweck</th>
                        <th className="zahl">Betrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beispiele.map((u, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap">{datum(u.buchungstag)}</td>
                          <td>{kurz(u.name, 32)}</td>
                          <td className="text-tinte-2">{kurz(u.verwendungszweck, 60)}</td>
                          <td className={`zahl whitespace-nowrap ${u.betrag < 0 ? "text-stempel-2" : ""}`}>{betrag(u.betrag)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {e.umsaetze.length > beispiele.length ? <p className="mt-2 text-sm text-tinte-3">Die letzten {beispiele.length} von {e.umsaetze.length} Umsätzen.</p> : null}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap items-end gap-4">
                <Feld label="Konto" className="min-w-72" hinweis={vorschau.konto ? "an der IBAN in der Datei erkannt" : "Die Datei nennt keine bekannte IBAN, bitte wählen"}>
                  <Auswahl value={kontoId} onChange={(ev) => setKontoId(ev.target.value)}>
                    <option value="">(Konto wählen)</option>
                    {konten.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.bezeichnung}{k.objektId ? ` · ${objektName.get(k.objektId) ?? ""}` : ""}
                      </option>
                    ))}
                  </Auswahl>
                </Feld>
                <Button onClick={uebernehmen} disabled={!kontoId || !e.umsaetze.length || laufend !== null}>
                  {laufend === "uebernehmen" ? "Wird übernommen…" : `${e.umsaetze.length} Umsätze übernehmen`}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
