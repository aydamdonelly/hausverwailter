import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Leer } from "@/components/ui/Leer";

export default function Seite() {
  return (
    <>
      <Seitenkopf titel="Protokoll" text="Wer hat wann was gemacht: Nutzer, KI, Regeln." />
      <Leer titel="Noch im Bau">Diese Seite wird gerade gebaut.</Leer>
    </>
  );
}
