"use client";

import { useMemo, useState } from "react";
import type { Einstellungen, Leistung, Objekt } from "@/lib/domain/schema";
import { sonderrechnung } from "@/lib/rechnungen/sonder";
import { rechnungAnlegen } from "@/lib/rechnungen/speichern";
import { mengeText } from "@/lib/rechnungen/text";
import { einheitText } from "@/lib/preise/kalkulation";
import { betrag, eur, heuteIso, parseDeZahl } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Auswahl, Eingabe, Feld } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";
import { Stempel } from "@/components/ui/Stempel";

/** Gilt eine Katalogleistung für dieses Objekt? Gewerbe rechnet wie Miete, Sonstiges nimmt alles. */
export function passtZuObjekt(l: Leistung, objekt: Objekt | null): boolean {
  if (!objekt || l.gilt === "ALLE" || objekt.art === "SONSTIG") return true;
  if (objekt.art === "GEWERBE") return l.gilt === "GEWERBE" || l.gilt === "MIET";
  return l.gilt === objekt.art;
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export function SonderrechnungFormular({ einstellungen, objekte, leistungen }: { einstellungen: Einstellungen; objekte: Objekt[]; leistungen: Leistung[] }) {
  const heute = heuteIso();
  const aktive = useMemo(() => objekte.filter((o) => o.aktiv).sort((a, b) => a.kurzname.localeCompare(b.kurzname, "de")), [objekte]);
  const [objektId, setObjektId] = useState("");
  const objekt = aktive.find((o) => o.id === objektId) ?? aktive[0] ?? null;

  const passende = useMemo(
    () =>
      leistungen
        .filter((l) => l.aktiv && passtZuObjekt(l, objekt))
        .sort((a, b) => (a.kategorie === b.kategorie ? a.bezeichnung.localeCompare(b.bezeichnung, "de") : a.kategorie === "sonderleistung" ? -1 : 1)),
    [leistungen, objekt],
  );
  const [leistungId, setLeistungId] = useState("");
  const leistung = passende.find((l) => l.id === leistungId) ?? passende[0] ?? null;

  const [menge, setMenge] = useState("1");
  const [text, setText] = useState("");
  const [datum, setDatum] = useState(heute);
  const [leistungsdatum, setLeistungsdatum] = useState(heute);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ nummer: string; brutto: number } | null>(null);
  const [fehler, setFehler] = useState("");

  const mengeZahl = parseDeZahl(menge) ?? 0;
  const rechnungsdatum = DATUM.test(datum) ? datum : heute;
  const leistungstag = DATUM.test(leistungsdatum) ? leistungsdatum : rechnungsdatum;
  const entwurf = useMemo(() => {
    if (!objekt || !leistung || !(mengeZahl > 0)) return null;
    try {
      return sonderrechnung({ objekt, leistung, menge: mengeZahl, text, datum: rechnungsdatum, leistungsdatum: leistungstag, einstellungen });
    } catch {
      return null;
    }
  }, [objekt, leistung, mengeZahl, text, rechnungsdatum, leistungstag, einstellungen]);

  async function erzeugen() {
    if (!entwurf) return;
    if (!window.confirm(`Rechnung über ${eur(entwurf.brutto)} an ${entwurf.empfaenger.name} erzeugen?\n\nSie bekommt eine fortlaufende Nummer und einen Buchungssatz.`)) return;
    setBeschaeftigt(true);
    setFehler("");
    try {
      const r = await rechnungAnlegen(entwurf, "Sonderrechnung erstellt");
      setErgebnis({ nummer: r.nummer, brutto: r.brutto });
      setText("");
      setMenge("1");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Die Rechnung konnte nicht erstellt werden.");
    } finally {
      setBeschaeftigt(false);
    }
  }

  const satz = entwurf?.positionen[0]?.ustSatz ?? 0;
  const vorschau = entwurf
    ? `${mengeText(mengeZahl)} ${entwurf.positionen[0].einheit} × ${betrag(entwurf.positionen[0].einzelpreisNetto)} € = ${betrag(entwurf.netto)} € netto${
        satz > 0 ? `, zzgl. ${satz} % USt = ${betrag(entwurf.brutto)} € brutto` : " (ohne Umsatzsteuer, § 19 UStG)"
      }, an ${entwurf.empfaenger.name}.`
    : mengeZahl > 0
      ? "Objekt und Leistung wählen."
      : "Die Menge muss größer als 0 sein.";

  return (
    <section className="mb-10">
      <h2 className="text-[1.375rem]">Sonderrechnung</h2>
      <p className="mt-1 mb-3 max-w-2xl text-tinte-2">Eine Leistung aus dem Katalog an den Auftraggeber eines Objekts: Mahngebühr, Wohnungsübergabe, Stunden, zusätzliche Versammlung.</p>
      <div className="blatt p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(5rem,1fr)_minmax(9rem,1.4fr)_minmax(9rem,1.4fr)]">
          <Feld label="Objekt">
            <Auswahl value={objekt?.id ?? ""} onChange={(e) => setObjektId(e.target.value)}>
              {aktive.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kurzname}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Leistung aus dem Katalog" hinweis={leistung ? `${betrag(leistung.preisNetto)} € je ${einheitText(leistung.einheit)} netto` : undefined}>
            <Auswahl value={leistung?.id ?? ""} onChange={(e) => setLeistungId(e.target.value)}>
              {passende.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.bezeichnung}
                </option>
              ))}
            </Auswahl>
          </Feld>
          <Feld label="Menge" hinweis={leistung ? einheitText(leistung.einheit) : undefined}>
            <Eingabe inputMode="decimal" className="zahl" value={menge} onChange={(e) => setMenge(e.target.value)} aria-label="Menge" />
          </Feld>
          <Feld label="Leistungstag">
            <Eingabe type="date" value={leistungsdatum} onChange={(e) => setLeistungsdatum(e.target.value)} />
          </Feld>
          <Feld label="Rechnungsdatum">
            <Eingabe type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </Feld>
        </div>
        <Feld label="Text auf der Rechnung" className="mt-4" hinweis="Steht unter der Position. Leer: die Beschreibung aus dem Katalog.">
          <Eingabe value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Wohnungsübergabe Whg 3 an Familie Yilmaz, Protokoll liegt bei" />
        </Feld>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-tinte-2">{vorschau}</p>
          <div className="flex items-center gap-3">
            {ergebnis ? <Stempel text="Erstellt" ton="gruen" neu /> : null}
            <Button onClick={erzeugen} disabled={!entwurf || beschaeftigt}>
              {beschaeftigt ? "Wird erzeugt…" : "Rechnung erzeugen"}
            </Button>
          </div>
        </div>
        {ergebnis ? (
          <div className="mt-4">
            <Hinweis ton="ok">
              Rechnung <span className="zahl">{ergebnis.nummer}</span> über {eur(ergebnis.brutto)} erstellt. Sie steht unten in der Liste.
            </Hinweis>
          </div>
        ) : null}
        {fehler ? (
          <div className="mt-4">
            <Hinweis ton="fehler">{fehler}</Hinweis>
          </div>
        ) : null}
        {!aktive.length ? (
          <div className="mt-4">
            <Hinweis ton="hinweis">Kein aktives Objekt. Objekte werden unter Stammdaten angelegt.</Hinweis>
          </div>
        ) : null}
        {aktive.length && !passende.length ? (
          <div className="mt-4">
            <Hinweis ton="hinweis">Der Leistungskatalog ist leer. Leistungen werden unter Stammdaten gepflegt.</Hinweis>
          </div>
        ) : null}
      </div>
    </section>
  );
}
