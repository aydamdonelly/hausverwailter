import { z } from "zod";
import { Angebot, Firma, Mahnung, Rechnung } from "@/lib/domain/schema";
import { pdfDateiname, type PdfAnfrage } from "@/lib/pdf";
import { pdfRendern } from "@/lib/pdf/rendern";
import { verweigert, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = {
  angebot: z.object({ dokument: Angebot, firma: Firma }),
  rechnung: z.object({ dokument: Rechnung, firma: Firma }),
  mahnung: z.object({ dokument: Mahnung, firma: Firma }),
} as const;

type Art = keyof typeof SCHEMA;

function istArt(art: string): art is Art {
  return art in SCHEMA;
}

/**
 * POST /api/pdf/angebot | rechnung | mahnung
 * Body: { dokument: Angebot | Rechnung | Mahnung, firma: Firma }
 * Antwort: application/pdf (inline, Dateiname im Content-Disposition); Fehler als JSON { fehler }.
 */
export async function POST(req: Request, ctx: { params: Promise<{ art: string }> }) {
  if (!zugangOk(req)) return verweigert();
  const { art } = await ctx.params;
  if (!istArt(art)) {
    return Response.json({ fehler: `Unbekannte Dokumentart „${art}“. Möglich sind angebot, rechnung und mahnung.` }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ fehler: "Der Anfragetext ist kein gültiges JSON." }, { status: 400 });
  }

  const geprueft = SCHEMA[art].safeParse(body);
  if (!geprueft.success) {
    const probleme = geprueft.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(Wurzel)"}: ${i.message}`);
    const bezeichnung = { angebot: "das Angebot", rechnung: "die Rechnung", mahnung: "die Mahnung" }[art];
    return Response.json({ fehler: `Die Daten für ${bezeichnung} sind unvollständig: ${probleme.join("; ")}` }, { status: 400 });
  }

  // Die drei Fälle sind nach dem Parsen typsicher; das Objekt hat je Art das passende Dokument.
  const anfrage = { art, ...geprueft.data } as PdfAnfrage;

  try {
    const pdf = await pdfRendern(anfrage);
    const dateiname = pdfDateiname(anfrage);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(pdf.length),
        "content-disposition": `inline; filename="${dateiname.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(dateiname)}`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    const grund = e instanceof Error ? e.message : String(e);
    console.error("PDF-Erzeugung fehlgeschlagen:", e);
    return Response.json({ fehler: `Das PDF konnte nicht erzeugt werden: ${grund}` }, { status: 500 });
  }
}
