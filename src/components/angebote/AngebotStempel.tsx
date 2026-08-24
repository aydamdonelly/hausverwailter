import type { Angebot } from "@/lib/domain/schema";
import { Stempel } from "@/components/ui/Stempel";
import { STATUS_TEXT } from "./aktionen";

const TON: Record<Angebot["status"], "tinte" | "ocker" | "gruen" | "rot"> = {
  entwurf: "tinte",
  versendet: "ocker",
  angenommen: "gruen",
  abgelehnt: "rot",
};

/** Der Status eines Angebots als Stempel, überall gleich. */
export function AngebotStempel({ status, neu = false, groesse = "klein" }: { status: Angebot["status"]; neu?: boolean; groesse?: "klein" | "normal" | "gross" }) {
  return <Stempel text={STATUS_TEXT[status]} ton={TON[status]} groesse={groesse} neu={neu} />;
}
