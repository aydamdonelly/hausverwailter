import { MODELL, kiVerfuegbar } from "@/lib/ki/client";
import { zugangNoetig, zugangOk } from "@/lib/zugang";

export const runtime = "nodejs";

/** Sagt der Oberfläche, was der Server kann: KI konfiguriert? Zugangscode nötig? Welches Modell? */
export async function GET(req: Request) {
  return Response.json({
    kiVerfuegbar: kiVerfuegbar(),
    modell: MODELL,
    zugangNoetig: zugangNoetig(),
    zugangOk: zugangOk(req),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
