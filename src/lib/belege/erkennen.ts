/**
 * Serverseitige Erkennung: Datei rein, Entwurf raus. Die Prüfung (pruefung.ts) läuft danach
 * im Browser, weil dort die vorhandenen Belege für die Duplikatsuche liegen.
 */
import "server-only";
import { strukturiert, type Anhang } from "../ki/client";
import { KiAnfrage, KiBeleg, KiHandwerkerangebot, KiKlassifikation } from "./schema-ki";
import { auftragErkennung, systemErkennung, type ErkennungsKontext } from "./prompts";
import { parseEml } from "../dokumente/eml";
import { Beleg, type Anfrage, type Herkunft } from "../domain/schema";
import { parseDeDatum } from "../format";
import { rundeGeld } from "../geld";

export interface ErkennungsErgebnis {
  typ: KiKlassifikation["typ"];
  zuversicht: KiKlassifikation["zuversicht"];
  zusammenfassung: string;
  belegEntwurf: Omit<Beleg, "id" | "dokumentId"> | null;
  anfrageEntwurf: Omit<Anfrage, "id" | "dokumentId" | "angebotId"> | null;
  handwerkerangebot: KiHandwerkerangebot | null;
  mailText: string;
  modell: string;
  eingabeTokens: number;
  ausgabeTokens: number;
}

const BILDER = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function anhaengeAusDatei(bytes: Uint8Array, mime: string, dateiname: string): { anhaenge: Anhang[]; mailText: string; hinweis: string } {
  const name = dateiname.toLowerCase();
  if (mime === "message/rfc822" || name.endsWith(".eml")) {
    const eml = parseEml(bytes);
    const anhaenge: Anhang[] = [];
    const kopf = `E-Mail von ${eml.von}, Betreff "${eml.betreff}", ${eml.datum}`;
    anhaenge.push({ art: "text", titel: kopf, text: eml.text || "(kein Text)" });
    for (const a of eml.anhaenge.slice(0, 3)) {
      if (a.mime === "application/pdf" || a.dateiname.toLowerCase().endsWith(".pdf")) anhaenge.push({ art: "pdf", base64: base64(a.bytes) });
      else if (BILDER.has(a.mime)) anhaenge.push({ art: "bild", mime: a.mime as "image/jpeg", base64: base64(a.bytes) });
    }
    return { anhaenge, mailText: eml.text, hinweis: eml.anhaenge.length ? `E-Mail mit ${eml.anhaenge.length} Anhang/Anhängen` : "E-Mail ohne Anhang" };
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return { anhaenge: [{ art: "pdf", base64: base64(bytes) }], mailText: "", hinweis: "PDF" };
  }
  if (BILDER.has(mime)) {
    return { anhaenge: [{ art: "bild", mime: mime as "image/jpeg", base64: base64(bytes) }], mailText: "", hinweis: "Foto/Bild" };
  }
  if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    const text = new TextDecoder("utf-8").decode(bytes);
    return { anhaenge: [{ art: "text", titel: `Textdatei ${dateiname}`, text }], mailText: text, hinweis: "Text" };
  }
  throw new Error(`Dateityp "${mime || dateiname}" wird nicht unterstützt. Bitte PDF, JPG/PNG, .eml oder .txt.`);
}

function datumOderNull(s: string | null): string | null {
  if (!s) return null;
  return parseDeDatum(s);
}

export function belegAusKi(k: KiBeleg, kontext: ErkennungsKontext, modell: string): Omit<Beleg, "id" | "dokumentId"> {
  const objektOk = k.objektId && kontext.objekte.some((o) => o.id === k.objektId) ? k.objektId : null;
  const kostenartOk = k.kostenartCode && kontext.kostenarten.some((x) => x.code === k.kostenartCode) ? k.kostenartCode : null;
  // Eingaben der KI sind Strings ("" = unbekannt); hier wird daraus das Speicher-Schema.
  const positionen = k.positionen.map((p) => ({
    beschreibung: p.beschreibung,
    menge: p.menge,
    einheit: p.einheit,
    einzelpreisNetto: p.einzelpreisNetto,
    netto: rundeGeld(p.netto),
    ustSatz: p.ustSatz,
  }));
  const steuersaetze = k.steuersaetze.map((z) => ({ satz: z.satz, netto: rundeGeld(z.netto), ust: rundeGeld(z.ust) }));
  const nettoGesamt = k.nettoGesamt ?? (steuersaetze.length ? rundeGeld(steuersaetze.reduce((a, z) => a + z.netto, 0)) : rundeGeld(positionen.reduce((a, p) => a + p.netto, 0)));
  const ustGesamt = k.ustGesamt ?? (steuersaetze.length ? rundeGeld(steuersaetze.reduce((a, z) => a + z.ust, 0)) : rundeGeld(k.bruttoGesamt - nettoGesamt));
  const herkunft: Record<string, Herkunft> = {};
  const felder = ["lieferant", "rechnungsnummer", "rechnungsdatum", "leistungVon", "leistungBis", "faelligAm", "positionen", "steuersaetze", "nettoGesamt", "ustGesamt", "bruttoGesamt", "zahlungsart", "objektId", "kostenartCode"];
  for (const f of felder) herkunft[f] = "ki";
  if (k.nettoGesamt === null) herkunft.nettoGesamt = "regel";
  if (k.ustGesamt === null) herkunft.ustGesamt = "regel";

  return Beleg.omit({ id: true, dokumentId: true }).parse({
    art: k.art,
    lieferant: {
      name: k.lieferantName,
      adresse: k.lieferantAdresse,
      steuernummer: k.lieferantSteuernummer,
      ustIdNr: k.lieferantUstIdNr,
      iban: k.lieferantIban,
      bic: k.lieferantBic,
      email: k.lieferantEmail,
      kundennummerBeimLieferanten: k.kundennummer,
    },
    rechnungsnummer: k.rechnungsnummer,
    rechnungsdatum: datumOderNull(k.rechnungsdatum),
    leistungVon: datumOderNull(k.leistungVon),
    leistungBis: datumOderNull(k.leistungBis),
    faelligAm: datumOderNull(k.faelligAm),
    positionen,
    steuersaetze,
    nettoGesamt: rundeGeld(nettoGesamt),
    ustGesamt: rundeGeld(ustGesamt),
    bruttoGesamt: rundeGeld(k.bruttoGesamt),
    waehrung: k.waehrung || "EUR",
    zahlungsart: k.zahlungsart,
    skontoText: k.skontoText,
    kleinunternehmer: k.kleinunternehmer,
    reverseCharge: k.reverseCharge,
    versicherungsteuer: k.versicherungsteuer,
    objektId: objektOk,
    objektHinweis: k.objektHinweis,
    kostenartCode: kostenartOk,
    kostenartBegruendung: k.kostenartBegruendung,
    befunde: [],
    herkunft,
    erkanntAm: new Date().toISOString(),
    modell,
    notizenKi: [k.schadenOderVersicherungsfall ? "Schaden/Versicherungsfall" : "", ...k.auffaelligkeiten].filter(Boolean).join("; "),
  });
}

export async function erkenneDokument(input: {
  bytes: Uint8Array;
  mime: string;
  dateiname: string;
  kontext: ErkennungsKontext;
  zusatz?: string;
}): Promise<ErkennungsErgebnis> {
  const { anhaenge, mailText, hinweis } = anhaengeAusDatei(input.bytes, input.mime, input.dateiname);
  const system = systemErkennung(input.kontext);
  const zusatz = [hinweis, input.zusatz].filter(Boolean).join("; ");

  // Schritt 1: Dokumenttyp
  const klass = await strukturiert({
    system,
    auftrag: auftragErkennung(input.dateiname, zusatz) + "\nIn diesem Schritt nur: Dokumenttyp, Zuversicht und eine Zusammenfassung in einem Satz.",
    anhaenge,
    schema: KiKlassifikation,
    maxTokens: 600,
    anhaengeCachen: true,
    aufwand: "low",
  });
  const k = klass.daten;
  let eingabeTokens = klass.eingabeTokens;
  let ausgabeTokens = klass.ausgabeTokens;
  let belegEntwurf: ErkennungsErgebnis["belegEntwurf"] = null;
  let anfrageEntwurf: ErkennungsErgebnis["anfrageEntwurf"] = null;
  let handwerkerangebot: KiHandwerkerangebot | null = null;

  // Schritt 2: typspezifische Extraktion
  if (k.typ === "eingangsrechnung" || k.typ === "gutschrift" || k.typ === "mahnung") {
    const e = await strukturiert({
      system,
      auftrag: auftragErkennung(input.dateiname, zusatz) + `\nDas Dokument ist: ${k.typ}. Erfasse jetzt alle Rechnungsdaten.`,
      anhaenge,
      schema: KiBeleg,
      maxTokens: 8000,
      anhaengeCachen: true,
      aufwand: "medium",
    });
    eingabeTokens += e.eingabeTokens;
    ausgabeTokens += e.ausgabeTokens;
    belegEntwurf = belegAusKi(e.daten, input.kontext, e.modell);
  } else if (k.typ === "anfrage") {
    const e = await strukturiert({
      system,
      auftrag: auftragErkennung(input.dateiname, zusatz) + "\nDas Dokument ist eine Anfrage. Erfasse jetzt alle Angaben zum Objekt, zum Kontakt und was fehlt.",
      anhaenge,
      schema: KiAnfrage,
      maxTokens: 4000,
      anhaengeCachen: true,
    });
    eingabeTokens += e.eingabeTokens;
    ausgabeTokens += e.ausgabeTokens;
    const a = e.daten;
    anfrageEntwurf = {
      eingangAm: new Date().toISOString(),
      text: mailText || "(Text im Dokument)",
      istAnfrage: a.istAnfrage,
      verwaltungsart: a.verwaltungsart,
      strasse: a.strasse,
      plz: a.plz,
      ort: a.ort,
      einheitenWohnen: a.einheitenWohnen,
      einheitenGewerbe: a.einheitenGewerbe,
      stellplaetze: a.stellplaetze,
      baujahr: a.baujahr,
      besonderheiten: a.besonderheiten,
      leistungswuensche: a.leistungswuensche,
      gewuenschterBeginn: datumOderNull(a.gewuenschterBeginn),
      kontakt: { name: a.kontaktName, rolle: a.kontaktRolle, firma: a.kontaktFirma, email: a.kontaktEmail, telefon: a.kontaktTelefon },
      offeneFragen: a.offeneFragen,
      zusammenfassung: a.zusammenfassung,
    };
  } else if (k.typ === "handwerkerangebot") {
    const e = await strukturiert({
      system,
      auftrag: auftragErkennung(input.dateiname, zusatz) + "\nDas Dokument ist ein Angebot/Kostenvoranschlag eines Handwerkers oder Dienstleisters. Erfasse alle Positionen und Bedingungen.",
      anhaenge,
      schema: KiHandwerkerangebot,
      maxTokens: 6000,
      anhaengeCachen: true,
    });
    eingabeTokens += e.eingabeTokens;
    ausgabeTokens += e.ausgabeTokens;
    handwerkerangebot = e.daten;
  }

  return {
    typ: k.typ,
    zuversicht: k.zuversicht,
    zusammenfassung: k.zusammenfassung,
    belegEntwurf,
    anfrageEntwurf,
    handwerkerangebot,
    mailText,
    modell: klass.modell,
    eingabeTokens,
    ausgabeTokens,
  };
}
