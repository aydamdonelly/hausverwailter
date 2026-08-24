import { Suspense } from "react";
import { StammdatenSeite } from "@/components/stammdaten/StammdatenSeite";
import { Seitenkopf } from "@/components/ui/Seitenkopf";

export default function Seite() {
  return (
    <Suspense fallback={<Seitenkopf titel="Stammdaten" text="Firma, Objekte, Personen, Kostenarten, Leistungskatalog und Einstellungen." />}>
      <StammdatenSeite />
    </Suspense>
  );
}
