"use client";

import { useState } from "react";
import type { Einstellungen, Mahnung, Objekt, Person } from "@/lib/domain/schema";
import { betrag, datum } from "@/lib/format";
import { pdfHerunterladen } from "@/lib/client/pdf";
import { ApiFehler } from "@/lib/api";
import { stufenTitel } from "@/lib/bank/mahnvorschlaege";
import { Button } from "@/components/ui/Button";
import { Stempel } from "@/components/ui/Stempel";
import { Leer } from "@/components/ui/Leer";
import { mahnungStatusSetzen, mahnungVerwerfen } from "./aktionen";
import { MAHN_STATUS, type Meldung } from "./texte";

/** Vorgeschlagene und versendete Zahlungserinnerungen und Mahnungen. */
export function Mahnvorschlaege({
  mahnungen,
  personen,
  objekte,
  einstellungen,
  onMeldung,
}: {
  mahnungen: Mahnung[];
  personen: Person[];
  objekte: Objekt[];
  einstellungen: Einstellungen | null;
  onMeldung: (m: Meldung | null) => void;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const [laufend, setLaufend] = useState<string | null>(null);
  const [erledigteZeigen, setErledigteZeigen] = useState(false);
  const personName = new Map(personen.map((p) => [p.id, p.name]));
  const objektName = new Map(objekte.map((o) => [o.id, o.kurzname]));
  const liste = [...mahnungen].filter((m) => erledigteZeigen || m.status !== "erledigt").sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : a.nummer < b.nummer ? 1 : -1));

  async function pdf(m: Mahnung) {
    if (!einstellungen) return;
    setLaufend(m.id);
    try {
      await pdfHerunterladen({ art: "mahnung", dokument: m, firma: einstellungen.firma });
      if (m.status === "vorschlag") await mahnungStatusSetzen(m.id, "erstellt");
    } catch (e) {
      if (e instanceof ApiFehler && e.status === 501) onMeldung({ ton: "warnung", text: "Die PDF-Erzeugung für Mahnungen ist auf diesem Server noch nicht verfügbar. Der Text steht unten zum Kopieren." });
      else onMeldung({ ton: "fehler", text: `PDF fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannter Fehler"}` });
    } finally {
      setLaufend(null);
    }
  }

  if (!mahnungen.length) {
    return <Leer titel="Keine Zahlungserinnerungen">Unter „Mieteingang“ steht je Monat, wer nicht gezahlt hat. „Zahlungserinnerungen vorschlagen“ legt hier die Entwürfe an: Stufe 1 ohne Kosten, ab Stufe 2 mit Verzugszinsen und den Mahnkosten aus den Einstellungen.</Leer>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-tinte-2">
        <span>Verzugszinsen nach § 288 Abs. 1 BGB werden ausgewiesen, nicht gebucht. Basiszins laut Einstellungen: {einstellungen ? `${einstellungen.mahnwesen.basiszinsProzent.toFixed(2).replace(".", ",")} %` : "…"}.</span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={erledigteZeigen} onChange={(e) => setErledigteZeigen(e.target.checked)} /> erledigte zeigen
        </label>
      </div>
      <div className="blatt overflow-x-auto">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Stufe</th>
              <th>Empfänger</th>
              <th className="zahl">Offen</th>
              <th className="zahl">Zinsen</th>
              <th className="zahl">Kosten</th>
              <th className="zahl">Gesamt</th>
              <th>Frist</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((m) => {
              const st = MAHN_STATUS[m.status];
              const auf = offen === m.id;
              return [
                <tr key={m.id}>
                  <td className="whitespace-nowrap zahl !text-left">{m.nummer}</td>
                  <td className="whitespace-nowrap">{stufenTitel(m.stufe)}</td>
                  <td>
                    <div className="font-medium">{m.personId ? personName.get(m.personId) ?? m.empfaenger.name : m.empfaenger.name}</div>
                    <div className="text-sm text-tinte-2">{m.objektId ? objektName.get(m.objektId) : ""}{m.posten.length ? ` · ${m.posten.length} Monat${m.posten.length > 1 ? "e" : ""}` : ""}</div>
                  </td>
                  <td className="zahl whitespace-nowrap">{betrag(m.betragOffen)} €</td>
                  <td className="zahl whitespace-nowrap text-tinte-2">{betrag(m.verzugszinsen)} €</td>
                  <td className="zahl whitespace-nowrap text-tinte-2">{betrag(m.mahngebuehr)} €</td>
                  <td className="zahl whitespace-nowrap font-medium">{betrag(m.gesamt)} €</td>
                  <td className="whitespace-nowrap">{datum(m.frist)}</td>
                  <td className="whitespace-nowrap">
                    <Stempel text={st.text} ton={st.ton} groesse="klein" />
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variante="text" klein onClick={() => setOffen(auf ? null : m.id)}>
                        {auf ? "Text schließen" : "Text"}
                      </Button>
                      <Button variante="sekundaer" klein onClick={() => pdf(m)} disabled={laufend === m.id || !einstellungen}>
                        {laufend === m.id ? "PDF…" : "PDF"}
                      </Button>
                      {m.status === "vorschlag" || m.status === "erstellt" ? (
                        <Button variante="text" klein onClick={() => mahnungStatusSetzen(m.id, "versendet")}>
                          Als versendet markieren
                        </Button>
                      ) : null}
                      {m.status === "versendet" ? (
                        <Button variante="text" klein onClick={() => mahnungStatusSetzen(m.id, "erledigt")}>
                          Erledigt
                        </Button>
                      ) : null}
                      {m.status === "vorschlag" ? (
                        <Button variante="gefaehrlich" klein onClick={() => mahnungVerwerfen(m.id)}>
                          Verwerfen
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>,
                auf ? (
                  <tr key={`${m.id}-text`}>
                    <td colSpan={10} className="bg-blatt-2">
                      <div className="grid gap-5 py-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        <table className="tabelle">
                          <thead>
                            <tr>
                              <th>Posten</th>
                              <th className="zahl">Soll</th>
                              <th className="zahl">Gezahlt</th>
                              <th className="zahl">Offen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.posten.map((p, i) => (
                              <tr key={i}>
                                <td>{p.bezeichnung}</td>
                                <td className="zahl whitespace-nowrap">{betrag(p.soll)} €</td>
                                <td className="zahl whitespace-nowrap">{betrag(p.ist)} €</td>
                                <td className="zahl whitespace-nowrap">{betrag(p.offen)} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="space-y-2 text-[0.9375rem]">
                          <p className="text-sm text-tinte-2">
                            {stufenTitel(m.stufe)} {m.nummer} vom {datum(m.datum)} an {m.empfaenger.name}{m.empfaenger.zusatz ? `, ${m.empfaenger.zusatz}` : ""}
                            {m.empfaenger.adresse.strasse ? `, ${m.empfaenger.adresse.strasse}, ${m.empfaenger.adresse.plz} ${m.empfaenger.adresse.ort}` : ""}
                          </p>
                          {m.text.map((t, i) => (
                            <p key={i}>{t}</p>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
