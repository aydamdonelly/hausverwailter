/**
 * Die Aktionen der Bankseite gegen die lokale Datenbank: Kontoauszug lesen und übernehmen,
 * Regeln und KI zuordnen lassen, Zuordnungen ändern, buchen, Mahnvorschläge anlegen. Jede
 * fachliche Aktion schreibt ins Protokoll. Die reine Fachlogik liegt in lib/bank/*.
 */
import { db, neueId } from "@/lib/store/db";
import { protokolliere } from "@/lib/store/protokoll";
import { ladeEinstellungen } from "@/lib/store/arbeitsbereich";
import { naechsteNummer } from "@/lib/store/nummern";
import { api } from "@/lib/api";
import type { Bankkonto, Bankumsatz, Beleg, Mahnung, Zuordnung } from "@/lib/domain/schema";
import { heuteIso, jetztIso, monatVon } from "@/lib/format";
import { leseKontoauszug } from "@/lib/bank/lesen";
import { gemerktesProfil, leseMitProfil } from "@/lib/bank/formate";
import { dekodiere } from "@/lib/bank/csv";
import { bereiteImport, kontoFuerIban } from "@/lib/bank/import";
import { ordneZu, sollBetrag, type AbgleichKontext } from "@/lib/bank/abgleich";
import { buchungAusUmsatz, istBuchbar } from "@/lib/bank/buchungen";
import { offeneSollstellungen } from "@/lib/bank/sollstellungen";
import { mahnvorschlaege } from "@/lib/bank/mahnvorschlaege";
import { gemerktesKiProfil, type SpaltenAntwort } from "@/lib/bank/spalten-ki";
import { KI_STAPEL, type ZuordnungsAnfrage, type ZuordnungsAntwort } from "@/lib/bank/zuordnen-ki";
import type { LeseErgebnis, Spaltenprofil } from "@/lib/bank/typen";

export interface Importvorschau {
  ergebnis: LeseErgebnis;
  /** Vorgeschlagenes Konto (IBAN in der Datei), null = Nutzer wählt */
  konto: Bankkonto | null;
  /** Wie viele Umsätze der Datei schon in der Datenbank sind (je Konto berechnet) */
  schonVorhanden: number;
  dateiname: string;
  dokumentId: string | null;
  buffer: ArrayBuffer;
}

/** Datei lesen: erst mit den gemerkten Profilen der Konten, dann mit der Formaterkennung. */
export async function kontoauszugLesen(buffer: ArrayBuffer, dateiname: string, dokumentId: string | null = null): Promise<Importvorschau> {
  const konten = await db.bankkonten.toArray();
  const objekte = await db.objekte.toArray();
  let ergebnis: LeseErgebnis | null = null;
  let kontoAusProfil: Bankkonto | null = null;
  for (const k of konten) {
    if (!gemerktesProfil(k.format)) continue;
    const e = leseKontoauszug(buffer, dateiname, k.format);
    if (e.umsaetze.length) {
      ergebnis = e;
      kontoAusProfil = k;
      break;
    }
  }
  if (!ergebnis) ergebnis = leseKontoauszug(buffer, dateiname);
  const konto = kontoFuerIban(konten, ergebnis.kontoIban, objekte) ?? kontoAusProfil ?? (konten.length === 1 ? konten[0] : null);
  const schonVorhanden = konto ? await anzahlVorhanden(konto.id, ergebnis) : 0;
  return { ergebnis, konto, schonVorhanden, dateiname, dokumentId, buffer };
}

/** Datei aus dem Posteingang (db.dateien) lesen. */
export async function kontoauszugAusDokument(dokumentId: string): Promise<Importvorschau | null> {
  const dokument = await db.dokumente.get(dokumentId);
  const datei = await db.dateien.get(dokumentId);
  if (!dokument || !datei) return null;
  return kontoauszugLesen(await datei.blob.arrayBuffer(), dokument.dateiname, dokumentId);
}

export async function anzahlVorhanden(kontoId: string, ergebnis: LeseErgebnis): Promise<number> {
  const vorhandene = new Set((await db.bankumsaetze.where("bankkontoId").equals(kontoId).toArray()).map((u) => u.hash));
  const { doppelt } = await bereiteImport(ergebnis.umsaetze, kontoId, vorhandene, () => "x", jetztIso());
  return doppelt;
}

/** Unbekanntes Format: Spalten von der KI benennen lassen und die Datei damit lesen. */
export async function spaltenErkennenLassen(vorschau: Importvorschau): Promise<Importvorschau> {
  const zeilen = vorschau.ergebnis.vorschau ?? [];
  const antwort = await api<SpaltenAntwort>("/api/bank/spalten", { method: "POST", body: JSON.stringify({ zeilen, dateiname: vorschau.dateiname }) });
  const profil: Spaltenprofil = antwort.profil;
  const { text } = dekodiere(vorschau.buffer);
  const gemerkt = gemerktesKiProfil(profil);
  const ergebnis = leseMitProfil(text, profil, "ki", gemerkt.name);
  await protokolliere("ki", "Spalten eines Kontoauszugs erkannt", "", { dateiname: vorschau.dateiname, bank: profil.bankVermutung, umsaetze: ergebnis.umsaetze.length, modell: antwort.modell });
  const konten = await db.bankkonten.toArray();
  const objekte = await db.objekte.toArray();
  const konto = kontoFuerIban(konten, ergebnis.kontoIban, objekte) ?? vorschau.konto;
  const schonVorhanden = konto ? await anzahlVorhanden(konto.id, ergebnis) : 0;
  return { ...vorschau, ergebnis, konto, schonVorhanden };
}

/** Umsätze in die Datenbank übernehmen, Format am Konto merken, Regeln anwenden, Posteingang aktualisieren. */
export async function umsaetzeUebernehmen(vorschau: Importvorschau, konto: Bankkonto): Promise<{ neu: number; doppelt: number; zugeordnet: number }> {
  const vorhandene = new Set((await db.bankumsaetze.where("bankkontoId").equals(konto.id).toArray()).map((u) => u.hash));
  const { neue, doppelt, doppeltInDatei } = await bereiteImport(vorschau.ergebnis.umsaetze, konto.id, vorhandene, neueId, jetztIso());
  const format = vorschau.ergebnis.profilJson ?? vorschau.ergebnis.format;
  await db.transaction("rw", db.bankumsaetze, db.bankkonten, db.dokumente, async () => {
    if (neue.length) await db.bankumsaetze.bulkAdd(neue);
    if (format !== "unbekannt" && konto.format !== format) await db.bankkonten.update(konto.id, { format });
    if (vorschau.dokumentId) {
      await db.dokumente.update(vorschau.dokumentId, { typ: "kontoauszug", status: "gebucht", bankkontoId: konto.id, notizen: `${vorschau.ergebnis.formatName}: ${neue.length} Umsätze übernommen${doppelt ? `, ${doppelt} schon vorhanden` : ""}` });
    }
  });
  await protokolliere("nutzer", "Kontoauszug importiert", `bankkonto:${konto.id}`, { dateiname: vorschau.dateiname, format: vorschau.ergebnis.formatName, neu: neue.length, schonVorhanden: doppelt + doppeltInDatei, uebersprungen: vorschau.ergebnis.uebersprungen });
  const zugeordnet = neue.length ? await regelnAnwenden(konto.id, neue.map((u) => u.id)) : 0;
  return { neu: neue.length, doppelt: doppelt + doppeltInDatei, zugeordnet };
}

async function abgleichKontext(konto: Bankkonto): Promise<AbgleichKontext> {
  const e = await ladeEinstellungen();
  const belege = (await db.belege.toArray()).filter((b) => !b.bezahltAm && !b.bankumsatzId && b.art === "rechnung");
  const rechnungen = (await db.rechnungen.toArray()).filter((r) => r.status === "gestellt");
  return {
    konto,
    objekte: await db.objekte.toArray(),
    personen: await db.personen.toArray(),
    einheiten: await db.einheiten.toArray(),
    belege,
    rechnungen,
    firma: { name: e.firma.name, iban: e.firma.iban },
    toleranz: e.mahnwesen.toleranzEuro,
  };
}

/** IDs aller Umsätze, die schon verbucht sind (Buchung, bezahlter Beleg, bezahlte Rechnung). Die werden nie neu zugeordnet. */
async function verbuchteIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const b of await db.buchungen.where("quelle").equals("bank").toArray()) if (b.bankumsatzId) ids.add(b.bankumsatzId);
  for (const b of await db.belege.toArray()) if (b.bankumsatzId) ids.add(b.bankumsatzId);
  for (const r of await db.rechnungen.toArray()) if (r.bankumsatzId) ids.add(r.bankumsatzId);
  return ids;
}

/**
 * Regeln auf Umsätze eines Kontos anwenden. Ohne `nurIds` alle offenen und alle regelbasierten
 * (KI- und manuelle Zuordnungen und alles Verbuchte bleiben unangetastet). Gibt die Zahl der neu zugeordneten zurück.
 */
export async function regelnAnwenden(kontoId: string, nurIds?: string[]): Promise<number> {
  const konto = await db.bankkonten.get(kontoId);
  if (!konto) return 0;
  const k = await abgleichKontext(konto);
  const ids = nurIds ? new Set(nurIds) : null;
  const verbucht = await verbuchteIds();
  const umsaetze = (await db.bankumsaetze.where("bankkontoId").equals(kontoId).toArray()).filter((u) => !verbucht.has(u.id) && (ids ? ids.has(u.id) : u.zuordnung.quelle === "regel"));
  let zugeordnet = 0;
  const belegeVergeben = new Set<string>();
  for (const u of umsaetze) {
    const z = ordneZu(u, { ...k, belege: k.belege.filter((b) => !belegeVergeben.has(b.id)) });
    if (z.belegId) belegeVergeben.add(z.belegId);
    if (JSON.stringify(z) === JSON.stringify(u.zuordnung)) continue;
    await db.bankumsaetze.update(u.id, { zuordnung: z });
    if (z.art !== "offen") zugeordnet++;
  }
  await protokolliere("regel", "Bankumsätze zugeordnet", `bankkonto:${kontoId}`, { geprueft: umsaetze.length, zugeordnet });
  return zugeordnet;
}

/** Offene und unsichere Umsätze eines Kontos an die KI geben (in Stapeln). Gibt die Zahl der Vorschläge zurück. */
export async function kiZuordnen(kontoId: string, fortschritt?: (fertig: number, gesamt: number) => void): Promise<number> {
  const konto = await db.bankkonten.get(kontoId);
  if (!konto) return 0;
  const k = await abgleichKontext(konto);
  const objekt = k.objekte.find((o) => o.id === konto.objektId);
  const verbucht = await verbuchteIds();
  const offene = (await db.bankumsaetze.where("bankkontoId").equals(kontoId).toArray()).filter((u) => !verbucht.has(u.id) && (u.zuordnung.art === "offen" || (u.zuordnung.quelle === "regel" && u.zuordnung.sicherheit === "unsicher")));
  if (!offene.length) return 0;
  const personen = k.personen.filter((p) => p.aktiv && (!konto.objektId || p.objektId === konto.objektId));
  const basis: Omit<ZuordnungsAnfrage, "umsaetze"> = {
    konto: { bezeichnung: konto.bezeichnung, objekt: objekt?.kurzname ?? "", istVerwaltungskonto: !konto.objektId },
    personen: personen.map((p) => ({ id: p.id, name: p.name, rolle: p.rolle === "eigentuemer" ? "Eigentümer" : p.rolle === "mieter" ? "Mieter" : "Sonstige", einheit: k.einheiten.find((e) => e.id === p.einheitId)?.bezeichnung ?? "", objekt: k.objekte.find((o) => o.id === p.objektId)?.kurzname ?? "", sollMonat: sollBetrag(p) })),
    belege: k.belege.map((b) => ({ id: b.id, lieferant: b.lieferant.name, rechnungsnummer: b.rechnungsnummer, brutto: b.bruttoGesamt, rechnungsdatum: b.rechnungsdatum ?? "" })),
    rechnungen: k.rechnungen.map((r) => ({ id: r.id, nummer: r.nummer, empfaenger: r.empfaenger.name, brutto: r.brutto })),
    auftraggeber: objekt?.auftraggeber.name ?? "",
  };
  let vorschlaege = 0;
  let modell = "";
  for (let start = 0; start < offene.length; start += KI_STAPEL) {
    const stapel = offene.slice(start, start + KI_STAPEL);
    const anfrage: ZuordnungsAnfrage = { ...basis, umsaetze: stapel.map((u, i) => ({ index: i, buchungstag: u.buchungstag, betrag: u.betrag, name: u.name, verwendungszweck: u.verwendungszweck, buchungstext: u.buchungstext })) };
    const antwort = await api<ZuordnungsAntwort>("/api/bank/zuordnen", { method: "POST", body: JSON.stringify(anfrage) });
    modell = antwort.modell;
    for (const { index, zuordnung } of antwort.zuordnungen) {
      const u = stapel[index];
      if (!u) continue;
      await db.bankumsaetze.update(u.id, { zuordnung });
      if (zuordnung.art !== "offen") vorschlaege++;
    }
    fortschritt?.(Math.min(offene.length, start + stapel.length), offene.length);
  }
  await protokolliere("ki", "Bankumsätze vorgeschlagen", `bankkonto:${kontoId}`, { geprueft: offene.length, vorschlaege, modell });
  return vorschlaege;
}

/** Zuordnung durch den Nutzer ändern: Quelle manuell, Sicherheit sicher. */
export async function zuordnungAendern(umsatzId: string, patch: Partial<Zuordnung>): Promise<void> {
  const u = await db.bankumsaetze.get(umsatzId);
  if (!u) return;
  const z: Zuordnung = { ...u.zuordnung, ...patch, quelle: "manuell", sicherheit: "sicher", begruendung: "vom Nutzer festgelegt" };
  if (z.art !== "mieteingang" && z.art !== "hausgeld" && z.art !== "kaution") z.personId = null;
  if (z.art !== "belegzahlung") z.belegId = null;
  if (z.art !== "honorar") z.rechnungId = null;
  if (z.art === "mieteingang" || z.art === "hausgeld") z.monat = z.monat ?? monatVon(u.buchungstag);
  else z.monat = null;
  if (z.art === "gebuehr") z.kostenartCode = z.kostenartCode ?? "BANKGEBUEHREN";
  else if (z.art !== "sonstiges") z.kostenartCode = null;
  if (z.art === "offen") {
    z.quelle = "manuell";
    z.sicherheit = "unsicher";
  }
  await db.bankumsaetze.update(umsatzId, { zuordnung: z });
  await protokolliere("nutzer", "Zuordnung geändert", `bankumsatz:${umsatzId}`, { art: z.art, personId: z.personId, belegId: z.belegId, monat: z.monat });
}

/** Ist der Umsatz schon verbucht (Buchung, bezahlter Beleg oder bezahlte Rechnung)? */
export async function istVerbucht(u: Bankumsatz): Promise<boolean> {
  if (await db.buchungen.where("bankumsatzId").equals(u.id).count()) return true;
  if (u.zuordnung.belegId) {
    const b = await db.belege.get(u.zuordnung.belegId);
    if (b?.bankumsatzId === u.id) return true;
  }
  if (u.zuordnung.rechnungId) {
    const r = await db.rechnungen.get(u.zuordnung.rechnungId);
    if (r?.bankumsatzId === u.id) return true;
  }
  return false;
}

/**
 * Einen zugeordneten Umsatz verbuchen: Mieteingang/Hausgeld/Entgelt/Auszahlung → Buchung (quelle bank);
 * Belegzahlung → Beleg als bezahlt markieren; Honorar → eigene Rechnung als bezahlt markieren.
 */
export async function umsatzBuchen(umsatzId: string): Promise<boolean> {
  const u = await db.bankumsaetze.get(umsatzId);
  if (!u) return false;
  const konto = await db.bankkonten.get(u.bankkontoId);
  if (!konto) return false;
  const z = u.zuordnung;
  if (z.art === "belegzahlung" && z.belegId) {
    const beleg = await db.belege.get(z.belegId);
    if (!beleg) return false;
    const patch: Partial<Beleg> = { bezahltAm: u.buchungstag, bankumsatzId: u.id, herkunft: { ...beleg.herkunft, bezahltAm: "regel" } };
    await db.belege.update(beleg.id, patch);
    await protokolliere("nutzer", "Beleg als bezahlt markiert", `beleg:${beleg.id}`, { bankumsatzId: u.id, bezahltAm: u.buchungstag, betrag: u.betrag });
    return true;
  }
  if (z.art === "honorar" && z.rechnungId) {
    const r = await db.rechnungen.get(z.rechnungId);
    if (!r) return false;
    await db.rechnungen.update(r.id, { bezahltAm: u.buchungstag, bankumsatzId: u.id, status: "bezahlt" });
    await protokolliere("nutzer", "Rechnung als bezahlt markiert", `rechnung:${r.id}`, { bankumsatzId: u.id, bezahltAm: u.buchungstag, betrag: u.betrag });
    return true;
  }
  if (!istBuchbar(u)) return false;
  if (await db.buchungen.where("bankumsatzId").equals(u.id).count()) return false;
  const e = await ladeEinstellungen();
  const buchung = buchungAusUmsatz(u, konto, await db.kostenarten.toArray(), await db.personen.toArray(), e.kontenrahmen, neueId, jetztIso());
  if (!buchung) return false;
  await db.buchungen.add(buchung);
  await protokolliere("nutzer", "Bankumsatz gebucht", `bankumsatz:${u.id}`, { buchungId: buchung.id, art: z.art, betrag: u.betrag, text: buchung.buchungstext });
  return true;
}

/** Alle sicher zugeordneten, noch nicht verbuchten Umsätze eines Kontos buchen. */
export async function sichereBuchen(kontoId: string): Promise<number> {
  const umsaetze = await db.bankumsaetze.where("bankkontoId").equals(kontoId).toArray();
  let n = 0;
  for (const u of umsaetze) {
    if (u.zuordnung.sicherheit !== "sicher" || u.zuordnung.art === "offen") continue;
    if (await istVerbucht(u)) continue;
    if (await umsatzBuchen(u.id)) n++;
  }
  return n;
}

export async function buchungZuruecknehmen(umsatzId: string): Promise<void> {
  const u = await db.bankumsaetze.get(umsatzId);
  if (!u) return;
  await db.buchungen.where("bankumsatzId").equals(umsatzId).delete();
  if (u.zuordnung.belegId) {
    const b = await db.belege.get(u.zuordnung.belegId);
    if (b?.bankumsatzId === umsatzId) await db.belege.update(b.id, { bezahltAm: null, bankumsatzId: null });
  }
  if (u.zuordnung.rechnungId) {
    const r = await db.rechnungen.get(u.zuordnung.rechnungId);
    if (r?.bankumsatzId === umsatzId) await db.rechnungen.update(r.id, { bezahltAm: null, bankumsatzId: null, status: "gestellt" });
  }
  await protokolliere("nutzer", "Buchung zurückgenommen", `bankumsatz:${umsatzId}`);
}

/** Mahnvorschläge für ein Objekt über einen Monatszeitraum anlegen (Status vorschlag). */
export async function mahnvorschlaegeAnlegen(objektId: string, vonMonat: string, bisMonat: string): Promise<number> {
  const e = await ladeEinstellungen();
  const personen = (await db.personen.where("objektId").equals(objektId).toArray()).filter((p) => p.aktiv);
  const konten = await db.bankkonten.where("objektId").equals(objektId).toArray();
  const umsaetze = (await Promise.all(konten.map((k) => db.bankumsaetze.where("bankkontoId").equals(k.id).toArray()))).flat();
  const offene = offeneSollstellungen(personen, umsaetze, vonMonat, bisMonat, e.mahnwesen.toleranzEuro);
  const heute = heuteIso();
  const vorschlaege = mahnvorschlaege(offene, {
    personen,
    objekte: await db.objekte.toArray(),
    einheiten: await db.einheiten.toArray(),
    mahnwesen: e.mahnwesen,
    firma: { name: e.firma.name, iban: e.firma.iban, bankname: e.firma.bankname },
    heute,
    vorhandene: await db.mahnungen.where("objektId").equals(objektId).toArray(),
  });
  for (const v of vorschlaege) {
    const nummer = await naechsteNummer("mahnung", heute);
    const mahnung: Mahnung = { ...v, id: neueId(), nummer };
    await db.mahnungen.add(mahnung);
    await protokolliere("regel", "Mahnvorschlag angelegt", `mahnung:${mahnung.id}`, { nummer, stufe: v.stufe, personId: v.personId, offen: v.betragOffen, zinsen: v.verzugszinsen, gesamt: v.gesamt });
  }
  return vorschlaege.length;
}

export async function mahnungStatusSetzen(id: string, status: Mahnung["status"]): Promise<void> {
  await db.mahnungen.update(id, { status });
  await protokolliere("nutzer", status === "versendet" ? "Mahnung als versendet markiert" : status === "erledigt" ? "Mahnung erledigt" : "Mahnungsstatus geändert", `mahnung:${id}`, { status });
}

export async function mahnungVerwerfen(id: string): Promise<void> {
  const m = await db.mahnungen.get(id);
  if (!m || m.status !== "vorschlag") return;
  await db.mahnungen.delete(id);
  await protokolliere("nutzer", "Mahnvorschlag verworfen", `mahnung:${id}`, { nummer: m.nummer });
}
