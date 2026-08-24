/**
 * Aus einer Anfrage wird ein Angebotsentwurf: Empfänger, Objekt, Positionen aus dem
 * Leistungskatalog, Leistungsumfang, Annahmen für alles, was in der Anfrage fehlt, Laufzeit
 * und Summen. Reiner Code ohne Datenbank; die Nummer vergibt der Aufrufer (Nummernkreis).
 */
import type { Anfrage, Angebot, Einstellungen, Empfaenger, Leistung, Position } from "../domain/schema";
import { einheitText, kalkuliereGrundhonorar } from "../preise/kalkulation";
import { rundeGeld, summe, ustAusNetto } from "../geld";
import { datum as datumFmt, eur, plusTage } from "../format";
import {
  ART_TEXT,
  giltFuer,
  laufzeitText,
  leistungsumfangDienstleister,
  leistungsumfangFuer,
  sonderleistungenFuer,
  standardBeginn,
  type AngebotsArt,
} from "./leistungsumfang";

export type AngebotEntwurf = Omit<Angebot, "id" | "nummer">;

export interface ErstellOptionen {
  leistungen: Leistung[];
  einstellungen: Einstellungen;
  /** Angebotsdatum (YYYY-MM-DD). */
  datum: string;
  /** Zeitstempel für erstelltAm; Standard: jetzt. */
  jetzt?: string;
}

export interface Summen {
  zwischensumme: number;
  rabattBetrag: number;
  netto: number;
  ust: number;
  brutto: number;
}

/** Summen eines Angebots: Positionen, dann Rabatt in Prozent auf die Zwischensumme, dann Umsatzsteuer. */
export function berechneSummen(positionen: Pick<Position, "gesamtNetto">[], rabattProzent: number, ustSatz: number): Summen {
  const zwischensumme = summe(positionen.map((p) => p.gesamtNetto));
  const rabattBetrag = rabattProzent > 0 ? rundeGeld((zwischensumme * rabattProzent) / 100) : 0;
  const netto = summe([zwischensumme, -rabattBetrag]);
  const ust = ustAusNetto(netto, ustSatz);
  return { zwischensumme, rabattBetrag, netto, ust, brutto: summe([netto, ust]) };
}

/** Positionen nach einer Änderung neu durchnummerieren und die Zeilensummen nachrechnen. */
export function positionenBereinigen(positionen: Position[]): Position[] {
  return positionen.map((p, i) => ({ ...p, pos: i + 1, gesamtNetto: rundeGeld(p.menge * p.einzelpreisNetto) }));
}

// ---------- Wortabgleich für Dienstleister ----------

const STOPP = new Set([
  "dienst", "dienste", "leistung", "leistungen", "angebot", "objekt", "monatlich", "woechentlich", "taeglich", "bitte", "gesucht", "suchen",
  "einheiten", "wohnungen", "wohnung", "gebaeude", "pauschale", "pauschal", "stunde", "stunden", "sonstige", "aufwand", "haus", "haeuser",
]);

/** Suchwörter je Katalogcode, falls der Katalog die Standardcodes verwendet. Eigene Codes matchen über die Bezeichnung. */
const SYNONYME: Record<string, string[]> = {
  TREPPENHAUS: ["treppenhaus", "treppe", "unterhaltsreinigung", "putzen", "hausreinigung"],
  WINTERDIENST: ["winterdienst", "schnee", "raeumen", "streuen", "glaette", "raeumdienst", "streudienst"],
  GARTEN: ["garten", "rasen", "hecke", "gruenpflege", "gruenanlage", "aussenanlage", "laub", "baumpflege"],
  HAUSMEISTER: ["hausmeister", "hauswart", "objektbetreuung", "kontrollgang", "hausbetreuung", "facility"],
  STUNDE_HANDWERK: ["kleinreparatur", "handwerker", "montage", "reparatur"],
  SPERRMUELL: ["sperrmuell", "entruempelung", "entsorgung", "raeumung"],
};

export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Wählt Katalogleistungen nach den Wünschen der Anfrage: ein Wort der Bezeichnung (oder ein
 * Synonym) kommt im Wunschtext vor, oder ein Wort des Wunsches steckt in der Bezeichnung.
 * Ergebnis in Katalogreihenfolge.
 */
export function waehleLeistungenNachWunsch(wuensche: string[], leistungen: Leistung[]): string[] {
  const text = ` ${normalisiere(wuensche.join(" "))} `;
  if (!text.trim()) return [];
  const wunschWoerter = text.split(" ").filter((w) => w.length >= 6 && !STOPP.has(w));
  const codes: string[] = [];
  for (const l of leistungen) {
    if (!l.aktiv) continue;
    const bezeichnung = normalisiere(l.bezeichnung);
    const kandidaten = new Set<string>(bezeichnung.split(" ").filter((w) => w.length >= 5 && !STOPP.has(w)));
    for (const s of SYNONYME[l.code] ?? []) kandidaten.add(s);
    const vorwaerts = [...kandidaten].some((k) => text.includes(k));
    const rueckwaerts = wunschWoerter.some((w) => bezeichnung.includes(w));
    if (vorwaerts || rueckwaerts) codes.push(l.code);
  }
  return codes;
}

// ---------- Verwaltungsart und Empfänger ----------

const EIGENTUEMER_EINZELN = /eigent[uü]mer|vermieter|inhaber|besitzer/i;
const GEMEINSCHAFT = /gemeinschaft|beirat|miteigent|weg\b|eigent[uü]mergemeinschaft|verwaltungsbeirat/i;

/** UNKLAR wird zu WEG, es sei denn, eine Einzelperson als Eigentümer fragt an (dann Mietverwaltung). */
export function verwaltungsartBestimmen(anfrage: Anfrage): { art: AngebotsArt; annahme: string | null } {
  if (anfrage.verwaltungsart !== "UNKLAR") return { art: anfrage.verwaltungsart, annahme: null };
  const rolle = anfrage.kontakt.rolle;
  if (EIGENTUEMER_EINZELN.test(rolle) && !GEMEINSCHAFT.test(rolle) && !GEMEINSCHAFT.test(anfrage.kontakt.firma)) {
    return {
      art: "MIET",
      annahme: "Die Anfrage nennt die Verwaltungsart nicht. Da Sie als Eigentümer anfragen, gehen wir von einer Mietverwaltung Ihres Objekts aus.",
    };
  }
  return {
    art: "WEG",
    annahme: "Die Anfrage nennt die Verwaltungsart nicht. Wir gehen von einer Wohnungseigentümergemeinschaft (WEG-Verwaltung) aus; für eine Mietverwaltung gilt ein anderer Satz je Einheit.",
  };
}

function objektText(anfrage: Pick<Anfrage, "strasse" | "plz" | "ort">): string {
  const ortszeile = [anfrage.plz, anfrage.ort].filter(Boolean).join(" ");
  return [anfrage.strasse, ortszeile].filter(Boolean).join(", ");
}

/** Empfänger aus dem Kontakt; ohne eigene Anschrift die Objektadresse mit "z. Hd.". */
export function empfaengerAus(anfrage: Anfrage, art: AngebotsArt, branche: Einstellungen["firma"]["branche"]): Empfaenger {
  const k = anfrage.kontakt;
  const adresse = { strasse: anfrage.strasse, plz: anfrage.plz, ort: anfrage.ort, land: "DE" };
  const zHd = k.name ? `z. Hd. ${k.name}${k.rolle && !k.firma ? `, ${k.rolle}` : ""}` : "";
  if (k.firma) {
    return { name: k.firma, zusatz: zHd, adresse, email: k.email, kundennummer: "", leitwegId: "", ustIdNr: "" };
  }
  if ((art === "WEG" || art === "UNKLAR") && branche !== "dienstleister") {
    const name = `Wohnungseigentümergemeinschaft ${anfrage.strasse}`.trim();
    return { name, zusatz: zHd, adresse, email: k.email, kundennummer: "", leitwegId: "", ustIdNr: "" };
  }
  if (art === "WEG" && branche === "dienstleister") {
    const name = `Wohnungseigentümergemeinschaft ${anfrage.strasse}`.trim();
    return { name, zusatz: zHd, adresse, email: k.email, kundennummer: "", leitwegId: "", ustIdNr: "" };
  }
  const name = k.name || `Eigentümer ${anfrage.strasse}`.trim();
  return { name, zusatz: k.name && k.rolle ? k.rolle : "", adresse, email: k.email, kundennummer: "", leitwegId: "", ustIdNr: "" };
}

// ---------- Das Angebot ----------

function grundleistungMitNullMenge(art: AngebotsArt, leistungen: Leistung[], ustSatz: number): Position | null {
  const gilt: AngebotsArt = art === "UNKLAR" ? "WEG" : art === "GEWERBE" ? "MIET" : art;
  const l =
    leistungen.find((x) => x.aktiv && x.kategorie === "grundleistung" && x.einheit === "einheit_monat" && x.gilt === gilt) ??
    leistungen.find((x) => x.aktiv && x.kategorie === "grundleistung" && x.einheit === "einheit_monat" && x.gilt === "ALLE");
  if (!l) return null;
  return {
    pos: 1,
    leistungCode: l.code,
    bezeichnung: l.bezeichnung,
    beschreibung: l.beschreibung,
    menge: 0,
    einheit: einheitText(l.einheit),
    einzelpreisNetto: l.preisNetto,
    gesamtNetto: 0,
    ustSatz,
  };
}

function aufzaehlung(teile: string[]): string {
  if (teile.length <= 1) return teile.join("");
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

/** Offene Fragen der KI werden als "Noch zu klären" übernommen, außer das Thema ist schon durch eine eigene Annahme abgedeckt. */
function offeneFragenAlsAnnahmen(fragen: string[], abgedeckt: RegExp[]): string[] {
  return fragen
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !abgedeckt.some((re) => re.test(f)))
    .map((f) => `Noch zu klären: ${f.replace(/\?$/, "")}`);
}

export function angebotAusAnfrage(anfrage: Anfrage, o: ErstellOptionen): AngebotEntwurf {
  const firma = o.einstellungen.firma;
  const branche = firma.branche;
  const dienstleister = branche === "dienstleister";
  const ustSatz = firma.kleinunternehmer ? 0 : firma.ustSatz;
  const annahmen: string[] = [];
  const abgedeckt: RegExp[] = [];

  // Verwaltungsart
  const bestimmt = verwaltungsartBestimmen(anfrage);
  const art: AngebotsArt = dienstleister ? anfrage.verwaltungsart : bestimmt.art;
  if (!dienstleister && bestimmt.annahme) {
    annahmen.push(bestimmt.annahme);
    abgedeckt.push(/verwaltungsart|weg|gemeinschaft|mietverwaltung/i);
  }

  // Objektzahlen: was fehlt, wird 0 und als Annahme genannt
  const einheitenWohnen = anfrage.einheitenWohnen ?? 0;
  const einheitenGewerbe = anfrage.einheitenGewerbe ?? 0;
  const stellplaetze = anfrage.stellplaetze ?? 0;
  if (!dienstleister) {
    if (anfrage.einheitenWohnen === null && anfrage.einheitenGewerbe === null) {
      annahmen.push("Die Anzahl der Einheiten ist in der Anfrage nicht genannt. Das Angebot rechnet vorerst mit 0 Einheiten; sobald Sie uns die Zahl nennen, tragen wir den Monatsbetrag nach.");
      abgedeckt.push(/einheit|wohnung/i);
    } else if (anfrage.einheitenGewerbe === null) {
      annahmen.push("Wir gehen davon aus, dass das Objekt keine Gewerbeeinheiten hat.");
      abgedeckt.push(/gewerbe/i);
    }
    if (anfrage.stellplaetze === null) {
      const stellplatz = o.leistungen.find((l) => l.aktiv && l.einheit === "stellplatz_monat");
      annahmen.push(
        stellplatz
          ? `Stellplätze und Garagen sind nicht genannt und daher nicht enthalten; je Stellplatz kämen ${eur(stellplatz.preisNetto)} netto im Monat hinzu.`
          : "Stellplätze und Garagen sind nicht genannt und daher nicht enthalten.",
      );
      abgedeckt.push(/stellpl|garage|tiefgarage/i);
    }
  }

  // Beginn
  const beginn = anfrage.gewuenschterBeginn ?? standardBeginn(o.datum);
  if (!anfrage.gewuenschterBeginn) {
    annahmen.push(
      `Der gewünschte Beginn ist nicht genannt; wir haben den ${datumFmt(beginn)} angesetzt.${
        !dienstleister && art === "WEG" ? " Ein Verwalterwechsel setzt einen Beschluss der Eigentümerversammlung voraus." : ""
      }`,
    );
    abgedeckt.push(/beginn|start|ab wann|zeitpunkt|übernahme|uebernahme/i);
  }

  // Positionen
  const objektdaten = { art, einheitenWohnen, einheitenGewerbe, stellplaetze };
  let codes: string[] | undefined;
  if (dienstleister) {
    const grund = o.leistungen.filter((l) => l.kategorie === "grundleistung");
    codes = waehleLeistungenNachWunsch(anfrage.leistungswuensche, grund);
    if (!codes.length) codes = waehleLeistungenNachWunsch([anfrage.zusammenfassung, ...anfrage.besonderheiten, anfrage.text], grund);
    if (!codes.length) {
      const erste = grund.find((l) => l.aktiv);
      if (erste) {
        codes = [erste.code];
        annahmen.push(`Die Anfrage nennt keine Leistung aus unserem Katalog; wir haben ${erste.bezeichnung} angesetzt.`);
      }
    }
  }
  const kalkulation = kalkuliereGrundhonorar(objektdaten, o.leistungen, o.einstellungen.staffel, o.einstellungen.mindesthonorarMonat, codes, ustSatz);
  let positionen = kalkulation.positionen;
  if (!positionen.length && !dienstleister) {
    const platzhalter = grundleistungMitNullMenge(art, o.leistungen, ustSatz);
    if (platzhalter) positionen = [platzhalter];
  }

  // Sonderleistungen aus dem Katalog; beim Dienstleister zusätzlich die gewünschten Sonderleistungen
  const sonderleistungen = sonderleistungenFuer(art, o.leistungen);

  // Texte
  const ortstext = objektText(anfrage) || "Ihr Objekt";
  const gewaehlt = (codes ?? []).map((c) => o.leistungen.find((l) => l.code === c)?.bezeichnung ?? c);
  const betreff = dienstleister ? `Angebot ${aufzaehlung(gewaehlt) || "Gebäudedienstleistungen"}, ${ortstext}` : `Angebot ${ART_TEXT[art]} ${ortstext}`;
  const leistungsumfang = dienstleister ? leistungsumfangDienstleister(o.leistungen, codes ?? []) : leistungsumfangFuer(art);

  annahmen.push(...offeneFragenAlsAnnahmen(anfrage.offeneFragen, abgedeckt));

  const summen = berechneSummen(positionen, 0, ustSatz);

  return {
    datum: o.datum,
    gueltigBis: plusTage(o.datum, 30),
    anfrageId: anfrage.id,
    empfaenger: empfaengerAus(anfrage, art, branche),
    ansprechpartner: anfrage.kontakt.name,
    objekt: {
      strasse: anfrage.strasse,
      plz: anfrage.plz,
      ort: anfrage.ort,
      art,
      einheitenWohnen,
      einheitenGewerbe,
      stellplaetze,
      besonderheiten: [...anfrage.besonderheiten],
    },
    betreff,
    positionen,
    rabattProzent: 0,
    rabattBetrag: 0,
    netto: summen.netto,
    ustSatz,
    ust: summen.ust,
    brutto: summen.brutto,
    turnus: "monatlich",
    laufzeitText: laufzeitText(art, beginn, branche),
    leistungsumfang,
    sonderleistungen,
    annahmen,
    anschreiben: [],
    antwortEmail: null,
    status: "entwurf",
    erstelltAm: o.jetzt ?? new Date().toISOString(),
  };
}

/** Passende Katalogleistungen zur Art, für die Positionsauswahl in der Oberfläche. */
export function katalogFuer(art: AngebotsArt, leistungen: Leistung[]): Leistung[] {
  return leistungen.filter((l) => l.aktiv && giltFuer(l, art));
}

/** Neue Position aus einer Katalogleistung. */
export function positionAusLeistung(l: Leistung, pos: number, ustSatz: number, menge = 1): Position {
  return {
    pos,
    leistungCode: l.code,
    bezeichnung: l.bezeichnung,
    beschreibung: l.beschreibung,
    menge,
    einheit: einheitText(l.einheit),
    einzelpreisNetto: l.preisNetto,
    gesamtNetto: rundeGeld(menge * l.preisNetto),
    ustSatz,
  };
}
