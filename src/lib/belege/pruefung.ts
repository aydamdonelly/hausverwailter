/**
 * Die Prüfregeln. Reiner, deterministischer Code ohne KI und ohne Datenbankzugriff, damit er
 * im Browser und auf dem Server gleich läuft und einzeln getestet werden kann.
 *
 * Ergebnis ist eine Liste von Befunden mit drei Stufen:
 *   fehler   → der Beleg darf so nicht gebucht werden (Mensch muss entscheiden)
 *   warnung  → wahrscheinlich ein Problem, bitte anschauen
 *   hinweis  → gut zu wissen, keine Handlung nötig
 */
import type { Befund, Beleg, DokumentStatus, Kostenart, Objekt } from "../domain/schema";
import { gleich, inCent, summe, ustAusNetto } from "../geld";
import { ibanGueltig, ustIdNrPlausibel } from "../iban";
import { plusTage } from "../format";

export const KLEINBETRAGSGRENZE = 250; // § 33 UStDV, brutto

export interface PruefKontext {
  heute: string; // YYYY-MM-DD
  freigabegrenze: number;
  kostenarten: Pick<Kostenart, "code" | "umlagefaehig" | "bezeichnung">[];
  objekte: Pick<Objekt, "id" | "art" | "verwaltungSeit" | "kurzname">[];
  /** Alle bereits erfassten Belege außer dem geprüften selbst. */
  vorhandeneBelege: Pick<Beleg, "id" | "lieferant" | "rechnungsnummer" | "bruttoGesamt" | "rechnungsdatum">[];
}

export function normalisiereName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(gmbh|ag|kg|ohg|gbr|ug|e\.?k\.?|mbh|co|&|und|inh\.?|haftungsbeschränkt)\b/g, "")
    .replace(/[^a-z0-9äöüß]/g, "");
}

export function normalisiereNummer(nr: string): string {
  return nr.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SCHADEN = /sturm|wasserschaden|rohrbruch|brand|einbruch|vandalismus|hagel|blitz|leckage|notdienst|schaden/i;
const REPARATUR = /reparatur|instandsetz|austausch|erneuer|ersatz|defekt|störung|stoerung/i;

export function pruefeBeleg(b: Beleg, k: PruefKontext): Befund[] {
  const f: Befund[] = [];
  const kleinbetrag = b.bruttoGesamt <= KLEINBETRAGSGRENZE;
  const fehlt = (feld: string, text: string, stufe: Befund["stufe"] = "fehler") => f.push({ stufe, code: "PFLICHTANGABE", text, feld });

  // § 14 Abs. 4 UStG Pflichtangaben (bei Kleinbeträgen gilt § 33 UStDV: weniger Pflichten)
  if (!b.lieferant.name.trim()) fehlt("lieferant.name", "Name des Rechnungsstellers fehlt.");
  if (!b.lieferant.adresse.trim()) fehlt("lieferant.adresse", "Anschrift des Rechnungsstellers fehlt.");
  if (!b.lieferant.steuernummer.trim() && !b.lieferant.ustIdNr.trim() && !kleinbetrag) {
    fehlt("lieferant.steuernummer", "Weder Steuernummer noch USt-IdNr. des Rechnungsstellers angegeben (§ 14 Abs. 4 Nr. 2 UStG).");
  }
  if (!b.rechnungsnummer.trim() && !kleinbetrag) fehlt("rechnungsnummer", "Rechnungsnummer fehlt (§ 14 Abs. 4 Nr. 4 UStG).");
  if (!b.rechnungsdatum) fehlt("rechnungsdatum", "Rechnungsdatum fehlt.");
  if (!b.leistungVon && !b.leistungBis && !kleinbetrag) {
    fehlt("leistungVon", "Leistungszeitpunkt oder -zeitraum fehlt (§ 14 Abs. 4 Nr. 6 UStG).", "warnung");
  }
  if (b.positionen.length === 0) fehlt("positionen", "Keine Leistungsbeschreibung erkannt (§ 14 Abs. 4 Nr. 5 UStG).", "warnung");
  if (b.lieferant.ustIdNr.trim() && !ustIdNrPlausibel(b.lieferant.ustIdNr)) {
    f.push({ stufe: "warnung", code: "USTID_FORM", text: `USt-IdNr. "${b.lieferant.ustIdNr}" hat nicht die Form DE + 9 Ziffern.`, feld: "lieferant.ustIdNr" });
  }
  if (b.lieferant.iban.trim() && !ibanGueltig(b.lieferant.iban)) {
    f.push({ stufe: "warnung", code: "IBAN_UNGUELTIG", text: `IBAN "${b.lieferant.iban}" besteht die Prüfziffernkontrolle nicht. Vor einer Überweisung nachsehen.`, feld: "lieferant.iban" });
  }

  // Rechnerische Prüfung
  if (b.positionen.length > 0) {
    const posNetto = summe(b.positionen.map((p) => p.netto));
    if (!gleich(posNetto, b.nettoGesamt, 0.02)) {
      f.push({ stufe: "fehler", code: "SUMME_POSITIONEN", text: `Die Positionen ergeben ${fmt(posNetto)} netto, ausgewiesen sind ${fmt(b.nettoGesamt)}.`, feld: "nettoGesamt" });
    }
  }
  if (b.steuersaetze.length > 0) {
    for (const z of b.steuersaetze) {
      const erwartet = ustAusNetto(z.netto, z.satz);
      if (!gleich(erwartet, z.ust, 0.02)) {
        f.push({ stufe: "fehler", code: "UST_SATZ", text: `${z.satz} % von ${fmt(z.netto)} sind ${fmt(erwartet)}, ausgewiesen sind ${fmt(z.ust)}.`, feld: "steuersaetze" });
      }
    }
    const nettoSumme = summe(b.steuersaetze.map((z) => z.netto));
    if (!gleich(nettoSumme, b.nettoGesamt, 0.02)) {
      f.push({ stufe: "fehler", code: "SUMME_STEUERZEILEN", text: `Die Steuerzeilen ergeben ${fmt(nettoSumme)} netto, ausgewiesen sind ${fmt(b.nettoGesamt)}.`, feld: "nettoGesamt" });
    }
  } else if (!b.kleinunternehmer && !b.versicherungsteuer && !b.reverseCharge && b.ustGesamt > 0) {
    const erwartet19 = ustAusNetto(b.nettoGesamt, 19);
    const erwartet7 = ustAusNetto(b.nettoGesamt, 7);
    if (!gleich(erwartet19, b.ustGesamt, 0.02) && !gleich(erwartet7, b.ustGesamt, 0.02)) {
      f.push({ stufe: "warnung", code: "UST_UNKLAR", text: `Die Umsatzsteuer ${fmt(b.ustGesamt)} entspricht weder 19 % noch 7 % von ${fmt(b.nettoGesamt)}.`, feld: "ustGesamt" });
    }
  }
  if (!gleich(summe([b.nettoGesamt, b.ustGesamt]), b.bruttoGesamt, 0.02)) {
    f.push({ stufe: "fehler", code: "SUMME_BRUTTO", text: `Netto ${fmt(b.nettoGesamt)} plus Steuer ${fmt(b.ustGesamt)} ergibt ${fmt(summe([b.nettoGesamt, b.ustGesamt]))}, ausgewiesen sind ${fmt(b.bruttoGesamt)}.`, feld: "bruttoGesamt" });
  }
  if (b.bruttoGesamt <= 0 && b.art === "rechnung") {
    f.push({ stufe: "fehler", code: "BETRAG_NULL", text: "Der Rechnungsbetrag ist null oder negativ.", feld: "bruttoGesamt" });
  }

  // Steuerliche Sonderfälle
  if (b.kleinunternehmer) {
    f.push({ stufe: "hinweis", code: "KLEINUNTERNEHMER", text: "Kleinunternehmer nach § 19 UStG: keine Umsatzsteuer, kein Vorsteuerabzug.", feld: "" });
    if (b.ustGesamt > 0) f.push({ stufe: "warnung", code: "KLEINUNTERNEHMER_UST", text: "Kleinunternehmer-Hinweis, aber Umsatzsteuer ausgewiesen. Das passt nicht zusammen.", feld: "" });
  } else if (b.ustGesamt === 0 && b.bruttoGesamt > 0 && !b.versicherungsteuer && !b.reverseCharge) {
    const ka = k.kostenarten.find((x) => x.code === b.kostenartCode);
    const steuerfreiUeblich = ["GRUNDSTEUER", "ENTWAESSERUNG", "STRASSENREINIGUNG_MUELL", "VERSICHERUNG", "SCHORNSTEINFEGER"].includes(ka?.code ?? "");
    if (!steuerfreiUeblich) {
      f.push({ stufe: "warnung", code: "KEINE_UST", text: "Keine Umsatzsteuer ausgewiesen und kein Grund erkennbar (Kleinunternehmer, § 13b, Versicherungsteuer, Gebührenbescheid).", feld: "ustGesamt" });
    }
  }
  if (b.versicherungsteuer) {
    f.push({ stufe: "hinweis", code: "VERSICHERUNGSTEUER", text: "Versicherungsteuer statt Umsatzsteuer: kein Vorsteuerabzug, Betrag brutto buchen.", feld: "" });
  }
  if (b.reverseCharge) {
    f.push({ stufe: "warnung", code: "REVERSE_CHARGE", text: "Hinweis auf § 13b UStG (Steuerschuldnerschaft des Leistungsempfängers). Mit dem Steuerberater klären, ob der Empfänger die Steuer schuldet.", feld: "" });
  }
  if (b.kostenartCode === "VERSICHERUNG" && b.ustGesamt > 0 && !b.versicherungsteuer) {
    f.push({ stufe: "warnung", code: "VERSICHERUNG_UST", text: "Versicherungsbeiträge tragen Versicherungsteuer, keine Umsatzsteuer. Bitte den Beleg prüfen.", feld: "" });
  }

  // Duplikate
  const nameN = normalisiereName(b.lieferant.name);
  const nrN = normalisiereNummer(b.rechnungsnummer);
  for (const v of k.vorhandeneBelege) {
    if (v.id === b.id) continue;
    const gleicherLieferant = normalisiereName(v.lieferant.name) === nameN && nameN.length > 0;
    if (gleicherLieferant && nrN && normalisiereNummer(v.rechnungsnummer) === nrN) {
      f.push({ stufe: "fehler", code: "DUPLIKAT", text: `Rechnung ${b.rechnungsnummer} von ${b.lieferant.name} ist bereits erfasst. Nicht doppelt bezahlen.`, feld: "rechnungsnummer" });
      break;
    }
    if (gleicherLieferant && gleich(v.bruttoGesamt, b.bruttoGesamt) && v.rechnungsdatum === b.rechnungsdatum) {
      f.push({ stufe: "warnung", code: "DUPLIKAT_VERDACHT", text: `Gleicher Lieferant, gleicher Betrag ${fmt(b.bruttoGesamt)}, gleiches Datum wie ein vorhandener Beleg (${v.rechnungsnummer || "ohne Nummer"}).`, feld: "" });
      break;
    }
  }

  // Zuordnung
  const objekt = k.objekte.find((o) => o.id === b.objektId);
  if (!b.objektId || !objekt) {
    f.push({ stufe: "fehler", code: "OBJEKT_FEHLT", text: b.objektHinweis ? `Kein verwaltetes Objekt zu "${b.objektHinweis}" gefunden. Bitte zuordnen.` : "Kein Objekt zugeordnet. Bitte zuordnen.", feld: "objektId" });
  }
  const kostenart = k.kostenarten.find((x) => x.code === b.kostenartCode);
  if (!kostenart) {
    f.push({ stufe: "fehler", code: "KOSTENART_FEHLT", text: "Keine Kostenart zugeordnet. Bitte wählen.", feld: "kostenartCode" });
  }
  if (kostenart?.umlagefaehig && b.positionen.some((p) => REPARATUR.test(p.beschreibung))) {
    f.push({ stufe: "hinweis", code: "WARTUNG_ODER_REPARATUR", text: `Kostenart "${kostenart.bezeichnung}" ist umlagefähig, die Positionen klingen aber nach Reparatur. Reparaturen sind Instandhaltung und nicht umlagefähig.`, feld: "kostenartCode" });
  }
  if (objekt?.verwaltungSeit && b.leistungBis && b.leistungBis < objekt.verwaltungSeit) {
    f.push({ stufe: "hinweis", code: "VOR_VERWALTUNGSBEGINN", text: `Die Leistung liegt vor dem Verwaltungsbeginn (${objekt.verwaltungSeit}). Gehört das noch zum Vorverwalter?`, feld: "" });
  }

  // Beträge und Freigabe
  if (b.bruttoGesamt >= k.freigabegrenze) {
    f.push({ stufe: "hinweis", code: "FREIGABE", text: `Betrag ${fmt(b.bruttoGesamt)} liegt über der Freigabegrenze von ${fmt(k.freigabegrenze)}. Freigabe durch die Leitung nötig.`, feld: "" });
  }
  if (objekt?.art === "WEG" && b.kostenartCode === "INSTANDHALTUNG" && b.bruttoGesamt >= 1000) {
    f.push({ stufe: "hinweis", code: "WEG_BESCHLUSS", text: "Größere Instandhaltung in einer WEG: Beschluss bzw. Notgeschäftsführung (§ 27 Abs. 1 Nr. 2 WEG) und Deckung aus der Erhaltungsrücklage prüfen.", feld: "" });
  }
  if (b.positionen.some((p) => SCHADEN.test(p.beschreibung)) || SCHADEN.test(b.notizenKi)) {
    f.push({ stufe: "hinweis", code: "VERSICHERUNGSFALL", text: "Die Leistung klingt nach einem Schaden. Prüfen, ob die Gebäudeversicherung zahlt, und den Schaden melden.", feld: "" });
  }
  if (b.skontoText.trim()) {
    f.push({ stufe: "hinweis", code: "SKONTO", text: `Skonto möglich: ${b.skontoText.trim()}.`, feld: "" });
  }

  // Daten
  if (b.rechnungsdatum && b.rechnungsdatum > plusTage(k.heute, 1)) {
    f.push({ stufe: "warnung", code: "DATUM_ZUKUNFT", text: `Rechnungsdatum ${b.rechnungsdatum} liegt in der Zukunft.`, feld: "rechnungsdatum" });
  }
  if (b.rechnungsdatum && b.rechnungsdatum < plusTage(k.heute, -365)) {
    f.push({ stufe: "hinweis", code: "DATUM_ALT", text: `Rechnungsdatum ${b.rechnungsdatum} ist über ein Jahr alt.`, feld: "rechnungsdatum" });
  }
  if (b.faelligAm && b.rechnungsdatum && b.faelligAm < b.rechnungsdatum) {
    f.push({ stufe: "warnung", code: "FAELLIG_VOR_DATUM", text: "Fälligkeit liegt vor dem Rechnungsdatum.", feld: "faelligAm" });
  }
  if (b.faelligAm && b.faelligAm < k.heute && !b.bezahltAm) {
    f.push({ stufe: "warnung", code: "UEBERFAELLIG", text: `Fällig seit ${b.faelligAm}, noch nicht als bezahlt erfasst.`, feld: "faelligAm" });
  }
  if (b.zahlungsart === "bereits_bezahlt") {
    f.push({ stufe: "hinweis", code: "BEREITS_BEZAHLT", text: "Laut Beleg bereits bezahlt (Lastschrift/Karte): nicht überweisen, nur buchen.", feld: "" });
  }
  if (b.zahlungsart === "lastschrift") {
    f.push({ stufe: "hinweis", code: "LASTSCHRIFT", text: "Wird per Lastschrift eingezogen: nicht überweisen.", feld: "" });
  }

  return dedupe(f);
}

/** Ob der Beleg direkt gebucht werden kann oder ein Mensch entscheiden muss. */
export function statusAusBefunden(befunde: Befund[]): Extract<DokumentStatus, "erkannt" | "freigabe"> {
  if (befunde.some((x) => x.stufe === "fehler" || x.code === "FREIGABE")) return "freigabe";
  return "erkannt";
}

export function schwerste(befunde: Befund[]): Befund["stufe"] | null {
  if (befunde.some((x) => x.stufe === "fehler")) return "fehler";
  if (befunde.some((x) => x.stufe === "warnung")) return "warnung";
  if (befunde.length) return "hinweis";
  return null;
}

function dedupe(f: Befund[]): Befund[] {
  const gesehen = new Set<string>();
  return f.filter((x) => {
    const k = `${x.code}|${x.feld}|${x.text}`;
    if (gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });
}

function fmt(n: number): string {
  return `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`;
}

export { inCent as _inCent };
