/**
 * Angebot als Geschäftsbrief: Anschreiben, Objektdaten, Leistungsumfang, Positionen mit
 * Monatssumme (bei Turnus monatlich auch der Jahresbetrag), Sonderleistungen nach Aufwand,
 * Annahmen, Laufzeit und Bindefrist, Grußformel mit Platz für die Unterschrift.
 */
import type { Angebot, Firma } from "../domain/schema";
import { datum, eur } from "../format";
import { Abschnitt, Absatz, Abstand, Betreff, Gruss, LabelWert, Liste, SummenBlock, Tabelle, Titel, type Spalte, type Zelle } from "./Bausteine";
import { Briefbogen } from "./Briefbogen";
import { angebotSummen, anredeErgaenzen, einheitText, infoblockZeilen, jahresbetragText, mengeText, objektZeilen, preisEinheitText } from "./texte";

const SPALTEN = (monatlich: boolean, mitUst: boolean): Spalte[] => [
  { titel: "Pos.", breite: 8 },
  { titel: "Leistung" },
  { titel: "Menge", breite: 11, rechts: true },
  { titel: "Einheit", breite: 23 },
  { titel: "Einzelpreis", breite: 20, rechts: true },
  ...(mitUst ? [{ titel: "USt", breite: 10, rechts: true }] : []),
  { titel: monatlich ? "Gesamt/Monat" : "Gesamt", breite: 24, rechts: true },
];

export function AngebotPdf({ angebot, firma }: { angebot: Angebot; firma: Firma }) {
  const titel = `Angebot ${angebot.nummer}`;
  const monatlich = angebot.turnus === "monatlich";
  const mitUst = !firma.kleinunternehmer;
  const zeilen: (string | Zelle)[][] = angebot.positionen.map((p) => [
    String(p.pos),
    { text: p.bezeichnung, nebentext: p.beschreibung },
    mengeText(p.menge),
    einheitText(p.einheit, p.menge),
    eur(p.einzelpreisNetto),
    ...(mitUst ? [`${mengeText(p.ustSatz)} %`] : []),
    eur(p.gesamtNetto),
  ]);
  const objekt = objektZeilen(angebot.objekt);
  const laufzeit = [angebot.laufzeitText.trim(), `Dieses Angebot ist gültig bis zum ${datum(angebot.gueltigBis)}.`].filter(Boolean).join(" ");
  const unterzeichner = angebot.ansprechpartner || firma.geschaeftsfuehrung;

  return (
    <Briefbogen firma={firma} empfaenger={angebot.empfaenger} kurztitel={`${titel} vom ${datum(angebot.datum)}`} infoblock={infoblockZeilen({ art: "angebot", dokument: angebot }, firma)}>
      <Titel>{titel}</Titel>
      {angebot.betreff ? <Betreff>{angebot.betreff}</Betreff> : null}
      <Abstand hoehe={5} />
      {anredeErgaenzen(angebot.anschreiben).map((absatz, i) => (
        <Absatz key={i}>{absatz}</Absatz>
      ))}
      {objekt.length ? (
        <Abschnitt titel="Das Objekt">
          <LabelWert zeilen={objekt} />
        </Abschnitt>
      ) : null}
      {angebot.leistungsumfang.length ? (
        <Abschnitt titel="Leistungsumfang">
          <Liste punkte={angebot.leistungsumfang} />
        </Abschnitt>
      ) : null}
      <Abschnitt titel={monatlich ? "Vergütung pro Monat" : "Vergütung"}>
        <Tabelle spalten={SPALTEN(monatlich, mitUst)} zeilen={zeilen} />
        <SummenBlock zeilen={angebotSummen(angebot, firma)} />
        {monatlich ? <Absatz klein>{jahresbetragText(angebot, firma)}</Absatz> : null}
        {firma.kleinunternehmer ? <Absatz klein>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</Absatz> : null}
      </Abschnitt>
      {angebot.sonderleistungen.length ? (
        <Abschnitt titel="Sonderleistungen nach Aufwand">
          <Absatz klein>Leistungen außerhalb des vereinbarten Umfangs rechnen wir nach Aufwand ab, jeweils netto:</Absatz>
          <Tabelle
            spalten={[{ titel: "Leistung" }, { titel: "Preis", breite: 24, rechts: true }, { titel: "Einheit", breite: 44 }]}
            zeilen={angebot.sonderleistungen.map((s) => [s.bezeichnung, eur(s.preisNetto), preisEinheitText(s.einheit)])}
          />
        </Abschnitt>
      ) : null}
      {angebot.annahmen.length ? (
        <Abschnitt titel="Annahmen">
          <Liste punkte={angebot.annahmen} />
        </Abschnitt>
      ) : null}
      <Abschnitt titel="Laufzeit und Bindefrist">
        <Absatz>{laufzeit}</Absatz>
      </Abschnitt>
      <Gruss firmenname={firma.name} name={unterzeichner} schluss={["Wir freuen uns auf die Zusammenarbeit. Für Rückfragen stehen wir Ihnen gern zur Verfügung."]} />
    </Briefbogen>
  );
}
