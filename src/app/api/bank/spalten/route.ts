import { KiSpalten } from "@/lib/belege/schema-ki";
import { KiFehler, strukturiert } from "@/lib/ki/client";
import { auftragSpalten, profilAusKiSpalten, SYSTEM_SPALTEN, type SpaltenAntwort } from "@/lib/bank/spalten-ki";
import { verweigert, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { zeilen: string[], dateiname?: string } → { profil: Spaltenprofil, modell }
 * Die KI bekommt nur die ersten Zeilen eines unbekannten CSV-Formats und benennt die Spalten.
 * Gelesen wird die Datei danach im Browser mit diesem Profil; die KI rechnet nichts.
 */
export async function POST(req: Request) {
  if (!zugangOk(req)) return verweigert();
  let body: { zeilen?: unknown; dateiname?: unknown };
  try {
    body = (await req.json()) as { zeilen?: unknown; dateiname?: unknown };
  } catch {
    return Response.json({ fehler: "Erwartet JSON mit dem Feld 'zeilen'." }, { status: 400 });
  }
  const zeilen = Array.isArray(body.zeilen) ? body.zeilen.filter((z): z is string => typeof z === "string").slice(0, 20) : [];
  if (!zeilen.length) return Response.json({ fehler: "Keine Zeilen übergeben." }, { status: 400 });
  const dateiname = typeof body.dateiname === "string" ? body.dateiname.slice(0, 200) : "";
  try {
    const ergebnis = await strukturiert({
      system: SYSTEM_SPALTEN,
      auftrag: auftragSpalten(zeilen.map((z) => z.slice(0, 600)), dateiname),
      schema: KiSpalten,
      maxTokens: 2000,
      aufwand: "low",
    });
    const antwort: SpaltenAntwort = { profil: profilAusKiSpalten(ergebnis.daten), modell: ergebnis.modell };
    return Response.json(antwort);
  } catch (e) {
    if (e instanceof KiFehler) return Response.json({ fehler: e.message }, { status: e.status && e.status >= 400 && e.status < 600 ? e.status : 502 });
    return Response.json({ fehler: e instanceof Error ? e.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
