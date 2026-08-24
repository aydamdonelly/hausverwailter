/**
 * Zuordnung offener Bankumsätze durch die KI, wenn die Regeln (abgleich.ts) nicht greifen.
 * Die KI bekommt eine Kandidatenliste (Personen mit Soll, offene Belege, eigene Rechnungen)
 * und liefert je Umsatz einen Vorschlag mit Sicherheit. Alles Weitere (Buchen, Sollstellung)
 * bleibt Code. Der Aufruf selbst liegt in app/api/bank/zuordnen/route.ts.
 */
import type { KiBankzuordnung } from "../belege/schema-ki";
import type { Zuordnung, ZuordnungArt } from "../domain/schema";

export interface KiUmsatz {
  index: number;
  buchungstag: string;
  betrag: number;
  name: string;
  verwendungszweck: string;
  buchungstext: string;
}

export interface KiPersonKandidat {
  id: string;
  name: string;
  rolle: string;
  einheit: string;
  objekt: string;
  sollMonat: number;
}

export interface KiBelegKandidat {
  id: string;
  lieferant: string;
  rechnungsnummer: string;
  brutto: number;
  rechnungsdatum: string;
}

export interface KiRechnungKandidat {
  id: string;
  nummer: string;
  empfaenger: string;
  brutto: number;
}

export interface ZuordnungsAnfrage {
  konto: { bezeichnung: string; objekt: string; istVerwaltungskonto: boolean };
  umsaetze: KiUmsatz[];
  personen: KiPersonKandidat[];
  belege: KiBelegKandidat[];
  rechnungen: KiRechnungKandidat[];
  auftraggeber: string;
}

export interface ZuordnungsAntwort {
  zuordnungen: { index: number; zuordnung: Zuordnung }[];
  modell: string;
}

/** Höchstens so viele Umsätze je KI-Aufruf, damit Antwort und Grammatik klein bleiben. */
export const KI_STAPEL = 40;

export function systemZuordnung(a: ZuordnungsAnfrage): string {
  const personen = a.personen.length
    ? a.personen.map((p) => `- ${p.id}: ${p.name} (${p.rolle}${p.einheit ? `, ${p.einheit}` : ""}, ${p.objekt}), Soll je Monat ${p.sollMonat.toFixed(2)} €`).join("\n")
    : "- (keine)";
  const belege = a.belege.length
    ? a.belege.map((b) => `- ${b.id}: ${b.lieferant}, Rechnung ${b.rechnungsnummer || "ohne Nummer"} vom ${b.rechnungsdatum || "?"}, ${b.brutto.toFixed(2)} €`).join("\n")
    : "- (keine offenen Belege)";
  const rechnungen = a.rechnungen.length
    ? a.rechnungen.map((r) => `- ${r.id}: ${r.nummer} an ${r.empfaenger}, ${r.brutto.toFixed(2)} €`).join("\n")
    : "- (keine offenen Rechnungen)";
  return `Du bist die Buchhaltung einer deutschen Hausverwaltung und ordnest Bankumsätze zu, die die festen Regeln (IBAN, Name, Betrag) nicht zuordnen konnten.

Konto: ${a.konto.bezeichnung}${a.konto.istVerwaltungskonto ? " (Geschäftskonto der Verwaltung)" : ` (Objektkonto ${a.konto.objekt})`}
${a.auftraggeber ? `Auftraggeber/Eigentümer des Objekts: ${a.auftraggeber}\n` : ""}
Arten:
- mieteingang: Miete oder Nebenkostenvorauszahlung eines Mieters (Eingang, positiv)
- hausgeld: Hausgeld eines Wohnungseigentümers (Eingang, positiv)
- belegzahlung: Bezahlung einer Eingangsrechnung (Ausgang, negativ), belegId aus der Liste
- honorar: Zahlung auf eine eigene Rechnung der Verwaltung (rechnungId aus der Liste)
- gebuehr: Kontoführung, Entgelte, Zinsen der Bank
- auszahlung_eigentuemer: Überweisung an den Eigentümer/Auftraggeber des Objekts
- kaution: Mietkaution (Eingang oder Rückzahlung)
- sonstiges: klar erkennbar, aber keine der Arten
- offen: nicht zuzuordnen

Regeln:
1. personId nur aus der Personenliste, sonst null. Ein Name, der einer Person nur ähnlich ist, reicht nicht für "sicher"; "wahrscheinlich" nur mit einem zweiten Anhaltspunkt (Betrag = Soll, Einheit im Verwendungszweck, Partner mit gleichem Nachnamen). Sonst "unsicher" oder offen.
2. Ehepartner, Mitbewohner oder Eltern zahlen oft unter anderem Namen; dann entscheiden Einheit ("Whg 3"), Betrag und Verwendungszweck. Nie einer Person zuordnen, nur weil der Betrag ungefähr passt.
3. monat: der bezahlte Monat als YYYY-MM, wenn er im Verwendungszweck steht ("Miete August", "08/2026", "HG 8/26"). Sonst der Buchungsmonat; Zahlungen ab dem 25. eines Monats gelten für den Folgemonat.
4. Bei Teilzahlungen (Betrag deutlich unter Soll) trotzdem die Person zuordnen; Teil/Rest prüft die Software.
5. Beträge nie umrechnen oder addieren. Du liest nur.
6. begruendung: ein kurzer Satz auf Deutsch, was den Ausschlag gab.

Personen (Mieter/Eigentümer):
${personen}

Offene Eingangsrechnungen (Belege):
${belege}

Offene eigene Rechnungen:
${rechnungen}`;
}

export function auftragZuordnung(umsaetze: KiUmsatz[]): string {
  return `Ordne diese Umsätze zu (umsatzIndex = index):\n${umsaetze
    .map((u) => `${u.index}: ${u.buchungstag} | ${u.betrag.toFixed(2)} € | ${u.name || "(kein Name)"} | ${u.verwendungszweck || "(kein Verwendungszweck)"}${u.buchungstext ? ` | ${u.buchungstext}` : ""}`)
    .join("\n")}`;
}

const ARTEN: ZuordnungArt[] = ["mieteingang", "hausgeld", "belegzahlung", "honorar", "gebuehr", "auszahlung_eigentuemer", "kaution", "sonstiges", "offen"];

/**
 * KI-Antwort prüfen und in Zuordnungen wandeln: nur bekannte Personen, gültige Monate,
 * Arten aus der Liste. Was nicht passt, bleibt offen.
 */
export function zuordnungenAusKi(ki: KiBankzuordnung, anfrage: ZuordnungsAnfrage): { index: number; zuordnung: Zuordnung }[] {
  const personen = new Set(anfrage.personen.map((p) => p.id));
  const belege = new Map(anfrage.belege.map((b) => [b.id, b]));
  const rechnungen = new Map(anfrage.rechnungen.map((r) => [r.id, r]));
  const umsaetze = new Map(anfrage.umsaetze.map((u) => [u.index, u]));
  const ergebnis: { index: number; zuordnung: Zuordnung }[] = [];
  for (const z of ki.zuordnungen) {
    const u = umsaetze.get(z.umsatzIndex);
    if (!u) continue;
    const art: ZuordnungArt = ARTEN.includes(z.art) ? z.art : "offen";
    const personId = z.personId && personen.has(z.personId) ? z.personId : null;
    let belegId: string | null = null;
    let rechnungId: string | null = null;
    if (art === "belegzahlung") {
      // Die KI liefert keine belegId im Schema; wir suchen den Beleg über Betrag (und Begründung/Zweck) selbst.
      const kandidaten = [...belege.values()].filter((b) => Math.abs(Math.abs(u.betrag) - b.brutto) < 0.011);
      if (kandidaten.length === 1) belegId = kandidaten[0].id;
      else if (kandidaten.length > 1) {
        const text = `${u.verwendungszweck} ${u.name} ${z.begruendung}`.toLowerCase();
        const treffer = kandidaten.find((b) => (b.rechnungsnummer && text.includes(b.rechnungsnummer.toLowerCase())) || text.includes(b.lieferant.toLowerCase().split(" ")[0]));
        belegId = treffer ? treffer.id : null;
      }
    }
    if (art === "honorar") {
      const kandidaten = [...rechnungen.values()].filter((r) => Math.abs(Math.abs(u.betrag) - r.brutto) < 0.011 || u.verwendungszweck.includes(r.nummer));
      if (kandidaten.length === 1) rechnungId = kandidaten[0].id;
    }
    const monat = z.monat && /^\d{4}-\d{2}$/.test(z.monat) ? z.monat : null;
    const sicherheit: Zuordnung["sicherheit"] = (art === "mieteingang" || art === "hausgeld") && !personId ? "unsicher" : z.sicherheit;
    ergebnis.push({
      index: z.umsatzIndex,
      zuordnung: {
        art: (art === "mieteingang" || art === "hausgeld") && !personId ? "offen" : art,
        personId,
        belegId,
        rechnungId,
        kostenartCode: art === "gebuehr" ? "BANKGEBUEHREN" : null,
        monat: art === "mieteingang" || art === "hausgeld" ? monat : null,
        sicherheit,
        quelle: "ki",
        begruendung: z.begruendung || "",
      },
    });
  }
  return ergebnis;
}
