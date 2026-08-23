import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Leer } from "@/components/ui/Leer";

export default function Seite() {
  return (
    <>
      <Seitenkopf titel="Stammdaten" text="Firma, Objekte, Personen, Kostenarten, Leistungskatalog." />
      <Leer titel="Noch im Bau">Diese Seite wird gerade gebaut.</Leer>
    </>
  );
}
