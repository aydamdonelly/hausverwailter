/**
 * Mahnung in drei Stufen: Zahlungserinnerung (freundlich), Mahnung (Verzug, Zinsen),
 * letzte Mahnung (Ankündigung des gerichtlichen Mahnverfahrens; bei Mietrückstand von zwei
 * Monatsmieten der Hinweis auf § 543 BGB). Postentabelle mit Soll, gezahlt und offen,
 * Gebühr und Zinsen nur wenn sie anfallen, Gesamtbetrag, Frist und Bankverbindung.
 */
import type { Firma, Mahnung } from "../domain/schema";
import { datum, eur } from "../format";
import { Abschnitt, Absatz, Abstand, Gruss, SummenBlock, Tabelle, Titel } from "./Bausteine";
import { Briefbogen } from "./Briefbogen";
import { bankZeile, infoblockZeilen, mahnAbsaetze, mahnAufforderungText, mahnSchlussAbsaetze, mahnTitel, mahnungSummen } from "./texte";

export function MahnungPdf({ mahnung, firma }: { mahnung: Mahnung; firma: Firma }) {
  const titel = mahnTitel(mahnung.stufe);
  const bank = bankZeile(firma);
  return (
    <Briefbogen firma={firma} empfaenger={mahnung.empfaenger} kurztitel={`${titel} ${mahnung.nummer} vom ${datum(mahnung.datum)}`} infoblock={infoblockZeilen({ art: "mahnung", dokument: mahnung }, firma)}>
      <Titel>{titel}</Titel>
      <Abstand hoehe={4} />
      {mahnAbsaetze(mahnung).map((absatz, i) => (
        <Absatz key={i}>{absatz}</Absatz>
      ))}
      <Tabelle
        spalten={[
          { titel: "Posten" },
          { titel: "Soll", breite: 26, rechts: true },
          { titel: "Gezahlt", breite: 26, rechts: true },
          { titel: "Offen", breite: 26, rechts: true },
        ]}
        zeilen={mahnung.posten.map((p) => [p.bezeichnung, eur(p.soll), eur(p.ist), eur(p.offen)])}
      />
      <SummenBlock zeilen={mahnungSummen(mahnung)} />
      <Abschnitt titel={`Zahlung bis ${datum(mahnung.frist)}`}>
        <Absatz abstand={bank ? 2 : 6}>{mahnAufforderungText(mahnung, firma)}</Absatz>
        {bank ? <Absatz>{bank}</Absatz> : null}
      </Abschnitt>
      <Gruss firmenname={firma.name} name={firma.geschaeftsfuehrung} schluss={mahnSchlussAbsaetze(mahnung)} />
    </Briefbogen>
  );
}
