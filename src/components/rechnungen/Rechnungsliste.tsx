"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { Einstellungen, Objekt, Rechnung } from "@/lib/domain/schema";
import { rechnungBezahltSetzen, rechnungStornieren } from "@/lib/rechnungen/speichern";
import { rechnungAlsPdf, rechnungAlsXRechnung } from "@/lib/rechnungen/ausgabe";
import { ART_TEXT, STATUS_TEXT, mengeText, ueberfaellig } from "@/lib/rechnungen/text";
import { betrag, datum as datumFmt, eur, heuteIso, monatName } from "@/lib/format";
import { summe } from "@/lib/geld";
import { Button } from "@/components/ui/Button";
import { Auswahl, Feld } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { Stempel } from "@/components/ui/Stempel";

/** Der Monat, unter dem eine Rechnung in der Liste läuft: der Leistungsmonat, sonst das Rechnungsdatum. */
export function abrechnungsmonat(r: Rechnung): string {
  return (r.leistungVon ?? r.datum).slice(0, 7);
}

export function RechnungsStatusStempel({ status, neu = false }: { status: Rechnung["status"]; neu?: boolean }) {
  const { text, ton } = STATUS_TEXT[status];
  return <Stempel text={text} ton={ton} groesse="klein" neu={neu} />;
}

/** Aufgeklappte Zeile: Positionen, Summen, Zahlungstext, Hinweise und die Buchungssätze dazu. */
function RechnungDetails({ rechnung, einstellungen }: { rechnung: Rechnung; einstellungen: Einstellungen }) {
  const buchungen = useLiveQuery(() => db.buchungen.where("rechnungId").equals(rechnung.id).sortBy("erstelltAm"), [rechnung.id]);
  return (
    <div className="grid gap-5 px-2 py-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <p className="font-medium">{rechnung.betreff}</p>
        {rechnung.einleitung ? <p className="mt-1 text-sm text-tinte-2">{rechnung.einleitung}</p> : null}
        <table className="tabelle mt-3">
          <thead>
            <tr>
              <th className="zahl">Pos.</th>
              <th>Leistung</th>
              <th className="zahl">Menge</th>
              <th className="zahl">Einzel €</th>
              <th className="zahl">Netto €</th>
              <th className="zahl">USt</th>
            </tr>
          </thead>
          <tbody>
            {rechnung.positionen.map((p) => (
              <tr key={p.pos}>
                <td className="zahl">{p.pos}</td>
                <td>
                  {p.bezeichnung}
                  {p.beschreibung ? <div className="text-sm text-tinte-2">{p.beschreibung}</div> : null}
                </td>
                <td className="zahl whitespace-nowrap">
                  {mengeText(p.menge)} {p.einheit}
                </td>
                <td className="zahl whitespace-nowrap">{betrag(p.einzelpreisNetto)}</td>
                <td className="zahl whitespace-nowrap">{betrag(p.gesamtNetto)}</td>
                <td className="zahl whitespace-nowrap">{p.ustSatz} %</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Netto</td>
              <td className="zahl whitespace-nowrap">{betrag(rechnung.netto)}</td>
              <td></td>
            </tr>
            {rechnung.steuersaetze
              .filter((z) => z.satz > 0)
              .map((z) => (
                <tr key={z.satz}>
                  <td colSpan={4} className="font-normal">
                    zzgl. {z.satz} % USt auf {betrag(z.netto)}
                  </td>
                  <td className="zahl whitespace-nowrap font-normal">{betrag(z.ust)}</td>
                  <td></td>
                </tr>
              ))}
            <tr>
              <td colSpan={4}>Brutto</td>
              <td className="zahl whitespace-nowrap">{betrag(rechnung.brutto)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-tinte-2">Empfänger</p>
          <p>
            {rechnung.empfaenger.name}
            {rechnung.empfaenger.zusatz ? `, ${rechnung.empfaenger.zusatz}` : ""}
          </p>
          <p className="text-tinte-2">
            {[rechnung.empfaenger.adresse.strasse, [rechnung.empfaenger.adresse.plz, rechnung.empfaenger.adresse.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
            {rechnung.empfaenger.kundennummer ? (
              <>
                {" · "}Kundennummer <span className="zahl">{rechnung.empfaenger.kundennummer}</span>
              </>
            ) : null}
            {rechnung.empfaenger.leitwegId ? (
              <>
                {" · "}Leitweg-ID <span className="zahl">{rechnung.empfaenger.leitwegId}</span>
              </>
            ) : null}
          </p>
        </div>
        {rechnung.leistungVon && rechnung.leistungBis ? (
          <div>
            <p className="text-tinte-2">Leistungszeitraum</p>
            <p>
              {rechnung.leistungVon === rechnung.leistungBis ? datumFmt(rechnung.leistungVon) : `${datumFmt(rechnung.leistungVon)} bis ${datumFmt(rechnung.leistungBis)}`}
            </p>
          </div>
        ) : null}
        <div>
          <p className="text-tinte-2">Zahlung</p>
          <p>{rechnung.zahlungsbedingung}</p>
        </div>
        {rechnung.hinweise.length ? (
          <div>
            <p className="text-tinte-2">Hinweise auf der Rechnung</p>
            {rechnung.hinweise.map((h, i) => (
              <p key={i}>{h}</p>
            ))}
          </div>
        ) : null}
        <div>
          <p className="text-tinte-2">Buchungssätze ({einstellungen.kontenrahmen})</p>
          {buchungen && buchungen.length ? (
            buchungen.map((b) => (
              <p key={b.id} className="zahl !text-left">
                {datumFmt(b.datum)} · Konto {b.konto || "–"} {b.sollHaben} · {betrag(b.netto)} netto, {betrag(b.ust)} USt ({b.ustSatz} %), {betrag(b.brutto)} brutto
                {b.exportiertAm ? ` · exportiert ${datumFmt(b.exportiertAm)}` : ""}
              </p>
            ))
          ) : (
            <p className="text-tinte-3">noch keine</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Rechnungsliste({ einstellungen, objekte, rechnungen }: { einstellungen: Einstellungen; objekte: Objekt[]; rechnungen: Rechnung[] }) {
  const heute = heuteIso();
  const [monat, setMonat] = useState("");
  const [objektId, setObjektId] = useState("");
  const [status, setStatus] = useState("");
  const [offen, setOffen] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ ton: "ok" | "warnung" | "fehler"; text: string } | null>(null);
  const [neuGestempelt, setNeuGestempelt] = useState<Set<string>>(new Set());

  const objektName = useMemo(() => new Map(objekte.map((o) => [o.id, o.kurzname])), [objekte]);
  const monate = useMemo(() => [...new Set(rechnungen.map(abrechnungsmonat))].sort().reverse(), [rechnungen]);
  const objekteMitRechnung = useMemo(
    () => objekte.filter((o) => rechnungen.some((r) => r.objektId === o.id)).sort((a, b) => a.kurzname.localeCompare(b.kurzname, "de")),
    [objekte, rechnungen],
  );
  const liste = useMemo(
    () =>
      rechnungen
        .filter((r) => (!monat || abrechnungsmonat(r) === monat) && (!objektId || r.objektId === objektId) && (!status || r.status === status))
        .sort((a, b) => b.datum.localeCompare(a.datum) || b.nummer.localeCompare(a.nummer, "de", { numeric: true })),
    [rechnungen, monat, objektId, status],
  );
  const gezaehlt = liste.filter((r) => r.status !== "storniert");
  const summeNetto = summe(gezaehlt.map((r) => r.netto));
  const summeBrutto = summe(gezaehlt.map((r) => r.brutto));
  const offenAnzahl = liste.filter((r) => r.status === "gestellt").length;
  const offenBrutto = summe(liste.filter((r) => r.status === "gestellt").map((r) => r.brutto));
  const storniert = liste.length - gezaehlt.length;

  function gestempelt(id: string) {
    setNeuGestempelt((s) => new Set(s).add(id));
  }

  async function ausgeben(r: Rechnung, art: "pdf" | "xrechnung") {
    setBeschaeftigt(`${r.id}:${art}`);
    setMeldung(null);
    try {
      if (art === "pdf") {
        await rechnungAlsPdf(r);
      } else {
        const befunde = await rechnungAlsXRechnung(r);
        setMeldung(
          befunde.length
            ? { ton: "warnung", text: `${r.nummer}.xml gespeichert. Für eine gültige XRechnung fehlt noch: ${befunde.join(" ")}` }
            : { ton: "ok", text: `${r.nummer}.xml gespeichert, alle bekannten Pflichtfelder der XRechnung sind gefüllt.` },
        );
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : "Ausgabe fehlgeschlagen";
      setMeldung({ ton: "warnung", text: `${art === "pdf" ? "PDF" : "XRechnung"} für ${r.nummer}: ${text}` });
    } finally {
      setBeschaeftigt(null);
    }
  }

  async function bezahlt(r: Rechnung, wert: string) {
    setMeldung(null);
    try {
      await rechnungBezahltSetzen(r.id, wert || null);
      gestempelt(r.id);
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Konnte die Zahlung nicht eintragen." });
    }
  }

  async function stornieren(r: Rechnung) {
    const grund = window.prompt(`Rechnung ${r.nummer} über ${eur(r.brutto)} stornieren? Die Buchungssätze werden gegengebucht, die Nummer bleibt vergeben.\n\nGrund (steht im Protokoll):`, "");
    if (grund === null) return;
    setMeldung(null);
    try {
      await rechnungStornieren(r.id, grund);
      gestempelt(r.id);
      setMeldung({ ton: "ok", text: `${r.nummer} storniert und gegengebucht.` });
    } catch (e) {
      setMeldung({ ton: "fehler", text: e instanceof Error ? e.message : "Storno fehlgeschlagen." });
    }
  }

  return (
    <section>
      <h2 className="text-[1.375rem]">Rechnungen</h2>
      <p className="mt-1 max-w-2xl text-tinte-2">Jede Zeile lässt sich aufklappen. PDF und XRechnung liegen zu jeder Rechnung bereit; Zahlung und Storno werden hier eingetragen.</p>
      <div className="mt-2 mb-4 max-w-4xl">
        <Hinweis ton="hinweis">
          E-Rechnung: Seit dem 1. Januar 2025 müssen alle inländischen Unternehmer E-Rechnungen empfangen können, auch Wohnungseigentümergemeinschaften und Vermieter.
          {einstellungen.firma.kleinunternehmer
            ? " Als Kleinunternehmer dürfen Sie weiter auf Papier oder als PDF ausstellen (§ 34a Satz 4 UStDV)."
            : " Ausstellen müssen Sie sie ab dem 1. Januar 2027, wenn Ihr Umsatz 2026 über 800.000 € lag, sonst ab dem 1. Januar 2028 (§ 27 Abs. 38 UStG). Bis dahin genügt das PDF."}{" "}
          Die XRechnung liegt trotzdem zu jeder Rechnung bereit.
        </Hinweis>
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        {rechnungen.length ? (
          <div className="flex flex-wrap items-end gap-3">
            <Feld label="Abrechnungsmonat" className="w-44">
              <Auswahl value={monat} onChange={(e) => setMonat(e.target.value)}>
                <option value="">Alle Monate</option>
                {monate.map((m) => (
                  <option key={m} value={m}>
                    {monatName(m)}
                  </option>
                ))}
              </Auswahl>
            </Feld>
            <Feld label="Objekt" className="w-52">
              <Auswahl value={objektId} onChange={(e) => setObjektId(e.target.value)}>
                <option value="">Alle Objekte</option>
                {objekteMitRechnung.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.kurzname}
                  </option>
                ))}
              </Auswahl>
            </Feld>
            <Feld label="Status" className="w-36">
              <Auswahl value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Alle</option>
                <option value="gestellt">Offen</option>
                <option value="bezahlt">Bezahlt</option>
                <option value="storniert">Storniert</option>
                <option value="entwurf">Entwurf</option>
              </Auswahl>
            </Feld>
          </div>
        ) : null}
      </div>

      {meldung ? (
        <div className="mb-3">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {rechnungen.length === 0 ? (
        <Leer titel="Noch keine Rechnungen">Der Honorarlauf oben erzeugt die ersten. Danach stehen sie hier mit PDF, XRechnung und Buchungssatz.</Leer>
      ) : (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Datum</th>
                <th>Empfänger</th>
                <th>Objekt</th>
                <th className="zahl">Netto €</th>
                <th className="zahl">Brutto €</th>
                <th>Fällig</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => {
                const istOffen = offen === r.id;
                const spaet = ueberfaellig(r, heute);
                return [
                  <tr key={r.id} className="klickbar" onClick={() => setOffen(istOffen ? null : r.id)} aria-expanded={istOffen}>
                    <td className="whitespace-nowrap">
                      <span className="zahl font-medium">{r.nummer}</span>
                      <div className="text-sm text-tinte-2">{ART_TEXT[r.art]}</div>
                    </td>
                    <td className="whitespace-nowrap">{datumFmt(r.datum)}</td>
                    <td>
                      {r.empfaenger.name}
                      {r.empfaenger.zusatz ? <div className="text-sm text-tinte-2">{r.empfaenger.zusatz}</div> : null}
                    </td>
                    <td>{r.objektId ? objektName.get(r.objektId) ?? r.objektId : <span className="text-tinte-3">–</span>}</td>
                    <td className="zahl whitespace-nowrap">{betrag(r.netto)}</td>
                    <td className="zahl whitespace-nowrap">{betrag(r.brutto)}</td>
                    <td className="whitespace-nowrap">
                      <span className={spaet ? "text-stempel-2" : ""} title={spaet ? "überfällig" : undefined}>
                        {datumFmt(r.faelligAm)}
                      </span>
                      {spaet ? <div className="text-sm text-stempel-2">überfällig</div> : null}
                      {r.status === "bezahlt" && r.bezahltAm ? <div className="text-sm text-tinte-2">bezahlt {datumFmt(r.bezahltAm)}</div> : null}
                    </td>
                    <td className="whitespace-nowrap">
                      <RechnungsStatusStempel status={r.status} neu={neuGestempelt.has(r.id)} />
                    </td>
                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variante="text" klein onClick={() => ausgeben(r, "pdf")} disabled={beschaeftigt !== null}>
                          {beschaeftigt === `${r.id}:pdf` ? "PDF…" : "PDF"}
                        </Button>
                        <Button variante="text" klein onClick={() => ausgeben(r, "xrechnung")} disabled={beschaeftigt !== null}>
                          {beschaeftigt === `${r.id}:xrechnung` ? "XRechnung…" : "XRechnung"}
                        </Button>
                        {r.status !== "storniert" ? (
                          <Button variante="gefaehrlich" klein onClick={() => stornieren(r)}>
                            Stornieren
                          </Button>
                        ) : null}
                      </div>
                      {r.status !== "storniert" ? (
                        <label className="mt-1 flex items-center gap-1.5 pl-1 text-sm text-tinte-2">
                          bezahlt am
                          <input type="date" className="feld w-32 !px-1.5 !py-0.5 text-sm" value={r.bezahltAm ?? ""} onChange={(e) => bezahlt(r, e.target.value)} aria-label={`Bezahlt am, ${r.nummer}`} />
                        </label>
                      ) : null}
                    </td>
                  </tr>,
                  istOffen ? (
                    <tr key={`${r.id}-details`}>
                      <td colSpan={9} className="bg-blatt-2">
                        <RechnungDetails rechnung={r} einstellungen={einstellungen} />
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  {liste.length === 1 ? "1 Rechnung" : `${liste.length} Rechnungen`}
                  {offenAnzahl ? `, davon ${offenAnzahl} offen (${eur(offenBrutto)})` : ""}
                  {storniert ? <span className="font-normal text-tinte-2">{`, ${storniert} storniert, nicht in der Summe`}</span> : null}
                </td>
                <td className="zahl whitespace-nowrap">{betrag(summeNetto)}</td>
                <td className="zahl whitespace-nowrap">{betrag(summeBrutto)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
          {liste.length === 0 ? <p className="p-5 text-tinte-2">Nichts in dieser Auswahl.</p> : null}
        </div>
      )}
    </section>
  );
}
