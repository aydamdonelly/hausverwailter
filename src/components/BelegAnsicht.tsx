"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { belegAblehnen, belegBuchen, belegSpeichern, belegZurueckstellen, dokumentLesen, dokumentLoeschen } from "@/lib/store/dokumente";
import { ladeEinstellungen } from "@/lib/store/arbeitsbereich";
import type { Beleg, Einstellungen } from "@/lib/domain/schema";
import { betrag, datum, eur, iban as ibanFmt, zeit } from "@/lib/format";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Button } from "@/components/ui/Button";
import { StatusStempel } from "@/components/ui/Stempel";
import { Hinweis } from "@/components/ui/Hinweis";
import { Kontierungsstempel, KontierungsZelle } from "@/components/ui/Kontierungsstempel";
import { Auswahl, Eingabe } from "@/components/ui/Feld";
import { GeldEingabe } from "@/components/ui/GeldEingabe";
import { DokumentViewer } from "@/components/DokumentViewer";
import { Leer } from "@/components/ui/Leer";

const STUFE_TON = { fehler: "fehler", warnung: "warnung", hinweis: "hinweis" } as const;
const STUFE_RANG = { fehler: 0, warnung: 1, hinweis: 2 } as const;

export function BelegAnsicht({ dokumentId }: { dokumentId: string }) {
  const router = useRouter();
  const dokument = useLiveQuery(() => db.dokumente.get(dokumentId), [dokumentId]);
  const gespeichert = useLiveQuery(() => db.belege.where("dokumentId").equals(dokumentId).first(), [dokumentId]);
  const objekte = useLiveQuery(() => db.objekte.filter((o) => o.aktiv).toArray(), []);
  const kostenarten = useLiveQuery(() => db.kostenarten.filter((k) => k.aktiv).toArray(), []);
  const buchungen = useLiveQuery(() => (gespeichert ? db.buchungen.where("belegId").equals(gespeichert.id).toArray() : []), [gespeichert?.id]);
  const [einstellungen, setEinstellungen] = useState<Einstellungen | null>(null);
  const [beleg, setBeleg] = useState<Beleg | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);
  const [gestempelt, setGestempelt] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geaendert = useRef<Set<string>>(new Set());

  useEffect(() => {
    ladeEinstellungen().then(setEinstellungen);
  }, []);
  // Sobald der gespeicherte Beleg (neu) da ist, wird er zum Formularzustand; während des Renderns, nicht im Effekt.
  if (gespeichert && (!beleg || beleg.id !== gespeichert.id)) setBeleg(gespeichert);

  const kostenart = useMemo(() => kostenarten?.find((k) => k.code === beleg?.kostenartCode), [kostenarten, beleg?.kostenartCode]);
  const objekt = useMemo(() => objekte?.find((o) => o.id === beleg?.objektId), [objekte, beleg?.objektId]);
  const konto = einstellungen?.kontenrahmen === "SKR04" ? kostenart?.kontoSkr04 : kostenart?.kontoSkr03;
  const befunde = useMemo(() => [...(beleg?.befunde ?? [])].sort((a, b) => STUFE_RANG[a.stufe] - STUFE_RANG[b.stufe]), [beleg?.befunde]);
  const hatFehler = befunde.some((b) => b.stufe === "fehler");
  const gebucht = dokument?.status === "gebucht";
  const abgelehnt = dokument?.status === "abgelehnt";

  /** Feldänderung: sofort im Formular, nach 500 ms speichern und neu prüfen. */
  function aendere(feld: string, patch: Partial<Beleg>) {
    if (!beleg) return;
    const neu = { ...beleg, ...patch };
    setBeleg(neu);
    geaendert.current.add(feld);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const felder = [...geaendert.current];
      geaendert.current.clear();
      const gespeichertNeu = await belegSpeichern(neu, felder);
      setBeleg((aktuell) => (aktuell && aktuell.id === gespeichertNeu.id ? { ...aktuell, befunde: gespeichertNeu.befunde, herkunft: gespeichertNeu.herkunft } : aktuell));
    }, 500);
  }

  function lieferantAendern(feld: keyof Beleg["lieferant"], wert: string) {
    if (!beleg) return;
    aendere(`lieferant.${feld}`, { lieferant: { ...beleg.lieferant, [feld]: wert } });
  }

  async function buchen() {
    if (!beleg) return;
    if (hatFehler && !window.confirm("Dieser Beleg hat Fehler-Befunde. Trotzdem freigeben und buchen?")) return;
    setBeschaeftigt("buchen");
    try {
      if (timer.current) {
        clearTimeout(timer.current);
        await belegSpeichern(beleg, [...geaendert.current]);
        geaendert.current.clear();
      }
      await belegBuchen(beleg.id);
      setGestempelt(true);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Buchen fehlgeschlagen");
    } finally {
      setBeschaeftigt(null);
    }
  }

  async function ablehnen() {
    if (!beleg) return;
    const grund = window.prompt("Warum wird der Beleg abgelehnt? (steht im Protokoll)", "Nicht unser Beleg");
    if (grund === null) return;
    await belegAblehnen(beleg.id, grund);
    setGestempelt(true);
  }

  async function neuLesen() {
    setBeschaeftigt("lesen");
    setBeleg(null);
    await dokumentLesen(dokumentId);
    setBeschaeftigt(null);
    setGestempelt(true);
  }

  async function loeschen() {
    if (!dokument) return;
    if (!window.confirm(`"${dokument.dateiname}" samt Beleg und Buchungen löschen?`)) return;
    await dokumentLoeschen(dokumentId);
    router.push("/");
  }

  if (dokument === undefined) return null;
  if (!dokument) return <Leer titel="Dokument nicht gefunden">Vielleicht wurde es gelöscht. <Link href="/" className="underline">Zurück zum Posteingang</Link></Leer>;

  const titel = beleg ? `${beleg.lieferant.name || "Unbekannt"}${beleg.rechnungsnummer ? ` · ${beleg.rechnungsnummer}` : ""}` : dokument.dateiname;

  return (
    <>
      <p className="mb-2 text-sm text-tinte-2">
        <Link href="/" className="hover:text-tinte">Posteingang</Link> / {dokument.dateiname}
      </p>
      <Seitenkopf
        titel={titel}
        text={dokument.notizen && beleg ? dokument.notizen : undefined}
        aktionen={
          <>
            {beleg && !gebucht && !abgelehnt ? (
              <Button onClick={buchen} disabled={beschaeftigt !== null || !beleg.objektId || !beleg.kostenartCode} title={!beleg.objektId || !beleg.kostenartCode ? "Objekt und Kostenart zuordnen" : undefined}>
                {beschaeftigt === "buchen" ? "Wird gebucht…" : "Freigeben und buchen"}
              </Button>
            ) : null}
            {beleg && gebucht ? (
              <Button variante="text" onClick={() => belegZurueckstellen(beleg.id)}>
                Buchung zurücknehmen
              </Button>
            ) : null}
            {beleg && !gebucht && !abgelehnt ? (
              <Button variante="gefaehrlich" onClick={ablehnen}>
                Ablehnen
              </Button>
            ) : null}
            <Button variante="text" onClick={neuLesen} disabled={beschaeftigt !== null}>
              {beschaeftigt === "lesen" ? "Wird gelesen…" : "Neu lesen"}
            </Button>
            <Button variante="text" onClick={loeschen}>
              Löschen
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <DokumentViewer dokumentId={dokumentId} className="h-[78vh] min-h-[480px]" />

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <StatusStempel status={dokument.status} groesse="normal" neu={gestempelt} />
            {beleg?.erkanntAm ? (
              <span className="text-sm text-tinte-3">
                gelesen {zeit(beleg.erkanntAm)}{beleg.modell ? ` mit ${beleg.modell}` : ""}
              </span>
            ) : null}
            {dokument.status === "wird_gelesen" || beschaeftigt === "lesen" ? <div className="lesebalken w-40" /> : null}
          </div>

          {dokument.status === "fehler" ? <Hinweis ton="fehler">{dokument.fehler}</Hinweis> : null}

          {!beleg && dokument.status !== "wird_gelesen" && beschaeftigt !== "lesen" ? (
            <div className="blatt p-5 text-tinte-2">
              {dokument.typ && dokument.typ !== "eingangsrechnung" ? (
                <>
                  <p>Die KI hat dieses Dokument als <strong className="text-tinte">{dokument.typ}</strong> eingestuft.</p>
                  {dokument.notizen ? <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{dokument.notizen}</pre> : null}
                  {dokument.typ === "anfrage" && dokument.anfrageId ? (
                    <p className="mt-3">
                      <Link href={`/angebote?anfrage=${dokument.anfrageId}`} className="underline">Zur Anfrage und zum Angebot</Link>
                    </p>
                  ) : null}
                  {dokument.typ === "kontoauszug" ? (
                    <p className="mt-3">
                      <Link href={`/bank?dokument=${dokument.id}`} className="underline">Im Bankimport öffnen</Link>
                    </p>
                  ) : null}
                </>
              ) : (
                <p>Noch nicht gelesen. „Neu lesen“ startet die Erkennung.</p>
              )}
            </div>
          ) : null}

          {beleg ? (
            <>
              {befunde.length ? (
                <div className="space-y-2">
                  {befunde.map((b, i) => (
                    <Hinweis key={`${b.code}-${i}`} ton={STUFE_TON[b.stufe]}>
                      {b.text}
                    </Hinweis>
                  ))}
                </div>
              ) : (
                <Hinweis ton="ok">Keine Befunde. Pflichtangaben vollständig, Beträge stimmen, kein Duplikat.</Hinweis>
              )}

              <Kontierungsstempel titel="Kontierung" spalten={2}>
                <KontierungsZelle label="Objekt" hinweis={beleg.herkunft.objektId === "manuell" ? "manuell zugeordnet" : beleg.objektHinweis ? `im Beleg: ${beleg.objektHinweis}` : undefined}>
                  <Auswahl value={beleg.objektId ?? ""} onChange={(e) => aendere("objektId", { objektId: e.target.value || null })} disabled={gebucht}>
                    <option value="">(nicht zugeordnet)</option>
                    {(objekte ?? []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.kurzname}
                      </option>
                    ))}
                  </Auswahl>
                </KontierungsZelle>
                <KontierungsZelle label="Kostenart" hinweis={beleg.kostenartBegruendung || undefined}>
                  <Auswahl value={beleg.kostenartCode ?? ""} onChange={(e) => aendere("kostenartCode", { kostenartCode: e.target.value || null })} disabled={gebucht}>
                    <option value="">(nicht zugeordnet)</option>
                    {(kostenarten ?? []).map((k) => (
                      <option key={k.code} value={k.code}>
                        {k.bezeichnung}
                      </option>
                    ))}
                  </Auswahl>
                </KontierungsZelle>
                <KontierungsZelle label="Umlagefähig">
                  {kostenart ? (kostenart.umlagefaehig ? `Ja${kostenart.betrkv ? `, ${kostenart.betrkv}` : ""}` : "Nein, trägt der Eigentümer") : "–"}
                </KontierungsZelle>
                <KontierungsZelle label={`Konto ${einstellungen?.kontenrahmen ?? ""}`}>
                  <span className="zahl">{konto || "–"}</span>
                  {objekt ? <span className="ml-3 text-tinte-3">Kostenstelle {objekt.kurzname}</span> : null}
                </KontierungsZelle>
                <KontierungsZelle label="Eingegangen">
                  {datum(dokument.hochgeladenAm)}
                  <span className="ml-2 text-tinte-3">{dokument.quelle === "email" ? "per E-Mail" : dokument.quelle === "beispiel" ? "Beispiel" : "abgelegt"}</span>
                </KontierungsZelle>
                <KontierungsZelle label="Sachlich richtig" hinweis="Leistung erbracht, Angaben stimmen. Wer das bestätigt, steht im Protokoll.">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#15201b]"
                      checked={Boolean(beleg.sachlichRichtigAm)}
                      disabled={gebucht}
                      onChange={(e) => aendere("sachlichRichtigAm", { sachlichRichtigAm: e.target.checked ? new Date().toISOString().slice(0, 10) : null })}
                    />
                    <span>{beleg.sachlichRichtigAm ? `bestätigt am ${datum(beleg.sachlichRichtigAm)}` : "noch nicht bestätigt"}</span>
                  </label>
                </KontierungsZelle>
                <KontierungsZelle label="Rechnerisch richtig">
                  {befunde.some((b) => b.code.startsWith("SUMME") || b.code.startsWith("UST_") || b.code === "VERSICHERUNGSTEUER_SATZ") ? <span className="text-stempel-2">Abweichung, siehe Befund</span> : "geprüft, stimmt"}
                </KontierungsZelle>
                <KontierungsZelle label="Gebucht">
                  {buchungen && buchungen.length ? (
                    <span>
                      {buchungen.length} Buchungssatz{buchungen.length > 1 ? "e" : ""} am {datum(buchungen[0].erstelltAm)}
                    </span>
                  ) : (
                    <span className="text-tinte-3">noch nicht</span>
                  )}
                </KontierungsZelle>
              </Kontierungsstempel>

              <Kontierungsstempel titel="Beleg" spalten={3}>
                <KontierungsZelle label="Rechnungssteller" breit hinweis={beleg.lieferant.adresse || undefined}>
                  <Eingabe value={beleg.lieferant.name} onChange={(e) => lieferantAendern("name", e.target.value)} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="Rechnungsnummer">
                  <Eingabe value={beleg.rechnungsnummer} onChange={(e) => aendere("rechnungsnummer", { rechnungsnummer: e.target.value })} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="Rechnungsdatum">
                  <Eingabe type="date" value={beleg.rechnungsdatum ?? ""} onChange={(e) => aendere("rechnungsdatum", { rechnungsdatum: e.target.value || null })} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="Leistung von">
                  <Eingabe type="date" value={beleg.leistungVon ?? ""} onChange={(e) => aendere("leistungVon", { leistungVon: e.target.value || null })} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="Leistung bis">
                  <Eingabe type="date" value={beleg.leistungBis ?? ""} onChange={(e) => aendere("leistungBis", { leistungBis: e.target.value || null })} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="Netto">
                  <GeldEingabe wert={beleg.nettoGesamt} onWert={(n) => aendere("nettoGesamt", { nettoGesamt: n })} disabled={gebucht} ariaLabel="Netto" />
                </KontierungsZelle>
                <KontierungsZelle label="Umsatzsteuer">
                  <GeldEingabe wert={beleg.ustGesamt} onWert={(n) => aendere("ustGesamt", { ustGesamt: n })} disabled={gebucht} ariaLabel="Umsatzsteuer" />
                </KontierungsZelle>
                <KontierungsZelle label="Brutto">
                  <GeldEingabe wert={beleg.bruttoGesamt} onWert={(n) => aendere("bruttoGesamt", { bruttoGesamt: n })} disabled={gebucht} ariaLabel="Brutto" />
                </KontierungsZelle>
                <KontierungsZelle label="Fällig am">
                  <Eingabe type="date" value={beleg.faelligAm ?? ""} onChange={(e) => aendere("faelligAm", { faelligAm: e.target.value || null })} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="Zahlung">
                  <Auswahl value={beleg.zahlungsart} onChange={(e) => aendere("zahlungsart", { zahlungsart: e.target.value as Beleg["zahlungsart"] })} disabled={gebucht}>
                    <option value="ueberweisung">Überweisung</option>
                    <option value="lastschrift">Lastschrift</option>
                    <option value="bereits_bezahlt">bereits bezahlt</option>
                    <option value="unbekannt">unbekannt</option>
                  </Auswahl>
                </KontierungsZelle>
                <KontierungsZelle label="Bezahlt am">
                  <Eingabe type="date" value={beleg.bezahltAm ?? ""} onChange={(e) => aendere("bezahltAm", { bezahltAm: e.target.value || null })} />
                </KontierungsZelle>
                <KontierungsZelle label="Steuernummer">
                  <Eingabe value={beleg.lieferant.steuernummer} onChange={(e) => lieferantAendern("steuernummer", e.target.value)} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="USt-IdNr.">
                  <Eingabe value={beleg.lieferant.ustIdNr} onChange={(e) => lieferantAendern("ustIdNr", e.target.value)} disabled={gebucht} />
                </KontierungsZelle>
                <KontierungsZelle label="IBAN">
                  <Eingabe value={ibanFmt(beleg.lieferant.iban)} onChange={(e) => lieferantAendern("iban", e.target.value)} disabled={gebucht} className="zahl !text-left" />
                </KontierungsZelle>
              </Kontierungsstempel>

              {beleg.positionen.length ? (
                <div className="blatt">
                  <table className="tabelle">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th className="zahl">Menge</th>
                        <th className="zahl">Einzel</th>
                        <th className="zahl">Netto</th>
                        <th className="zahl">USt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beleg.positionen.map((p, i) => (
                        <tr key={i}>
                          <td>{p.beschreibung}</td>
                          <td className="zahl whitespace-nowrap">{p.menge !== null ? `${betrag(p.menge).replace(",00", "")} ${p.einheit}`.trim() : ""}</td>
                          <td className="zahl whitespace-nowrap">{p.einzelpreisNetto !== null ? betrag(p.einzelpreisNetto) : ""}</td>
                          <td className="zahl whitespace-nowrap">{betrag(p.netto)}</td>
                          <td className="zahl whitespace-nowrap">{p.ustSatz} %</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Summe</td>
                        <td className="zahl">{betrag(beleg.nettoGesamt)}</td>
                        <td className="zahl whitespace-nowrap">{eur(beleg.bruttoGesamt)} brutto</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}

              {beleg.notizenKi ? <p className="text-sm text-tinte-2">Der KI ist aufgefallen: {beleg.notizenKi}</p> : null}
              {Object.values(beleg.herkunft).includes("manuell") ? (
                <p className="text-sm text-tinte-3">
                  Manuell geändert: {Object.entries(beleg.herkunft).filter(([, h]) => h === "manuell").map(([f]) => f).join(", ")}. Steht so im Protokoll.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
