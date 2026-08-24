import { KiBankzuordnung } from "@/lib/belege/schema-ki";
import { KiFehler, strukturiert } from "@/lib/ki/client";
import { auftragZuordnung, KI_STAPEL, systemZuordnung, zuordnungenAusKi, type ZuordnungsAnfrage, type ZuordnungsAntwort } from "@/lib/bank/zuordnen-ki";
import { verweigert, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST ZuordnungsAnfrage → { zuordnungen: [{ index, zuordnung }], modell }
 * Offene Bankumsätze mit Kandidatenliste (Personen mit Soll, offene Belege, eigene Rechnungen)
 * an die KI; die Antwort wird gegen die Kandidaten geprüft, bevor sie zurückgeht.
 */
export async function POST(req: Request) {
  if (!zugangOk(req)) return verweigert();
  let a: ZuordnungsAnfrage;
  try {
    a = (await req.json()) as ZuordnungsAnfrage;
  } catch {
    return Response.json({ fehler: "Erwartet JSON (ZuordnungsAnfrage)." }, { status: 400 });
  }
  if (!Array.isArray(a.umsaetze) || !a.umsaetze.length) return Response.json({ fehler: "Keine Umsätze übergeben." }, { status: 400 });
  if (a.umsaetze.length > KI_STAPEL) return Response.json({ fehler: `Höchstens ${KI_STAPEL} Umsätze je Aufruf.` }, { status: 400 });
  a.personen = Array.isArray(a.personen) ? a.personen.slice(0, 300) : [];
  a.belege = Array.isArray(a.belege) ? a.belege.slice(0, 200) : [];
  a.rechnungen = Array.isArray(a.rechnungen) ? a.rechnungen.slice(0, 200) : [];
  a.konto ??= { bezeichnung: "Bankkonto", objekt: "", istVerwaltungskonto: false };
  a.auftraggeber ??= "";
  try {
    const ergebnis = await strukturiert({
      system: systemZuordnung(a),
      auftrag: auftragZuordnung(a.umsaetze),
      schema: KiBankzuordnung,
      maxTokens: 6000,
      aufwand: "medium",
    });
    const antwort: ZuordnungsAntwort = { zuordnungen: zuordnungenAusKi(ergebnis.daten, a), modell: ergebnis.modell };
    return Response.json(antwort);
  } catch (e) {
    if (e instanceof KiFehler) return Response.json({ fehler: e.message }, { status: e.status && e.status >= 400 && e.status < 600 ? e.status : 502 });
    return Response.json({ fehler: e instanceof Error ? e.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
