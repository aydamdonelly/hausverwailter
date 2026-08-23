/**
 * Optionaler Zugangsschutz für eine öffentlich erreichbare Demo (z. B. auf Vercel).
 * Ist ZUGANGSCODE gesetzt, muss jeder API-Aufruf den Code im Header "x-zugangscode" mitgeben.
 * Die Oberfläche fragt den Code einmal ab und merkt ihn sich im Browser.
 * Ohne ZUGANGSCODE (lokaler Betrieb) ist alles offen.
 */
export function zugangNoetig(): boolean {
  return Boolean(process.env.ZUGANGSCODE);
}

export function zugangOk(req: Request): boolean {
  const code = process.env.ZUGANGSCODE;
  if (!code) return true;
  const geliefert = req.headers.get("x-zugangscode") ?? "";
  return geliefert === code;
}

export function verweigert(): Response {
  return Response.json({ fehler: "Zugangscode fehlt oder ist falsch." }, { status: 401 });
}
