import { erkenneDokument } from "@/lib/belege/erkennen";
import type { ErkennungsKontext } from "@/lib/belege/prompts";
import { KiFehler } from "@/lib/ki/client";
import { verweigert, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * POST multipart/form-data: datei (File), kontext (JSON-String: ErkennungsKontext), zusatz (optional).
 * Antwort: ErkennungsErgebnis. Die Datei wird nicht gespeichert; sie geht nur an die KI.
 */
export async function POST(req: Request) {
  if (!zugangOk(req)) return verweigert();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ fehler: "Erwartet multipart/form-data mit dem Feld 'datei'." }, { status: 400 });
  }
  const datei = form.get("datei");
  if (!(datei instanceof File)) return Response.json({ fehler: "Feld 'datei' fehlt." }, { status: 400 });
  if (datei.size > MAX_BYTES) return Response.json({ fehler: "Datei größer als 25 MB." }, { status: 413 });
  let kontext: ErkennungsKontext;
  try {
    kontext = JSON.parse(String(form.get("kontext") ?? "{}")) as ErkennungsKontext;
    kontext.objekte ??= [];
    kontext.kostenarten ??= [];
    kontext.firma ??= { name: "Hausverwaltung", branche: "hausverwaltung" };
  } catch {
    return Response.json({ fehler: "Feld 'kontext' ist kein gültiges JSON." }, { status: 400 });
  }
  try {
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const ergebnis = await erkenneDokument({ bytes, mime: datei.type, dateiname: datei.name, kontext, zusatz: String(form.get("zusatz") ?? "") || undefined });
    return Response.json(ergebnis);
  } catch (e) {
    if (e instanceof KiFehler) return Response.json({ fehler: e.message }, { status: e.status && e.status >= 400 && e.status < 600 ? e.status : 502 });
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    const status = /nicht unterstützt/.test(msg) ? 415 : 500;
    return Response.json({ fehler: msg }, { status });
  }
}
