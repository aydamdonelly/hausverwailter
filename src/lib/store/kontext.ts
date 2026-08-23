import { db } from "./db";
import { ladeEinstellungen } from "./arbeitsbereich";
import type { ErkennungsKontext } from "../belege/prompts";
import type { PruefKontext } from "../belege/pruefung";
import { heuteIso } from "../format";

/** Was die KI über den Betrieb wissen muss, um Belege zuzuordnen. */
export async function erkennungsKontext(): Promise<ErkennungsKontext> {
  const e = await ladeEinstellungen();
  const objekte = await db.objekte.filter((o) => o.aktiv).toArray();
  const kostenarten = await db.kostenarten.filter((k) => k.aktiv).toArray();
  return {
    firma: { name: e.firma.name, branche: e.firma.branche },
    objekte: objekte.map((o) => ({ id: o.id, kurzname: o.kurzname, adresse: `${o.adresse.strasse}, ${o.adresse.plz} ${o.adresse.ort}`, art: o.art })),
    kostenarten: kostenarten.map((k) => ({ code: k.code, bezeichnung: k.bezeichnung, umlagefaehig: k.umlagefaehig, hinweis: k.hinweis })),
  };
}

/** Was die Prüfregeln brauchen. `ausser` = ID des Belegs, der gerade geprüft wird. */
export async function pruefKontext(ausser?: string): Promise<PruefKontext> {
  const e = await ladeEinstellungen();
  const objekte = await db.objekte.toArray();
  const kostenarten = await db.kostenarten.toArray();
  const belege = await db.belege.toArray();
  return {
    heute: heuteIso(),
    freigabegrenze: e.firma.freigabegrenze,
    kostenarten,
    objekte,
    vorhandeneBelege: belege
      .filter((b) => b.id !== ausser)
      .map((b) => ({ id: b.id, lieferant: b.lieferant, rechnungsnummer: b.rechnungsnummer, bruttoGesamt: b.bruttoGesamt, rechnungsdatum: b.rechnungsdatum })),
  };
}
