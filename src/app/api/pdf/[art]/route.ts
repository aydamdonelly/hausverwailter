import { verweigert, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/pdf/angebot | rechnung | mahnung
 * Body: { dokument: Angebot | Rechnung | Mahnung, firma: Firma }
 * Antwort: application/pdf. Implementiert vom Modul "pdf".
 */
export async function POST(req: Request, ctx: { params: Promise<{ art: string }> }) {
  if (!zugangOk(req)) return verweigert();
  const { art } = await ctx.params;
  return Response.json({ fehler: `PDF-Erzeugung für "${art}" ist noch nicht implementiert.` }, { status: 501 });
}
