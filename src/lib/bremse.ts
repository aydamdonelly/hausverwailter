/**
 * Einfache Bremse gegen Missbrauch der KI-Routen: höchstens N Aufrufe pro Minute und Absender.
 * Läuft im Speicher der Instanz (auf Vercel je Function-Instanz), reicht für eine Demo. Für den
 * Produktivbetrieb: Zugangscode plus Ausgabenlimit in der Anthropic-Konsole plus WAF-Regel.
 */
const zaehler = new Map<string, { bis: number; n: number }>();

export function bremse(req: Request, bereich: string, proMinute: number): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "lokal";
  const schluessel = `${bereich}:${ip}`;
  const jetzt = Date.now();
  const eintrag = zaehler.get(schluessel);
  if (!eintrag || eintrag.bis < jetzt) {
    zaehler.set(schluessel, { bis: jetzt + 60_000, n: 1 });
    return null;
  }
  eintrag.n += 1;
  if (eintrag.n > proMinute) {
    return Response.json({ fehler: "Zu viele Anfragen in kurzer Zeit. Bitte eine Minute warten." }, { status: 429 });
  }
  return null;
}
