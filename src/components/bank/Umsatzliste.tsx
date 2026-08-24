"use client";

import { useMemo, useState } from "react";
import type { Bankkonto, Bankumsatz, Beleg, Einheit, Objekt, Person, Rechnung, ZuordnungArt } from "@/lib/domain/schema";
import { betrag, datum, kurz, monatName } from "@/lib/format";
import { istBuchbar } from "@/lib/bank/buchungen";
import { ApiFehler } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Auswahl, Eingabe } from "@/components/ui/Feld";
import { Stempel } from "@/components/ui/Stempel";
import { Leer } from "@/components/ui/Leer";
import { buchungZuruecknehmen, kiZuordnen, regelnAnwenden, sichereBuchen, umsatzBuchen, zuordnungAendern } from "./aktionen";
import { ART_TEXT, ARTEN_REIHENFOLGE, QUELLE_TEXT, SICHERHEIT_TEXT, type Meldung } from "./texte";

type Filter = "alle" | "offen" | "zugeordnet" | "gebucht";

export function Umsatzliste({
  konto,
  umsaetze,
  personen,
  einheiten,
  objekte,
  belege,
  rechnungen,
  verbucht,
  monat,
  onMonat,
  onMeldung,
}: {
  konto: Bankkonto;
  umsaetze: Bankumsatz[];
  personen: Person[];
  einheiten: Einheit[];
  objekte: Objekt[];
  belege: Beleg[];
  rechnungen: Rechnung[];
  /** IDs der Umsätze, die schon gebucht bzw. als Zahlung verknüpft sind */
  verbucht: Set<string>;
  monat: string;
  onMonat: (m: string) => void;
  onMeldung: (m: Meldung | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("alle");
  const [laufend, setLaufend] = useState<{ text: string; fertig?: number; gesamt?: number } | null>(null);
  const [alleMonate, setAlleMonate] = useState(false);

  const personenKonto = useMemo(() => personen.filter((p) => p.aktiv && (!konto.objektId || p.objektId === konto.objektId)), [personen, konto.objektId]);
  const einheitName = useMemo(() => new Map(einheiten.map((e) => [e.id, e.bezeichnung])), [einheiten]);
  const objektName = useMemo(() => new Map(objekte.map((o) => [o.id, o.kurzname])), [objekte]);
  const belegName = useMemo(() => new Map(belege.map((b) => [b.id, b])), [belege]);
  const rechnungName = useMemo(() => new Map(rechnungen.map((r) => [r.id, r])), [rechnungen]);

  const imMonat = useMemo(() => umsaetze.filter((u) => alleMonate || u.buchungstag.startsWith(monat)).sort((a, b) => (a.buchungstag < b.buchungstag ? 1 : a.buchungstag > b.buchungstag ? -1 : 0)), [umsaetze, monat, alleMonate]);
  const zaehler = {
    alle: imMonat.length,
    offen: imMonat.filter((u) => u.zuordnung.art === "offen").length,
    zugeordnet: imMonat.filter((u) => u.zuordnung.art !== "offen" && !verbucht.has(u.id)).length,
    gebucht: imMonat.filter((u) => verbucht.has(u.id)).length,
  };
  const liste = imMonat.filter((u) => {
    if (filter === "offen") return u.zuordnung.art === "offen";
    if (filter === "zugeordnet") return u.zuordnung.art !== "offen" && !verbucht.has(u.id);
    if (filter === "gebucht") return verbucht.has(u.id);
    return true;
  });
  const sichere = umsaetze.filter((u) => u.zuordnung.sicherheit === "sicher" && u.zuordnung.art !== "offen" && !verbucht.has(u.id) && (istBuchbar(u) || (u.zuordnung.art === "belegzahlung" && u.zuordnung.belegId) || (u.zuordnung.art === "honorar" && u.zuordnung.rechnungId))).length;
  const offeneGesamt = umsaetze.filter((u) => u.zuordnung.art === "offen" || (u.zuordnung.quelle === "regel" && u.zuordnung.sicherheit === "unsicher")).length;

  async function zuordnenLassen() {
    onMeldung(null);
    setLaufend({ text: "Regeln laufen…" });
    try {
      const regel = await regelnAnwenden(konto.id);
      setLaufend({ text: "Die KI prüft die offenen Umsätze…", fertig: 0, gesamt: offeneGesamt });
      let ki = 0;
      try {
        ki = await kiZuordnen(konto.id, (fertig, gesamt) => setLaufend({ text: "Die KI prüft die offenen Umsätze…", fertig, gesamt }));
      } catch (e) {
        onMeldung({ ton: "warnung", text: `Regeln: ${regel} neu zugeordnet. Die KI war nicht erreichbar${e instanceof ApiFehler ? ` (${e.message})` : ""}.` });
        return;
      }
      onMeldung({ ton: "ok", text: `Regeln: ${regel} neu zugeordnet. KI: ${ki} Vorschläge. Bitte die Vorschläge in der Liste prüfen; gebucht wird erst auf Klick.` });
    } finally {
      setLaufend(null);
    }
  }

  async function alleSicherenBuchen() {
    setLaufend({ text: "Wird gebucht…" });
    try {
      const n = await sichereBuchen(konto.id);
      onMeldung({ ton: "ok", text: n ? `${n} sichere Zuordnungen gebucht.` : "Nichts zu buchen." });
    } finally {
      setLaufend(null);
    }
  }

  function zielText(u: Bankumsatz): string {
    const z = u.zuordnung;
    if (z.personId) {
      const p = personen.find((x) => x.id === z.personId);
      return p ? `${p.name}${p.einheitId ? `, ${einheitName.get(p.einheitId) ?? ""}` : ""}` : "";
    }
    if (z.belegId) {
      const b = belegName.get(z.belegId);
      return b ? `${b.lieferant.name} ${b.rechnungsnummer}`.trim() : "";
    }
    if (z.rechnungId) return rechnungName.get(z.rechnungId)?.nummer ?? "";
    return "";
  }

  return (
    <div>
      {umsaetze.length ? (
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-sm text-tinte-2">Monat</span>
            <div className="w-44">
              <Eingabe type="month" value={monat} onChange={(e) => e.target.value && onMonat(e.target.value)} disabled={alleMonate} />
            </div>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-tinte-2">
            <input type="checkbox" checked={alleMonate} onChange={(e) => setAlleMonate(e.target.checked)} /> alle Monate
          </label>
          <div className="flex flex-wrap gap-5 pb-2 text-[0.9375rem]">
            {(["alle", "offen", "zugeordnet", "gebucht"] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`transition-colors ${filter === f ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}>
                {{ alle: "Alle", offen: "Offen", zugeordnet: "Zugeordnet", gebucht: "Gebucht" }[f]} <span className="zahl text-tinte-3">{zaehler[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {laufend ? (
            <span className="flex items-center gap-3 text-sm text-tinte-2">
              {laufend.text}
              {laufend.gesamt ? ` ${laufend.fertig ?? 0} von ${laufend.gesamt}` : ""}
              <span className="lesebalken w-32" aria-hidden="true" />
            </span>
          ) : null}
          <Button variante="sekundaer" onClick={zuordnenLassen} disabled={laufend !== null || !umsaetze.length}>
            Zuordnen lassen
          </Button>
          <Button onClick={alleSicherenBuchen} disabled={laufend !== null || !sichere}>
            {sichere === 0 ? "Sichere Zuordnungen buchen" : sichere === 1 ? "1 sichere Zuordnung buchen" : `${sichere} sichere Zuordnungen buchen`}
          </Button>
        </div>
      </div>
      ) : null}

      {!umsaetze.length ? (
        <Leer titel="Noch keine Umsätze auf diesem Konto">Legen Sie oben einen Kontoauszug ab. Die App erkennt das Format, übernimmt die Umsätze und ordnet zu, was die Regeln sicher erkennen.</Leer>
      ) : (
        <div className="blatt overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Umsatz</th>
                <th className="zahl">Betrag</th>
                <th>Zuordnung</th>
                <th>Sicherheit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((u) => {
                const z = u.zuordnung;
                const gebucht = verbucht.has(u.id);
                const brauchtPerson = z.art === "mieteingang" || z.art === "hausgeld" || z.art === "kaution";
                const buchbar = !gebucht && (istBuchbar(u) || (z.art === "belegzahlung" && z.belegId) || (z.art === "honorar" && z.rechnungId));
                return (
                  <tr key={u.id}>
                    <td className="whitespace-nowrap">{datum(u.buchungstag)}</td>
                    <td className="min-w-64">
                      <div className="font-medium">{u.name || <span className="text-tinte-3">(kein Name)</span>}</div>
                      <div className="text-sm text-tinte-2" title={u.verwendungszweck}>
                        {kurz(u.verwendungszweck, 70) || <span className="text-tinte-3">(kein Verwendungszweck)</span>}
                      </div>
                      {u.buchungstext ? <div className="text-xs text-tinte-3">{u.buchungstext}</div> : null}
                    </td>
                    <td className={`zahl whitespace-nowrap ${u.betrag < 0 ? "text-stempel-2" : ""}`}>{betrag(u.betrag)} €</td>
                    <td className="min-w-72">
                      <div className="flex flex-col gap-1">
                        <Auswahl value={z.art} disabled={gebucht} aria-label="Art" onChange={(e) => zuordnungAendern(u.id, { art: e.target.value as ZuordnungArt })}>
                          {ARTEN_REIHENFOLGE.map((a) => (
                            <option key={a} value={a}>
                              {a === "offen" ? "(offen)" : ART_TEXT[a]}
                            </option>
                          ))}
                        </Auswahl>
                        {brauchtPerson ? (
                          <div className="flex gap-1">
                            <div className="min-w-0 flex-1">
                              <Auswahl value={z.personId ?? ""} disabled={gebucht} aria-label="Person" onChange={(e) => zuordnungAendern(u.id, { personId: e.target.value || null })}>
                                <option value="">(Person wählen)</option>
                                {personenKonto.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}{p.einheitId ? `, ${einheitName.get(p.einheitId) ?? ""}` : ""}{!konto.objektId ? ` (${objektName.get(p.objektId) ?? ""})` : ""}
                                  </option>
                                ))}
                              </Auswahl>
                            </div>
                            {z.art !== "kaution" ? (
                              <div className="w-36 shrink-0">
                                <Eingabe type="month" value={z.monat ?? ""} disabled={gebucht} aria-label="Monat" onChange={(e) => e.target.value && zuordnungAendern(u.id, { monat: e.target.value })} />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {z.art === "belegzahlung" ? (
                          <Auswahl value={z.belegId ?? ""} disabled={gebucht} aria-label="Beleg" onChange={(e) => zuordnungAendern(u.id, { belegId: e.target.value || null })}>
                            <option value="">(Beleg wählen)</option>
                            {belege
                              .filter((b) => (!b.bezahltAm && !b.bankumsatzId) || b.id === z.belegId)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.lieferant.name} {b.rechnungsnummer} · {betrag(b.bruttoGesamt)} €
                                </option>
                              ))}
                          </Auswahl>
                        ) : null}
                        {z.art === "honorar" ? (
                          <Auswahl value={z.rechnungId ?? ""} disabled={gebucht} aria-label="Rechnung" onChange={(e) => zuordnungAendern(u.id, { rechnungId: e.target.value || null })}>
                            <option value="">(Rechnung wählen)</option>
                            {rechnungen
                              .filter((r) => r.status === "gestellt" || r.id === z.rechnungId)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.nummer} · {r.empfaenger.name} · {betrag(r.brutto)} €
                                </option>
                              ))}
                          </Auswahl>
                        ) : null}
                        {gebucht ? <div className="text-sm text-tinte-2">{ART_TEXT[z.art]}{zielText(u) ? ` · ${zielText(u)}` : ""}{z.monat ? ` · ${monatName(z.monat)}` : ""}</div> : null}
                      </div>
                    </td>
                    <td className="text-sm">
                      {z.art === "offen" ? (
                        <span className="text-tinte-3">{z.begruendung ? kurz(z.begruendung, 60) : "nicht erkannt"}</span>
                      ) : (
                        <>
                          <div>
                            {SICHERHEIT_TEXT[z.sicherheit]} <span className="text-tinte-3">({QUELLE_TEXT[z.quelle]})</span>
                          </div>
                          {z.begruendung ? <div className="text-tinte-3" title={z.begruendung}>{kurz(z.begruendung, 60)}</div> : null}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {gebucht ? (
                        <div className="flex items-center gap-2">
                          <Stempel text={z.art === "belegzahlung" || z.art === "honorar" ? "Bezahlt" : "Gebucht"} ton="gruen" groesse="klein" />
                          <Button variante="text" klein onClick={() => buchungZuruecknehmen(u.id)}>
                            zurück
                          </Button>
                        </div>
                      ) : buchbar ? (
                        <Button variante="sekundaer" klein onClick={() => umsatzBuchen(u.id)}>
                          {z.art === "belegzahlung" ? "Beleg bezahlt" : z.art === "honorar" ? "Rechnung bezahlt" : "Buchen"}
                        </Button>
                      ) : z.art === "offen" ? (
                        <Stempel text="Offen" ton="rot" groesse="klein" />
                      ) : (
                        <span className="text-sm text-tinte-3">{brauchtPerson && !z.personId ? "Person fehlt" : z.art === "belegzahlung" ? "Beleg fehlt" : z.art === "honorar" ? "Rechnung fehlt" : "keine Buchung"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {liste.length === 0 ? <p className="p-5 text-tinte-2">{alleMonate ? "Nichts in dieser Ansicht." : `Keine Umsätze im ${monatName(monat)} in dieser Ansicht.`}</p> : null}
        </div>
      )}
    </div>
  );
}
