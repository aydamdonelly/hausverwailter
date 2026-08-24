"use client";

import { useSearchParams } from "next/navigation";
import { Uebersicht } from "./Uebersicht";
import { AnfrageAnsicht } from "./AnfrageAnsicht";
import { AngebotAnsicht } from "./AngebotAnsicht";

/** Eine Seite, drei Ansichten: Übersicht, eine Anfrage (?anfrage=…), ein Angebot (?angebot=…). */
export function AngeboteSeite() {
  const params = useSearchParams();
  const angebotId = params.get("angebot");
  const anfrageId = params.get("anfrage");
  if (angebotId) return <AngebotAnsicht angebotId={angebotId} />;
  if (anfrageId) return <AnfrageAnsicht anfrageId={anfrageId} />;
  return <Uebersicht />;
}
