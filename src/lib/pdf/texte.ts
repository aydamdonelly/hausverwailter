/**
 * Reine Fachlogik der Briefe: welche Zeilen in die Anschrift gehören, wie Mengen und
 * Einheiten heißen, welche Sätze eine Rechnung nach § 14 UStG tragen muss, was in einer
 * Mahnung je Stufe steht. Kein React, keine Datenbank, damit alles testbar bleibt.
 */
import type { Angebot, Empfaenger, Firma, Mahnung, Rechnung, Steuerzeile } from "../domain/schema";
import { datum, eur, iban as ibanFmt, prozent } from "../format";
import { ausCent, inCent, steuerzeilen, summe } from "../geld";

// ---------- Anschrift, Absender, Informationsblock ----------

/** Ländername in Großbuchstaben für die letzte Anschriftzeile; Deutschland bleibt leer. */
export function laendername(code: string | null | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  if (!c || c === "DE" || c === "DEUTSCHLAND") return "";
  try {
    const name = new Intl.DisplayNames(["de"], { type: "region" }).of(c);
    return (name ?? c).toUpperCase();
  } catch {
    return c;
  }
}

/** Die Zeilen des Anschriftfelds (DIN 5008: höchstens 6, keine Leerzeilen). */
export function anschriftZeilen(e: Empfaenger): string[] {
  const ort = `${e.adresse.plz} ${e.adresse.ort}`.trim();
  return [e.name, e.zusatz, e.adresse.strasse, ort, laendername(e.adresse.land)]
    .map((z) => z.trim())
    .filter(Boolean)
    .slice(0, 6);
}

/** Einzeilige Rücksendeangabe über dem Anschriftfeld. */
export function ruecksendeangabe(firma: Firma): string {
  const ort = `${firma.adresse.plz} ${firma.adresse.ort}`.trim();
  return [firma.name, firma.adresse.strasse, ort].map((z) => z.trim()).filter(Boolean).join(" · ");
}

export type InfoZeile = [label: string, wert: string];

function ohneLeere(zeilen: InfoZeile[]): InfoZeile[] {
  return zeilen.filter(([, wert]) => wert.trim() !== "");
}

/** Der Informationsblock rechts neben der Anschrift, je Dokumentart. */
export function infoblockZeilen(
  anfrage: { art: "angebot"; dokument: Angebot } | { art: "rechnung"; dokument: Rechnung } | { art: "mahnung"; dokument: Mahnung },
  firma: Firma,
): InfoZeile[] {
  const d = anfrage.dokument;
  const kontakt: InfoZeile[] = [
    ["Telefon", firma.telefon],
    ["E-Mail", firma.email],
  ];
  if (anfrage.art === "angebot") {
    const a = anfrage.dokument;
    return ohneLeere([
      ["Datum", datum(a.datum)],
      ["Angebotsnummer", a.nummer],
      ["Gültig bis", datum(a.gueltigBis)],
      ["Kundennummer", a.empfaenger.kundennummer],
      ["Ansprechpartner", a.ansprechpartner || firma.geschaeftsfuehrung],
      ...kontakt,
    ]);
  }
  if (anfrage.art === "rechnung") {
    const r = anfrage.dokument;
    return ohneLeere([
      ["Datum", datum(r.datum)],
      [r.art === "gutschrift" ? "Korrekturnummer" : "Rechnungsnummer", r.nummer],
      [r.art === "gutschrift" ? "" : "Fällig am", r.art === "gutschrift" ? "" : datum(r.faelligAm)],
      ["Kundennummer", r.empfaenger.kundennummer],
      ["Leitweg-ID", r.empfaenger.leitwegId],
      ["Ihre USt-IdNr.", r.empfaenger.ustIdNr],
      ["Ansprechpartner", firma.geschaeftsfuehrung],
      ...kontakt,
    ]);
  }
  const m = d as Mahnung;
  return ohneLeere([
    ["Datum", datum(m.datum)],
    ["Unser Zeichen", m.nummer],
    ["Zahlung bis", datum(m.frist)],
    ["Kundennummer", m.empfaenger.kundennummer],
    ["Ansprechpartner", firma.geschaeftsfuehrung],
    ...kontakt,
  ]);
}

/** Bankverbindung als Label/Wert-Zeilen, nur die gefüllten. */
export function bankZeilen(firma: Firma): InfoZeile[] {
  return ohneLeere([
    ["Kontoinhaber", firma.name],
    ["IBAN", ibanFmt(firma.iban)],
    ["BIC", firma.bic],
    ["Bank", firma.bankname],
  ]);
}

/** Bankverbindung in einem Satz, für Briefe, in denen der Platz knapp ist. */
export function bankZeile(firma: Firma): string {
  const teile = [firma.bankname, firma.iban ? `IBAN ${ibanFmt(firma.iban)}` : "", firma.bic ? `BIC ${firma.bic}` : ""].filter(Boolean);
  if (!teile.length) return "";
  return `Bankverbindung: ${teile.join(", ")}, Kontoinhaber ${firma.name}.`;
}

// ---------- Mengen, Einheiten, Objekt ----------

const mengeFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export function mengeText(menge: number): string {
  return mengeFormat.format(menge);
}

const EINHEIT: Record<string, [einzahl: string, mehrzahl: string]> = {
  einheit_monat: ["Einheit/Monat", "Einheiten/Monat"],
  stellplatz_monat: ["Stellplatz/Monat", "Stellplätze/Monat"],
  pauschal_monat: ["pauschal/Monat", "pauschal/Monat"],
  qm_monat: ["m²/Monat", "m²/Monat"],
  stunde: ["Stunde", "Stunden"],
  stueck: ["Stück", "Stück"],
  pauschal: ["pauschal", "pauschal"],
};

/** Einheit für die Spalte neben der Menge; bekannte Codes werden übersetzt, Freitext bleibt. */
export function einheitText(einheit: string, menge = 1): string {
  const bekannt = EINHEIT[einheit];
  if (!bekannt) return einheit;
  return menge === 1 ? bekannt[0] : bekannt[1];
}

const PREIS_EINHEIT: Record<string, string> = {
  einheit_monat: "je Einheit und Monat",
  stellplatz_monat: "je Stellplatz und Monat",
  pauschal_monat: "pauschal je Monat",
  qm_monat: "je m² und Monat",
  stunde: "je Stunde",
  stueck: "je Stück",
  pauschal: "pauschal",
};

/** Einheit hinter einem Preis ("75,00 € je Stunde"). */
export function preisEinheitText(einheit: string): string {
  return PREIS_EINHEIT[einheit] ?? einheit;
}

export function objektArtText(art: Angebot["objekt"]["art"]): string {
  return { WEG: "Wohnungseigentümergemeinschaft", MIET: "Mietobjekt", GEWERBE: "Gewerbeobjekt", UNKLAR: "" }[art];
}

function zaehlText(n: number, einzahl: string, mehrzahl: string): string {
  return `${n} ${n === 1 ? einzahl : mehrzahl}`;
}

export function einheitenText(objekt: Angebot["objekt"]): string {
  const teile: string[] = [];
  if (objekt.einheitenWohnen > 0) teile.push(zaehlText(objekt.einheitenWohnen, "Wohnung", "Wohnungen"));
  if (objekt.einheitenGewerbe > 0) teile.push(zaehlText(objekt.einheitenGewerbe, "Gewerbeeinheit", "Gewerbeeinheiten"));
  if (objekt.stellplaetze > 0) teile.push(zaehlText(objekt.stellplaetze, "Stellplatz", "Stellplätze"));
  return teile.join(", ");
}

/** Objektdaten eines Angebots als Label/Wert-Zeilen, nur die gefüllten. */
export function objektZeilen(objekt: Angebot["objekt"]): InfoZeile[] {
  const ort = `${objekt.plz} ${objekt.ort}`.trim();
  const adresse = [objekt.strasse, ort].filter(Boolean).join(", ");
  return ohneLeere([
    ["Objekt", adresse],
    ["Art", objektArtText(objekt.art)],
    ["Einheiten", einheitenText(objekt)],
    ["Besonderheiten", objekt.besonderheiten.filter(Boolean).join(", ")],
  ]);
}

// ---------- Anrede, Absätze ----------

export const ANREDE_STANDARD = "Sehr geehrte Damen und Herren,";

/** Stellt die Anrede voran, wenn die Absätze nicht schon mit einer beginnen. */
export function anredeErgaenzen(absaetze: string[], anrede = ANREDE_STANDARD): string[] {
  const sauber = absaetze.map((a) => a.trim()).filter(Boolean);
  if (sauber.length === 0) return [anrede];
  if (/^(sehr geehrte|guten tag|liebe|hallo|werte)/i.test(sauber[0])) return sauber;
  return [anrede, ...sauber];
}

// ---------- Summen ----------

export interface SummenZeile {
  text: string;
  wert: number;
  fett?: boolean;
}

function satzText(satz: number): string {
  return prozent(satz);
}

/** Steuerzeilen einer Rechnung; fehlen sie, werden sie aus den Positionen gebildet. */
export function rechnungSteuerzeilen(r: Rechnung): Steuerzeile[] {
  return r.steuersaetze.length ? r.steuersaetze : steuerzeilen(r.positionen);
}

/**
 * Summenblock einer Rechnung nach § 14 Abs. 4 Nr. 7 und 8 UStG: Entgelt und Steuer je
 * Steuersatz, dann der Rechnungsbetrag. Kleinunternehmer weisen keine Steuer aus.
 */
export function rechnungSummen(r: Rechnung, firma: Firma): SummenZeile[] {
  const gesamt = r.art === "gutschrift" ? "Gutschriftbetrag" : "Rechnungsbetrag";
  if (firma.kleinunternehmer) return [{ text: gesamt, wert: r.brutto, fett: true }];
  const zeilen = rechnungSteuerzeilen(r);
  if (zeilen.length <= 1) {
    const satz = zeilen[0]?.satz ?? 0;
    return [
      { text: "Nettobetrag", wert: r.netto },
      { text: `zzgl. ${satzText(satz)} Umsatzsteuer`, wert: r.ust },
      { text: gesamt, wert: r.brutto, fett: true },
    ];
  }
  return [
    ...zeilen.map((z) => ({ text: `Nettobetrag ${satzText(z.satz)}`, wert: z.netto })),
    ...zeilen.filter((z) => z.satz > 0).map((z) => ({ text: `Umsatzsteuer ${satzText(z.satz)}`, wert: z.ust })),
    { text: gesamt, wert: r.brutto, fett: true },
  ];
}

/** Summenblock eines Angebots: Zwischensumme, Nachlass, Netto, Steuer, Gesamt (je Monat bei Turnus monatlich). */
export function angebotSummen(a: Angebot, firma: Firma): SummenZeile[] {
  const monat = a.turnus === "monatlich" ? " pro Monat" : "";
  const zeilen: SummenZeile[] = [];
  if (a.rabattBetrag > 0) {
    zeilen.push({ text: "Zwischensumme", wert: summe(a.positionen.map((p) => p.gesamtNetto)) });
    zeilen.push({ text: a.rabattProzent > 0 ? `Nachlass ${satzText(a.rabattProzent)}` : "Nachlass", wert: -a.rabattBetrag });
  }
  if (firma.kleinunternehmer) {
    zeilen.push({ text: `Gesamtbetrag${monat}`, wert: a.brutto, fett: true });
    return zeilen;
  }
  zeilen.push({ text: `Nettobetrag${monat}`, wert: a.netto });
  zeilen.push({ text: `zzgl. ${satzText(a.ustSatz)} Umsatzsteuer`, wert: a.ust });
  zeilen.push({ text: `Gesamtbetrag${monat}`, wert: a.brutto, fett: true });
  return zeilen;
}

/** Satz unter dem Summenblock eines monatlichen Angebots. */
export function jahresbetragText(a: Angebot, firma: Firma): string {
  if (a.turnus !== "monatlich") return "";
  const nettoJahr = ausCent(inCent(a.netto) * 12);
  const bruttoJahr = ausCent(inCent(a.brutto) * 12);
  if (firma.kleinunternehmer) return `Das entspricht einem Jahresbetrag von ${eur(nettoJahr)}.`;
  return `Das entspricht einem Jahresbetrag von ${eur(nettoJahr)} netto (${eur(bruttoJahr)} brutto).`;
}

/** Summenblock einer Mahnung: offene Posten, Gebühr und Zinsen nur, wenn sie anfallen. */
export function mahnungSummen(m: Mahnung): SummenZeile[] {
  const zeilen: SummenZeile[] = [{ text: "Offene Posten", wert: m.betragOffen }];
  if (m.mahngebuehr > 0) zeilen.push({ text: "Mahngebühr", wert: m.mahngebuehr });
  if (m.verzugszinsen > 0) zeilen.push({ text: "Verzugszinsen (§ 288 BGB)", wert: m.verzugszinsen });
  zeilen.push({ text: "Zu zahlen", wert: m.gesamt, fett: true });
  return zeilen;
}

// ---------- Rechnung ----------

export function rechnungTitel(r: Rechnung): string {
  return r.art === "gutschrift" ? "Rechnungskorrektur" : "Rechnung";
}

/** § 14 Abs. 4 Nr. 6 UStG: der Leistungszeitpunkt muss auf der Rechnung stehen. */
export function leistungszeitraumText(r: Rechnung): string {
  if (r.leistungVon && r.leistungBis && r.leistungVon !== r.leistungBis) {
    return `Leistungszeitraum: ${datum(r.leistungVon)} bis ${datum(r.leistungBis)}`;
  }
  const tag = r.leistungVon ?? r.leistungBis;
  if (tag) return `Leistungsdatum: ${datum(tag)}`;
  return "Das Leistungsdatum entspricht dem Rechnungsdatum.";
}

export function einleitungAbsaetze(r: Rechnung): string[] {
  if (r.einleitung.trim()) return anredeErgaenzen([r.einleitung]);
  const standard = r.art === "gutschrift" ? "zu unserer Rechnung erteilen wir Ihnen folgende Korrektur:" : "für unsere Leistungen berechnen wir Ihnen wie vereinbart:";
  return [ANREDE_STANDARD, standard];
}

export function zahlungsbedingungText(r: Rechnung, firma: Firma): string {
  if (r.zahlungsbedingung.trim()) return r.zahlungsbedingung.trim();
  if (r.art === "gutschrift") return `Der Betrag von ${eur(Math.abs(r.brutto))} wird Ihnen in den nächsten Tagen überwiesen.`;
  const konto = firma.iban ? "auf das unten genannte Konto" : "auf unser Konto";
  return `Bitte überweisen Sie den Rechnungsbetrag von ${eur(r.brutto)} bis zum ${datum(r.faelligAm)} ohne Abzug ${konto}. Geben Sie dabei die Rechnungsnummer ${r.nummer} als Verwendungszweck an.`;
}

export const HINWEIS_KLEINUNTERNEHMER = "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Steuerbefreiung für Kleinunternehmer).";
export const HINWEIS_VERZUG = "Hinweis nach § 286 Abs. 3 BGB: Sie kommen spätestens in Verzug, wenn Sie nicht innerhalb von 30 Tagen nach Fälligkeit und Zugang dieser Rechnung zahlen.";
export const HINWEIS_AUFBEWAHRUNG = "Hinweis nach § 14 Abs. 4 Nr. 9 UStG: Sind Sie kein Unternehmer oder haben Sie die Leistung für Ihren nichtunternehmerischen Bereich bezogen, sind Sie verpflichtet, diese Rechnung zwei Jahre aufzubewahren.";

function schonEnthalten(hinweise: string[], muster: RegExp): boolean {
  return hinweise.some((h) => muster.test(h));
}

/**
 * Hinweise unter der Rechnung: die vom Fachmodul mitgegebenen plus die gesetzlichen, die
 * aus den Firmendaten folgen (Kleinunternehmer § 19 UStG, Verzug § 286 BGB, Aufbewahrung
 * § 14 Abs. 4 Nr. 9 UStG). Ein Hinweis, den das Fachmodul schon formuliert hat, wird nicht verdoppelt.
 */
export function rechnungsHinweise(r: Rechnung, firma: Firma): string[] {
  const eigene = r.hinweise.map((h) => h.trim()).filter(Boolean);
  const hinweise: string[] = [];
  if (firma.kleinunternehmer && !schonEnthalten(eigene, /§\s?19\s?UStG/i)) hinweise.push(HINWEIS_KLEINUNTERNEHMER);
  hinweise.push(...eigene);
  if (r.art !== "gutschrift" && r.brutto > 0 && !schonEnthalten(eigene, /§\s?286/i)) hinweise.push(HINWEIS_VERZUG);
  if (!schonEnthalten(eigene, /aufzubewahren|Aufbewahrung/i)) hinweise.push(HINWEIS_AUFBEWAHRUNG);
  return hinweise;
}

// ---------- Mahnung ----------

export function mahnTitel(stufe: number): string {
  if (stufe <= 1) return "Zahlungserinnerung";
  if (stufe === 2) return "Mahnung";
  return "Letzte Mahnung";
}

/**
 * Absätze vor der Postentabelle. Hat das Mahnwesen eigene Sätze mitgegeben (mahnung.text),
 * gelten die; sonst der Standard je Stufe. Die Anrede steht immer davor.
 */
export function mahnAbsaetze(m: Mahnung): string[] {
  if (m.text.some((t) => t.trim())) return anredeErgaenzen(m.text);
  const standard: Record<number, string> = {
    1: "sicher ist es Ihrer Aufmerksamkeit entgangen, dass für die folgenden Posten noch keine Zahlung bei uns eingegangen ist.",
    2: "trotz unserer Zahlungserinnerung ist für die folgenden Posten noch keine Zahlung bei uns eingegangen. Sie befinden sich damit in Verzug.",
    3: "trotz Zahlungserinnerung und Mahnung sind die folgenden Posten weiterhin offen. Wir fordern Sie hiermit letztmalig zur Zahlung auf.",
  };
  return [ANREDE_STANDARD, standard[Math.min(Math.max(m.stufe, 1), 3)]];
}

/** Zahlungsaufforderung nach der Tabelle: Betrag, Frist, Konto. */
export function mahnAufforderungText(m: Mahnung, firma: Firma): string {
  const konto = firma.iban ? "auf das folgende Konto" : "auf unser Konto";
  const zweck = m.nummer ? ` Geben Sie bitte „${m.nummer}“ als Verwendungszweck an.` : "";
  return `Bitte überweisen Sie den Gesamtbetrag von ${eur(m.gesamt)} bis zum ${datum(m.frist)} ${konto}.${zweck}`;
}

/** Schlusssätze je Stufe; bei der letzten Mahnung mit Ankündigung der nächsten Schritte. */
export function mahnSchlussAbsaetze(m: Mahnung): string[] {
  if (m.stufe <= 1) return ["Sollten Sie die Zahlung inzwischen veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos."];
  if (m.stufe === 2) {
    return [
      "Für die Zeit des Verzugs berechnen wir Verzugszinsen nach § 288 BGB. Geht die Zahlung nicht fristgerecht ein, erhalten Sie eine letzte Mahnung; weitere Kosten gehen dann zu Ihren Lasten. Haben Sie die Zahlung in den letzten Tagen veranlasst, betrachten Sie dieses Schreiben bitte als gegenstandslos.",
    ];
  }
  const saetze = [
    `Geht der Betrag nicht bis zum ${datum(m.frist)} bei uns ein, werden wir ohne weitere Ankündigung das gerichtliche Mahnverfahren einleiten. Die dadurch entstehenden Kosten gehen zu Ihren Lasten.`,
  ];
  const kuendigung = kuendigungsHinweis(m);
  if (kuendigung) saetze.push(kuendigung);
  return saetze;
}

/**
 * Hinweis auf § 543 Abs. 2 Nr. 3 BGB, nur wenn es um Miete geht und der Rückstand zwei
 * Monatsmieten erreicht (Monatsmiete = höchstes Soll unter den Mietposten). Sonst leer.
 */
export function kuendigungsHinweis(m: Mahnung): string {
  const mietposten = m.posten.filter((p) => /miete/i.test(p.bezeichnung));
  if (mietposten.length < 2) return "";
  const monatsmiete = Math.max(...mietposten.map((p) => p.soll));
  if (monatsmiete <= 0) return "";
  const offen = summe(mietposten.map((p) => p.offen));
  if (inCent(offen) < inCent(monatsmiete) * 2) return "";
  return "Wir weisen darauf hin, dass ein Mietrückstand in Höhe von zwei Monatsmieten den Vermieter nach § 543 Abs. 2 Satz 1 Nr. 3 BGB zur fristlosen Kündigung des Mietverhältnisses berechtigt.";
}
