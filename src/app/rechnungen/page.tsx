"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { Einstellungen } from "@/lib/domain/schema";
import { ladeBeispieldaten } from "@/lib/beispiel/laden";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Leer } from "@/components/ui/Leer";
import { Button } from "@/components/ui/Button";
import { Honorarlauf } from "@/components/rechnungen/Honorarlauf";
import { SonderrechnungFormular } from "@/components/rechnungen/SonderrechnungFormular";
import { AngeboteAbrechnen } from "@/components/rechnungen/AngeboteAbrechnen";
import { Rechnungsliste } from "@/components/rechnungen/Rechnungsliste";

export default function RechnungenSeite() {
  // null statt undefined, wenn es noch keine Einstellungen gibt: undefined heißt "lädt noch".
  const einstellungenRoh = useLiveQuery(() => db.einstellungen.get("einstellungen").then((e) => e ?? null), []);
  const objekte = useLiveQuery(() => db.objekte.toArray(), []);
  const leistungen = useLiveQuery(() => db.leistungen.toArray(), []);
  const rechnungen = useLiveQuery(() => db.rechnungen.toArray(), []);
  const angebote = useLiveQuery(() => db.angebote.where("status").equals("angenommen").toArray(), []);
  const einstellungen = useMemo(() => (einstellungenRoh === undefined ? undefined : Einstellungen.parse(einstellungenRoh ?? {})), [einstellungenRoh]);

  const geladen = einstellungen && objekte && leistungen && rechnungen && angebote;
  const dienstleister = einstellungen?.firma.branche === "dienstleister";

  return (
    <>
      <Seitenkopf
        titel="Rechnungen"
        text={
          dienstleister
            ? "Ein Klick im Monat: die Pauschalen an alle Objekte, als PDF und XRechnung, mit Buchungssatz. Dazu Zusatzleistungen nach Aufwand und die erste Rechnung zu einem angenommenen Angebot."
            : "Ein Klick im Monat: die Honorarrechnungen an alle Objekte, als PDF und XRechnung, mit Buchungssatz. Dazu Sonderleistungen und die erste Rechnung zu einem angenommenen Angebot."
        }
      />

      {geladen && objekte.length === 0 && rechnungen.length === 0 ? (
        <Leer
          titel="Noch keine Objekte"
          aktion={
            <Button
              onClick={async () => {
                await ladeBeispieldaten();
              }}
            >
              Beispielbetrieb laden
            </Button>
          }
        >
          Der Honorarlauf braucht Objekte mit Auftraggeber. Legen Sie sie unter{" "}
          <Link href="/stammdaten" className="underline">
            Stammdaten
          </Link>{" "}
          an, oder probieren Sie es mit dem Beispielbetrieb: fünf Objekte, eines mit Pauschale.
        </Leer>
      ) : null}

      {geladen && (objekte.length > 0 || rechnungen.length > 0) ? (
        <>
          <Honorarlauf einstellungen={einstellungen} objekte={objekte} leistungen={leistungen} rechnungen={rechnungen} />
          <SonderrechnungFormular einstellungen={einstellungen} objekte={objekte} leistungen={leistungen} />
          <AngeboteAbrechnen einstellungen={einstellungen} objekte={objekte} angebote={angebote} rechnungen={rechnungen} />
          <Rechnungsliste einstellungen={einstellungen} objekte={objekte} rechnungen={rechnungen} />
        </>
      ) : null}
    </>
  );
}
