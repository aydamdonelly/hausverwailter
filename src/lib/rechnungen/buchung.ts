/**
 * Buchungssätze zu Ausgangsrechnungen: je Steuersatz eine Habenbuchung auf das Erlöskonto,
 * Kostenstelle = Objekt, Belegnummer = Rechnungsnummer. Das Debitorenkonto vergibt der
 * DATEV-Export (Gegenkonto bleibt hier leer). Storno = dieselben Zeilen mit umgekehrtem
 * Vorzeichen. Reiner Code: die Id-Vergabe wird hereingereicht.
 */
import type { Buchung, Einstellungen, Rechnung } from "../domain/schema";
import { kurz } from "../format";
import { summe } from "../geld";

export function buchungenAusRechnung(rechnung: Rechnung, einstellungen: Einstellungen, jetzt: string, neueId: () => string): Buchung[] {
  const zeilen = rechnung.steuersaetze.length ? rechnung.steuersaetze : [{ satz: 0, netto: rechnung.netto, ust: rechnung.ust }];
  return zeilen.map((z) => ({
    id: neueId(),
    datum: rechnung.datum,
    belegId: null,
    bankumsatzId: null,
    rechnungId: rechnung.id,
    objektId: rechnung.objektId,
    kostenartCode: null,
    umlagefaehig: null,
    konto: einstellungen.datev.erloeskonto,
    gegenkonto: "",
    buSchluessel: "",
    belegnummer: rechnung.nummer,
    buchungstext: kurz(rechnung.betreff || `${rechnung.empfaenger.name} ${rechnung.nummer}`, 60),
    netto: z.netto,
    ust: z.ust,
    brutto: summe([z.netto, z.ust]),
    ustSatz: z.satz,
    sollHaben: "H",
    quelle: "rechnung",
    erstelltAm: jetzt,
    exportiertAm: null,
  }));
}

/** Gegenbuchungen zu den vorhandenen Buchungen einer Rechnung: gleiche Konten, umgekehrtes Vorzeichen. */
export function stornoBuchungen(rechnung: Rechnung, vorhandene: Buchung[], datum: string, jetzt: string, neueId: () => string): Buchung[] {
  return vorhandene
    .filter((b) => b.rechnungId === rechnung.id && b.quelle === "rechnung")
    .map((b) => ({
      ...b,
      id: neueId(),
      datum,
      netto: -b.netto,
      ust: -b.ust,
      brutto: -b.brutto,
      buchungstext: kurz(`Storno ${rechnung.nummer} ${b.buchungstext}`, 60),
      erstelltAm: jetzt,
      exportiertAm: null,
    }));
}
