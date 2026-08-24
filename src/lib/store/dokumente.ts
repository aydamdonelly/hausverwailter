/**
 * Der Weg eines Dokuments: ablegen → lesen (KI) → prüfen (Regeln) → freigeben → buchen.
 * Alle Schritte schreiben ins Protokoll. Läuft im Browser gegen die lokale Datenbank.
 */
import { db, neueId, sha256 } from "./db";
import { protokolliere } from "./protokoll";
import { erkennungsKontext, pruefKontext } from "./kontext";
import { api } from "../api";
import { pruefeBeleg, statusAusBefunden } from "../belege/pruefung";
import type { ErkennungsErgebnis } from "../belege/erkennen";
import { Beleg, Buchung, Dokument, type Anfrage, type DokumentTyp } from "../domain/schema";
import { jetztIso } from "../format";
import { ladeEinstellungen } from "./arbeitsbereich";
import { summe } from "../geld";
import { istCamt } from "../bank/camt053";

export type ErkennungsAntwort = Omit<ErkennungsErgebnis, never>;

async function typAusDatei(datei: File): Promise<DokumentTyp | null> {
  const n = datei.name.toLowerCase();
  if (n.endsWith(".csv") || n.endsWith(".camt") || n.endsWith(".sta") || n.endsWith(".mt940") || (n.endsWith(".txt") && /kontoauszug|umsaetze|umsätze/.test(n))) return "kontoauszug";
  if (n.endsWith(".xml")) {
    // Kontoauszug (CAMT.053) oder E-Rechnung (XRechnung)? Nur CAMT geht zum Bankimport.
    const anfang = await datei.slice(0, 4000).text();
    return istCamt(anfang) ? "kontoauszug" : null;
  }
  return null;
}

/** Datei in die Datenbank legen. Doppelte Dateien (gleicher Inhalt) werden erkannt und nicht erneut angelegt. */
export async function dokumentAblegen(datei: File, quelle: Dokument["quelle"] = "upload"): Promise<{ dokument: Dokument; doppelt: boolean }> {
  const hash = await sha256(datei);
  const vorhanden = await db.dokumente.where("hash").equals(hash).first();
  if (vorhanden) return { dokument: vorhanden, doppelt: true };
  const dokument = Dokument.parse({
    id: neueId(),
    dateiname: datei.name,
    mime: datei.type || "application/octet-stream",
    groesse: datei.size,
    hash,
    hochgeladenAm: jetztIso(),
    quelle,
    typ: await typAusDatei(datei),
    status: "neu",
  });
  await db.transaction("rw", db.dokumente, db.dateien, async () => {
    await db.dateien.put({ id: dokument.id, mime: dokument.mime, blob: datei });
    await db.dokumente.put(dokument);
  });
  await protokolliere("nutzer", "Dokument abgelegt", `dokument:${dokument.id}`, { dateiname: datei.name, groesse: datei.size });
  return { dokument, doppelt: false };
}

/** Dokument von der KI lesen lassen, Ergebnis speichern, Prüfregeln anwenden. */
export async function dokumentLesen(dokumentId: string): Promise<Dokument> {
  const dokument = await db.dokumente.get(dokumentId);
  const datei = await db.dateien.get(dokumentId);
  if (!dokument || !datei) throw new Error("Dokument nicht gefunden");
  if (dokument.typ === "kontoauszug") return dokument; // Kontoauszüge liest der Bankimport, nicht die KI

  await db.dokumente.update(dokumentId, { status: "wird_gelesen", fehler: "" });
  try {
    const form = new FormData();
    form.append("datei", new File([datei.blob], dokument.dateiname, { type: dokument.mime }));
    form.append("kontext", JSON.stringify(await erkennungsKontext()));
    const ergebnis = await api<ErkennungsAntwort>("/api/erkennen", { method: "POST", body: form });
    await protokolliere("ki", "Dokument gelesen", `dokument:${dokumentId}`, {
      typ: ergebnis.typ,
      zuversicht: ergebnis.zuversicht,
      modell: ergebnis.modell,
      tokens: `${ergebnis.eingabeTokens} rein / ${ergebnis.ausgabeTokens} raus`,
    });

    const aenderung: Partial<Dokument> = { typ: ergebnis.typ, notizen: ergebnis.zusammenfassung };

    if (ergebnis.belegEntwurf) {
      // Vorhandenen Beleg zu diesem Dokument ersetzen (z. B. bei "neu lesen")
      const alt = await db.belege.where("dokumentId").equals(dokumentId).first();
      const id = alt?.id ?? neueId();
      const entwurf = Beleg.parse({ ...ergebnis.belegEntwurf, id, dokumentId });
      const befunde = pruefeBeleg(entwurf, await pruefKontext(id));
      const beleg = { ...entwurf, befunde };
      await db.belege.put(beleg);
      aenderung.belegId = id;
      aenderung.status = statusAusBefunden(befunde);
      await protokolliere("regel", "Beleg geprüft", `beleg:${id}`, {
        fehler: befunde.filter((b) => b.stufe === "fehler").length,
        warnungen: befunde.filter((b) => b.stufe === "warnung").length,
        hinweise: befunde.filter((b) => b.stufe === "hinweis").length,
        status: aenderung.status,
      });
    } else if (ergebnis.anfrageEntwurf) {
      const alt = await db.anfragen.where("dokumentId").equals(dokumentId).first();
      const id = alt?.id ?? neueId();
      const anfrage: Anfrage = { ...ergebnis.anfrageEntwurf, id, dokumentId, angebotId: alt?.angebotId ?? null };
      await db.anfragen.put(anfrage);
      aenderung.anfrageId = id;
      aenderung.status = "erkannt";
    } else if (ergebnis.handwerkerangebot) {
      aenderung.status = "erkannt";
      aenderung.notizen = `${ergebnis.zusammenfassung}\n\n${JSON.stringify(ergebnis.handwerkerangebot, null, 2)}`;
    } else {
      aenderung.status = "erkannt";
    }
    await db.dokumente.update(dokumentId, aenderung);
  } catch (e) {
    const text = e instanceof Error ? e.message : "Unbekannter Fehler";
    await db.dokumente.update(dokumentId, { status: "fehler", fehler: text });
    await protokolliere("system", "Lesen fehlgeschlagen", `dokument:${dokumentId}`, text);
  }
  return (await db.dokumente.get(dokumentId))!;
}

/** Beleg nach manueller Änderung speichern und neu prüfen. */
export async function belegSpeichern(beleg: Beleg, geaendert: string[]): Promise<Beleg> {
  const herkunft = { ...beleg.herkunft };
  for (const feld of geaendert) herkunft[feld] = "manuell";
  const befunde = pruefeBeleg({ ...beleg, herkunft }, await pruefKontext(beleg.id));
  const neu = { ...beleg, herkunft, befunde };
  await db.belege.put(neu);
  const dokument = await db.dokumente.get(beleg.dokumentId);
  if (dokument && (dokument.status === "erkannt" || dokument.status === "freigabe")) {
    await db.dokumente.update(beleg.dokumentId, { status: statusAusBefunden(befunde) });
  }
  if (geaendert.length) await protokolliere("nutzer", "Beleg geändert", `beleg:${beleg.id}`, { felder: geaendert.join(", ") });
  return neu;
}

/** Freigeben und buchen: erzeugt je Steuersatz einen Buchungssatz. */
export async function belegBuchen(belegId: string): Promise<void> {
  const beleg = await db.belege.get(belegId);
  if (!beleg) throw new Error("Beleg nicht gefunden");
  if (!beleg.objektId || !beleg.kostenartCode) throw new Error("Objekt und Kostenart müssen zugeordnet sein.");
  const e = await ladeEinstellungen();
  const kostenart = await db.kostenarten.get(beleg.kostenartCode);
  const konto = e.kontenrahmen === "SKR04" ? kostenart?.kontoSkr04 ?? "" : kostenart?.kontoSkr03 ?? "";
  const zeilen = beleg.steuersaetze.length ? beleg.steuersaetze : [{ satz: beleg.ustGesamt > 0 ? 19 : 0, netto: beleg.nettoGesamt, ust: beleg.ustGesamt }];
  const vorzeichen = beleg.art === "gutschrift" ? -1 : 1;
  await db.transaction("rw", db.buchungen, db.dokumente, db.protokoll, async () => {
    await db.buchungen.where("belegId").equals(belegId).delete();
    for (const z of zeilen) {
      await db.buchungen.add(
        Buchung.parse({
          id: neueId(),
          datum: beleg.rechnungsdatum ?? new Date().toISOString().slice(0, 10),
          belegId,
          objektId: beleg.objektId,
          kostenartCode: beleg.kostenartCode,
          umlagefaehig: kostenart?.umlagefaehig ?? null,
          konto,
          gegenkonto: "",
          belegnummer: beleg.rechnungsnummer,
          buchungstext: `${beleg.lieferant.name} ${beleg.rechnungsnummer}`.trim(),
          netto: vorzeichen * z.netto,
          ust: vorzeichen * z.ust,
          brutto: vorzeichen * summe([z.netto, z.ust]),
          ustSatz: z.satz,
          sollHaben: beleg.art === "gutschrift" ? "H" : "S",
          quelle: "beleg",
          erstelltAm: jetztIso(),
        }),
      );
    }
    await db.dokumente.update(beleg.dokumentId, { status: "gebucht" });
  });
  await protokolliere("nutzer", "Beleg freigegeben und gebucht", `beleg:${belegId}`, { zeilen: zeilen.length, brutto: beleg.bruttoGesamt });
}

export async function belegAblehnen(belegId: string, grund: string): Promise<void> {
  const beleg = await db.belege.get(belegId);
  if (!beleg) return;
  await db.dokumente.update(beleg.dokumentId, { status: "abgelehnt", notizen: grund });
  await db.buchungen.where("belegId").equals(belegId).delete();
  await protokolliere("nutzer", "Beleg abgelehnt", `beleg:${belegId}`, grund);
}

export async function belegZurueckstellen(belegId: string): Promise<void> {
  const beleg = await db.belege.get(belegId);
  if (!beleg) return;
  await db.buchungen.where("belegId").equals(belegId).delete();
  await db.dokumente.update(beleg.dokumentId, { status: statusAusBefunden(beleg.befunde) });
  await protokolliere("nutzer", "Buchung zurückgenommen", `beleg:${belegId}`);
}

export async function dokumentLoeschen(dokumentId: string): Promise<void> {
  const dokument = await db.dokumente.get(dokumentId);
  if (!dokument) return;
  await db.transaction("rw", db.dokumente, db.dateien, db.belege, db.buchungen, db.anfragen, async () => {
    if (dokument.belegId) {
      await db.buchungen.where("belegId").equals(dokument.belegId).delete();
      await db.belege.delete(dokument.belegId);
    }
    if (dokument.anfrageId) await db.anfragen.delete(dokument.anfrageId);
    await db.dateien.delete(dokumentId);
    await db.dokumente.delete(dokumentId);
  });
  await protokolliere("nutzer", "Dokument gelöscht", `dokument:${dokumentId}`, dokument.dateiname);
}

/** Alle Belege ohne Fehler und ohne Freigabepflicht auf einmal buchen. */
export async function unauffaelligeBuchen(): Promise<number> {
  const dokumente = await db.dokumente.where("status").equals("erkannt").toArray();
  let n = 0;
  for (const d of dokumente) {
    if (!d.belegId) continue;
    const beleg = await db.belege.get(d.belegId);
    if (!beleg || !beleg.objektId || !beleg.kostenartCode) continue;
    if (beleg.befunde.some((b) => b.stufe === "fehler")) continue;
    await belegBuchen(beleg.id);
    n++;
  }
  return n;
}
