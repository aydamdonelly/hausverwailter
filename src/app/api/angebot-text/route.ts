import { AnschreibenEingabe, AnschreibenSchema, auftragAnschreiben, pruefeAnschreiben, systemAnschreiben, type AnschreibenAntwort } from "@/lib/angebote/anschreiben";
import { KiFehler, strukturiert } from "@/lib/ki/client";
import { verweigert, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/angebot-text
 * Body: { anfrage: Anfrage, angebot: Angebot, firma: Firma }
 * Antwort: { anschreiben: string[], antwortBetreff, antwortText, modell, eingabeTokens, ausgabeTokens }
 * Die KI formuliert nur; alle Zahlen kommen fertig gerechnet aus dem Angebot.
 */
export async function POST(req: Request) {
  if (!zugangOk(req)) return verweigert();
  let roh: unknown;
  try {
    roh = await req.json();
  } catch {
    return Response.json({ fehler: "Erwartet JSON mit anfrage, angebot und firma." }, { status: 400 });
  }
  const eingabe = AnschreibenEingabe.safeParse(roh);
  if (!eingabe.success) {
    const erste = eingabe.error.issues[0];
    return Response.json({ fehler: `Eingabe ungültig: ${erste ? `${erste.path.join(".")}: ${erste.message}` : "unbekannt"}` }, { status: 400 });
  }
  const { anfrage, angebot, firma } = eingabe.data;
  const system = systemAnschreiben(firma);
  const auftrag = auftragAnschreiben(anfrage, angebot, firma);

  try {
    let eingabeTokens = 0;
    let ausgabeTokens = 0;
    let modell = "";
    let grund = "";
    // Ein zweiter Versuch mit dem Prüfergebnis als Hinweis, falls die erste Antwort nicht taugt.
    for (let versuch = 0; versuch < 2; versuch++) {
      const e = await strukturiert({
        system,
        auftrag: versuch === 0 ? auftrag : `${auftrag}\n\nDer vorige Versuch wurde abgelehnt: ${grund} Bitte beachte die Vorgaben genau.`,
        schema: AnschreibenSchema,
        maxTokens: 2500,
        aufwand: "medium",
      });
      eingabeTokens += e.eingabeTokens;
      ausgabeTokens += e.ausgabeTokens;
      modell = e.modell;
      const geprueft = pruefeAnschreiben(e.daten);
      if (geprueft.ok) {
        const antwort: AnschreibenAntwort = { ...geprueft.daten, modell, eingabeTokens, ausgabeTokens };
        return Response.json(antwort);
      }
      grund = geprueft.grund;
    }
    return Response.json({ fehler: `Die KI hat kein brauchbares Anschreiben geliefert: ${grund}` }, { status: 502 });
  } catch (e) {
    if (e instanceof KiFehler) return Response.json({ fehler: e.message }, { status: e.status && e.status >= 400 && e.status < 600 ? e.status : 502 });
    return Response.json({ fehler: e instanceof Error ? e.message : "Unbekannter Fehler" }, { status: 500 });
  }
}
