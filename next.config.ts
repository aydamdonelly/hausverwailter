import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer bringt eigene Node-Abhängigkeiten mit und darf nicht gebundelt werden.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Die Schriftdateien werden von den PDF-Routen zur Laufzeit vom Dateisystem gelesen
  // (auch auf Vercel), deshalb müssen sie in das Function-Bundle mit hinein.
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./public/fonts/static/**"],
  },
};

export default nextConfig;
