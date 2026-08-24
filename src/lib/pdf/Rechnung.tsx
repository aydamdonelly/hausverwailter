/**
 * Rechnung mit allen Pflichtangaben nach § 14 Abs. 4 UStG: Aussteller und Empfänger mit
 * Anschrift (Kopf/Anschriftfeld), Steuernummer und USt-IdNr. (Fußzeile), Ausstellungsdatum
 * und fortlaufende Nummer (Informationsblock), Art und Umfang der Leistung (Positionen),
 * Leistungszeitpunkt, Entgelt und Steuer je Steuersatz (Summenblock), Hinweise auf
 * Steuerbefreiung (§ 19 UStG) und Aufbewahrungspflicht.
 */
import { View } from "@react-pdf/renderer";
import type { Firma, Rechnung } from "../domain/schema";
import { datum, eur } from "../format";
import { Abschnitt, Absatz, Abstand, Betreff, LabelWert, SummenBlock, Tabelle, Titel, type Spalte, type Zelle } from "./Bausteine";
import { Briefbogen } from "./Briefbogen";
import {
  bankZeilen,
  einheitText,
  einleitungAbsaetze,
  infoblockZeilen,
  leistungszeitraumText,
  mengeText,
  rechnungSteuerzeilen,
  rechnungSummen,
  rechnungTitel,
  rechnungsHinweise,
  zahlungsbedingungText,
} from "./texte";

const SPALTEN = (mitUst: boolean): Spalte[] => [
  { titel: "Pos.", breite: 8 },
  { titel: "Leistung" },
  { titel: "Menge", breite: 11, rechts: true },
  { titel: "Einheit", breite: 23 },
  { titel: "Einzelpreis", breite: 20, rechts: true },
  ...(mitUst ? [{ titel: "USt", breite: 10, rechts: true }] : []),
  { titel: "Gesamt", breite: 22, rechts: true },
];

export function RechnungPdf({ rechnung, firma }: { rechnung: Rechnung; firma: Firma }) {
  const titel = `${rechnungTitel(rechnung)} ${rechnung.nummer}`;
  // Die USt-Spalte braucht es nur, wenn Steuer ausgewiesen wird und mehr als ein Satz vorkommt.
  const mitUst = !firma.kleinunternehmer && rechnungSteuerzeilen(rechnung).length > 1;
  const zeilen: (string | Zelle)[][] = rechnung.positionen.map((p) => [
    String(p.pos),
    { text: p.bezeichnung, nebentext: p.beschreibung },
    mengeText(p.menge),
    einheitText(p.einheit, p.menge),
    eur(p.einzelpreisNetto),
    ...(mitUst ? [`${mengeText(p.ustSatz)} %`] : []),
    eur(p.gesamtNetto),
  ]);
  const bank = bankZeilen(firma);
  const hinweise = rechnungsHinweise(rechnung, firma);

  return (
    <Briefbogen firma={firma} empfaenger={rechnung.empfaenger} kurztitel={`${titel} vom ${datum(rechnung.datum)}`} infoblock={infoblockZeilen({ art: "rechnung", dokument: rechnung }, firma)}>
      <Titel>{titel}</Titel>
      {rechnung.betreff ? <Betreff>{rechnung.betreff}</Betreff> : null}
      <Absatz abstand={0}>{leistungszeitraumText(rechnung)}</Absatz>
      <Abstand hoehe={5} />
      {einleitungAbsaetze(rechnung).map((absatz, i) => (
        <Absatz key={i}>{absatz}</Absatz>
      ))}
      <Tabelle spalten={SPALTEN(mitUst)} zeilen={zeilen} />
      <SummenBlock zeilen={rechnungSummen(rechnung, firma)} />
      <Abschnitt titel="Zahlung">
        <Absatz>{zahlungsbedingungText(rechnung, firma)}</Absatz>
        {bank.length && rechnung.art !== "gutschrift" ? <LabelWert zeilen={bank} labelBreite={28} /> : null}
      </Abschnitt>
      {hinweise.length ? (
        // Die Hinweise sind kurz und bleiben zusammen auf einer Seite.
        <View wrap={false}>
          <Abschnitt titel="Hinweise">
            {hinweise.map((h, i) => (
              <Absatz key={i} klein abstand={3}>
                {h}
              </Absatz>
            ))}
          </Abschnitt>
        </View>
      ) : null}
    </Briefbogen>
  );
}
