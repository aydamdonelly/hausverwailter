/**
 * Schreibzugriffe der Stammdatenpflege auf die lokale Datenbank. Jede Änderung wird geprüft
 * (Zod) und protokolliert (wer, was, welches Feld, alt → neu), so wie die GoBD es für
 * Stammdaten und Steuerungsdaten verlangen (Rz 59, 111). Löschen geht nur, wenn nichts mehr
 * an dem Datensatz hängt; sonst wird deaktiviert.
 */
import { db, neueId } from "@/lib/store/db";
import { exportiereArbeitsbereich, importiereArbeitsbereich, ladeEinstellungen, leereArbeitsbereich, speichereEinstellungen } from "@/lib/store/arbeitsbereich";
import { protokolliere } from "@/lib/store/protokoll";
import { ladeBeispieldaten } from "@/lib/beispiel/laden";
import { STANDARD_KOSTENARTEN, STANDARD_LEISTUNGEN_DIENSTLEISTER, STANDARD_LEISTUNGEN_HAUSVERWALTUNG } from "@/lib/domain/standard";
import { Einheit, Einstellungen, Kostenart, Leistung, Objekt, Person } from "@/lib/domain/schema";
import { exportDateiname, fehlendeNachCode, unterschiede, verwendungText } from "./logik";

// ---------- Einstellungen und Firma ----------

/** Lädt, ändert, prüft, speichert und protokolliert die Einstellungen in einem Schritt. */
export async function einstellungenAendern(aktion: string, aendern: (e: Einstellungen) => void): Promise<Einstellungen> {
  const alt = await ladeEinstellungen();
  const neu = structuredClone(alt);
  aendern(neu);
  const geprueft = Einstellungen.parse(neu);
  await speichereEinstellungen(geprueft);
  const diff = unterschiede(alt, geprueft);
  if (Object.keys(diff).length) await protokolliere("nutzer", aktion, "einstellungen", diff);
  return geprueft;
}

// ---------- Objekte ----------

const OBJEKT_NAMEN: Record<string, [string, string]> = {
  belege: ["Beleg", "Belegen"],
  buchungen: ["Buchung", "Buchungen"],
  personen: ["Person", "Personen"],
  rechnungen: ["Rechnung", "Rechnungen"],
  mahnungen: ["Mahnung", "Mahnungen"],
  bankkonten: ["Bankkonto", "Bankkonten"],
};

export interface ObjektVerwendung {
  zaehlung: Record<string, number>;
  text: string;
  loeschbar: boolean;
}

/** Was hängt an einem Objekt? Bestimmt, ob es gelöscht werden darf. */
export async function objektVerwendung(id: string): Promise<ObjektVerwendung> {
  const zaehlung = {
    belege: await db.belege.where("objektId").equals(id).count(),
    buchungen: await db.buchungen.where("objektId").equals(id).count(),
    personen: await db.personen.where("objektId").equals(id).count(),
    rechnungen: await db.rechnungen.where("objektId").equals(id).count(),
    mahnungen: await db.mahnungen.where("objektId").equals(id).count(),
    bankkonten: await db.bankkonten.where("objektId").equals(id).count(),
  };
  const text = verwendungText(zaehlung, OBJEKT_NAMEN);
  return { zaehlung, text, loeschbar: Object.values(zaehlung).every((n) => n === 0) };
}

export async function objektSpeichern(objekt: Objekt, alt: Objekt | null): Promise<Objekt> {
  const geprueft = Objekt.parse(objekt);
  await db.objekte.put(geprueft);
  if (alt) {
    const diff = unterschiede(alt, geprueft);
    if (Object.keys(diff).length) await protokolliere("nutzer", "Objekt geändert", `objekt:${geprueft.id}`, { kurzname: geprueft.kurzname, ...diff });
  } else {
    await protokolliere("nutzer", "Objekt angelegt", `objekt:${geprueft.id}`, {
      kurzname: geprueft.kurzname,
      art: geprueft.art,
      adresse: `${geprueft.adresse.strasse}, ${geprueft.adresse.plz} ${geprueft.adresse.ort}`.trim(),
      auftraggeber: geprueft.auftraggeber.name,
    });
  }
  return geprueft;
}

export async function objektAktivSetzen(id: string, aktiv: boolean): Promise<void> {
  const o = await db.objekte.get(id);
  if (!o) return;
  await db.objekte.update(id, { aktiv });
  await protokolliere("nutzer", aktiv ? "Objekt aktiviert" : "Objekt deaktiviert", `objekt:${id}`, { kurzname: o.kurzname });
}

/** Löscht ein Objekt samt Einheiten. Wirft, wenn noch Belege, Buchungen, Personen o. ä. daran hängen. */
export async function objektLoeschen(id: string): Promise<void> {
  const o = await db.objekte.get(id);
  if (!o) return;
  const v = await objektVerwendung(id);
  if (!v.loeschbar) throw new Error(`An „${o.kurzname}“ hängen noch ${v.text}. Deaktivieren Sie das Objekt stattdessen.`);
  const einheiten = await db.einheiten.where("objektId").equals(id).count();
  await db.transaction("rw", db.objekte, db.einheiten, async () => {
    await db.einheiten.where("objektId").equals(id).delete();
    await db.objekte.delete(id);
  });
  await protokolliere("nutzer", "Objekt gelöscht", `objekt:${id}`, { kurzname: o.kurzname, einheiten });
}

export function neuesObjekt(): Objekt {
  return Objekt.parse({
    id: neueId(),
    kurzname: "",
    adresse: { strasse: "", plz: "", ort: "", land: "DE" },
    art: "WEG",
    auftraggeber: { name: "" },
  });
}

// ---------- Einheiten ----------

export async function einheitSpeichern(einheit: Einheit, alt: Einheit | null): Promise<Einheit> {
  const geprueft = Einheit.parse(einheit);
  await db.einheiten.put(geprueft);
  if (alt) {
    const diff = unterschiede(alt, geprueft);
    if (Object.keys(diff).length) await protokolliere("nutzer", "Einheit geändert", `einheit:${geprueft.id}`, { bezeichnung: geprueft.bezeichnung, ...diff });
  } else {
    await protokolliere("nutzer", "Einheit angelegt", `einheit:${geprueft.id}`, { bezeichnung: geprueft.bezeichnung, objektId: geprueft.objektId });
  }
  return geprueft;
}

export async function einheitAnlegen(objektId: string): Promise<Einheit> {
  const vorhandene = await db.einheiten.where("objektId").equals(objektId).count();
  const einheit = Einheit.parse({ id: neueId(), objektId, bezeichnung: `Whg ${vorhandene + 1}`, art: "wohnung" });
  return einheitSpeichern(einheit, null);
}

export async function einheitLoeschen(id: string): Promise<void> {
  const e = await db.einheiten.get(id);
  if (!e) return;
  const personen = await db.personen.where("einheitId").equals(id).count();
  if (personen) throw new Error(`„${e.bezeichnung}“ ist ${personen === 1 ? "einer Person" : `${personen} Personen`} zugeordnet. Erst die Zuordnung ändern.`);
  await db.einheiten.delete(id);
  await protokolliere("nutzer", "Einheit gelöscht", `einheit:${id}`, { bezeichnung: e.bezeichnung, objektId: e.objektId });
}

// ---------- Personen ----------

export function neuePerson(objektId: string): Person {
  return Person.parse({ id: neueId(), objektId, rolle: "mieter", name: "", ibans: [] });
}

export async function personSpeichern(person: Person, alt: Person | null): Promise<Person> {
  const geprueft = Person.parse(person);
  await db.personen.put(geprueft);
  if (alt) {
    const diff = unterschiede(alt, geprueft);
    if (Object.keys(diff).length) await protokolliere("nutzer", "Person geändert", `person:${geprueft.id}`, { name: geprueft.name, ...diff });
  } else {
    await protokolliere("nutzer", "Person angelegt", `person:${geprueft.id}`, { name: geprueft.name, rolle: geprueft.rolle, objektId: geprueft.objektId });
  }
  return geprueft;
}

export async function personAktivSetzen(id: string, aktiv: boolean): Promise<void> {
  const p = await db.personen.get(id);
  if (!p) return;
  await db.personen.update(id, { aktiv });
  await protokolliere("nutzer", aktiv ? "Person aktiviert" : "Person deaktiviert", `person:${id}`, { name: p.name });
}

export async function personVerwendung(id: string): Promise<{ text: string; loeschbar: boolean }> {
  const zaehlung = {
    umsaetze: await db.bankumsaetze.where("zuordnung.personId").equals(id).count(),
    mahnungen: await db.mahnungen.where("personId").equals(id).count(),
  };
  const text = verwendungText(zaehlung, { umsaetze: ["zugeordnetem Bankumsatz", "zugeordneten Bankumsätzen"], mahnungen: ["Mahnung", "Mahnungen"] });
  return { text, loeschbar: Object.values(zaehlung).every((n) => n === 0) };
}

export async function personLoeschen(id: string): Promise<void> {
  const p = await db.personen.get(id);
  if (!p) return;
  const v = await personVerwendung(id);
  if (!v.loeschbar) throw new Error(`„${p.name}“ hängt noch an ${v.text}. Deaktivieren Sie die Person stattdessen.`);
  await db.personen.delete(id);
  await protokolliere("nutzer", "Person gelöscht", `person:${id}`, { name: p.name });
}

// ---------- Kostenarten ----------

export async function kostenartSpeichern(kostenart: Kostenart, alt: Kostenart | null): Promise<Kostenart> {
  const geprueft = Kostenart.parse(kostenart);
  await db.kostenarten.put(geprueft);
  if (alt) {
    const diff = unterschiede(alt, geprueft);
    if (Object.keys(diff).length) await protokolliere("nutzer", "Kostenart geändert", `kostenart:${geprueft.code}`, { bezeichnung: geprueft.bezeichnung, ...diff });
  } else {
    await protokolliere("nutzer", "Kostenart angelegt", `kostenart:${geprueft.code}`, { bezeichnung: geprueft.bezeichnung, umlagefaehig: geprueft.umlagefaehig });
  }
  return geprueft;
}

export async function kostenartVerwendung(code: string): Promise<{ text: string; loeschbar: boolean }> {
  const zaehlung = {
    belege: await db.belege.where("kostenartCode").equals(code).count(),
    buchungen: await db.buchungen.filter((b) => b.kostenartCode === code).count(),
    umsaetze: await db.bankumsaetze.filter((u) => u.zuordnung.kostenartCode === code).count(),
  };
  const text = verwendungText(zaehlung, { belege: ["Beleg", "Belegen"], buchungen: ["Buchung", "Buchungen"], umsaetze: ["Bankumsatz", "Bankumsätzen"] });
  return { text, loeschbar: Object.values(zaehlung).every((n) => n === 0) };
}

export async function kostenartLoeschen(code: string): Promise<void> {
  const k = await db.kostenarten.get(code);
  if (!k) return;
  const v = await kostenartVerwendung(code);
  if (!v.loeschbar) throw new Error(`„${k.bezeichnung}“ ist noch ${v.text} zugeordnet. Deaktivieren Sie die Kostenart stattdessen.`);
  await db.kostenarten.delete(code);
  await protokolliere("nutzer", "Kostenart gelöscht", `kostenart:${code}`, { bezeichnung: k.bezeichnung });
}

/** Ergänzt die Standard-Kostenarten nach § 2 BetrKV, ohne vorhandene zu überschreiben. */
export async function standardKostenartenErgaenzen(): Promise<number> {
  const codes = (await db.kostenarten.toArray()).map((k) => k.code);
  const fehlend = fehlendeNachCode(codes, STANDARD_KOSTENARTEN);
  if (!fehlend.length) return 0;
  await db.kostenarten.bulkPut(fehlend);
  await protokolliere("nutzer", "Standard-Kostenarten geladen", "kostenarten", { anzahl: fehlend.length, codes: fehlend.map((k) => k.code).join(", ") });
  return fehlend.length;
}

// ---------- Leistungskatalog ----------

export async function leistungSpeichern(leistung: Leistung, alt: Leistung | null): Promise<Leistung> {
  const geprueft = Leistung.parse(leistung);
  await db.leistungen.put(geprueft);
  if (alt) {
    const diff = unterschiede(alt, geprueft);
    if (Object.keys(diff).length) await protokolliere("nutzer", "Leistung geändert", `leistung:${geprueft.id}`, { code: geprueft.code, ...diff });
  } else {
    await protokolliere("nutzer", "Leistung angelegt", `leistung:${geprueft.id}`, { code: geprueft.code, bezeichnung: geprueft.bezeichnung });
  }
  return geprueft;
}

export async function leistungAnlegen(): Promise<Leistung> {
  const leistung = Leistung.parse({ id: neueId(), code: "", bezeichnung: "", einheit: "pauschal", preisNetto: 0, gilt: "ALLE", kategorie: "sonderleistung" });
  await db.leistungen.put(leistung);
  return leistung;
}

export async function leistungLoeschen(id: string): Promise<void> {
  const l = await db.leistungen.get(id);
  if (!l) return;
  await db.leistungen.delete(id);
  if (l.code || l.bezeichnung) await protokolliere("nutzer", "Leistung gelöscht", `leistung:${id}`, { code: l.code, bezeichnung: l.bezeichnung });
}

/** Ergänzt einen Standardkatalog um die Codes, die noch fehlen. Überschreibt nichts. */
export async function katalogErgaenzen(art: "hausverwaltung" | "dienstleister"): Promise<number> {
  const standard = art === "hausverwaltung" ? STANDARD_LEISTUNGEN_HAUSVERWALTUNG : STANDARD_LEISTUNGEN_DIENSTLEISTER;
  const codes = (await db.leistungen.toArray()).map((l) => l.code);
  const fehlend = fehlendeNachCode(codes, standard);
  if (!fehlend.length) return 0;
  await db.leistungen.bulkPut(fehlend.map((l) => ({ ...l, id: neueId() })));
  await protokolliere("nutzer", `Leistungskatalog ${art === "hausverwaltung" ? "Hausverwaltung" : "Dienstleister"} geladen`, "leistungen", {
    anzahl: fehlend.length,
    codes: fehlend.map((l) => l.code).join(", "),
  });
  return fehlend.length;
}

// ---------- Daten: sichern, umziehen, löschen ----------

export interface Bestand {
  objekte: number;
  einheiten: number;
  personen: number;
  kostenarten: number;
  leistungen: number;
  dokumente: number;
  belege: number;
  buchungen: number;
  bankkonten: number;
  bankumsaetze: number;
  angebote: number;
  rechnungen: number;
  mahnungen: number;
  protokoll: number;
}

export async function bestandZaehlen(): Promise<Bestand> {
  return {
    objekte: await db.objekte.count(),
    einheiten: await db.einheiten.count(),
    personen: await db.personen.count(),
    kostenarten: await db.kostenarten.count(),
    leistungen: await db.leistungen.count(),
    dokumente: await db.dokumente.count(),
    belege: await db.belege.count(),
    buchungen: await db.buchungen.count(),
    bankkonten: await db.bankkonten.count(),
    bankumsaetze: await db.bankumsaetze.count(),
    angebote: await db.angebote.count(),
    rechnungen: await db.rechnungen.count(),
    mahnungen: await db.mahnungen.count(),
    protokoll: await db.protokoll.count(),
  };
}

export async function beispielbetriebLaden(): Promise<void> {
  await ladeBeispieldaten();
}

/** Alles als JSON-Datei; liefert Blob und Dateinamen, das Speichern macht der Aufrufer. */
export async function arbeitsbereichAlsDatei(): Promise<{ blob: Blob; dateiname: string }> {
  const ab = await exportiereArbeitsbereich();
  const json = JSON.stringify(ab);
  const blob = new Blob([json], { type: "application/json" });
  await protokolliere("nutzer", "Arbeitsbereich exportiert", "arbeitsbereich", {
    dateien: ab.dateien.length,
    dokumente: ab.dokumente.length,
    belege: ab.belege.length,
    groesse: blob.size,
  });
  return { blob, dateiname: exportDateiname(ab.exportiertAm) };
}

/** Ersetzt alles durch die Datei. Der Protokolleintrag steht danach im neuen Journal. */
export async function arbeitsbereichAusDatei(datei: File): Promise<void> {
  let roh: unknown;
  try {
    roh = JSON.parse(await datei.text());
  } catch {
    throw new Error("Die Datei ist kein lesbares JSON.");
  }
  if (!roh || typeof roh !== "object" || (roh as { format?: string }).format !== "hausverwailter-arbeitsbereich") {
    throw new Error("Das ist keine Arbeitsbereich-Datei dieser App (Format fehlt).");
  }
  await importiereArbeitsbereich(roh);
  await protokolliere("nutzer", "Arbeitsbereich importiert", "arbeitsbereich", { dateiname: datei.name, groesse: datei.size });
}

export async function allesLoeschen(): Promise<void> {
  const bestand = await bestandZaehlen();
  await leereArbeitsbereich();
  await protokolliere("nutzer", "Arbeitsbereich gelöscht", "arbeitsbereich", bestand);
}

export interface SpeicherStatus {
  belegt: number | null;
  verfuegbar: number | null;
  persistent: boolean | null;
  unterstuetzt: boolean;
}

export async function speicherStatus(): Promise<SpeicherStatus> {
  if (typeof navigator === "undefined" || !navigator.storage) return { belegt: null, verfuegbar: null, persistent: null, unterstuetzt: false };
  let belegt: number | null = null;
  let verfuegbar: number | null = null;
  let persistent: boolean | null = null;
  try {
    if (navigator.storage.estimate) {
      const s = await navigator.storage.estimate();
      belegt = s.usage ?? null;
      verfuegbar = s.quota ?? null;
    }
  } catch {
    /* manche Browser verweigern die Schätzung */
  }
  try {
    if (navigator.storage.persisted) persistent = await navigator.storage.persisted();
  } catch {
    /* nicht unterstützt */
  }
  return { belegt, verfuegbar, persistent, unterstuetzt: true };
}

export async function persistentenSpeicherAnfordern(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  const ok = await navigator.storage.persist();
  await protokolliere("nutzer", ok ? "Persistenter Speicher gewährt" : "Persistenter Speicher abgelehnt", "arbeitsbereich");
  return ok;
}
