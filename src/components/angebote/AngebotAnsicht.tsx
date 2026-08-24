"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { ladeEinstellungen } from "@/lib/store/arbeitsbereich";
import type { Angebot, Einstellungen, Position } from "@/lib/domain/schema";
import { betrag, datum, eur, zeit } from "@/lib/format";
import { berechneSummen, katalogFuer, positionAusLeistung, positionenBereinigen, normalisiere } from "@/lib/angebote/erstellen";
import { ART_TEXT, einheitKurz } from "@/lib/angebote/leistungsumfang";
import { pdfHerunterladen } from "@/lib/client/pdf";
import { ApiFehler } from "@/lib/api";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Kontierungsstempel, KontierungsZelle } from "@/components/ui/Kontierungsstempel";
import { Auswahl, Eingabe, Textbereich } from "@/components/ui/Feld";
import { GeldEingabe } from "@/components/ui/GeldEingabe";
import { AngebotStempel } from "./AngebotStempel";
import { ListenEditor } from "./ListenEditor";
import { MengeEingabe } from "./MengeEingabe";
import { angebotLoeschen, angebotSpeichern, angebotStatusSetzen, anschreibenFormulieren, objektAusAngebot } from "./aktionen";

type Meldung = { ton: "ok" | "warnung" | "fehler" | "hinweis"; text: string };

/** Summen nach jeder Änderung neu rechnen; die Positionen sind die Wahrheit, alles andere folgt. */
function mitSummen(a: Angebot): Angebot {
  const positionen = positionenBereinigen(a.positionen);
  const s = berechneSummen(positionen, a.rabattProzent, a.ustSatz);
  return { ...a, positionen, rabattBetrag: s.rabattBetrag, netto: s.netto, ust: s.ust, brutto: s.brutto };
}

export function AngebotAnsicht({ angebotId }: { angebotId: string }) {
  const router = useRouter();
  const gespeichert = useLiveQuery(() => db.angebote.get(angebotId), [angebotId]);
  const anfrage = useLiveQuery(() => (gespeichert?.anfrageId ? db.anfragen.get(gespeichert.anfrageId) : undefined), [gespeichert?.anfrageId]);
  const leistungen = useLiveQuery(() => db.leistungen.filter((l) => l.aktiv).toArray(), []);
  const objekte = useLiveQuery(() => db.objekte.toArray(), []);
  const [einstellungen, setEinstellungen] = useState<Einstellungen | null>(null);
  const [angebot, setAngebot] = useState<Angebot | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [gestempelt, setGestempelt] = useState(false);
  const [umfangOffen, setUmfangOffen] = useState(true);
  const [kopiert, setKopiert] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geaendert = useRef<Set<string>>(new Set());

  useEffect(() => {
    ladeEinstellungen().then(setEinstellungen);
  }, []);
  if (gespeichert && (!angebot || angebot.id !== gespeichert.id)) setAngebot(gespeichert);

  const katalog = useMemo(() => (angebot && leistungen ? katalogFuer(angebot.objekt.art, leistungen) : []), [angebot, leistungen]);
  const objektVorhanden = useMemo(() => {
    if (!angebot || !objekte) return undefined;
    const s = normalisiere(angebot.objekt.strasse);
    if (!s) return undefined;
    return objekte.find((o) => normalisiere(o.adresse.strasse) === s && (!angebot.objekt.plz || !o.adresse.plz || o.adresse.plz === angebot.objekt.plz));
  }, [angebot, objekte]);
  const summen = useMemo(() => (angebot ? berechneSummen(angebot.positionen, angebot.rabattProzent, angebot.ustSatz) : null), [angebot]);

  /** Feldänderung: sofort sichtbar, nach 500 ms gespeichert und protokolliert. */
  function aendere(feld: string, patch: Partial<Angebot>) {
    if (!angebot) return;
    const neu = mitSummen({ ...angebot, ...patch });
    setAngebot(neu);
    geaendert.current.add(feld);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const felder = [...geaendert.current];
      geaendert.current.clear();
      timer.current = null;
      await angebotSpeichern(neu, felder);
    }, 500);
  }

  async function speichernJetzt(): Promise<Angebot | null> {
    if (!angebot) return null;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      const felder = [...geaendert.current];
      geaendert.current.clear();
      await angebotSpeichern(angebot, felder);
    }
    return angebot;
  }

  function positionAendern(i: number, patch: Partial<Position>) {
    if (!angebot) return;
    aendere(`positionen[${i + 1}]`, { positionen: angebot.positionen.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  }

  function positionEntfernen(i: number) {
    if (!angebot) return;
    aendere("positionen", { positionen: angebot.positionen.filter((_, k) => k !== i) });
  }

  function positionHinzufuegen(code: string) {
    if (!angebot) return;
    const pos = angebot.positionen.length + 1;
    if (code === "frei") {
      aendere("positionen", { positionen: [...angebot.positionen, { pos, leistungCode: "", bezeichnung: "", beschreibung: "", menge: 1, einheit: "pauschal", einzelpreisNetto: 0, gesamtNetto: 0, ustSatz: angebot.ustSatz }] });
      return;
    }
    const l = katalog.find((x) => x.code === code);
    if (!l) return;
    const menge = l.einheit === "einheit_monat" ? angebot.objekt.einheitenWohnen + angebot.objekt.einheitenGewerbe || 1 : l.einheit === "stellplatz_monat" ? angebot.objekt.stellplaetze || 1 : 1;
    aendere("positionen", { positionen: [...angebot.positionen, positionAusLeistung(l, pos, angebot.ustSatz, menge)] });
  }

  function sonderleistungHinzufuegen(code: string) {
    if (!angebot) return;
    const l = katalog.find((x) => x.code === code);
    if (!l) return;
    aendere("sonderleistungen", { sonderleistungen: [...angebot.sonderleistungen, { bezeichnung: l.bezeichnung, preisNetto: l.preisNetto, einheit: einheitKurz(l.einheit) }] });
  }

  async function statusSetzen(status: Angebot["status"]) {
    const a = await speichernJetzt();
    if (!a) return;
    await angebotStatusSetzen(a, status);
    setAngebot({ ...a, status });
    setGestempelt(true);
    setMeldung(null);
  }

  async function pdf() {
    const a = await speichernJetzt();
    if (!a || !einstellungen) return;
    setBeschaeftigt("pdf");
    setMeldung(null);
    try {
      await pdfHerunterladen({ art: "angebot", dokument: a, firma: einstellungen.firma });
    } catch (e) {
      if (e instanceof ApiFehler && e.status === 501) {
        setMeldung({ ton: "warnung", text: "Die PDF-Erzeugung ist noch nicht eingebaut (Modul PDF). Sobald sie da ist, funktioniert dieser Knopf ohne weitere Änderung; alle Daten des Angebots sind gespeichert." });
      } else {
        setMeldung({ ton: "fehler", text: `PDF fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannter Fehler"}` });
      }
    } finally {
      setBeschaeftigt(null);
    }
  }

  async function formulieren() {
    const a = await speichernJetzt();
    if (!a) return;
    setBeschaeftigt("anschreiben");
    setMeldung(null);
    try {
      const neu = await anschreibenFormulieren(a, anfrage ?? null);
      setAngebot(neu);
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Die KI hat nicht geantwortet." });
    } finally {
      setBeschaeftigt(null);
    }
  }

  async function kopieren() {
    if (!angebot?.antwortEmail) return;
    const text = `Betreff: ${angebot.antwortEmail.betreff}\n\n${angebot.antwortEmail.text}`;
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      setMeldung({ ton: "fehler", text: "Die Zwischenablage ist in diesem Browser nicht erreichbar. Markieren und kopieren Sie den Text von Hand." });
    }
  }

  async function objektAnlegen() {
    const a = await speichernJetzt();
    if (!a) return;
    try {
      await objektAusAngebot(a, anfrage ?? null);
      setMeldung(null); // der Hinweis zum angelegten Objekt erscheint über die Live-Abfrage
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Objekt konnte nicht angelegt werden" });
    }
  }

  async function loeschen() {
    if (!angebot) return;
    if (!window.confirm(`Angebot ${angebot.nummer} löschen? Die Nummer bleibt vergeben.`)) return;
    await angebotLoeschen(angebot);
    router.push(angebot.anfrageId ? `/angebote?anfrage=${angebot.anfrageId}` : "/angebote");
  }

  if (gespeichert === undefined) return null;
  if (!gespeichert || !angebot || !summen) {
    return (
      <Leer titel="Angebot nicht gefunden">
        Vielleicht wurde es gelöscht. <Link href="/angebote" className="underline">Zurück zu den Angeboten</Link>
      </Leer>
    );
  }

  const monatlich = angebot.turnus === "monatlich";
  const kleinunternehmer = angebot.ustSatz === 0;
  const turnusText = monatlich ? "im Monat" : "einmalig";
  const grundleistungen = katalog.filter((l) => l.kategorie === "grundleistung");
  const sonderKatalog = katalog.filter((l) => l.kategorie === "sonderleistung" && !angebot.sonderleistungen.some((s) => s.bezeichnung === l.bezeichnung));

  return (
    <>
      <p className="mb-2 text-sm text-tinte-2">
        <Link href="/angebote" className="hover:text-tinte">Angebote</Link>
        {anfrage ? (
          <>
            {" / "}
            <Link href={`/angebote?anfrage=${anfrage.id}`} className="hover:text-tinte">
              Anfrage vom {datum(anfrage.eingangAm)}
            </Link>
          </>
        ) : null}
        {" / "}
        {angebot.nummer}
      </p>
      <Seitenkopf
        titel={`Angebot ${angebot.nummer}`}
        text={angebot.betreff}
        aktionen={
          <>
            <Button onClick={pdf} disabled={beschaeftigt !== null || !einstellungen}>
              {beschaeftigt === "pdf" ? "PDF wird erzeugt…" : "PDF herunterladen"}
            </Button>
            {angebot.status === "entwurf" ? (
              <Button variante="sekundaer" onClick={() => statusSetzen("versendet")}>
                Als versendet markieren
              </Button>
            ) : null}
            {angebot.status === "versendet" ? (
              <>
                <Button variante="sekundaer" onClick={() => statusSetzen("angenommen")}>
                  Angenommen
                </Button>
                <Button variante="gefaehrlich" onClick={() => statusSetzen("abgelehnt")}>
                  Abgelehnt
                </Button>
              </>
            ) : null}
            {angebot.status !== "entwurf" ? (
              <Button variante="text" onClick={() => statusSetzen("entwurf")}>
                Zurück auf Entwurf
              </Button>
            ) : null}
            <Button variante="text" onClick={loeschen}>
              Löschen
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <AngebotStempel status={angebot.status} groesse="normal" neu={gestempelt} />
        <span className="text-sm text-tinte-3">
          erstellt {zeit(angebot.erstelltAm)} · gültig bis {datum(angebot.gueltigBis)} · {eur(angebot.netto)} netto {turnusText}
        </span>
      </div>

      {meldung ? (
        <div className="mb-5">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {angebot.status === "angenommen" ? (
        <div className="mb-5">
          {objektVorhanden ? (
            <Hinweis ton="ok">
              Das Objekt „{objektVorhanden.kurzname}“ ist angelegt{objektVorhanden.honorarNettoMonat !== null ? ` mit ${eur(objektVorhanden.honorarNettoMonat)} netto im Monat` : ""}. Einheiten, Personen und Bankkonto pflegen Sie unter{" "}
              <Link href="/stammdaten" className="underline">Stammdaten</Link>.
            </Hinweis>
          ) : (
            <Hinweis ton="ok">
              <span className="mr-3">Angenommen. Das Objekt kann jetzt mit Auftraggeber und Monatshonorar angelegt werden.</span>
              <Button variante="sekundaer" klein onClick={objektAnlegen}>
                Objekt aus dem Angebot anlegen
              </Button>
            </Hinweis>
          )}
        </div>
      ) : null}

      <div className="space-y-6">
        <Kontierungsstempel titel="Angebot" spalten={3}>
          <KontierungsZelle label="Empfänger" breit>
            <Eingabe value={angebot.empfaenger.name} onChange={(e) => aendere("empfaenger.name", { empfaenger: { ...angebot.empfaenger, name: e.target.value } })} />
          </KontierungsZelle>
          <KontierungsZelle label="Zusatz / z. Hd.">
            <Eingabe value={angebot.empfaenger.zusatz} onChange={(e) => aendere("empfaenger.zusatz", { empfaenger: { ...angebot.empfaenger, zusatz: e.target.value } })} />
          </KontierungsZelle>
          <KontierungsZelle label="Anschrift" breit>
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,2fr)] gap-2">
              <Eingabe value={angebot.empfaenger.adresse.strasse} placeholder="Straße" onChange={(e) => aendere("empfaenger.adresse", { empfaenger: { ...angebot.empfaenger, adresse: { ...angebot.empfaenger.adresse, strasse: e.target.value } } })} />
              <Eingabe value={angebot.empfaenger.adresse.plz} placeholder="PLZ" className="zahl !text-left" onChange={(e) => aendere("empfaenger.adresse", { empfaenger: { ...angebot.empfaenger, adresse: { ...angebot.empfaenger.adresse, plz: e.target.value } } })} />
              <Eingabe value={angebot.empfaenger.adresse.ort} placeholder="Ort" onChange={(e) => aendere("empfaenger.adresse", { empfaenger: { ...angebot.empfaenger, adresse: { ...angebot.empfaenger.adresse, ort: e.target.value } } })} />
            </div>
          </KontierungsZelle>
          <KontierungsZelle label="E-Mail">
            <Eingabe type="email" value={angebot.empfaenger.email} onChange={(e) => aendere("empfaenger.email", { empfaenger: { ...angebot.empfaenger, email: e.target.value } })} />
          </KontierungsZelle>
          <KontierungsZelle label="Objekt" breit>
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,2fr)] gap-2">
              <Eingabe value={angebot.objekt.strasse} placeholder="Straße" onChange={(e) => aendere("objekt.strasse", { objekt: { ...angebot.objekt, strasse: e.target.value } })} />
              <Eingabe value={angebot.objekt.plz} placeholder="PLZ" className="zahl !text-left" onChange={(e) => aendere("objekt.plz", { objekt: { ...angebot.objekt, plz: e.target.value } })} />
              <Eingabe value={angebot.objekt.ort} placeholder="Ort" onChange={(e) => aendere("objekt.ort", { objekt: { ...angebot.objekt, ort: e.target.value } })} />
            </div>
          </KontierungsZelle>
          <KontierungsZelle label="Verwaltungsart">
            <Auswahl value={angebot.objekt.art} onChange={(e) => aendere("objekt.art", { objekt: { ...angebot.objekt, art: e.target.value as Angebot["objekt"]["art"] } })}>
              {(["WEG", "MIET", "GEWERBE", "UNKLAR"] as const).map((a) => (
                <option key={a} value={a}>
                  {a === "UNKLAR" ? "unklar" : ART_TEXT[a]}
                </option>
              ))}
            </Auswahl>
          </KontierungsZelle>
          <KontierungsZelle label="Wohneinheiten">
            <MengeEingabe wert={angebot.objekt.einheitenWohnen} ganzzahl onWert={(n) => aendere("objekt.einheitenWohnen", { objekt: { ...angebot.objekt, einheitenWohnen: n } })} ariaLabel="Wohneinheiten" />
          </KontierungsZelle>
          <KontierungsZelle label="Gewerbeeinheiten">
            <MengeEingabe wert={angebot.objekt.einheitenGewerbe} ganzzahl onWert={(n) => aendere("objekt.einheitenGewerbe", { objekt: { ...angebot.objekt, einheitenGewerbe: n } })} ariaLabel="Gewerbeeinheiten" />
          </KontierungsZelle>
          <KontierungsZelle label="Stellplätze">
            <MengeEingabe wert={angebot.objekt.stellplaetze} ganzzahl onWert={(n) => aendere("objekt.stellplaetze", { objekt: { ...angebot.objekt, stellplaetze: n } })} ariaLabel="Stellplätze" />
          </KontierungsZelle>
          <KontierungsZelle label="Datum">
            <Eingabe type="date" value={angebot.datum} onChange={(e) => e.target.value && aendere("datum", { datum: e.target.value })} />
          </KontierungsZelle>
          <KontierungsZelle label="Gültig bis">
            <Eingabe type="date" value={angebot.gueltigBis} onChange={(e) => e.target.value && aendere("gueltigBis", { gueltigBis: e.target.value })} />
          </KontierungsZelle>
          <KontierungsZelle label="Turnus">
            <Auswahl value={angebot.turnus} onChange={(e) => aendere("turnus", { turnus: e.target.value as Angebot["turnus"] })}>
              <option value="monatlich">monatlich</option>
              <option value="einmalig">einmalig</option>
            </Auswahl>
          </KontierungsZelle>
          <KontierungsZelle label="Betreff" breit>
            <Eingabe value={angebot.betreff} onChange={(e) => aendere("betreff", { betreff: e.target.value })} />
          </KontierungsZelle>
          <KontierungsZelle label="Ansprechpartner">
            <Eingabe value={angebot.ansprechpartner} onChange={(e) => aendere("ansprechpartner", { ansprechpartner: e.target.value })} />
          </KontierungsZelle>
        </Kontierungsstempel>

        <section>
          <h2 className="mb-2 text-xl">Positionen</h2>
          <div className="blatt overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th className="zahl w-10">Pos.</th>
                  <th>Leistung</th>
                  <th className="zahl w-28">Menge</th>
                  <th className="w-40">Einheit</th>
                  <th className="zahl w-32">Einzelpreis</th>
                  <th className="zahl w-32">Netto</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {angebot.positionen.map((p, i) => (
                  <tr key={i}>
                    <td className="zahl pt-[1.05rem]">{p.pos}</td>
                    <td>
                      <Eingabe value={p.bezeichnung} placeholder="Bezeichnung" onChange={(e) => positionAendern(i, { bezeichnung: e.target.value })} aria-label={`Bezeichnung Position ${p.pos}`} />
                      {p.beschreibung ? <div className="mt-1 text-xs text-tinte-3">{p.beschreibung}</div> : null}
                    </td>
                    <td>
                      <MengeEingabe wert={p.menge} onWert={(n) => positionAendern(i, { menge: n })} ariaLabel={`Menge Position ${p.pos}`} />
                    </td>
                    <td>
                      <Eingabe value={p.einheit} onChange={(e) => positionAendern(i, { einheit: e.target.value })} aria-label={`Einheit Position ${p.pos}`} />
                    </td>
                    <td>
                      <GeldEingabe wert={p.einzelpreisNetto} onWert={(n) => positionAendern(i, { einzelpreisNetto: n })} ariaLabel={`Einzelpreis Position ${p.pos}`} />
                    </td>
                    <td className="zahl whitespace-nowrap pt-[1.05rem]">{betrag(p.gesamtNetto)}</td>
                    <td className="pt-[0.8rem] text-right">
                      <Button variante="text" klein onClick={() => positionEntfernen(i)}>
                        entfernen
                      </Button>
                    </td>
                  </tr>
                ))}
                {angebot.positionen.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-tinte-2">
                      Keine Positionen. Fügen Sie eine Leistung aus dem Katalog hinzu.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <div className="flex flex-wrap items-end justify-between gap-4 p-4">
              <div className="flex items-center gap-2">
                <Auswahl className="!w-auto" value="" onChange={(e) => positionHinzufuegen(e.target.value)} aria-label="Position hinzufügen">
                  <option value="">Position hinzufügen …</option>
                  {grundleistungen.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.bezeichnung} ({eur(l.preisNetto)} {einheitKurz(l.einheit)})
                    </option>
                  ))}
                  {katalog
                    .filter((l) => l.kategorie === "sonderleistung")
                    .map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.bezeichnung} ({eur(l.preisNetto)} {einheitKurz(l.einheit)})
                      </option>
                    ))}
                  <option value="frei">Freie Position</option>
                </Auswahl>
              </div>
              <dl className="grid min-w-[22rem] grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[0.9375rem]">
                <dt className="text-tinte-2">Zwischensumme</dt>
                <dd className="zahl">{betrag(summen.zwischensumme)} €</dd>
                <dt className="flex items-center gap-2 text-tinte-2">
                  Rabatt
                  <MengeEingabe wert={angebot.rabattProzent} onWert={(n) => aendere("rabattProzent", { rabattProzent: Math.min(100, n) })} className="!w-20 !py-1" ariaLabel="Rabatt in Prozent" />
                  %
                </dt>
                <dd className="zahl self-center">{summen.rabattBetrag > 0 ? `−${betrag(summen.rabattBetrag)} €` : "–"}</dd>
                <dt className="text-tinte-2">Netto {turnusText}</dt>
                <dd className="zahl">{betrag(summen.netto)} €</dd>
                <dt className="text-tinte-2">{kleinunternehmer ? "Umsatzsteuer (Kleinunternehmer, § 19 UStG)" : `Umsatzsteuer ${angebot.ustSatz} %`}</dt>
                <dd className="zahl">{kleinunternehmer ? "keine" : `${betrag(summen.ust)} €`}</dd>
                <dt className="border-t border-tinte pt-1 font-semibold">Brutto {turnusText}</dt>
                <dd className="zahl border-t border-tinte pt-1 font-semibold">{betrag(summen.brutto)} €</dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="blatt p-5">
          <h2 className="text-lg">Annahmen</h2>
          <p className="mb-3 text-sm text-tinte-2">Was in der Anfrage fehlte und wie das Angebot damit umgeht. Stehen so im Angebot und im Anschreiben.</p>
          <ListenEditor eintraege={angebot.annahmen} onChange={(neu) => aendere("annahmen", { annahmen: neu })} hinzufuegenText="Annahme ergänzen" nummeriert leerText="Keine Annahmen: die Anfrage war vollständig." />
        </section>

        <section className="blatt p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg">
              Leistungsumfang <span className="zahl text-base font-normal text-tinte-3">{angebot.leistungsumfang.length}</span>
            </h2>
            <Button variante="text" klein onClick={() => setUmfangOffen((o) => !o)}>
              {umfangOffen ? "Ausblenden" : "Einblenden"}
            </Button>
          </div>
          <p className="mb-3 text-sm text-tinte-2">Was das Grundhonorar enthält. Steht als Liste im Angebot.</p>
          {umfangOffen ? <ListenEditor eintraege={angebot.leistungsumfang} onChange={(neu) => aendere("leistungsumfang", { leistungsumfang: neu })} hinzufuegenText="Punkt ergänzen" nummeriert leerText="Kein Leistungsumfang eingetragen." /> : null}
        </section>

        <section className="blatt p-5">
          <h2 className="text-lg">Laufzeit</h2>
          <Textbereich className="mt-2 field-sizing-content !min-h-0" rows={2} value={angebot.laufzeitText} onChange={(e) => aendere("laufzeitText", { laufzeitText: e.target.value })} aria-label="Laufzeit" />
        </section>

        <section className="blatt">
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-5">
            <h2 className="text-lg">Sonderleistungen nach Preisliste</h2>
            {sonderKatalog.length ? (
              <Auswahl className="!w-auto" value="" onChange={(e) => e.target.value && sonderleistungHinzufuegen(e.target.value)} aria-label="Sonderleistung hinzufügen">
                <option value="">Aus dem Katalog hinzufügen …</option>
                {sonderKatalog.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.bezeichnung}
                  </option>
                ))}
              </Auswahl>
            ) : null}
          </div>
          <p className="px-5 pb-3 text-sm text-tinte-2">Nicht im Grundhonorar enthalten, werden nach Anfall berechnet.</p>
          {angebot.sonderleistungen.length ? (
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Leistung</th>
                  <th className="zahl w-32">Netto</th>
                  <th className="w-56">Einheit</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {angebot.sonderleistungen.map((s, i) => (
                  <tr key={i}>
                    <td>{s.bezeichnung}</td>
                    <td className="zahl whitespace-nowrap">{betrag(s.preisNetto)} €</td>
                    <td className="text-tinte-2">{s.einheit}</td>
                    <td className="text-right">
                      <Button variante="text" klein onClick={() => aendere("sonderleistungen", { sonderleistungen: angebot.sonderleistungen.filter((_, k) => k !== i) })}>
                        entfernen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 pb-5 text-sm text-tinte-3">Keine Sonderleistungen im Angebot.</p>
          )}
        </section>

        <section className="blatt p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">Anschreiben</h2>
            <div className="flex items-center gap-3">
              {beschaeftigt === "anschreiben" ? <div className="lesebalken w-40" aria-hidden="true" /> : null}
              <Button variante={angebot.anschreiben.length ? "sekundaer" : "primaer"} onClick={formulieren} disabled={beschaeftigt !== null}>
                {beschaeftigt === "anschreiben" ? "Wird formuliert…" : angebot.anschreiben.length ? "Neu formulieren lassen" : "Anschreiben formulieren lassen"}
              </Button>
            </div>
          </div>
          <p className="mb-3 mt-1 text-sm text-tinte-2">
            Die KI geht auf die Anfrage ein, nennt den Monatsbetrag und die Annahmen. Die Zahlen kommen aus dem Angebot, nicht von der KI. Jeder Absatz ist editierbar; der erste ist die Anrede.
          </p>
          <ListenEditor eintraege={angebot.anschreiben} onChange={(neu) => aendere("anschreiben", { anschreiben: neu })} hinzufuegenText="Absatz ergänzen" leerText="Noch kein Anschreiben. Der Knopf oben formuliert es in wenigen Sekunden." />
        </section>

        <section className="blatt p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">Antwortmail</h2>
            {angebot.antwortEmail ? (
              <Button variante="sekundaer" onClick={kopieren}>
                {kopiert ? "Kopiert" : "In die Zwischenablage kopieren"}
              </Button>
            ) : null}
          </div>
          <p className="mb-3 mt-1 text-sm text-tinte-2">Kurze Mail mit Hinweis auf das angehängte PDF. Kopieren, in Ihr Mailprogramm einfügen, PDF anhängen.</p>
          {angebot.antwortEmail ? (
            <div className="space-y-3">
              <Eingabe value={angebot.antwortEmail.betreff} onChange={(e) => aendere("antwortEmail.betreff", { antwortEmail: { betreff: e.target.value, text: angebot.antwortEmail?.text ?? "" } })} aria-label="Betreff der Antwortmail" />
              <Textbereich className="field-sizing-content min-h-[8rem]" value={angebot.antwortEmail.text} onChange={(e) => aendere("antwortEmail.text", { antwortEmail: { betreff: angebot.antwortEmail?.betreff ?? "", text: e.target.value } })} aria-label="Text der Antwortmail" />
            </div>
          ) : (
            <p className="text-sm text-tinte-3">Entsteht zusammen mit dem Anschreiben.</p>
          )}
        </section>
      </div>
    </>
  );
}
