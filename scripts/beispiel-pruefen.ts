/**
 * Nachweis für die Beispieldokumente: schickt jede Datei aus public/beispiel/ an die laufende App
 * (POST /api/erkennen), macht aus der Antwort einen Beleg und lässt die Prüfregeln aus
 * src/lib/belege/pruefung.ts darüber laufen, in derselben Reihenfolge wie beim Laden des
 * Beispielbetriebs (damit das Duplikat als Duplikat erkannt wird).
 *
 *   npx tsx scripts/beispiel-pruefen.ts                 alle Dokumente außer Kontoauszügen
 *   npx tsx scripts/beispiel-pruefen.ts --nur fuchs,bon  nur Dateien, deren Name das enthält
 *
 * Braucht den Dev-Server (BASIS, Standard http://localhost:3000) mit API-Key; jede Datei kostet
 * ein paar Cent KI-Aufruf. Kontoauszüge liest der Bankimport, nicht die KI; sie werden übersprungen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BEISPIEL_DOKUMENTE, BEISPIEL_FIRMA, BEISPIEL_OBJEKTE } from "../src/lib/beispiel/daten";
import { STANDARD_KOSTENARTEN } from "../src/lib/domain/standard";
import { Beleg } from "../src/lib/domain/schema";
import { pruefeBeleg, statusAusBefunden, type PruefKontext } from "../src/lib/belege/pruefung";
import type { ErkennungsErgebnis } from "../src/lib/belege/erkennen";
import type { ErkennungsKontext } from "../src/lib/belege/prompts";
import { betrag, datum, heuteIso } from "../src/lib/format";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = process.env.BASIS ?? "http://localhost:3000";
const args = process.argv.slice(2);
const nur = args.includes("--nur") ? (args[args.indexOf("--nur") + 1] ?? "").split(",").filter(Boolean) : [];

const kontext: ErkennungsKontext = {
  firma: { name: BEISPIEL_FIRMA.name, branche: BEISPIEL_FIRMA.branche },
  objekte: BEISPIEL_OBJEKTE.map((o) => ({ id: o.id, kurzname: o.kurzname, adresse: `${o.adresse.strasse}, ${o.adresse.plz} ${o.adresse.ort}`, art: o.art })),
  kostenarten: STANDARD_KOSTENARTEN.map((k) => ({ code: k.code, bezeichnung: k.bezeichnung, umlagefaehig: k.umlagefaehig, hinweis: k.hinweis })),
};

const zeile = (k: string, v: string | number | null | undefined) => console.log(`    ${k.padEnd(16)} ${v ?? ""}`);
const geld = (n: number) => `${betrag(n)} €`;

async function erkennen(dateiname: string, mime: string, bytes: Buffer): Promise<ErkennungsErgebnis> {
  const form = new FormData();
  form.append("datei", new File([new Uint8Array(bytes)], dateiname, { type: mime }));
  form.append("kontext", JSON.stringify(kontext));
  const headers: Record<string, string> = {};
  if (process.env.ZUGANGSCODE) headers["x-zugangscode"] = process.env.ZUGANGSCODE;
  const res = await fetch(`${BASIS}/api/erkennen`, { method: "POST", body: form, headers });
  const json = (await res.json()) as ErkennungsErgebnis | { fehler: string };
  if (!res.ok || "fehler" in json) throw new Error(`HTTP ${res.status}: ${"fehler" in json ? json.fehler : "unbekannt"}`);
  return json;
}

async function main() {
  const vorhandeneBelege: PruefKontext["vorhandeneBelege"] = [];
  const pruefKontext: PruefKontext = {
    heute: heuteIso(),
    freigabegrenze: BEISPIEL_FIRMA.freigabegrenze,
    kostenarten: STANDARD_KOSTENARTEN,
    objekte: BEISPIEL_OBJEKTE,
    vorhandeneBelege,
  };
  let nr = 0;
  let tokensRein = 0;
  let tokensRaus = 0;
  for (const d of BEISPIEL_DOKUMENTE) {
    const dateiname = d.pfad.split("/").pop() ?? d.pfad;
    if (dateiname.includes("kontoauszug")) continue;
    if (nur.length && !nur.some((n) => dateiname.includes(n))) continue;
    nr++;
    console.log(`\n${nr}. ${dateiname}`);
    const bytes = readFileSync(path.join(WURZEL, "public", d.pfad));
    let erg: ErkennungsErgebnis;
    try {
      erg = await erkennen(dateiname, d.mime, bytes);
    } catch (e) {
      console.log(`    FEHLER: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    tokensRein += erg.eingabeTokens;
    tokensRaus += erg.ausgabeTokens;
    zeile("Typ", `${erg.typ} (${erg.zuversicht}), ${erg.eingabeTokens} Token rein / ${erg.ausgabeTokens} raus`);
    zeile("Zusammenfassung", erg.zusammenfassung);

    if (erg.belegEntwurf) {
      const beleg = Beleg.parse({ ...erg.belegEntwurf, id: `B-${nr}`, dokumentId: `D-${nr}` });
      zeile("Lieferant", `${beleg.lieferant.name} | ${beleg.lieferant.adresse} | StNr ${beleg.lieferant.steuernummer || "-"} | USt-IdNr ${beleg.lieferant.ustIdNr || "-"} | IBAN ${beleg.lieferant.iban || "-"}`);
      zeile("Rechnung", `${beleg.rechnungsnummer || "(ohne Nummer)"} vom ${datum(beleg.rechnungsdatum) || "?"}, Leistung ${datum(beleg.leistungVon) || "?"} bis ${datum(beleg.leistungBis) || "?"}, fällig ${datum(beleg.faelligAm) || "-"}`);
      zeile("Beträge", `netto ${geld(beleg.nettoGesamt)}, USt ${geld(beleg.ustGesamt)}, brutto ${geld(beleg.bruttoGesamt)}`);
      zeile("Steuerzeilen", beleg.steuersaetze.map((z) => `${z.satz} %: ${geld(z.netto)} + ${geld(z.ust)}`).join("; ") || "(keine)");
      zeile("Positionen", beleg.positionen.map((p) => `${p.beschreibung.slice(0, 40)} = ${geld(p.netto)} (${p.ustSatz} %)`).join(" | "));
      zeile("Zuordnung", `Objekt ${beleg.objektId ?? `? (${beleg.objektHinweis || "kein Hinweis"})`}, Kostenart ${beleg.kostenartCode ?? "?"}: ${beleg.kostenartBegruendung}`);
      zeile("Merkmale", `Zahlung ${beleg.zahlungsart}${beleg.kleinunternehmer ? ", Kleinunternehmer" : ""}${beleg.versicherungsteuer ? ", Versicherungsteuer" : ""}${beleg.reverseCharge ? ", § 13b" : ""}${beleg.skontoText ? `, Skonto: ${beleg.skontoText}` : ""}`);
      if (beleg.notizenKi) zeile("KI-Notizen", beleg.notizenKi);
      const befunde = pruefeBeleg(beleg, pruefKontext);
      zeile("Status", statusAusBefunden(befunde));
      for (const b of befunde) console.log(`      [${b.stufe.toUpperCase().padEnd(7)}] ${b.code}: ${b.text}`);
      vorhandeneBelege.push({ id: beleg.id, lieferant: beleg.lieferant, rechnungsnummer: beleg.rechnungsnummer, bruttoGesamt: beleg.bruttoGesamt, rechnungsdatum: beleg.rechnungsdatum });
    } else if (erg.anfrageEntwurf) {
      const a = erg.anfrageEntwurf;
      zeile("Anfrage", `${a.istAnfrage ? "ja" : "nein"}, ${a.verwaltungsart}, ${a.strasse} ${a.plz} ${a.ort}`.trim());
      zeile("Einheiten", `${a.einheitenWohnen ?? "?"} Wohnungen, ${a.einheitenGewerbe ?? "?"} Gewerbe, ${a.stellplaetze ?? "?"} Stellplätze, Baujahr ${a.baujahr ?? "?"}`);
      zeile("Beginn", a.gewuenschterBeginn ?? "?");
      zeile("Kontakt", `${a.kontakt.name} (${a.kontakt.rolle}) ${a.kontakt.email} ${a.kontakt.telefon}`.trim());
      zeile("Besonderheiten", a.besonderheiten.join("; "));
      zeile("Wünsche", a.leistungswuensche.join("; "));
      zeile("Offene Fragen", a.offeneFragen.join(" | "));
    } else if (erg.handwerkerangebot) {
      const h = erg.handwerkerangebot;
      zeile("Anbieter", `${h.anbieterName}, Angebot ${h.angebotsnummer} vom ${h.datum ?? "?"}, gültig bis ${h.gueltigBis ?? "?"}`);
      zeile("Objekt", `${h.objektId || "?"} (${h.objektHinweis})`);
      zeile("Leistung", h.leistungKurz);
      zeile("Positionen", `${h.positionen.length} Positionen, Summe ${geld(h.positionen.reduce((s, p) => s + p.netto, 0))}; netto ${h.nettoGesamt ?? "?"}, USt ${h.ustGesamt ?? "?"}, brutto ${h.bruttoGesamt ?? "?"}`);
      zeile("Bedingungen", h.bedingungen.join(" | "));
      if (h.auffaelligkeiten.length) zeile("Auffällig", h.auffaelligkeiten.join(" | "));
    }
  }
  console.log(`\n${nr} Dokumente, ${tokensRein} Token rein, ${tokensRaus} Token raus.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
