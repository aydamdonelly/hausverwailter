/**
 * Die fachlichen Aktionen des Angebotsmoduls gegen die lokale Datenbank: Angebot aus Anfrage
 * anlegen (mit Nummer aus dem Nummernkreis), speichern, Status setzen, Anschreiben holen,
 * Anfrage aus eingefügtem Text lesen, Objekt aus einem angenommenen Angebot anlegen.
 * Jede Aktion schreibt ins Protokoll.
 */
import { db, neueId } from "@/lib/store/db";
import { protokolliere } from "@/lib/store/protokoll";
import { naechsteNummer } from "@/lib/store/nummern";
import { ladeEinstellungen } from "@/lib/store/arbeitsbereich";
import { dokumentAblegen, dokumentLesen } from "@/lib/store/dokumente";
import { grundausstattungAnlegen } from "@/lib/beispiel/laden";
import { api } from "@/lib/api";
import { Angebot, Objekt, type Anfrage, type Dokument } from "@/lib/domain/schema";
import { angebotAusAnfrage, normalisiere } from "@/lib/angebote/erstellen";
import type { AnschreibenAntwort } from "@/lib/angebote/anschreiben";
import { jetztIso } from "@/lib/format";

/** Das heutige Datum in der Zeitzone des Nutzers (heuteIso aus lib/format rechnet in UTC und springt abends einen Tag vor). */
function heuteLokal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const STATUS_TEXT: Record<Angebot["status"], string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
};

/** Angebot aus einer Anfrage anlegen. Nummer aus dem Nummernkreis, Anfrage wird verknüpft. */
export async function angebotErstellen(anfrage: Anfrage): Promise<Angebot> {
  if ((await db.leistungen.count()) === 0) await grundausstattungAnlegen();
  const einstellungen = await ladeEinstellungen();
  const leistungen = await db.leistungen.toArray();
  const datum = heuteLokal();
  const entwurf = angebotAusAnfrage(anfrage, { leistungen, einstellungen, datum, jetzt: jetztIso() });
  const nummer = await naechsteNummer("angebot", datum);
  const angebot = Angebot.parse({ ...entwurf, id: neueId(), nummer });
  await db.transaction("rw", db.angebote, db.anfragen, async () => {
    await db.angebote.put(angebot);
    await db.anfragen.update(anfrage.id, { angebotId: angebot.id });
  });
  await protokolliere("regel", "Angebot erstellt", `angebot:${angebot.id}`, {
    nummer,
    anfrage: anfrage.id,
    art: angebot.objekt.art,
    positionen: angebot.positionen.length,
    netto: angebot.netto,
    annahmen: angebot.annahmen.length,
  });
  return angebot;
}

export async function angebotSpeichern(angebot: Angebot, felder: string[]): Promise<void> {
  await db.angebote.put(Angebot.parse(angebot));
  if (felder.length) await protokolliere("nutzer", "Angebot geändert", `angebot:${angebot.id}`, { nummer: angebot.nummer, felder: felder.join(", ") });
}

export async function angebotStatusSetzen(angebot: Angebot, status: Angebot["status"]): Promise<void> {
  await db.angebote.update(angebot.id, { status });
  await protokolliere("nutzer", `Angebot: ${STATUS_TEXT[status]}`, `angebot:${angebot.id}`, { nummer: angebot.nummer, vorher: STATUS_TEXT[angebot.status] });
}

export async function angebotLoeschen(angebot: Angebot): Promise<void> {
  await db.transaction("rw", db.angebote, db.anfragen, async () => {
    await db.angebote.delete(angebot.id);
    if (angebot.anfrageId) {
      const anfrage = await db.anfragen.get(angebot.anfrageId);
      if (anfrage && anfrage.angebotId === angebot.id) await db.anfragen.update(anfrage.id, { angebotId: null });
    }
  });
  await protokolliere("nutzer", "Angebot gelöscht", `angebot:${angebot.id}`, { nummer: angebot.nummer });
}

export async function anfrageSpeichern(anfrage: Anfrage, felder: string[]): Promise<void> {
  await db.anfragen.put(anfrage);
  if (felder.length) await protokolliere("nutzer", "Anfrage geändert", `anfrage:${anfrage.id}`, { felder: felder.join(", ") });
}

/** Anschreiben und Antwortmail von der KI formulieren lassen und am Angebot speichern. */
export async function anschreibenFormulieren(angebot: Angebot, anfrage: Anfrage | null): Promise<Angebot> {
  const einstellungen = await ladeEinstellungen();
  const anfrageFuerKi: Anfrage = anfrage ?? {
    id: "",
    dokumentId: null,
    eingangAm: angebot.erstelltAm,
    text: "",
    istAnfrage: true,
    verwaltungsart: angebot.objekt.art,
    strasse: angebot.objekt.strasse,
    plz: angebot.objekt.plz,
    ort: angebot.objekt.ort,
    einheitenWohnen: angebot.objekt.einheitenWohnen,
    einheitenGewerbe: angebot.objekt.einheitenGewerbe,
    stellplaetze: angebot.objekt.stellplaetze,
    baujahr: null,
    besonderheiten: angebot.objekt.besonderheiten,
    leistungswuensche: [],
    gewuenschterBeginn: null,
    kontakt: { name: angebot.ansprechpartner, rolle: "", firma: "", email: angebot.empfaenger.email, telefon: "" },
    offeneFragen: [],
    zusammenfassung: angebot.betreff,
    angebotId: angebot.id,
  };
  const antwort = await api<AnschreibenAntwort>("/api/angebot-text", {
    method: "POST",
    body: JSON.stringify({ anfrage: anfrageFuerKi, angebot, firma: einstellungen.firma }),
  });
  const neu: Angebot = { ...angebot, anschreiben: antwort.anschreiben, antwortEmail: { betreff: antwort.antwortBetreff, text: antwort.antwortText } };
  await db.angebote.put(neu);
  await protokolliere("ki", "Anschreiben formuliert", `angebot:${angebot.id}`, {
    nummer: angebot.nummer,
    modell: antwort.modell,
    tokens: `${antwort.eingabeTokens} rein / ${antwort.ausgabeTokens} raus`,
    absaetze: antwort.anschreiben.length,
  });
  return neu;
}

/** Eingefügter Text (Mail, WhatsApp, Kontaktformular) wird als Textdatei abgelegt und von der KI gelesen. */
export async function anfrageAusText(text: string): Promise<{ dokument: Dokument; doppelt: boolean }> {
  const stempel = jetztIso().slice(0, 19).replace(/[:T]/g, "-");
  const datei = new File([text], `anfrage-${stempel}.txt`, { type: "text/plain" });
  const { dokument, doppelt } = await dokumentAblegen(datei);
  if (doppelt) return { dokument, doppelt };
  return { dokument: await dokumentLesen(dokument.id), doppelt: false };
}

/** Dateien (Mail als .eml, PDF, Text) ablegen und lesen; gibt die gelesenen Dokumente zurück. */
export async function anfrageAusDateien(dateien: File[]): Promise<{ dokumente: Dokument[]; doppelt: number }> {
  const dokumente: Dokument[] = [];
  let doppelt = 0;
  for (const d of dateien) {
    const { dokument, doppelt: istDoppelt } = await dokumentAblegen(d);
    if (istDoppelt) {
      doppelt++;
      dokumente.push(dokument);
      continue;
    }
    dokumente.push(await dokumentLesen(dokument.id));
  }
  return { dokumente, doppelt };
}

/** Gibt es schon ein Objekt an der Adresse des Angebots? */
export async function objektZumAngebot(angebot: Pick<Angebot, "objekt">): Promise<Objekt | undefined> {
  const strasse = normalisiere(angebot.objekt.strasse);
  if (!strasse) return undefined;
  return db.objekte.filter((o) => normalisiere(o.adresse.strasse) === strasse && (!angebot.objekt.plz || !o.adresse.plz || o.adresse.plz === angebot.objekt.plz)).first();
}

/** Aus einem angenommenen Angebot wird ein verwaltetes Objekt mit Auftraggeber und Monatshonorar. */
export async function objektAusAngebot(angebot: Angebot, anfrage: Anfrage | null): Promise<Objekt> {
  const vorhanden = await objektZumAngebot(angebot);
  if (vorhanden) throw new Error(`An dieser Adresse gibt es schon das Objekt „${vorhanden.kurzname}“.`);
  const art = angebot.objekt.art === "UNKLAR" ? "SONSTIG" : angebot.objekt.art;
  const kurzname = `${art === "WEG" ? "WEG " : ""}${angebot.objekt.strasse || angebot.empfaenger.name}`.trim();
  const objekt = Objekt.parse({
    id: neueId(),
    kurzname,
    adresse: { strasse: angebot.objekt.strasse, plz: angebot.objekt.plz, ort: angebot.objekt.ort, land: "DE" },
    art,
    einheitenWohnen: angebot.objekt.einheitenWohnen,
    einheitenGewerbe: angebot.objekt.einheitenGewerbe,
    stellplaetze: angebot.objekt.stellplaetze,
    baujahr: anfrage?.baujahr ?? null,
    auftraggeber: {
      name: angebot.empfaenger.name,
      zusatz: angebot.empfaenger.zusatz,
      adresse: angebot.empfaenger.adresse,
      email: angebot.empfaenger.email,
      kundennummer: angebot.empfaenger.kundennummer,
      leitwegId: angebot.empfaenger.leitwegId,
    },
    honorarNettoMonat: angebot.turnus === "monatlich" ? angebot.netto : null,
    verwaltungSeit: anfrage?.gewuenschterBeginn ?? null,
    bankIban: "",
    aktiv: true,
    notizen: [`Angelegt aus Angebot ${angebot.nummer}.`, ...angebot.objekt.besonderheiten].join(" "),
  });
  await db.objekte.put(objekt);
  await protokolliere("nutzer", "Objekt aus Angebot angelegt", `objekt:${objekt.id}`, { angebot: angebot.nummer, kurzname, honorarNettoMonat: objekt.honorarNettoMonat });
  return objekt;
}
