"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { Einheit, Objekt, Person } from "@/lib/domain/schema";
import { betrag, datum, iban as ibanFmt, ibanNormalisiert } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Dialog } from "./Dialog";
import { AuswahlFeld, Gruppe, SchalterFeld, TextFeld, ZahlFeld } from "./Felder";
import { ReiterKopf, useGespeichert } from "./Reiter";
import { einheitAnlegen, einheitLoeschen, einheitSpeichern, neuesObjekt, objektAktivSetzen, objektLoeschen, objektSpeichern } from "./speicher";
import { EINHEIT_ART_TEXTE, pruefeEinheit, pruefeObjekt, VERWALTUNGSART_KURZ, VERWALTUNGSART_TEXTE, type Feldfehler } from "./logik";

type Meldung = { ton: "ok" | "fehler" | "warnung"; text: string };

export function ObjekteReiter({ onZuPersonen }: { onZuPersonen: (objektId: string) => void }) {
  const objekte = useLiveQuery(() => db.objekte.orderBy("kurzname").toArray(), []);
  const einheiten = useLiveQuery(() => db.einheiten.toArray(), []);
  const personen = useLiveQuery(() => db.personen.toArray(), []);
  // Welche Objekte hängen an Belegen, Buchungen, Rechnungen, Mahnungen oder Bankkonten? Die dürfen nicht gelöscht werden.
  const verwendet = useLiveQuery(async () => {
    const ids = new Set<string>();
    for (const b of await db.belege.toArray()) if (b.objektId) ids.add(b.objektId);
    for (const b of await db.buchungen.toArray()) if (b.objektId) ids.add(b.objektId);
    for (const r of await db.rechnungen.toArray()) if (r.objektId) ids.add(r.objektId);
    for (const m of await db.mahnungen.toArray()) if (m.objektId) ids.add(m.objektId);
    for (const k of await db.bankkonten.toArray()) if (k.objektId) ids.add(k.objektId);
    return ids;
  }, []);
  const [dialog, setDialog] = useState<{ objekt: Objekt; neu: boolean } | null>(null);
  const [offen, setOffen] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const { gespeichert, markiere } = useGespeichert();

  const einheitenJeObjekt = useMemo(() => {
    const m = new Map<string, Einheit[]>();
    for (const e of einheiten ?? []) m.set(e.objektId, [...(m.get(e.objektId) ?? []), e]);
    for (const liste of m.values()) liste.sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de", { numeric: true }));
    return m;
  }, [einheiten]);
  const personenJeObjekt = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of personen ?? []) m.set(p.objektId, [...(m.get(p.objektId) ?? []), p]);
    return m;
  }, [personen]);

  async function loeschen(o: Objekt) {
    const n = einheitenJeObjekt.get(o.id)?.length ?? 0;
    if (!window.confirm(`„${o.kurzname}“${n ? ` samt ${n} Einheit${n > 1 ? "en" : ""}` : ""} endgültig löschen?`)) return;
    try {
      await objektLoeschen(o.id);
      setMeldung({ ton: "ok", text: `„${o.kurzname}“ wurde gelöscht.` });
      markiere();
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Löschen fehlgeschlagen." });
    }
  }

  async function aktivWechseln(o: Objekt) {
    await objektAktivSetzen(o.id, !o.aktiv);
    markiere();
  }

  if (!objekte) return null;

  return (
    <>
      <ReiterKopf
        titel="Objekte"
        text="Jedes verwaltete Haus mit Auftraggeber, Einheiten und Objektkonto. Die KI ordnet Belege den Objekten nach Adresse zu, der Bankimport nach IBAN."
        gespeichert={gespeichert}
        aktionen={
          <Button onClick={() => setDialog({ objekt: neuesObjekt(), neu: true })}>Neues Objekt</Button>
        }
      />
      {meldung ? (
        <div className="mb-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {objekte.length === 0 ? (
        <Leer titel="Noch kein Objekt" aktion={<Button onClick={() => setDialog({ objekt: neuesObjekt(), neu: true })}>Erstes Objekt anlegen</Button>}>
          Legen Sie das erste Haus an: Kurzname, Adresse, Art und Auftraggeber reichen für den Anfang.
        </Leer>
      ) : (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Kurzname</th>
                <th>Adresse</th>
                <th>Art</th>
                <th className="zahl">Einh. W / G</th>
                <th className="zahl">Stellpl.</th>
                <th>Auftraggeber</th>
                <th className="zahl">Honorar/Monat</th>
                <th>Aktiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {objekte.map((o) => {
                const einheitenListe = einheitenJeObjekt.get(o.id) ?? [];
                const personenListe = personenJeObjekt.get(o.id) ?? [];
                const loeschbar = !verwendet?.has(o.id) && personenListe.length === 0;
                const istOffen = offen === o.id;
                return (
                  <ObjektZeile
                    key={o.id}
                    objekt={o}
                    einheiten={einheitenListe}
                    personen={personenListe}
                    loeschbar={loeschbar}
                    offen={istOffen}
                    onBearbeiten={() => setDialog({ objekt: o, neu: false })}
                    onEinheiten={() => setOffen(istOffen ? null : o.id)}
                    onPersonen={() => onZuPersonen(o.id)}
                    onAktiv={() => aktivWechseln(o)}
                    onLoeschen={() => loeschen(o)}
                    onGespeichert={markiere}
                    onMeldung={setMeldung}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog ? (
        <ObjektDialog
          objekt={dialog.objekt}
          neu={dialog.neu}
          verwendet={verwendet?.has(dialog.objekt.id) ?? false}
          onSchliessen={() => setDialog(null)}
          onGespeichert={(o, neu) => {
            markiere();
            setMeldung({ ton: "ok", text: neu ? `„${o.kurzname}“ ist angelegt. Jetzt Einheiten und Personen dazu eintragen.` : `„${o.kurzname}“ ist gespeichert.` });
          }}
        />
      ) : null}
    </>
  );
}

function ObjektZeile({
  objekt: o,
  einheiten,
  personen,
  loeschbar,
  offen,
  onBearbeiten,
  onEinheiten,
  onPersonen,
  onAktiv,
  onLoeschen,
  onGespeichert,
  onMeldung,
}: {
  objekt: Objekt;
  einheiten: Einheit[];
  personen: Person[];
  loeschbar: boolean;
  offen: boolean;
  onBearbeiten: () => void;
  onEinheiten: () => void;
  onPersonen: () => void;
  onAktiv: () => void;
  onLoeschen: () => void;
  onGespeichert: () => void;
  onMeldung: (m: Meldung) => void;
}) {
  const ton = o.aktiv ? "" : "text-tinte-3";
  return (
    <>
      <tr className={`klickbar ${ton}`} onClick={onBearbeiten}>
        <td className="whitespace-nowrap font-medium">{o.kurzname}</td>
        <td className="whitespace-nowrap">
          {o.adresse.strasse}
          <div className="text-sm text-tinte-2">
            {o.adresse.plz} {o.adresse.ort}
          </div>
        </td>
        <td className="whitespace-nowrap">{VERWALTUNGSART_KURZ[o.art]}</td>
        <td className="zahl whitespace-nowrap">
          {o.einheitenWohnen} / {o.einheitenGewerbe}
        </td>
        <td className="zahl">{o.stellplaetze}</td>
        <td>
          {o.auftraggeber.name}
          {o.auftraggeber.kundennummer ? <div className="text-sm text-tinte-2">Kd.-Nr. {o.auftraggeber.kundennummer}</div> : null}
        </td>
        <td className="zahl whitespace-nowrap">{o.honorarNettoMonat !== null ? `${betrag(o.honorarNettoMonat)} €` : <span className="text-tinte-3">aus Katalog</span>}</td>
        <td className="whitespace-nowrap">{o.aktiv ? "ja" : "nein"}</td>
        <td className="whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-x-3">
            <Button variante="text" klein onClick={onEinheiten} aria-expanded={offen}>
              Einheiten <span className="zahl text-tinte-3">{einheiten.length}</span>
            </Button>
            <Button variante="text" klein onClick={onPersonen}>
              Personen <span className="zahl text-tinte-3">{personen.length}</span>
            </Button>
          </div>
          <div className="mt-0.5 flex gap-x-3">
            <Button variante="text" klein onClick={onBearbeiten}>
              Bearbeiten
            </Button>
            <Button variante="text" klein onClick={onAktiv}>
              {o.aktiv ? "Deaktivieren" : "Aktivieren"}
            </Button>
            {loeschbar ? (
              <Button variante="gefaehrlich" klein onClick={onLoeschen}>
                Löschen
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      {offen ? (
        <tr>
          <td colSpan={9} className="!bg-blatt-2 !p-4">
            <EinheitenTabelle objekt={o} einheiten={einheiten} personen={personen} onGespeichert={onGespeichert} onMeldung={onMeldung} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

/** Einheiten eines Objekts, direkt in der Tabelle editierbar. */
function EinheitenTabelle({
  objekt,
  einheiten,
  personen,
  onGespeichert,
  onMeldung,
}: {
  objekt: Objekt;
  einheiten: Einheit[];
  personen: Person[];
  onGespeichert: () => void;
  onMeldung: (m: Meldung) => void;
}) {
  const gesamt = objekt.einheitenWohnen + objekt.einheitenGewerbe + objekt.stellplaetze;

  async function speichern(e: Einheit, patch: Partial<Einheit>) {
    const neu = { ...e, ...patch };
    const fehler = pruefeEinheit(neu);
    if (Object.keys(fehler).length) {
      onMeldung({ ton: "fehler", text: Object.values(fehler)[0] });
      return;
    }
    await einheitSpeichern(neu, e);
    onGespeichert();
  }

  async function entfernen(e: Einheit) {
    if (!window.confirm(`Einheit „${e.bezeichnung}“ löschen?`)) return;
    try {
      await einheitLoeschen(e.id);
      onGespeichert();
    } catch (err) {
      onMeldung({ ton: "fehler", text: err instanceof Error ? err.message : "Löschen fehlgeschlagen." });
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-tinte-2">
          Einheiten von <span className="font-medium text-tinte">{objekt.kurzname}</span>: {einheiten.length} angelegt, {gesamt} laut Objekt (Wohnen, Gewerbe, Stellplätze). Personen werden Einheiten zugeordnet.
        </p>
        <Button
          variante="sekundaer"
          klein
          onClick={async () => {
            await einheitAnlegen(objekt.id);
            onGespeichert();
          }}
        >
          Einheit hinzufügen
        </Button>
      </div>
      {einheiten.length ? (
        <table className="tabelle">
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th>Art</th>
              <th className="zahl">Fläche</th>
              <th>Lage</th>
              <th>Personen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {einheiten.map((e) => {
              const bewohner = personen.filter((p) => p.einheitId === e.id);
              return (
                <tr key={e.id} className="!bg-transparent">
                  <td className="w-44">
                    <TextFeld kompakt wert={e.bezeichnung} onSpeichern={(w) => speichern(e, { bezeichnung: w })} ariaLabel={`Bezeichnung ${e.bezeichnung}`} />
                  </td>
                  <td className="w-36">
                    <AuswahlFeld
                      kompakt
                      wert={e.art}
                      optionen={(Object.keys(EINHEIT_ART_TEXTE) as Einheit["art"][]).map((a) => ({ wert: a, text: EINHEIT_ART_TEXTE[a] }))}
                      onSpeichern={(w) => speichern(e, { art: w })}
                      ariaLabel={`Art ${e.bezeichnung}`}
                    />
                  </td>
                  <td className="w-32">
                    <ZahlFeld kompakt wert={e.flaecheQm} onSpeichern={(n) => speichern(e, { flaecheQm: n })} ganzzahl={false} leerErlaubt einheit="m²" ariaLabel={`Fläche ${e.bezeichnung}`} />
                  </td>
                  <td className="w-48">
                    <TextFeld kompakt wert={e.lage} onSpeichern={(w) => speichern(e, { lage: w })} placeholder="EG links" ariaLabel={`Lage ${e.bezeichnung}`} />
                  </td>
                  <td className="text-sm">{bewohner.length ? bewohner.map((p) => p.name).join(", ") : <span className="text-tinte-3">niemand</span>}</td>
                  <td className="text-right">
                    <Button variante="gefaehrlich" klein onClick={() => entfernen(e)} disabled={bewohner.length > 0} title={bewohner.length ? "Erst die Personen dieser Einheit umziehen" : undefined}>
                      Löschen
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-tinte-3">Noch keine Einheit angelegt.</p>
      )}
    </div>
  );
}

function ObjektDialog({
  objekt,
  neu,
  verwendet,
  onSchliessen,
  onGespeichert,
}: {
  objekt: Objekt;
  neu: boolean;
  verwendet: boolean;
  onSchliessen: () => void;
  onGespeichert: (o: Objekt, neu: boolean) => void;
}) {
  const [entwurf, setEntwurf] = useState<Objekt>(objekt);
  const [fehler, setFehler] = useState<Feldfehler>({});
  const [laeuft, setLaeuft] = useState(false);

  /** Sobald ein Feld geändert wird, verschwindet seine alte Fehlermeldung; die nächste Prüfung kommt beim Speichern. */
  function fehlerLoeschen(schluessel: string[]) {
    setFehler((f) => {
      const neu = { ...f };
      for (const k of schluessel) delete neu[k];
      delete neu.allgemein;
      return neu;
    });
  }
  function aendere(patch: Partial<Objekt>) {
    setEntwurf((e) => ({ ...e, ...patch }));
    fehlerLoeschen(Object.keys(patch));
  }
  function adresse(patch: Partial<Objekt["adresse"]>) {
    setEntwurf((e) => ({ ...e, adresse: { ...e.adresse, ...patch } }));
    fehlerLoeschen(Object.keys(patch).map((k) => `adresse.${k}`));
  }
  function auftraggeber(patch: Partial<Objekt["auftraggeber"]>) {
    setEntwurf((e) => ({ ...e, auftraggeber: { ...e.auftraggeber, ...patch } }));
    fehlerLoeschen(Object.keys(patch).map((k) => `auftraggeber.${k}`));
  }
  function auftraggeberAdresse(patch: Partial<Objekt["auftraggeber"]["adresse"]>) {
    setEntwurf((e) => ({ ...e, auftraggeber: { ...e.auftraggeber, adresse: { ...e.auftraggeber.adresse, ...patch } } }));
    fehlerLoeschen(Object.keys(patch).map((k) => `auftraggeber.adresse.${k}`));
  }

  async function speichern() {
    const bereinigt: Objekt = { ...entwurf, kurzname: entwurf.kurzname.trim(), bankIban: ibanNormalisiert(entwurf.bankIban) };
    const f = pruefeObjekt(bereinigt);
    setFehler(f);
    if (Object.keys(f).length) return;
    setLaeuft(true);
    try {
      const gespeichert = await objektSpeichern(bereinigt, neu ? null : objekt);
      onGespeichert(gespeichert, neu);
      onSchliessen();
    } catch (e) {
      setFehler({ allgemein: e instanceof Error ? e.message : "Speichern fehlgeschlagen." });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Dialog
      offen
      onOffen={(o) => {
        if (!o) onSchliessen();
      }}
      titel={neu ? "Neues Objekt" : objekt.kurzname}
      text={neu ? "Kurzname, Adresse, Art und Auftraggeber reichen für den Anfang. Alles andere lässt sich später ergänzen." : `Angelegt als ${VERWALTUNGSART_TEXTE[objekt.art]}${objekt.verwaltungSeit ? `, verwaltet seit ${datum(objekt.verwaltungSeit)}` : ""}.`}
      breit
      fuss={
        <>
          {fehler.allgemein ? <Hinweis ton="fehler">{fehler.allgemein}</Hinweis> : null}
          {Object.keys(fehler).length && !fehler.allgemein ? <span className="text-sm text-stempel-2">Bitte die markierten Felder prüfen.</span> : null}
          <Button variante="text" onClick={onSchliessen}>
            Abbrechen
          </Button>
          <Button onClick={speichern} disabled={laeuft}>
            {laeuft ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Gruppe titel="Objekt" className="!p-4">
          <TextFeld label="Kurzname" wert={entwurf.kurzname} onSpeichern={(w) => aendere({ kurzname: w })} fehler={fehler.kurzname} placeholder="WEG Am Stadtpark 3" autoFocus={neu} />
          <AuswahlFeld
            label="Verwaltungsart"
            wert={entwurf.art}
            optionen={(Object.keys(VERWALTUNGSART_TEXTE) as Objekt["art"][]).map((a) => ({ wert: a, text: VERWALTUNGSART_TEXTE[a] }))}
            onSpeichern={(w) => aendere({ art: w })}
          />
          <TextFeld label="Straße und Hausnummer" wert={entwurf.adresse.strasse} onSpeichern={(w) => adresse({ strasse: w })} className="sm:col-span-2" />
          <TextFeld label="PLZ" wert={entwurf.adresse.plz} onSpeichern={(w) => adresse({ plz: w.trim() })} fehler={fehler["adresse.plz"]} inputMode="numeric" />
          <TextFeld label="Ort" wert={entwurf.adresse.ort} onSpeichern={(w) => adresse({ ort: w })} />
          <ZahlFeld label="Wohneinheiten" wert={entwurf.einheitenWohnen} onSpeichern={(n) => aendere({ einheitenWohnen: n ?? 0 })} fehler={fehler.einheitenWohnen} />
          <ZahlFeld label="Gewerbeeinheiten" wert={entwurf.einheitenGewerbe} onSpeichern={(n) => aendere({ einheitenGewerbe: n ?? 0 })} fehler={fehler.einheitenGewerbe} />
          <ZahlFeld label="Stellplätze" wert={entwurf.stellplaetze} onSpeichern={(n) => aendere({ stellplaetze: n ?? 0 })} fehler={fehler.stellplaetze} />
          <ZahlFeld label="Baujahr" wert={entwurf.baujahr} onSpeichern={(n) => aendere({ baujahr: n })} leerErlaubt fehler={fehler.baujahr} />
          <TextFeld label="Verwaltet seit" type="date" wert={entwurf.verwaltungSeit ?? ""} onSpeichern={(w) => aendere({ verwaltungSeit: w || null })} fehler={fehler.verwaltungSeit} />
          <ZahlFeld
            label="Honorar netto je Monat"
            wert={entwurf.honorarNettoMonat}
            onSpeichern={(n) => aendere({ honorarNettoMonat: n })}
            ganzzahl={false}
            leerErlaubt
            einheit="€"
            hinweis="Leer lassen: aus dem Leistungskatalog gerechnet."
            fehler={fehler.honorarNettoMonat}
          />
          <TextFeld
            label="IBAN des Objektkontos"
            wert={ibanFmt(entwurf.bankIban)}
            onSpeichern={(w) => aendere({ bankIban: ibanNormalisiert(w) })}
            fehler={fehler.bankIban}
            hinweis="Mietkonto oder Gemeinschaftskonto; der Bankimport erkennt daran das Objekt."
            feldClassName="zahl !text-left"
            className="sm:col-span-2"
          />
          <TextFeld label="Notizen" wert={entwurf.notizen} onSpeichern={(w) => aendere({ notizen: w })} mehrzeilig className="sm:col-span-2" />
          <SchalterFeld
            text="Aktiv"
            wert={entwurf.aktiv}
            onSpeichern={(w) => aendere({ aktiv: w })}
            hinweis={verwendet ? "An diesem Objekt hängen Belege oder Buchungen; es kann deaktiviert, aber nicht gelöscht werden." : "Inaktive Objekte bleiben in Auswertungen, werden aber nicht mehr vorgeschlagen."}
            className="sm:col-span-2"
          />
        </Gruppe>
        <Gruppe titel="Auftraggeber" text="Empfänger Ihrer Rechnungen: bei einer WEG die Gemeinschaft, sonst der Eigentümer." className="!p-4">
          <TextFeld label="Name" wert={entwurf.auftraggeber.name} onSpeichern={(w) => auftraggeber({ name: w })} fehler={fehler["auftraggeber.name"]} className="sm:col-span-2" placeholder="Wohnungseigentümergemeinschaft Am Stadtpark 3" />
          <TextFeld label="Zusatz" wert={entwurf.auftraggeber.zusatz} onSpeichern={(w) => auftraggeber({ zusatz: w })} className="sm:col-span-2" placeholder="vertreten durch die Verwaltung" />
          <TextFeld label="Straße und Hausnummer" wert={entwurf.auftraggeber.adresse.strasse} onSpeichern={(w) => auftraggeberAdresse({ strasse: w })} className="sm:col-span-2" />
          <TextFeld label="PLZ" wert={entwurf.auftraggeber.adresse.plz} onSpeichern={(w) => auftraggeberAdresse({ plz: w.trim() })} fehler={fehler["auftraggeber.adresse.plz"]} inputMode="numeric" />
          <TextFeld label="Ort" wert={entwurf.auftraggeber.adresse.ort} onSpeichern={(w) => auftraggeberAdresse({ ort: w })} />
          <TextFeld label="E-Mail" type="email" wert={entwurf.auftraggeber.email} onSpeichern={(w) => auftraggeber({ email: w.trim() })} />
          <TextFeld label="Kundennummer" wert={entwurf.auftraggeber.kundennummer} onSpeichern={(w) => auftraggeber({ kundennummer: w.trim() })} hinweis="Ihre Nummer für diesen Kunden; wird zum Debitorenkonto." />
          <TextFeld label="Leitweg-ID" wert={entwurf.auftraggeber.leitwegId} onSpeichern={(w) => auftraggeber({ leitwegId: w.trim() })} hinweis="Nur für Rechnungen an Behörden (XRechnung)." className="sm:col-span-2" />
        </Gruppe>
      </div>
    </Dialog>
  );
}
