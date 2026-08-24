"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { ladeEinstellungen } from "@/lib/store/arbeitsbereich";
import type { Einstellungen } from "@/lib/domain/schema";
import { heuteIso, monatVon } from "@/lib/format";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Hinweis } from "@/components/ui/Hinweis";
import { Kontenuebersicht } from "./Kontenuebersicht";
import { Import } from "./Import";
import { Umsatzliste } from "./Umsatzliste";
import { Mieteingang } from "./Mieteingang";
import { Mahnvorschlaege } from "./Mahnvorschlaege";
import type { Meldung } from "./texte";

type Reiter = "umsaetze" | "mieteingang" | "mahnungen";

export function BankSeite() {
  const params = useSearchParams();
  const dokumentId = params.get("dokument");
  const konten = useLiveQuery(() => db.bankkonten.toArray(), []);
  const objekte = useLiveQuery(() => db.objekte.filter((o) => o.aktiv).toArray(), []);
  const personen = useLiveQuery(() => db.personen.toArray(), []);
  const einheiten = useLiveQuery(() => db.einheiten.toArray(), []);
  const umsaetze = useLiveQuery(() => db.bankumsaetze.toArray(), []);
  const belege = useLiveQuery(() => db.belege.toArray(), []);
  const rechnungen = useLiveQuery(() => db.rechnungen.toArray(), []);
  const buchungenBank = useLiveQuery(() => db.buchungen.where("quelle").equals("bank").toArray(), []);
  const mahnungen = useLiveQuery(() => db.mahnungen.toArray(), []);
  const [einstellungen, setEinstellungen] = useState<Einstellungen | null>(null);
  const [kontoId, setKontoId] = useState<string | null>(null);
  const [objektId, setObjektId] = useState<string>("");
  const [reiter, setReiter] = useState<Reiter>("umsaetze");
  const [monat, setMonat] = useState<string>(monatVon(heuteIso()));
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [monatGesetzt, setMonatGesetzt] = useState(false);
  const heute = heuteIso();

  useEffect(() => {
    ladeEinstellungen().then(setEinstellungen);
  }, [mahnungen?.length]);

  // Standardauswahl, sobald die Daten da sind (während des Renderns, kein Effekt nötig)
  if (konten && konten.length && (!kontoId || !konten.some((k) => k.id === kontoId))) setKontoId(konten[0].id);
  const konto = konten?.find((k) => k.id === kontoId) ?? null;
  if (objekte && objekte.length && (!objektId || !objekte.some((o) => o.id === objektId))) setObjektId(konto?.objektId ?? objekte[0].id);
  // Monat: beim ersten Laden der Monat des jüngsten Umsatzes, damit die Listen nicht leer starten
  if (umsaetze && umsaetze.length && !monatGesetzt) {
    const juengster = umsaetze.reduce((max, u) => (u.buchungstag > max ? u.buchungstag : max), "");
    if (juengster) setMonat(monatVon(juengster));
    setMonatGesetzt(true);
  }

  const verbucht = useMemo(() => {
    const s = new Set<string>();
    for (const b of buchungenBank ?? []) if (b.bankumsatzId) s.add(b.bankumsatzId);
    for (const b of belege ?? []) if (b.bankumsatzId) s.add(b.bankumsatzId);
    for (const r of rechnungen ?? []) if (r.bankumsatzId) s.add(r.bankumsatzId);
    return s;
  }, [buchungenBank, belege, rechnungen]);

  const umsaetzeKonto = useMemo(() => (umsaetze ?? []).filter((u) => u.bankkontoId === kontoId), [umsaetze, kontoId]);
  const offeneMahnungen = (mahnungen ?? []).filter((m) => m.status === "vorschlag" || m.status === "erstellt").length;
  const onMeldung = useCallback((m: Meldung | null) => setMeldung(m), []);

  function kontoWaehlen(id: string) {
    setKontoId(id);
    const k = konten?.find((x) => x.id === id);
    if (k?.objektId) setObjektId(k.objektId);
    setReiter("umsaetze");
  }

  function importFertig(id: string, letzterMonat: string | null) {
    kontoWaehlen(id);
    if (letzterMonat) setMonat(letzterMonat);
    setMonatGesetzt(true);
  }

  if (!konten || !objekte || !personen || !einheiten || !umsaetze || !belege || !rechnungen || !mahnungen) return null;

  const reiterListe: { id: Reiter; text: string; zahl?: number }[] = [
    { id: "umsaetze", text: "Umsätze", zahl: umsaetzeKonto.length },
    { id: "mieteingang", text: objekte.find((o) => o.id === objektId)?.art === "WEG" ? "Hausgeld" : "Mieteingang" },
    { id: "mahnungen", text: "Zahlungserinnerungen", zahl: offeneMahnungen || undefined },
  ];

  return (
    <>
      <Seitenkopf
        titel="Bank"
        text="Kontoauszug ablegen, egal von welcher Bank. Die App erkennt das Format, ordnet Mieteingänge, Hausgeld und bezahlte Rechnungen zu und zeigt je Monat, wer gezahlt hat. Gebucht und gemahnt wird erst auf Klick."
      />

      <section className="space-y-4">
        <Kontenuebersicht konten={konten} objekte={objekte} umsaetze={umsaetze} aktiv={kontoId} onWaehlen={kontoWaehlen} />
        {konten.length ? <Import konten={konten} objekte={objekte} dokumentId={dokumentId} onFertig={importFertig} onMeldung={onMeldung} /> : null}
      </section>

      {meldung ? (
        <div className="mt-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {konten.length ? (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-baseline gap-5">
            {reiterListe.map((r) => (
              <button key={r.id} type="button" onClick={() => setReiter(r.id)} className={`text-[1.0625rem] transition-colors ${reiter === r.id ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}>
                {r.text} {r.zahl !== undefined ? <span className="zahl text-tinte-3">{r.zahl}</span> : null}
              </button>
            ))}
            {konto ? <span className="ml-auto text-sm text-tinte-3">{konto.bezeichnung}</span> : null}
          </div>

          {reiter === "umsaetze" && konto ? (
            <Umsatzliste
              konto={konto}
              umsaetze={umsaetzeKonto}
              personen={personen}
              einheiten={einheiten}
              objekte={objekte}
              belege={belege}
              rechnungen={rechnungen}
              verbucht={verbucht}
              monat={monat}
              onMonat={setMonat}
              onMeldung={onMeldung}
            />
          ) : null}
          {reiter === "mieteingang" ? (
            <Mieteingang
              objekte={objekte}
              konten={konten}
              personen={personen}
              einheiten={einheiten}
              umsaetze={umsaetze}
              toleranz={einstellungen?.mahnwesen.toleranzEuro ?? 1}
              objektId={objektId}
              onObjekt={setObjektId}
              monat={monat}
              onMonat={setMonat}
              heute={heute}
              onMeldung={onMeldung}
              onZuMahnungen={() => setReiter("mahnungen")}
            />
          ) : null}
          {reiter === "mahnungen" ? <Mahnvorschlaege mahnungen={mahnungen} personen={personen} objekte={objekte} einstellungen={einstellungen} onMeldung={onMeldung} /> : null}
        </section>
      ) : null}
    </>
  );
}
