"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { Kostenart } from "@/lib/domain/schema";
import { STANDARD_KOSTENARTEN } from "@/lib/domain/standard";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Dialog } from "./Dialog";
import { AuswahlFeld, Gruppe, SchalterFeld, TextFeld } from "./Felder";
import { ReiterKopf, useGespeichert } from "./Reiter";
import { kostenartLoeschen, kostenartSpeichern, standardKostenartenErgaenzen } from "./speicher";
import { fehlendeNachCode, kostenartCodeAusText, pruefeKostenart, type Feldfehler } from "./logik";

type Meldung = { ton: "ok" | "fehler" | "warnung"; text: string };

/** Sortierung: umlagefähige nach der Nummer in § 2 BetrKV, dann die übrigen nach Bezeichnung. */
function betrkvNummer(text: string): number {
  const m = /Nr\.\s*(\d+)/.exec(text);
  return m ? Number(m[1]) : 99;
}

export function KostenartenReiter() {
  const kostenarten = useLiveQuery(() => db.kostenarten.toArray(), []);
  const verwendet = useLiveQuery(async () => {
    const codes = new Set<string>();
    for (const b of await db.belege.toArray()) if (b.kostenartCode) codes.add(b.kostenartCode);
    for (const b of await db.buchungen.toArray()) if (b.kostenartCode) codes.add(b.kostenartCode);
    for (const u of await db.bankumsaetze.toArray()) if (u.zuordnung.kostenartCode) codes.add(u.zuordnung.kostenartCode);
    return codes;
  }, []);
  const einstellungen = useLiveQuery(() => db.einstellungen.get("einstellungen"), []);
  const [neu, setNeu] = useState(false);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const { gespeichert, markiere } = useGespeichert();

  const liste = useMemo(
    () =>
      [...(kostenarten ?? [])].sort(
        (a, b) => Number(b.umlagefaehig) - Number(a.umlagefaehig) || betrkvNummer(a.betrkv) - betrkvNummer(b.betrkv) || a.bezeichnung.localeCompare(b.bezeichnung, "de"),
      ),
    [kostenarten],
  );
  const fehlend = useMemo(() => fehlendeNachCode((kostenarten ?? []).map((k) => k.code), STANDARD_KOSTENARTEN).length, [kostenarten]);
  const kontenrahmen = einstellungen?.kontenrahmen ?? "SKR03";

  async function speichern(k: Kostenart, patch: Partial<Kostenart>) {
    const neuK = { ...k, ...patch };
    const f = pruefeKostenart(neuK);
    if (Object.keys(f).length) {
      setMeldung({ ton: "fehler", text: `${k.bezeichnung}: ${Object.values(f)[0]}` });
      return;
    }
    await kostenartSpeichern(neuK, k);
    setMeldung(null);
    markiere();
  }

  async function loeschen(k: Kostenart) {
    if (!window.confirm(`Kostenart „${k.bezeichnung}“ löschen?`)) return;
    try {
      await kostenartLoeschen(k.code);
      markiere();
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Löschen fehlgeschlagen." });
    }
  }

  async function standardLaden() {
    const n = await standardKostenartenErgaenzen();
    setMeldung({ ton: "ok", text: n ? `${n} Kostenart${n > 1 ? "en" : ""} nach § 2 BetrKV ergänzt. Kontonummern bitte mit dem Steuerberater abgleichen.` : "Alle Standard-Kostenarten sind schon da." });
    markiere();
  }

  if (!kostenarten) return null;

  return (
    <>
      <ReiterKopf
        titel="Kostenarten"
        text={
          <>
            Wohin ein Beleg gehört: Bezeichnung, Fundstelle in § 2 BetrKV, ob die Kosten auf Mieter umlegbar sind, und das Sachkonto im {kontenrahmen}. Der Hinweis hilft der KI bei der Zuordnung. Änderungen speichern beim Verlassen des Feldes.
          </>
        }
        gespeichert={gespeichert}
        aktionen={
          <>
            {kostenarten.length > 0 && fehlend > 0 ? (
              <Button variante="text" onClick={standardLaden}>
                {fehlend} fehlende Standard-Kostenart{fehlend > 1 ? "en" : ""} ergänzen
              </Button>
            ) : null}
            <Button onClick={() => setNeu(true)}>Neue Kostenart</Button>
          </>
        }
      />
      {meldung ? (
        <div className="mb-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {kostenarten.length === 0 ? (
        <Leer titel="Noch keine Kostenarten" aktion={<Button onClick={standardLaden}>Standard nach BetrKV laden</Button>}>
          Der Standard enthält die 17 Betriebskostenarten aus § 2 BetrKV plus Instandhaltung, Verwaltung, Bankgebühren und Rücklage, jeweils mit üblichen SKR03/SKR04-Konten.
        </Leer>
      ) : (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Bezeichnung</th>
                <th>BetrKV</th>
                <th>Umlagefähig</th>
                <th className="zahl">SKR03</th>
                <th className="zahl">SKR04</th>
                <th>Hinweis für Zuordnung</th>
                <th>Aktiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => {
                const inVerwendung = verwendet?.has(k.code) ?? true;
                return (
                  <tr key={k.code} className={k.aktiv ? "" : "text-tinte-3"}>
                    <td className="min-w-[13rem]">
                      <TextFeld kompakt wert={k.bezeichnung} onSpeichern={(w) => speichern(k, { bezeichnung: w })} ariaLabel={`Bezeichnung ${k.code}`} />
                      <div className="mt-1 text-xs text-tinte-3">{k.code}</div>
                    </td>
                    <td className="w-40 min-w-[9rem]">
                      <TextFeld kompakt wert={k.betrkv} onSpeichern={(w) => speichern(k, { betrkv: w })} ariaLabel={`BetrKV ${k.code}`} placeholder="§ 2 Nr. … BetrKV" />
                    </td>
                    <td className="w-28 min-w-[6.5rem]">
                      <AuswahlFeld
                        kompakt
                        wert={k.umlagefaehig ? "ja" : "nein"}
                        optionen={[
                          { wert: "ja", text: "ja" },
                          { wert: "nein", text: "nein" },
                        ]}
                        onSpeichern={(w) => speichern(k, { umlagefaehig: w === "ja" })}
                        ariaLabel={`Umlagefähig ${k.code}`}
                      />
                    </td>
                    <td className="w-24">
                      <TextFeld kompakt wert={k.kontoSkr03} onSpeichern={(w) => speichern(k, { kontoSkr03: w.trim() })} ariaLabel={`Konto SKR03 ${k.code}`} inputMode="numeric" feldClassName="zahl" />
                    </td>
                    <td className="w-24">
                      <TextFeld kompakt wert={k.kontoSkr04} onSpeichern={(w) => speichern(k, { kontoSkr04: w.trim() })} ariaLabel={`Konto SKR04 ${k.code}`} inputMode="numeric" feldClassName="zahl" />
                    </td>
                    <td className="w-[34%] min-w-[20rem]">
                      <TextFeld kompakt wert={k.hinweis} onSpeichern={(w) => speichern(k, { hinweis: w })} ariaLabel={`Hinweis ${k.code}`} />
                    </td>
                    <td>
                      <SchalterFeld wert={k.aktiv} onSpeichern={(w) => speichern(k, { aktiv: w })} ariaLabel={`Aktiv ${k.code}`} className="mt-1" />
                    </td>
                    <td className="text-right">
                      {!inVerwendung ? (
                        <Button variante="gefaehrlich" klein onClick={() => loeschen(k)}>
                          Löschen
                        </Button>
                      ) : (
                        <span className="text-xs text-tinte-3" title="Belege oder Buchungen nutzen diese Kostenart">
                          in Gebrauch
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {neu ? (
        <NeueKostenartDialog
          vorhandeneCodes={kostenarten.map((k) => k.code)}
          onSchliessen={() => setNeu(false)}
          onGespeichert={(k) => {
            markiere();
            setMeldung({ ton: "ok", text: `„${k.bezeichnung}“ ist angelegt.` });
          }}
        />
      ) : null}
    </>
  );
}

function NeueKostenartDialog({ vorhandeneCodes, onSchliessen, onGespeichert }: { vorhandeneCodes: string[]; onSchliessen: () => void; onGespeichert: (k: Kostenart) => void }) {
  const [entwurf, setEntwurf] = useState<Kostenart>(Kostenart.parse({ code: "", bezeichnung: "", umlagefaehig: false }));
  const [codeManuell, setCodeManuell] = useState(false);
  const [fehler, setFehler] = useState<Feldfehler>({});

  function aendere(patch: Partial<Kostenart>) {
    setEntwurf((k) => {
      const neu = { ...k, ...patch };
      if (patch.bezeichnung !== undefined && !codeManuell) neu.code = kostenartCodeAusText(patch.bezeichnung);
      return neu;
    });
  }

  async function speichern() {
    const f = pruefeKostenart(entwurf, vorhandeneCodes);
    setFehler(f);
    if (Object.keys(f).length) return;
    const k = await kostenartSpeichern(entwurf, null);
    onGespeichert(k);
    onSchliessen();
  }

  return (
    <Dialog
      offen
      onOffen={(o) => {
        if (!o) onSchliessen();
      }}
      titel="Neue Kostenart"
      text="Der Code ist der feste Schlüssel; er wird aus der Bezeichnung vorgeschlagen und ändert sich später nicht mehr."
      fuss={
        <>
          <Button variante="text" onClick={onSchliessen}>
            Abbrechen
          </Button>
          <Button onClick={speichern}>Anlegen</Button>
        </>
      }
    >
      <Gruppe titel="Kostenart" className="!border-0 !p-0">
        <TextFeld label="Bezeichnung" wert={entwurf.bezeichnung} onSpeichern={(w) => aendere({ bezeichnung: w })} fehler={fehler.bezeichnung} autoFocus className="sm:col-span-2" />
        <TextFeld
          label="Code"
          wert={entwurf.code}
          onSpeichern={(w) => {
            setCodeManuell(true);
            setEntwurf((k) => ({ ...k, code: kostenartCodeAusText(w) }));
          }}
          fehler={fehler.code}
          hinweis="Großbuchstaben, Ziffern, Unterstrich."
        />
        <AuswahlFeld
          label="Umlagefähig"
          wert={entwurf.umlagefaehig ? "ja" : "nein"}
          optionen={[
            { wert: "nein", text: "nein, trägt der Eigentümer" },
            { wert: "ja", text: "ja, Betriebskosten" },
          ]}
          onSpeichern={(w) => aendere({ umlagefaehig: w === "ja" })}
        />
        <TextFeld label="Fundstelle BetrKV" wert={entwurf.betrkv} onSpeichern={(w) => aendere({ betrkv: w })} placeholder="§ 2 Nr. 17 BetrKV" />
        <div className="grid grid-cols-2 gap-3">
          <TextFeld label="Konto SKR03" wert={entwurf.kontoSkr03} onSpeichern={(w) => aendere({ kontoSkr03: w.trim() })} fehler={fehler.kontoSkr03} inputMode="numeric" feldClassName="zahl" />
          <TextFeld label="Konto SKR04" wert={entwurf.kontoSkr04} onSpeichern={(w) => aendere({ kontoSkr04: w.trim() })} fehler={fehler.kontoSkr04} inputMode="numeric" feldClassName="zahl" />
        </div>
        <TextFeld label="Hinweis für die Zuordnung" wert={entwurf.hinweis} onSpeichern={(w) => aendere({ hinweis: w })} mehrzeilig className="sm:col-span-2" placeholder="Wann gilt diese Kostenart? Die KI liest das beim Zuordnen." />
      </Gruppe>
    </Dialog>
  );
}
