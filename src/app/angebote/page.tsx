import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Leer } from "@/components/ui/Leer";

export default function Seite() {
  return (
    <>
      <Seitenkopf titel="Angebote" text="Aus einer Anfrage wird ein fertiges Angebot mit Anschreiben." />
      <Leer titel="Noch im Bau">Diese Seite wird gerade gebaut.</Leer>
    </>
  );
}
