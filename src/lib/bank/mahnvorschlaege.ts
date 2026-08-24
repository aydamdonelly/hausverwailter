/**
 * Aus offenen Sollstellungen werden Mahnvorschläge (Mahnung mit Status "vorschlag"). Alles
 * deterministisch: Stufe aus den bisherigen Mahnungen der Person, Gebühr aus den Einstellungen,
 * Frist = heute + fristTage, Verzugszinsen nach § 288 Abs. 1 BGB ausgewiesen, Textabsätze aus
 * festen Bausteinen. Nummer und ID vergibt der Aufrufer (naechsteNummer("mahnung")).
 */
import type { Einheit, Einstellungen, Mahnung, Objekt, Person, Sollstellung } from "../domain/schema";
import { rundeGeld, summe } from "../geld";
import { datum as datumFmt, eur, monatName, plusTage } from "../format";
import { faelligkeit, verzugsbeginn, verzugszinsen } from "./verzugszinsen";

export interface MahnKontext {
  personen: Person[];
  objekte: Objekt[];
  einheiten: Einheit[];
  mahnwesen: Einstellungen["mahnwesen"];
  firma: { name: string; iban: string; bankname: string };
  heute: string;
  /** Alle bisherigen Mahnungen (für Stufe und um doppelte Vorschläge zu vermeiden) */
  vorhandene: Mahnung[];
}

export type Mahnvorschlag = Omit<Mahnung, "id" | "nummer">;

const STUFEN_TITEL: Record<number, string> = { 1: "Zahlungserinnerung", 2: "Mahnung", 3: "Letzte Mahnung" };

export function stufenTitel(stufe: number): string {
  return STUFEN_TITEL[stufe] ?? "Mahnung";
}

function anrede(p: Person): string {
  const a = (p.anrede ?? "").trim();
  if (/^frau$/i.test(a)) return `Sehr geehrte Frau ${nachname(p.name)},`;
  if (/^herr$/i.test(a)) return `Sehr geehrter Herr ${nachname(p.name)},`;
  if (/^(herr und frau|eheleute|familie)$/i.test(a)) return `Sehr geehrte ${a} ${nachname(p.name)},`;
  return "Sehr geehrte Damen und Herren,";
}

function nachname(name: string): string {
  const teile = name.trim().split(/\s+/);
  return teile[teile.length - 1] ?? name;
}

/** Zusatzzeile der Anschrift: die Einheit, und das Objekt nur, wenn die Person woanders wohnt. */
function empfaengerZusatz(person: Person, objekt: Objekt | undefined, einheit: Einheit | undefined): string {
  const wohntDort = !person.adresse || !objekt || person.adresse.strasse.trim().toLowerCase() === objekt.adresse.strasse.trim().toLowerCase();
  const teile: string[] = [];
  if (!wohntDort && objekt) teile.push(objekt.kurzname);
  if (einheit) teile.push(einheit.bezeichnung);
  return teile.join(", ");
}

function glaeubigerText(objekt: Objekt | undefined, firma: { name: string }): string {
  if (!objekt) return firma.name;
  if (objekt.art === "WEG") return `${objekt.auftraggeber.name} (vertreten durch ${firma.name})`;
  return `${objekt.auftraggeber.name} (vertreten durch ${firma.name})`;
}

/** Nächste Stufe für eine Person: 1, wenn keine offene Mahnung existiert; sonst eine höher, höchstens 3. */
export function naechsteStufe(personId: string, vorhandene: Mahnung[]): number | null {
  const eigene = vorhandene.filter((m) => m.personId === personId);
  if (eigene.some((m) => m.status === "vorschlag" || m.status === "erstellt")) return null; // erst versenden oder verwerfen
  const versendet = eigene.filter((m) => m.status === "versendet");
  if (!versendet.length) return 1;
  return Math.min(3, Math.max(...versendet.map((m) => m.stufe)) + 1);
}

/**
 * Erzeugt je Person mit überfälligen Sollstellungen einen Mahnvorschlag. Überfällig heißt:
 * Fälligkeit (3. Werktag des Monats) liegt vor heute und der Rest übersteigt die Toleranz.
 */
export function mahnvorschlaege(offene: Sollstellung[], k: MahnKontext): Mahnvorschlag[] {
  const proPerson = new Map<string, Sollstellung[]>();
  for (const s of offene) {
    if (s.differenz <= k.mahnwesen.toleranzEuro) continue;
    const person = k.personen.find((p) => p.id === s.personId);
    if (!person) continue;
    if (faelligkeit(s.monat, person.soll.faelligTag) >= k.heute) continue;
    const liste = proPerson.get(s.personId) ?? [];
    liste.push(s);
    proPerson.set(s.personId, liste);
  }
  const ergebnis: Mahnvorschlag[] = [];
  const basiszins = typeof k.mahnwesen.basiszinsProzent === "number" ? k.mahnwesen.basiszinsProzent : null;
  for (const [personId, posten] of proPerson) {
    const person = k.personen.find((p) => p.id === personId)!;
    const stufe = naechsteStufe(personId, k.vorhandene);
    if (stufe === null) continue;
    const objekt = k.objekte.find((o) => o.id === person.objektId);
    const einheit = person.einheitId ? k.einheiten.find((e) => e.id === person.einheitId) : undefined;
    const artText = person.rolle === "eigentuemer" ? "Hausgeld" : "Miete";
    posten.sort((a, b) => (a.monat < b.monat ? -1 : 1));
    const mahnposten = posten.map((s) => ({
      bezeichnung: `${artText} ${monatName(s.monat)}${einheit ? `, ${einheit.bezeichnung}` : ""} (fällig ${datumFmt(faelligkeit(s.monat, person.soll.faelligTag))})`,
      soll: s.soll,
      ist: s.ist,
      offen: s.differenz,
    }));
    const betragOffen = summe(mahnposten.map((p) => p.offen));
    const mahngebuehr = stufe === 2 ? k.mahnwesen.gebuehrStufe2 : stufe === 3 ? k.mahnwesen.gebuehrStufe3 : 0;
    // Zinsen je Posten ab dem Tag nach der Fälligkeit bis heute, nur ausgewiesen, wenn ein Basiszins bekannt ist
    const zinsposten = basiszins === null ? [] : posten.map((s) => verzugszinsen(s.differenz, verzugsbeginn(s.monat, person.soll.faelligTag), k.heute, basiszins));
    const verzugszinsenSumme = rundeGeld(zinsposten.reduce((acc, z) => acc + z.zinsen, 0));
    const frist = plusTage(k.heute, k.mahnwesen.fristTage);
    const gesamt = summe([betragOffen, mahngebuehr, verzugszinsenSumme]);
    const text = mahntext({ stufe, person, objekt, artText, betragOffen, mahngebuehr, verzugszinsen: verzugszinsenSumme, zinssatz: zinsposten[0]?.satz ?? null, basiszins, frist, heute: k.heute, firma: k.firma, aeltesterMonat: posten[0].monat, faelligTag: person.soll.faelligTag, vorherige: k.vorhandene.filter((m) => m.personId === personId && m.status === "versendet") });
    ergebnis.push({
      stufe,
      datum: k.heute,
      frist,
      objektId: person.objektId,
      personId,
      rechnungId: null,
      empfaenger: {
        name: person.name,
        zusatz: empfaengerZusatz(person, objekt, einheit),
        adresse: person.adresse ?? { strasse: "", plz: "", ort: "", land: "DE" },
        email: person.email,
        kundennummer: "",
        leitwegId: "",
        ustIdNr: "",
      },
      posten: mahnposten,
      betragOffen,
      mahngebuehr,
      verzugszinsen: verzugszinsenSumme,
      gesamt,
      text,
      status: "vorschlag",
      erstelltAm: new Date().toISOString(),
    });
  }
  return ergebnis;
}

function mahntext(a: {
  stufe: number;
  person: Person;
  objekt: Objekt | undefined;
  artText: string;
  betragOffen: number;
  mahngebuehr: number;
  verzugszinsen: number;
  zinssatz: number | null;
  basiszins: number | null;
  frist: string;
  heute: string;
  firma: { name: string; iban: string; bankname: string };
  aeltesterMonat: string;
  faelligTag: number;
  vorherige: Mahnung[];
}): string[] {
  const absaetze: string[] = [anrede(a.person)];
  const objektText = a.objekt ? `für das Objekt ${a.objekt.adresse.strasse}, ${a.objekt.adresse.plz} ${a.objekt.adresse.ort}` : "";
  const glaeubiger = glaeubigerText(a.objekt, a.firma);
  const verzugSeit = datumFmt(verzugsbeginn(a.aeltesterMonat, a.faelligTag));
  const letzte = a.vorherige.length ? a.vorherige.sort((x, y) => (x.datum < y.datum ? 1 : -1))[0] : null;

  if (a.stufe === 1) {
    absaetze.push(`bei der Durchsicht der Zahlungseingänge ${objektText} haben wir festgestellt, dass folgende ${a.artText === "Miete" ? "Mietzahlungen" : "Hausgeldzahlungen"} noch nicht eingegangen sind:`);
    absaetze.push(`Sicher handelt es sich um ein Versehen. Bitte überweisen Sie den offenen Betrag von ${eur(a.betragOffen)} bis zum ${datumFmt(a.frist)} auf das Konto ${a.firma.iban ? `${a.firma.iban}${a.firma.bankname ? ` (${a.firma.bankname})` : ""}` : "der Verwaltung"}, Gläubiger: ${glaeubiger}.`);
    absaetze.push("Sollten Sie den Betrag in den letzten Tagen bereits überwiesen haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.");
  } else {
    absaetze.push(`trotz unserer ${letzte ? `${stufenTitel(letzte.stufe)} vom ${datumFmt(letzte.datum)}` : "Zahlungserinnerung"} sind folgende ${a.artText === "Miete" ? "Mietzahlungen" : "Hausgeldzahlungen"} ${objektText} weiterhin nicht eingegangen:`);
    absaetze.push(`${a.artText === "Miete" ? "Die Miete ist bis zum dritten Werktag eines Monats fällig (§ 556b Abs. 1 BGB)" : "Das Hausgeld ist zum Monatsbeginn fällig"}; Sie befinden sich damit seit dem ${verzugSeit} in Verzug, ohne dass es einer Mahnung bedurfte (§ 286 Abs. 2 Nr. 1 BGB).`);
    const zinsSatz = a.zinssatz !== null && a.basiszins !== null ? ` Verzugszinsen nach § 288 Abs. 1 BGB in Höhe von fünf Prozentpunkten über dem Basiszinssatz (${a.basiszins.toFixed(2).replace(".", ",")} %), also ${a.zinssatz.toFixed(2).replace(".", ",")} % jährlich, taggenau bis heute: ${eur(a.verzugszinsen)}.` : "";
    const gebuehr = a.mahngebuehr > 0 ? ` Mahnkosten dieser Mahnung: ${eur(a.mahngebuehr)}.` : "";
    absaetze.push(`Offener Betrag: ${eur(a.betragOffen)}.${zinsSatz}${gebuehr} Insgesamt zu zahlen: ${eur(summe([a.betragOffen, a.mahngebuehr, a.verzugszinsen]))}.`);
    if (a.stufe === 2) {
      absaetze.push(`Bitte überweisen Sie den Gesamtbetrag bis spätestens ${datumFmt(a.frist)} auf das Konto ${a.firma.iban || "der Verwaltung"}, Gläubiger: ${glaeubiger}.`);
    } else {
      absaetze.push(`Wir fordern Sie letztmalig auf, den Gesamtbetrag bis spätestens ${datumFmt(a.frist)} auf das Konto ${a.firma.iban || "der Verwaltung"} zu überweisen, Gläubiger: ${glaeubiger}.`);
      absaetze.push(`Geht der Betrag bis dahin nicht ein, werden wir ohne weitere Ankündigung das gerichtliche Mahnverfahren einleiten. Die dadurch entstehenden Kosten gehen zu Ihren Lasten.${a.artText === "Miete" ? " Wir weisen darauf hin, dass ein Rückstand von zwei Monatsmieten eine fristlose Kündigung rechtfertigen kann (§ 543 Abs. 2 Nr. 3 BGB)." : ""}`);
    }
    absaetze.push("Sollten Sie zwischenzeitlich gezahlt haben, bitten wir um einen kurzen Hinweis mit dem Zahlungsdatum.");
  }
  absaetze.push("Mit freundlichen Grüßen");
  absaetze.push(a.firma.name);
  return absaetze;
}
