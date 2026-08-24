/**
 * Anschreiben und Antwortmail zu einem Angebot: Schema, Anweisungen an die KI und die Prüfung
 * der Antwort. Reiner Code (kein KI-Aufruf, keine Datenbank), damit die Prompts testbar sind.
 * Der eigentliche Aufruf steht in app/api/angebot-text/route.ts.
 */
import { z } from "zod";
import { Anfrage, Angebot, Firma } from "../domain/schema";
import { betrag, datum, eur } from "../format";
import { ART_TEXT } from "./leistungsumfang";

/** Was die KI liefert. Klein und flach: die API kompiliert eine Grammatik daraus. */
export const AnschreibenSchema = z.object({
  anschreiben: z.array(z.string()).describe("Erster Eintrag ist die Anrede allein, danach drei bis vier Absätze Fließtext"),
  antwortBetreff: z.string().describe("Betreffzeile der Antwortmail"),
  antwortText: z.string().describe("Kurze Antwortmail mit Anrede und Grußformel, verweist auf das angehängte PDF"),
});
export type AnschreibenText = z.infer<typeof AnschreibenSchema>;

/** Was der Browser an die Route schickt. */
export const AnschreibenEingabe = z.object({ anfrage: Anfrage, angebot: Angebot, firma: Firma });
export type AnschreibenEingabe = z.infer<typeof AnschreibenEingabe>;

export interface AnschreibenAntwort extends AnschreibenText {
  modell: string;
  eingabeTokens: number;
  ausgabeTokens: number;
}

const MAX_ANFRAGETEXT = 6000;

export function systemAnschreiben(firma: Firma): string {
  const rolle =
    firma.branche === "dienstleister"
      ? `Du schreibst für ${firma.name}, einen deutschen Gebäudedienstleister (Hausmeister, Reinigung, Winterdienst, Gartenpflege), der für Hausverwaltungen und Eigentümer arbeitet.`
      : `Du schreibst für ${firma.name}, eine deutsche Hausverwaltung, die WEG-, Miet- und Gewerbeverwaltung anbietet.`;
  return `${rolle}
Du formulierst das Anschreiben zu einem fertig kalkulierten Angebot und eine kurze Antwortmail. Die Zahlen sind gerechnet und stehen fest; du übernimmst sie wörtlich und rechnest nichts.

Ton und Form:
1. Sachlicher deutscher Geschäftsbrief in der Sie-Form. Kurze Sätze. Keine Superlative, kein Marketing, keine Floskeln. Die Wörter "gern", "gerne", "selbstverständlich", "natürlich", "hervorragend", "bestens", "maßgeschneidert", "individuell", "professionell", "kompetent" und "Full-Service" kommen nicht vor.
2. Das Anschreiben geht konkret auf die Anfrage ein: auf die genannten Besonderheiten (anstehende Sanierung, Verwalterwechsel, Zeitdruck, Aufzug, Konflikte, bisheriger Verwalter) und auf ausdrückliche Wünsche. Nichts erfinden, was nicht in der Anfrage oder im Angebot steht.
3. Aufbau des Anschreibens (Feld "anschreiben", ein Eintrag je Absatz):
   - Eintrag 1: nur die Anrede, z. B. "Sehr geehrter Herr Klein," oder "Sehr geehrte Frau Vogel,". Ist aus dem Namen nicht sicher erkennbar, ob Herr oder Frau: "Guten Tag Vorname Nachname,". Ohne Namen: "Sehr geehrte Damen und Herren,".
   - Eintrag 2: Bezug auf die Anfrage (worum es geht, was der Anfragende geschildert hat) und Dank für die Anfrage in einem Satz, ohne "gerne".
   - Eintrag 3: das Angebot in Zahlen: der Monatsbetrag netto und brutto (bzw. ohne Umsatzsteuer bei Kleinunternehmern), wie er sich zusammensetzt, und was das Grundhonorar enthält (zwei, drei Kernpunkte aus dem Leistungsumfang, keine vollständige Liste; die steht im Angebot).
   - Eintrag 4: die Annahmen offen benennen ("Wir sind davon ausgegangen, dass ..."), mit der Bitte um Korrektur, falls es anders ist. Einträge, die mit "Noch zu klären" beginnen, sind keine Annahmen, sondern offene Punkte: als kurze Frage an den Empfänger formulieren ("Bitte teilen Sie uns noch mit, ..."); die Wörter "Noch zu klären" selbst kommen im Text nicht vor. Gibt es weder Annahmen noch offene Punkte, stattdessen Laufzeit und Beginn nennen.
   - Eintrag 5 (optional): nächster Schritt, etwa Vorstellung in der Eigentümerversammlung, Objektbegehung, Übernahmegespräch mit dem bisherigen Verwalter, Bindefrist des Angebots. Ein bis zwei Sätze.
   Keine Grußformel, kein Name am Ende: die kommen aus dem Briefkopf.
4. Antwortmail (Felder "antwortBetreff" und "antwortText"): Betreff mit Angebotsnummer und Objekt. Text mit derselben Anrede, zwei bis vier Sätzen (Bezug auf die Anfrage, Hinweis auf das angehängte PDF mit Angebotsnummer, Monatsbetrag netto, Bindefrist, Angebot eines Gesprächstermins), Grußformel "Mit freundlichen Grüßen" und darunter der Firmenname. Anrede, Text und Grußformel durch Leerzeilen trennen. Kein Marketing.
5. Beträge exakt so schreiben, wie sie geliefert werden (deutsches Format, z. B. 769,50 €). Daten als TT.MM.JJJJ.
6. Keine Gedankenstriche; Komma, Punkt oder Doppelpunkt verwenden.
7. Nur Deutsch.`;
}

function zeile(label: string, wert: string | number | null | undefined): string {
  if (wert === null || wert === undefined || wert === "") return "";
  return `${label}: ${wert}`;
}

export function auftragAnschreiben(anfrage: Anfrage, angebot: Angebot, firma: Firma): string {
  const kleinunternehmer = angebot.ustSatz === 0;
  const kontakt = [anfrage.kontakt.name, anfrage.kontakt.rolle, anfrage.kontakt.firma].filter(Boolean).join(", ");
  const objekt = [angebot.objekt.strasse, [angebot.objekt.plz, angebot.objekt.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const turnus = angebot.turnus === "monatlich" ? "im Monat" : "einmalig";
  const positionen = angebot.positionen.map((p) => `- ${p.bezeichnung}: ${betrag(p.menge).replace(",00", "")} ${p.einheit} × ${eur(p.einzelpreisNetto)} = ${eur(p.gesamtNetto)}`);
  const summen = [
    angebot.rabattBetrag > 0 ? `Rabatt ${betrag(angebot.rabattProzent).replace(",00", "")} %: −${eur(angebot.rabattBetrag)}` : "",
    `Netto ${turnus}: ${eur(angebot.netto)}`,
    kleinunternehmer ? "Keine Umsatzsteuer (Kleinunternehmer nach § 19 UStG)" : `Umsatzsteuer ${angebot.ustSatz} %: ${eur(angebot.ust)}`,
    kleinunternehmer ? "" : `Brutto ${turnus}: ${eur(angebot.brutto)}`,
  ].filter(Boolean);
  const text = anfrage.text.length > MAX_ANFRAGETEXT ? `${anfrage.text.slice(0, MAX_ANFRAGETEXT)} …` : anfrage.text;

  return [
    "Formuliere Anschreiben und Antwortmail zu diesem Angebot.",
    "",
    "ANFRAGE",
    zeile("Eingegangen am", datum(anfrage.eingangAm)),
    zeile("Zusammenfassung", anfrage.zusammenfassung),
    zeile("Kontakt", kontakt),
    zeile("Besonderheiten", anfrage.besonderheiten.join("; ")),
    zeile("Ausdrückliche Wünsche", anfrage.leistungswuensche.join("; ")),
    zeile("Gewünschter Beginn", anfrage.gewuenschterBeginn ? datum(anfrage.gewuenschterBeginn) : ""),
    "Wortlaut der Anfrage:",
    text || "(kein Text)",
    "",
    "ANGEBOT",
    zeile("Nummer", angebot.nummer),
    zeile("Datum", datum(angebot.datum)),
    zeile("Gültig bis", datum(angebot.gueltigBis)),
    zeile("Betreff", angebot.betreff),
    zeile("Empfänger", [angebot.empfaenger.name, angebot.empfaenger.zusatz].filter(Boolean).join(", ")),
    zeile("Objekt", objekt),
    zeile("Art", firma.branche === "dienstleister" ? "Gebäudedienstleistung" : ART_TEXT[angebot.objekt.art]),
    zeile("Einheiten", `${angebot.objekt.einheitenWohnen} Wohnen, ${angebot.objekt.einheitenGewerbe} Gewerbe, ${angebot.objekt.stellplaetze} Stellplätze`),
    "Positionen:",
    ...positionen,
    ...summen,
    zeile("Laufzeit", angebot.laufzeitText),
    "Leistungsumfang (Auszug):",
    ...angebot.leistungsumfang.slice(0, 6).map((z) => `- ${z}`),
    angebot.sonderleistungen.length ? `Sonderleistungen nach Preisliste: ${angebot.sonderleistungen.length} Positionen (z. B. ${angebot.sonderleistungen[0].bezeichnung})` : "",
    "Annahmen:",
    ...(angebot.annahmen.length ? angebot.annahmen.map((a) => `- ${a}`) : ["- keine"]),
    "",
    "ABSENDER",
    zeile("Firma", firma.name),
    zeile("Unterzeichnet", firma.geschaeftsfuehrung),
  ]
    .filter((z) => z !== "")
    .join("\n");
}

const VERBOTEN = /\b(gerne?|selbstverständlich|maßgeschneidert|Noch zu klären)\b/gi;

/** Entfernt Floskeln, die sich trotz Anweisung einschleichen, ohne den Satz zu zerstören. */
export function floskelnEntfernen(text: string): string {
  return text
    .replace(/[ \t]+gerne?(?=[\s,.;!])/g, "")
    .replace(/[ \t]+selbstverständlich(?=[\s,.;!])/g, "")
    .replace(/ [–—] /g, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type Pruefung = { ok: true; daten: AnschreibenText } | { ok: false; grund: string };

/** Prüft die Antwort der KI: genug Absätze, keine leeren Felder, keine Floskeln. */
export function pruefeAnschreiben(roh: AnschreibenText): Pruefung {
  const absaetze = roh.anschreiben.map((a) => floskelnEntfernen(a)).filter(Boolean);
  if (absaetze.length < 3) return { ok: false, grund: `Das Anschreiben hat nur ${absaetze.length} Absätze, erwartet werden Anrede plus mindestens zwei Absätze.` };
  if (absaetze.length > 7) return { ok: false, grund: `Das Anschreiben hat ${absaetze.length} Absätze, das ist zu lang.` };
  if (!/[,]$/.test(absaetze[0]) || absaetze[0].length > 80) return { ok: false, grund: "Der erste Absatz ist nicht die Anrede." };
  const betreff = roh.antwortBetreff.trim();
  const text = floskelnEntfernen(roh.antwortText);
  if (!betreff) return { ok: false, grund: "Die Antwortmail hat keinen Betreff." };
  if (!text) return { ok: false, grund: "Die Antwortmail hat keinen Text." };
  if (text.length > 3000) return { ok: false, grund: "Die Antwortmail ist zu lang." };
  const rest = [...absaetze, text].join(" ").match(VERBOTEN);
  if (rest) return { ok: false, grund: `Floskel im Text: ${rest[0]}` };
  return { ok: true, daten: { anschreiben: absaetze, antwortBetreff: betreff, antwortText: text } };
}
