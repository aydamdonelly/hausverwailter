/**
 * Buchungssätze aus zugeordneten Bankumsätzen (quelle "bank"). Gebucht werden Mieteingänge,
 * Hausgeld, Bankentgelte und Auszahlungen an den Eigentümer. Belegzahlungen erzeugen keine
 * neue Buchung (die gibt es aus dem Beleg schon), sie markieren nur den Beleg als bezahlt.
 */
import { Buchung, type Bankkonto, type Bankumsatz, type Kostenart, type Person } from "../domain/schema";
import { monatName } from "../format";

export const BUCHBARE_ARTEN = new Set<Bankumsatz["zuordnung"]["art"]>(["mieteingang", "hausgeld", "gebuehr", "auszahlung_eigentuemer"]);

export function istBuchbar(u: Bankumsatz): boolean {
  return BUCHBARE_ARTEN.has(u.zuordnung.art) && (u.zuordnung.art === "gebuehr" || u.zuordnung.art === "auszahlung_eigentuemer" || Boolean(u.zuordnung.personId));
}

export function buchungAusUmsatz(
  u: Bankumsatz,
  konto: Bankkonto,
  kostenarten: Kostenart[],
  personen: Person[],
  kontenrahmen: "SKR03" | "SKR04",
  neueId: () => string,
  jetzt: string,
): Buchung | null {
  if (!istBuchbar(u)) return null;
  const z = u.zuordnung;
  const person = z.personId ? personen.find((p) => p.id === z.personId) : undefined;
  const kostenart = z.kostenartCode ? kostenarten.find((k) => k.code === z.kostenartCode) : undefined;
  const kontoNr = kostenart ? (kontenrahmen === "SKR04" ? kostenart.kontoSkr04 : kostenart.kontoSkr03) : "";
  let text: string;
  switch (z.art) {
    case "mieteingang":
      text = `Miete ${z.monat ? monatName(z.monat) : ""} ${person?.name ?? u.name}`.replace(/\s+/g, " ").trim();
      break;
    case "hausgeld":
      text = `Hausgeld ${z.monat ? monatName(z.monat) : ""} ${person?.name ?? u.name}`.replace(/\s+/g, " ").trim();
      break;
    case "gebuehr":
      text = `Bankentgelt ${u.buchungstext || u.verwendungszweck}`.trim();
      break;
    default:
      text = `Auszahlung an Eigentümer ${u.name}`.trim();
  }
  const betrag = Math.abs(u.betrag);
  return Buchung.parse({
    id: neueId(),
    datum: u.buchungstag,
    bankumsatzId: u.id,
    objektId: konto.objektId ?? person?.objektId ?? null,
    kostenartCode: z.kostenartCode,
    umlagefaehig: kostenart ? kostenart.umlagefaehig : null,
    konto: kontoNr,
    gegenkonto: "",
    belegnummer: u.endToEndId || "",
    buchungstext: text,
    netto: betrag,
    ust: 0,
    brutto: betrag,
    ustSatz: 0,
    sollHaben: u.betrag >= 0 ? "H" : "S",
    quelle: "bank",
    erstelltAm: jetzt,
  });
}
