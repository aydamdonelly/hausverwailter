"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/store/db";
import { grundausstattungAnlegen } from "@/lib/beispiel/laden";
import { protokolliere } from "@/lib/store/protokoll";
import { Seitenkopf } from "@/components/ui/Seitenkopf";
import { Hinweis } from "@/components/ui/Hinweis";
import { Reiter } from "./Reiter";
import { FirmaReiter } from "./FirmaReiter";
import { ObjekteReiter } from "./ObjekteReiter";
import { PersonenReiter } from "./PersonenReiter";
import { KostenartenReiter } from "./KostenartenReiter";
import { LeistungenReiter } from "./LeistungenReiter";
import { EinstellungenReiter } from "./EinstellungenReiter";
import { DatenReiter } from "./DatenReiter";

const REITER = [
  { id: "firma", text: "Firma & Briefkopf" },
  { id: "objekte", text: "Objekte" },
  { id: "personen", text: "Personen" },
  { id: "kostenarten", text: "Kostenarten" },
  { id: "leistungen", text: "Leistungskatalog" },
  { id: "einstellungen", text: "Einstellungen" },
  { id: "daten", text: "Daten" },
] as const;
type ReiterId = (typeof REITER)[number]["id"];

function istReiter(x: string | null): x is ReiterId {
  return REITER.some((r) => r.id === x);
}

/** Die Stammdaten: alles, was ein Betrieb über sich weiß, in sieben Reitern. Der aktive Reiter steht in der URL (?reiter=…). */
export function StammdatenSeite() {
  const router = useRouter();
  const pfad = usePathname();
  const params = useSearchParams();
  const reiterParam = params.get("reiter");
  const aktiv: ReiterId = istReiter(reiterParam) ? reiterParam : "firma";
  const [objektFilter, setObjektFilter] = useState<string>(params.get("objekt") ?? "alle");
  const [grundausstattung, setGrundausstattung] = useState(false);
  const geprueft = useRef(false);

  // Beim ersten Öffnen ohne Kostenarten und Leistungen: Grundausstattung anlegen, damit nichts leer ist.
  useEffect(() => {
    if (geprueft.current) return;
    geprueft.current = true;
    (async () => {
      const [k, l] = await Promise.all([db.kostenarten.count(), db.leistungen.count()]);
      if (k === 0 && l === 0) {
        await grundausstattungAnlegen();
        await protokolliere("system", "Grundausstattung angelegt", "stammdaten", "Kostenarten nach BetrKV, Leistungskatalog Hausverwaltung, Staffel");
        setGrundausstattung(true);
      }
    })();
  }, []);

  const wechsel = useCallback(
    (id: ReiterId, objekt?: string) => {
      const p = new URLSearchParams();
      if (id !== "firma") p.set("reiter", id);
      if (id === "personen" && objekt && objekt !== "alle") p.set("objekt", objekt);
      const q = p.toString();
      router.replace(q ? `${pfad}?${q}` : pfad, { scroll: false });
    },
    [router, pfad],
  );

  return (
    <>
      <Seitenkopf
        titel="Stammdaten"
        text="Firma, Objekte, Personen, Kostenarten, Leistungskatalog und Einstellungen. Alles hier lässt sich ohne Hilfe von außen pflegen; ein neuer Betrieb trägt seine Welt in einer halben Stunde ein."
      />
      {grundausstattung ? (
        <div className="mb-5">
          <Hinweis ton="ok">
            Beim ersten Öffnen wurden die Standard-Kostenarten nach § 2 BetrKV und der Leistungskatalog einer Hausverwaltung angelegt. Alles davon lässt sich ändern oder löschen.
          </Hinweis>
        </div>
      ) : null}
      <Reiter eintraege={[...REITER]} aktiv={aktiv} onWechsel={(id) => wechsel(id)} />
      {aktiv === "firma" ? <FirmaReiter /> : null}
      {aktiv === "objekte" ? (
        <ObjekteReiter
          onZuPersonen={(objektId) => {
            setObjektFilter(objektId);
            wechsel("personen", objektId);
          }}
        />
      ) : null}
      {aktiv === "personen" ? (
        <PersonenReiter
          objektFilter={objektFilter}
          onObjektFilter={(id) => {
            setObjektFilter(id);
            wechsel("personen", id);
          }}
        />
      ) : null}
      {aktiv === "kostenarten" ? <KostenartenReiter /> : null}
      {aktiv === "leistungen" ? <LeistungenReiter /> : null}
      {aktiv === "einstellungen" ? <EinstellungenReiter /> : null}
      {aktiv === "daten" ? <DatenReiter /> : null}
    </>
  );
}
