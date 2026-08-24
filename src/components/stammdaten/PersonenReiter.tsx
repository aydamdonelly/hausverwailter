"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { Einheit, Objekt, Person } from "@/lib/domain/schema";
import { betrag, datum, iban as ibanFmt, ibanNormalisiert } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Auswahl } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Dialog } from "./Dialog";
import { AuswahlFeld, GeldFeld, Gruppe, SchalterFeld, TextFeld, ZahlFeld } from "./Felder";
import { ReiterKopf, useGespeichert } from "./Reiter";
import { neuePerson, personAktivSetzen, personLoeschen, personSpeichern } from "./speicher";
import { ibansBereinigen, pruefePerson, ROLLE_TEXTE, sollGesamt, type Feldfehler } from "./logik";

type Meldung = { ton: "ok" | "fehler" | "warnung"; text: string };

export function PersonenReiter({ objektFilter, onObjektFilter }: { objektFilter: string; onObjektFilter: (id: string) => void }) {
  const objekte = useLiveQuery(() => db.objekte.orderBy("kurzname").toArray(), []);
  const einheiten = useLiveQuery(() => db.einheiten.toArray(), []);
  const personen = useLiveQuery(() => db.personen.toArray(), []);
  const [dialog, setDialog] = useState<{ person: Person; neu: boolean } | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const { gespeichert, markiere } = useGespeichert();

  const objektName = useMemo(() => new Map((objekte ?? []).map((o) => [o.id, o.kurzname])), [objekte]);
  const einheitName = useMemo(() => new Map((einheiten ?? []).map((e) => [e.id, e.bezeichnung])), [einheiten]);
  const liste = useMemo(
    () =>
      (personen ?? [])
        .filter((p) => objektFilter === "alle" || p.objektId === objektFilter)
        .sort(
          (a, b) =>
            Number(b.aktiv) - Number(a.aktiv) ||
            (objektName.get(a.objektId) ?? "").localeCompare(objektName.get(b.objektId) ?? "", "de") ||
            a.name.localeCompare(b.name, "de"),
        ),
    [personen, objektFilter, objektName],
  );

  function neu() {
    const objektId = objektFilter !== "alle" ? objektFilter : (objekte?.[0]?.id ?? "");
    setDialog({ person: neuePerson(objektId), neu: true });
  }

  async function loeschen(p: Person) {
    if (!window.confirm(`„${p.name}“ endgültig löschen? Für ausgezogene Mieter ist „Deaktivieren“ mit Auszugsdatum die bessere Wahl.`)) return;
    try {
      await personLoeschen(p.id);
      setMeldung({ ton: "ok", text: `„${p.name}“ wurde gelöscht.` });
      markiere();
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Löschen fehlgeschlagen." });
    }
  }

  if (!objekte || !personen) return null;
  const keineObjekte = objekte.length === 0;

  return (
    <>
      <ReiterKopf
        titel="Personen"
        text="Mieter und Eigentümer mit monatlichem Soll und den IBANs, von denen sie zahlen. Daran erkennt der Bankimport Mieteingänge und Hausgeld."
        gespeichert={gespeichert}
        aktionen={
          <>
            <label className="flex items-center gap-2 text-sm text-tinte-2">
              Objekt
              <Auswahl value={objektFilter} onChange={(e) => onObjektFilter(e.target.value)} className="!w-auto !py-1.5" aria-label="Nach Objekt filtern">
                <option value="alle">Alle Objekte</option>
                {objekte.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.kurzname}
                  </option>
                ))}
              </Auswahl>
            </label>
            <Button onClick={neu} disabled={keineObjekte} title={keineObjekte ? "Zuerst ein Objekt anlegen" : undefined}>
              Neue Person
            </Button>
          </>
        }
      />
      {meldung ? (
        <div className="mb-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {keineObjekte ? (
        <Leer titel="Zuerst ein Objekt">Personen gehören zu einem Objekt. Legen Sie unter „Objekte“ das erste Haus an, dann die Mieter oder Eigentümer dazu.</Leer>
      ) : liste.length === 0 ? (
        <Leer titel={objektFilter === "alle" ? "Noch keine Person" : `Niemand in ${objektName.get(objektFilter) ?? "diesem Objekt"}`} aktion={<Button onClick={neu}>Person anlegen</Button>}>
          Mieter mit Kaltmiete und Nebenkosten, Eigentümer mit Hausgeld. Die IBAN ist das wichtigste Merkmal für den Bankabgleich.
        </Leer>
      ) : (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rolle</th>
                {objektFilter === "alle" ? <th>Objekt</th> : null}
                <th>Einheit</th>
                <th className="zahl">Soll je Monat</th>
                <th>IBAN</th>
                <th>Seit / bis</th>
                <th>Aktiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((p) => (
                <tr key={p.id} className={`klickbar ${p.aktiv ? "" : "text-tinte-3"}`} onClick={() => setDialog({ person: p, neu: false })}>
                  <td className="font-medium">
                    {p.anrede ? <span className="font-normal text-tinte-2">{p.anrede} </span> : null}
                    {p.name}
                  </td>
                  <td className="whitespace-nowrap">{ROLLE_TEXTE[p.rolle]}</td>
                  {objektFilter === "alle" ? <td className="whitespace-nowrap">{objektName.get(p.objektId) ?? <span className="text-stempel-2">unbekannt</span>}</td> : null}
                  <td>{p.einheitId ? (einheitName.get(p.einheitId) ?? "?") : ""}</td>
                  <td className="zahl whitespace-nowrap">
                    {betrag(sollGesamt(p.soll))} €
                    <div className="text-xs text-tinte-3">
                      {p.rolle === "eigentuemer" ? `Hausgeld, bis ${p.soll.faelligTag}.` : `${betrag(p.soll.kalt)} kalt + ${betrag(p.soll.nebenkosten)} NK, bis ${p.soll.faelligTag}.`}
                    </div>
                  </td>
                  <td className="zahl !text-left whitespace-nowrap text-sm">
                    {p.ibans.length ? p.ibans.map((i) => <div key={i}>{ibanFmt(i)}</div>) : <span className="text-tinte-3">keine bekannt</span>}
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {datum(p.seit) || "–"}
                    {p.bis ? ` bis ${datum(p.bis)}` : ""}
                  </td>
                  <td>{p.aktiv ? "ja" : "nein"}</td>
                  <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-x-3">
                      <Button variante="text" klein onClick={() => setDialog({ person: p, neu: false })}>
                        Bearbeiten
                      </Button>
                      <Button
                        variante="text"
                        klein
                        onClick={async () => {
                          await personAktivSetzen(p.id, !p.aktiv);
                          markiere();
                        }}
                      >
                        {p.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button variante="gefaehrlich" klein onClick={() => loeschen(p)}>
                        Löschen
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog ? (
        <PersonDialog
          person={dialog.person}
          neu={dialog.neu}
          objekte={objekte}
          einheiten={einheiten ?? []}
          onSchliessen={() => setDialog(null)}
          onGespeichert={(p, neu) => {
            markiere();
            setMeldung({ ton: "ok", text: neu ? `„${p.name}“ ist angelegt.` : `„${p.name}“ ist gespeichert.` });
          }}
        />
      ) : null}
    </>
  );
}

function PersonDialog({
  person,
  neu,
  objekte,
  einheiten,
  onSchliessen,
  onGespeichert,
}: {
  person: Person;
  neu: boolean;
  objekte: Objekt[];
  einheiten: Einheit[];
  onSchliessen: () => void;
  onGespeichert: (p: Person, neu: boolean) => void;
}) {
  const [entwurf, setEntwurf] = useState<Person>(person);
  const [fehler, setFehler] = useState<Feldfehler>({});
  const [laeuft, setLaeuft] = useState(false);
  const adresse = entwurf.adresse ?? { strasse: "", plz: "", ort: "", land: "DE" };
  const einheitenHier = einheiten.filter((e) => e.objektId === entwurf.objektId).sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de", { numeric: true }));

  /** Sobald ein Feld geändert wird, verschwindet seine alte Fehlermeldung; die nächste Prüfung kommt beim Speichern. */
  function fehlerLoeschen(schluessel: string[], praefix?: string) {
    setFehler((f) => {
      const neu = { ...f };
      for (const k of schluessel) delete neu[k];
      if (praefix) for (const k of Object.keys(neu)) if (k.startsWith(praefix)) delete neu[k];
      delete neu.allgemein;
      return neu;
    });
  }
  function aendere(patch: Partial<Person>) {
    setEntwurf((p) => ({ ...p, ...patch }));
    fehlerLoeschen(Object.keys(patch), "ibans" in patch ? "ibans." : undefined);
  }
  function adresseAendern(patch: Partial<NonNullable<Person["adresse"]>>) {
    setEntwurf((p) => ({ ...p, adresse: { ...(p.adresse ?? { strasse: "", plz: "", ort: "", land: "DE" }), ...patch } }));
    fehlerLoeschen(Object.keys(patch).map((k) => `adresse.${k}`));
  }
  function soll(patch: Partial<Person["soll"]>) {
    setEntwurf((p) => ({ ...p, soll: { ...p.soll, ...patch } }));
    fehlerLoeschen(Object.keys(patch).map((k) => `soll.${k}`));
  }
  function ibanSetzen(i: number, wert: string) {
    setEntwurf((p) => ({ ...p, ibans: p.ibans.map((x, n) => (n === i ? ibanNormalisiert(wert) : x)) }));
    fehlerLoeschen([`ibans.${i}`]);
  }

  async function speichern() {
    const adresseLeer = !adresse.strasse.trim() && !adresse.plz.trim() && !adresse.ort.trim();
    const bereinigt: Person = { ...entwurf, name: entwurf.name.trim(), adresse: adresseLeer ? null : adresse };
    const f = pruefePerson(bereinigt);
    setFehler(f);
    if (Object.keys(f).length) return;
    setLaeuft(true);
    try {
      const gespeichert = await personSpeichern({ ...bereinigt, ibans: ibansBereinigen(bereinigt.ibans) }, neu ? null : person);
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
      titel={neu ? "Neue Person" : person.name}
      text={neu ? "Name, Rolle und Objekt sind Pflicht. Soll und IBAN machen den Bankabgleich möglich." : undefined}
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
        <Gruppe titel="Person" className="!p-4">
          <TextFeld label="Anrede" wert={entwurf.anrede} onSpeichern={(w) => aendere({ anrede: w })} placeholder="Frau, Herr, Familie, Eheleute" />
          <AuswahlFeld
            label="Rolle"
            wert={entwurf.rolle}
            optionen={(Object.keys(ROLLE_TEXTE) as Person["rolle"][]).map((r) => ({ wert: r, text: ROLLE_TEXTE[r] }))}
            onSpeichern={(w) => aendere({ rolle: w })}
          />
          <TextFeld label="Name" wert={entwurf.name} onSpeichern={(w) => aendere({ name: w })} fehler={fehler.name} className="sm:col-span-2" autoFocus={neu} />
          <AuswahlFeld
            label="Objekt"
            wert={entwurf.objektId}
            optionen={objekte.map((o) => ({ wert: o.id, text: o.kurzname }))}
            onSpeichern={(w) => aendere({ objektId: w, einheitId: null })}
            fehler={fehler.objektId}
          />
          <AuswahlFeld
            label="Einheit"
            wert={entwurf.einheitId ?? ""}
            optionen={[{ wert: "", text: einheitenHier.length ? "(keine)" : "(keine Einheiten angelegt)" }, ...einheitenHier.map((e) => ({ wert: e.id, text: `${e.bezeichnung}${e.lage ? `, ${e.lage}` : ""}` }))]}
            onSpeichern={(w) => aendere({ einheitId: w || null })}
          />
          <TextFeld label="E-Mail" type="email" wert={entwurf.email} onSpeichern={(w) => aendere({ email: w.trim() })} />
          <TextFeld label="Telefon" type="tel" wert={entwurf.telefon} onSpeichern={(w) => aendere({ telefon: w })} />
          <TextFeld label="Straße und Hausnummer" wert={adresse.strasse} onSpeichern={(w) => adresseAendern({ strasse: w })} className="sm:col-span-2" hinweis="Leer lassen, wenn die Person im Objekt wohnt und keine eigene Anschrift braucht." />
          <TextFeld label="PLZ" wert={adresse.plz} onSpeichern={(w) => adresseAendern({ plz: w.trim() })} fehler={fehler["adresse.plz"]} inputMode="numeric" />
          <TextFeld label="Ort" wert={adresse.ort} onSpeichern={(w) => adresseAendern({ ort: w })} />
          <TextFeld label={entwurf.rolle === "eigentuemer" ? "Eigentümer seit" : "Einzug"} type="date" wert={entwurf.seit ?? ""} onSpeichern={(w) => aendere({ seit: w || null })} fehler={fehler.seit} />
          <TextFeld label={entwurf.rolle === "eigentuemer" ? "Eigentümer bis" : "Auszug"} type="date" wert={entwurf.bis ?? ""} onSpeichern={(w) => aendere({ bis: w || null })} fehler={fehler.bis} />
          <TextFeld label="Notizen" wert={entwurf.notizen} onSpeichern={(w) => aendere({ notizen: w })} mehrzeilig className="sm:col-span-2" placeholder="Zahlt vom Konto des Ehemanns; Dauerauftrag ohne Verwendungszweck." />
          <SchalterFeld text="Aktiv" wert={entwurf.aktiv} onSpeichern={(w) => aendere({ aktiv: w })} hinweis="Ausgezogene Mieter deaktivieren statt löschen; die Zahlungshistorie bleibt erhalten." className="sm:col-span-2" />
        </Gruppe>
        <div className="space-y-5">
          <Gruppe titel="Soll je Monat" text="Mieter: Kaltmiete und Nebenkostenvorauszahlung. Eigentümer: Hausgeld. Die Summe ist die monatliche Sollstellung." className="!p-4">
            <GeldFeld label="Kaltmiete" wert={entwurf.soll.kalt} onSpeichern={(n) => soll({ kalt: n })} fehler={fehler["soll.kalt"]} />
            <GeldFeld label="Nebenkosten" wert={entwurf.soll.nebenkosten} onSpeichern={(n) => soll({ nebenkosten: n })} fehler={fehler["soll.nebenkosten"]} />
            <GeldFeld label="Hausgeld" wert={entwurf.soll.hausgeld} onSpeichern={(n) => soll({ hausgeld: n })} fehler={fehler["soll.hausgeld"]} />
            <ZahlFeld label="Fällig bis zum" wert={entwurf.soll.faelligTag} onSpeichern={(n) => soll({ faelligTag: n ?? 3 })} einheit=". des Monats" fehler={fehler["soll.faelligTag"]} hinweis="§ 556b BGB: spätestens am 3. Werktag." />
            <p className="text-sm text-tinte-2 sm:col-span-2">
              Soll gesamt: <span className="zahl font-medium text-tinte">{betrag(sollGesamt(entwurf.soll))} €</span> je Monat
            </p>
          </Gruppe>
          <Gruppe titel="IBANs" text="Alle Konten, von denen diese Person überweist. Mehrere sind normal (Ehepartner, Firmenkonto)." spalten={1} className="!p-4">
            {entwurf.ibans.map((i, n) => (
              <div key={n} className="flex items-start gap-2">
                <TextFeld
                  wert={ibanFmt(i)}
                  onSpeichern={(w) => ibanSetzen(n, w)}
                  fehler={fehler[`ibans.${n}`]}
                  ariaLabel={`IBAN ${n + 1}`}
                  placeholder="DE00 0000 0000 0000 0000 00"
                  feldClassName="zahl !text-left"
                  className="grow"
                />
                <Button variante="text" klein className="mt-1.5" onClick={() => aendere({ ibans: entwurf.ibans.filter((_, k) => k !== n) })}>
                  Entfernen
                </Button>
              </div>
            ))}
            <div>
              <Button variante="sekundaer" klein onClick={() => aendere({ ibans: [...entwurf.ibans, ""] })}>
                IBAN hinzufügen
              </Button>
            </div>
          </Gruppe>
        </div>
      </div>
    </Dialog>
  );
}
