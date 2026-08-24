"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { Einstellungen, type Nummernkreis } from "@/lib/domain/schema";
import { formatiereNummer } from "@/lib/store/nummern";
import { betrag } from "@/lib/format";
import { AuswahlFeld, GeldFeld, Gruppe, TextFeld, ZahlFeld } from "./Felder";
import { ReiterKopf, useGespeichert } from "./Reiter";
import { einstellungenAendern } from "./speicher";

const KREISE: { id: "angebot" | "rechnung" | "mahnung"; text: string }[] = [
  { id: "angebot", text: "Angebote" },
  { id: "rechnung", text: "Rechnungen" },
  { id: "mahnung", text: "Mahnungen" },
];

export function EinstellungenReiter() {
  const einstellungen = useLiveQuery(async () => Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {}), []);
  const { gespeichert, markiere } = useGespeichert();

  if (!einstellungen) return null;
  const e = einstellungen;

  async function aendern(aktion: string, f: (e: Einstellungen) => void) {
    await einstellungenAendern(aktion, f);
    markiere();
  }
  function kreis(id: "angebot" | "rechnung" | "mahnung", patch: Partial<Nummernkreis>) {
    return aendern("Nummernkreis geändert", (x) => {
      x.nummernkreise[id] = { ...x.nummernkreise[id], ...patch };
    });
  }
  function datev<K extends keyof Einstellungen["datev"]>(feld: K, wert: Einstellungen["datev"][K]) {
    return aendern("DATEV-Einstellung geändert", (x) => {
      x.datev[feld] = wert;
    });
  }
  function mahnwesen<K extends keyof Einstellungen["mahnwesen"]>(feld: K, wert: Einstellungen["mahnwesen"][K]) {
    return aendern("Mahnwesen geändert", (x) => {
      x.mahnwesen[feld] = wert;
    });
  }

  const kreditoren = Object.keys(e.datev.kreditoren).length;
  const debitoren = Object.keys(e.datev.debitoren).length;
  const verzugVerbraucher = e.mahnwesen.basiszinsProzent + 5;
  const verzugUnternehmer = e.mahnwesen.basiszinsProzent + 9;

  return (
    <>
      <ReiterKopf titel="Einstellungen" text="Nummernkreise, Kontenrahmen, DATEV-Übergabe und Mahnwesen. Felder speichern beim Verlassen." gespeichert={gespeichert} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Gruppe titel="Nummernkreise" text="Fortlaufend und lückenlos (§ 14 Abs. 4 Nr. 4 UStG). Der Zähler ist die zuletzt vergebene Nummer; beim Jahreswechsel beginnt er wieder bei 0." spalten={1} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Kreis</th>
                  <th>Präfix</th>
                  <th className="zahl">Jahr</th>
                  <th className="zahl">Zähler</th>
                  <th className="zahl">Stellen</th>
                  <th>Nächste Nummer</th>
                </tr>
              </thead>
              <tbody>
                {KREISE.map((k) => {
                  const n = e.nummernkreise[k.id];
                  return (
                    <tr key={k.id}>
                      <td className="font-medium">{k.text}</td>
                      <td className="w-32">
                        <TextFeld kompakt wert={n.prefix} onSpeichern={(w) => kreis(k.id, { prefix: w })} ariaLabel={`Präfix ${k.text}`} />
                      </td>
                      <td className="w-28">
                        <ZahlFeld kompakt gruppierung={false} wert={n.jahr} onSpeichern={(w) => kreis(k.id, { jahr: w ?? n.jahr })} ariaLabel={`Jahr ${k.text}`} />
                      </td>
                      <td className="w-28">
                        <ZahlFeld kompakt gruppierung={false} wert={n.zaehler} onSpeichern={(w) => kreis(k.id, { zaehler: Math.max(0, w ?? 0) })} ariaLabel={`Zähler ${k.text}`} />
                      </td>
                      <td className="w-24">
                        <ZahlFeld kompakt wert={n.stellen} onSpeichern={(w) => kreis(k.id, { stellen: Math.min(8, Math.max(1, w ?? 4)) })} ariaLabel={`Stellen ${k.text}`} />
                      </td>
                      <td className="zahl !text-left font-medium">{formatiereNummer(n, n.zaehler + 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-tinte-3">Wer aus einer anderen Software umzieht, trägt beim Zähler die letzte dort vergebene Nummer ein, damit es keine Doppelten gibt.</p>
        </Gruppe>

        <Gruppe titel="Kontenrahmen" text="Bestimmt, welches Sachkonto der Kostenarten in Buchungen und im DATEV-Export steht." spalten={1}>
          <AuswahlFeld
            label="Kontenrahmen"
            wert={e.kontenrahmen}
            optionen={[
              { wert: "SKR03", text: "SKR03 (Prozessgliederung, verbreitet bei kleinen Betrieben)" },
              { wert: "SKR04", text: "SKR04 (Abschlussgliederung)" },
            ]}
            onSpeichern={(w) =>
              aendern("Kontenrahmen geändert", (x) => {
                x.kontenrahmen = w;
              })
            }
            hinweis="Im Zweifel den Steuerberater fragen; er bekommt den Buchungsstapel."
          />
        </Gruppe>

        <Gruppe titel="Mahnwesen" text="Stufe 1 ist die Zahlungserinnerung, Stufe 2 die Mahnung, Stufe 3 die letzte Mahnung.">
          <ZahlFeld label="Zahlungsfrist je Mahnstufe" wert={e.mahnwesen.fristTage} onSpeichern={(n) => mahnwesen("fristTage", n ?? 10)} einheit="Tage" hinweis="Üblich sind 7 bis 14 Tage." />
          <GeldFeld label="Toleranz" wert={e.mahnwesen.toleranzEuro} onSpeichern={(n) => mahnwesen("toleranzEuro", n)} hinweis="Bis zu dieser Differenz gilt ein Monat als bezahlt (Rundungen, Bankgebühren)." />
          <GeldFeld label="Gebühr Stufe 2" wert={e.mahnwesen.gebuehrStufe2} onSpeichern={(n) => mahnwesen("gebuehrStufe2", n)} />
          <GeldFeld label="Gebühr Stufe 3" wert={e.mahnwesen.gebuehrStufe3} onSpeichern={(n) => mahnwesen("gebuehrStufe3", n)} />
          <ZahlFeld
            label="Basiszinssatz"
            wert={e.mahnwesen.basiszinsProzent}
            onSpeichern={(n) => mahnwesen("basiszinsProzent", n ?? 1.52)}
            ganzzahl={false}
            einheit="%"
            hinweis="§ 247 BGB, ändert sich am 1. Januar und 1. Juli (Deutsche Bundesbank)."
          />
          <p className="text-sm text-tinte-2 sm:col-span-2">
            Daraus folgt: Verzugszins <span className="zahl font-medium text-tinte">{betrag(verzugVerbraucher)} %</span> gegenüber Verbrauchern (Basiszins + 5 Punkte) und{" "}
            <span className="zahl font-medium text-tinte">{betrag(verzugUnternehmer)} %</span> gegenüber Unternehmern (+ 9 Punkte, § 288 BGB).
          </p>
          <p className="text-xs text-tinte-3 sm:col-span-2">
            Pauschale Mahngebühren sind gegenüber Verbrauchern unwirksam (BGH VIII ZR 95/18); ersatzfähig sind nur nachgewiesene Kosten wie Porto. In der WEG darf der Verwalter dem säumigen Eigentümer gar keine Gebühr berechnen. Deshalb steht hier 0 €, solange nichts vertraglich vereinbart ist.
          </p>
        </Gruppe>

        <Gruppe titel="DATEV" text="Kopfdaten des Buchungsstapels (EXTF 700) und die Kontenkreise für Kreditoren und Debitoren." className="lg:col-span-2" spalten={3}>
          <TextFeld label="Beraternummer" wert={e.datev.beraternummer} onSpeichern={(w) => datev("beraternummer", w.trim())} inputMode="numeric" hinweis="Steht auf jeder Auswertung des Steuerberaters (7-stellig)." feldClassName="zahl !text-left" />
          <TextFeld label="Mandantennummer" wert={e.datev.mandantennummer} onSpeichern={(w) => datev("mandantennummer", w.trim())} inputMode="numeric" hinweis="Bis zu 5 Stellen." feldClassName="zahl !text-left" />
          <TextFeld label="Beginn Wirtschaftsjahr" type="date" wert={e.datev.wirtschaftsjahrBeginn ?? ""} onSpeichern={(w) => datev("wirtschaftsjahrBeginn", w || null)} hinweis="Meist der 1. Januar." />
          <ZahlFeld label="Sachkontenlänge" wert={e.datev.sachkontenlaenge} onSpeichern={(n) => datev("sachkontenlaenge", Math.min(8, Math.max(4, n ?? 4)))} hinweis="4 bis 8; Personenkonten sind eine Stelle länger." />
          <TextFeld label="Bankkonto (Sachkonto)" wert={e.datev.bankkonto} onSpeichern={(w) => datev("bankkonto", w.trim())} inputMode="numeric" hinweis="SKR03: 1200, SKR04: 1800." feldClassName="zahl !text-left" />
          <TextFeld label="Erlöskonto" wert={e.datev.erloeskonto} onSpeichern={(w) => datev("erloeskonto", w.trim())} inputMode="numeric" hinweis="SKR03: 8400, SKR04: 4400 (Erlöse 19 %)." feldClassName="zahl !text-left" />
          <ZahlFeld label="Erste Kreditorennummer" gruppierung={false} wert={e.datev.kreditorStart} onSpeichern={(n) => datev("kreditorStart", n ?? 70000)} hinweis={`Lieferanten ab hier, üblich 70000. ${kreditoren ? `${kreditoren} vergeben.` : "Noch keine vergeben."}`} />
          <ZahlFeld label="Erste Debitorennummer" gruppierung={false} wert={e.datev.debitorStart} onSpeichern={(n) => datev("debitorStart", n ?? 10000)} hinweis={`Kunden ab hier, üblich 10000. ${debitoren ? `${debitoren} vergeben.` : "Noch keine vergeben."}`} />
        </Gruppe>
      </div>
    </>
  );
}
