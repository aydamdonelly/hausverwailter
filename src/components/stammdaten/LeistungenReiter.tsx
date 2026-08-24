"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { Einstellungen, type Leistung } from "@/lib/domain/schema";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { Leer } from "@/components/ui/Leer";
import { AuswahlFeld, GeldFeld, Gruppe, SchalterFeld, TextFeld, ZahlFeld } from "./Felder";
import { ReiterKopf, useGespeichert } from "./Reiter";
import { einstellungenAendern, katalogErgaenzen, leistungAnlegen, leistungLoeschen, leistungSpeichern } from "./speicher";
import { EINHEIT_TEXTE, pruefeLeistung } from "./logik";

type Meldung = { ton: "ok" | "fehler" | "warnung"; text: string };

const GILT_TEXTE: Record<Leistung["gilt"], string> = { ALLE: "alle", WEG: "WEG", MIET: "Miete", GEWERBE: "Gewerbe" };
const KATEGORIE_TEXTE: Record<Leistung["kategorie"], string> = { grundleistung: "Grundleistung", sonderleistung: "Sonderleistung" };

export function LeistungenReiter() {
  const leistungen = useLiveQuery(() => db.leistungen.toArray(), []);
  const einstellungen = useLiveQuery(async () => Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {}), []);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const { gespeichert, markiere } = useGespeichert();

  const liste = useMemo(
    () => [...(leistungen ?? [])].sort((a, b) => a.kategorie.localeCompare(b.kategorie) || a.code.localeCompare(b.code, "de")),
    [leistungen],
  );
  const codes = useMemo(() => (leistungen ?? []).map((l) => l.code), [leistungen]);

  async function speichern(l: Leistung, patch: Partial<Leistung>) {
    await leistungSpeichern({ ...l, ...patch }, l);
    markiere();
  }

  async function katalog(art: "hausverwaltung" | "dienstleister") {
    const n = await katalogErgaenzen(art);
    setMeldung({
      ton: "ok",
      text: n ? `${n} Leistung${n > 1 ? "en" : ""} ergänzt. Vorhandene Einträge wurden nicht verändert; Preise bitte anpassen.` : "Alle Codes dieses Katalogs sind schon vorhanden.",
    });
    markiere();
  }

  async function staffelAendern(stufen: { abEinheiten: number; rabattProzent: number }[]) {
    await einstellungenAendern("Staffel geändert", (e) => {
      e.staffel = [...stufen].sort((a, b) => a.abEinheiten - b.abEinheiten);
    });
    markiere();
  }

  if (!leistungen || !einstellungen) return null;

  return (
    <>
      <ReiterKopf
        titel="Leistungskatalog"
        text="Was Sie anbieten und berechnen: Grundleistungen je Einheit oder pauschal, Sonderleistungen nach Stück oder Stunde. Daraus entstehen Angebote und der monatliche Honorarlauf."
        gespeichert={gespeichert}
        aktionen={
          <>
            <Button variante="text" onClick={() => katalog("hausverwaltung")}>
              Katalog Hausverwaltung laden
            </Button>
            <Button variante="text" onClick={() => katalog("dienstleister")}>
              Katalog Dienstleister laden
            </Button>
            <Button
              onClick={async () => {
                await leistungAnlegen();
                markiere();
              }}
            >
              Neue Leistung
            </Button>
          </>
        }
      />
      {meldung ? (
        <div className="mb-4">
          <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>
        </div>
      ) : null}

      {leistungen.length === 0 ? (
        <Leer
          titel="Der Katalog ist leer"
          aktion={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => katalog("hausverwaltung")}>Katalog Hausverwaltung laden</Button>
              <Button variante="sekundaer" onClick={() => katalog("dienstleister")}>
                Katalog Dienstleister laden
              </Button>
            </div>
          }
        >
          Zwei Startkataloge: Verwalterhonorar je Einheit mit Sonderleistungen, oder Hausmeister, Reinigung, Garten und Winterdienst als Monatspauschalen. Beide lassen sich danach frei ändern.
        </Leer>
      ) : (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Code</th>
                <th>Bezeichnung</th>
                <th>Beschreibung</th>
                <th>Abrechnung</th>
                <th className="zahl">Preis netto</th>
                <th>Gilt für</th>
                <th>Kategorie</th>
                <th>Aktiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((l) => {
                const fehler = pruefeLeistung(l, codes.filter((c, i) => c !== "" && leistungen[i]?.id !== l.id));
                return (
                  <tr key={l.id} className={l.aktiv ? "" : "text-tinte-3"}>
                    <td className="min-w-[8rem]">
                      <TextFeld kompakt wert={l.code} onSpeichern={(w) => speichern(l, { code: w.trim().toUpperCase().replace(/\s+/g, "_") })} ariaLabel={`Code ${l.code || "neu"}`} fehler={fehler.code} placeholder="CODE" feldClassName="zahl !text-left" />
                    </td>
                    <td className="min-w-[11.5rem]">
                      <TextFeld kompakt wert={l.bezeichnung} onSpeichern={(w) => speichern(l, { bezeichnung: w })} ariaLabel={`Bezeichnung ${l.code}`} fehler={fehler.bezeichnung} placeholder="Bezeichnung" />
                    </td>
                    <td className="min-w-[11.5rem]">
                      <TextFeld kompakt wert={l.beschreibung} onSpeichern={(w) => speichern(l, { beschreibung: w })} ariaLabel={`Beschreibung ${l.code}`} placeholder="steht als Zeile unter der Position" />
                    </td>
                    <td className="min-w-[12.5rem]">
                      <AuswahlFeld
                        kompakt
                        wert={l.einheit}
                        optionen={(Object.keys(EINHEIT_TEXTE) as Leistung["einheit"][]).map((e) => ({ wert: e, text: EINHEIT_TEXTE[e] }))}
                        onSpeichern={(w) => speichern(l, { einheit: w })}
                        ariaLabel={`Abrechnung ${l.code}`}
                      />
                    </td>
                    <td className="w-32 min-w-[7.5rem]">
                      <GeldFeld kompakt wert={l.preisNetto} onSpeichern={(n) => speichern(l, { preisNetto: n })} ariaLabel={`Preis ${l.code}`} fehler={fehler.preisNetto} />
                    </td>
                    <td className="min-w-[6.5rem]">
                      <AuswahlFeld
                        kompakt
                        wert={l.gilt}
                        optionen={(Object.keys(GILT_TEXTE) as Leistung["gilt"][]).map((g) => ({ wert: g, text: GILT_TEXTE[g] }))}
                        onSpeichern={(w) => speichern(l, { gilt: w })}
                        ariaLabel={`Gilt für ${l.code}`}
                      />
                    </td>
                    <td className="min-w-[9.5rem]">
                      <AuswahlFeld
                        kompakt
                        wert={l.kategorie}
                        optionen={(Object.keys(KATEGORIE_TEXTE) as Leistung["kategorie"][]).map((k) => ({ wert: k, text: KATEGORIE_TEXTE[k] }))}
                        onSpeichern={(w) => speichern(l, { kategorie: w })}
                        ariaLabel={`Kategorie ${l.code}`}
                      />
                    </td>
                    <td>
                      <SchalterFeld wert={l.aktiv} onSpeichern={(w) => speichern(l, { aktiv: w })} ariaLabel={`Aktiv ${l.code}`} className="mt-1" />
                    </td>
                    <td className="text-right">
                      <Button
                        variante="gefaehrlich"
                        klein
                        onClick={async () => {
                          if (l.code || l.bezeichnung) {
                            if (!window.confirm(`Leistung „${l.bezeichnung || l.code}“ aus dem Katalog entfernen? Bestehende Angebote und Rechnungen bleiben unverändert.`)) return;
                          }
                          await leistungLoeschen(l.id);
                          markiere();
                        }}
                      >
                        Löschen
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Gruppe titel="Mengenstaffel" text="Rabatt auf das Grundhonorar ab einer Zahl von Einheiten (Wohnen plus Gewerbe). Es gilt die höchste erreichte Stufe." spalten={1}>
          {einstellungen.staffel.length ? (
            <table className="tabelle">
              <thead>
                <tr>
                  <th className="zahl">Ab Einheiten</th>
                  <th className="zahl">Rabatt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {einstellungen.staffel.map((s, i) => (
                  <tr key={`${s.abEinheiten}-${i}`}>
                    <td className="w-40">
                      <ZahlFeld kompakt wert={s.abEinheiten} onSpeichern={(n) => staffelAendern(einstellungen.staffel.map((x, k) => (k === i ? { ...x, abEinheiten: n ?? 0 } : x)))} ariaLabel={`Stufe ${i + 1} ab Einheiten`} />
                    </td>
                    <td className="w-40">
                      <ZahlFeld kompakt wert={s.rabattProzent} onSpeichern={(n) => staffelAendern(einstellungen.staffel.map((x, k) => (k === i ? { ...x, rabattProzent: n ?? 0 } : x)))} ganzzahl={false} einheit="%" ariaLabel={`Stufe ${i + 1} Rabatt`} />
                    </td>
                    <td className="text-right">
                      <Button variante="gefaehrlich" klein onClick={() => staffelAendern(einstellungen.staffel.filter((_, k) => k !== i))}>
                        Entfernen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-tinte-3">Keine Staffel: jedes Objekt zahlt den vollen Katalogpreis.</p>
          )}
          <div>
            <Button variante="sekundaer" klein onClick={() => staffelAendern([...einstellungen.staffel, { abEinheiten: (einstellungen.staffel.at(-1)?.abEinheiten ?? 0) + 30, rabattProzent: (einstellungen.staffel.at(-1)?.rabattProzent ?? 0) + 5 }])}>
              Stufe hinzufügen
            </Button>
          </div>
        </Gruppe>
        <Gruppe titel="Mindesthonorar" text="Unter diesen Nettobetrag je Objekt und Monat fällt kein Grundhonorar, egal wie klein das Haus ist. 0 € schaltet die Regel ab." spalten={1}>
          <GeldFeld
            label="Mindesthonorar netto je Monat"
            wert={einstellungen.mindesthonorarMonat}
            onSpeichern={async (n) => {
              await einstellungenAendern("Mindesthonorar geändert", (e) => {
                e.mindesthonorarMonat = n;
              });
              markiere();
            }}
            className="max-w-xs"
          />
        </Gruppe>
      </div>
    </>
  );
}
