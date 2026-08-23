import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Leer } from "@/components/ui/Leer";

export default function Seite() {
  return (
    <>
      <Seitenkopf titel="Posteingang" text="Belege, Fotos, Mails und Kontoauszüge hier ablegen. Die App liest sie, prüft sie und schlägt die Buchung vor." />
      <Leer titel="Noch im Bau">Diese Seite wird gerade gebaut.</Leer>
    </>
  );
}
