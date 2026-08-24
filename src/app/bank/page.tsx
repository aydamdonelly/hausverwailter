import { Suspense } from "react";
import { BankSeite } from "@/components/bank/BankSeite";

/** Bank: Kontoauszüge importieren, Umsätze zuordnen, Mieteingang prüfen, Zahlungserinnerungen vorschlagen. */
export default function Seite() {
  return (
    <Suspense fallback={null}>
      <BankSeite />
    </Suspense>
  );
}
