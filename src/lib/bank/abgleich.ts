/**
 * Deterministische Zuordnung von Bankumsätzen. Reihenfolge und Gewichte sind bewusst
 * konservativ: Lieber "offen" als eine falsche Person. Was hier nicht sicher wird, geht an
 * die KI (zuordnen-ki.ts) oder an den Nutzer.
 *
 * Eingänge: IBAN der Person (sicher) → Nachname + Einheit/Betrag (sicher) → Nachname allein
 * (wahrscheinlich) → Betrag = Soll bei genau einer Person (wahrscheinlich).
 * Ausgänge: Bankentgelte → Belege (Betrag = Brutto und Rechnungsnummer/Lieferant/IBAN) →
 * eigene Rechnungen → Auszahlung an den Eigentümer → offen.
 */
import type { Bankkonto, Beleg, Einheit, Objekt, Person, Rechnung, Zuordnung } from "../domain/schema";
import { gleich, rundeGeld } from "../geld";
import { ibanNormalisiert, monatVon } from "../format";

export interface AbgleichUmsatz {
  buchungstag: string;
  betrag: number;
  name: string;
  iban: string;
  verwendungszweck: string;
  buchungstext: string;
}

export interface AbgleichKontext {
  konto: Bankkonto;
  objekte: Objekt[];
  personen: Person[];
  einheiten: Einheit[];
  /** Offene Eingangsrechnungen (bezahltAm null) */
  belege: Beleg[];
  /** Gestellte, unbezahlte eigene Rechnungen */
  rechnungen: Rechnung[];
  firma: { name: string; iban: string };
  /** Toleranz in Euro für "Betrag = Soll" (Einstellungen.mahnwesen.toleranzEuro) */
  toleranz: number;
}

// ---------- Text ----------

const STOPP = new Set(["dr", "prof", "herr", "frau", "familie", "fam", "eheleute", "wg", "und", "u", "gmbh", "mbh", "co", "kg", "ag", "ohg", "gbr", "ug", "e", "v", "ev", "inh", "med", "dipl", "ing", "the", "von", "van", "der", "de", "zu"]);

/** Kleinschreibung, Umlaute als ae/oe/ue/ss, alles außer Buchstaben und Ziffern wird Leerraum. */
export function normalisiere(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalisiere(text).split(" ").filter((t) => t.length >= 2 && !STOPP.has(t));
}

/**
 * Nachnamen einer Person: der letzte Token jedes Namensteils ("WG Becker / Ott" → becker, ott;
 * "Lukas und Marie Hoffmann" → hoffmann; "Müller, Hans" → mueller). Firmen behalten alle Tokens.
 */
export function nachnamen(name: string): string[] {
  const roh = name ?? "";
  if (/,/.test(roh)) {
    const erster = tokens(roh.split(",")[0]);
    return erster.length ? [erster[erster.length - 1]] : [];
  }
  const teile = roh.split(/\s*[/&]\s*|\s+und\s+/i).map(tokens).filter((t) => t.length);
  if (!teile.length) return [];
  if (teile.length === 1) {
    const t = teile[0];
    // Bei "Vorname Nachname" zählt der letzte Token; ein einzelner Token ist selbst der Nachname.
    return t.length ? [t[t.length - 1]] : [];
  }
  // "Lukas und Marie Hoffmann": nur der letzte Teil trägt einen Nachnamen, wenn der erste Teil ein Vorname ist
  const letzter = teile[teile.length - 1];
  const nachname = letzter[letzter.length - 1];
  const ergebnis = new Set<string>([nachname]);
  for (const t of teile.slice(0, -1)) {
    // Ein einzelner Token vor "und" ist meist ein Vorname ("Lukas und Marie Hoffmann"); zwei oder mehr ein eigener Name ("Becker / Ott")
    if (t.length >= 2 || roh.includes("/") || roh.includes("&")) ergebnis.add(t[t.length - 1]);
  }
  return [...ergebnis].filter((t) => t.length >= 3);
}

function enthaeltToken(haystack: string[], token: string): boolean {
  return haystack.includes(token);
}

const MONATE: Record<string, number> = {
  januar: 1, jan: 1, februar: 2, feb: 2, maerz: 3, marz: 3, mrz: 3, mar: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6,
  juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12,
};

/**
 * Welcher Monat wird bezahlt? Aus dem Verwendungszweck ("Miete Juli", "07/2026", "HG 8/26",
 * "2026-07"), sonst aus dem Buchungstag: ab dem 25. gilt der Folgemonat (Miete ist im Voraus
 * fällig, § 556b BGB, viele Daueraufträge laufen am Monatsende).
 */
export function monatAusZweck(zweck: string, buchungstag: string): { monat: string; quelle: "zweck" | "buchungstag" } {
  const jahrBuchung = Number(buchungstag.slice(0, 4));
  const monatBuchung = Number(buchungstag.slice(5, 7));
  // Volle Daten (05.12.2025, 2025-12-05) entfernen, damit "12.2025" darin nicht als Monat gilt
  const text = (zweck ?? "").replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ").replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
  let monat: number | null = null;
  let jahr: number | null = null;

  let m = /(?<![\d.])(0?[1-9]|1[0-2])\s*[/.\-]\s*(20\d{2}|\d{2})(?![\d.])/.exec(text);
  if (m) {
    monat = Number(m[1]);
    jahr = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  }
  if (monat === null) {
    m = /\b(20\d{2})\s*[/-]\s*(0?[1-9]|1[0-2])\b/.exec(text);
    if (m) {
      jahr = Number(m[1]);
      monat = Number(m[2]);
    }
  }
  if (monat === null) {
    const n = normalisiere(text);
    m = /\b(januar|jan|februar|feb|maerz|marz|mrz|mar|april|apr|mai|juni|jun|juli|jul|august|aug|september|sept|sep|oktober|okt|november|nov|dezember|dez)\b(?:\s*(20\d{2}|\d{2})\b)?/.exec(n);
    if (m) {
      monat = MONATE[m[1]];
      if (m[2]) jahr = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    }
  }
  if (monat !== null) {
    if (jahr === null) {
      jahr = jahrBuchung;
      // "Dezember" im Januar gezahlt: gemeint ist der Vormonat; "Januar" im Dezember: der Folgemonat
      if (monat - monatBuchung > 6) jahr -= 1;
      if (monatBuchung - monat > 6) jahr += 1;
    }
    if (jahr >= 2000 && jahr <= 2100) return { monat: `${jahr}-${String(monat).padStart(2, "0")}`, quelle: "zweck" };
  }
  const tag = Number(buchungstag.slice(8, 10));
  if (tag >= 25) {
    const d = new Date(Date.UTC(jahrBuchung, monatBuchung, 1));
    return { monat: d.toISOString().slice(0, 7), quelle: "buchungstag" };
  }
  return { monat: monatVon(buchungstag), quelle: "buchungstag" };
}

/** Findet eine Einheit im Verwendungszweck: "Whg 3", "Wohnung 3", "WE 3", "Einheit 3", oder die Bezeichnung selbst. */
export function einheitImZweck(zweck: string, einheiten: Einheit[]): Einheit | null {
  const n = ` ${normalisiere(zweck)} `;
  for (const e of einheiten) {
    const bez = normalisiere(e.bezeichnung);
    if (bez && n.includes(` ${bez} `)) return e;
    const nummer = /(\d+)/.exec(e.bezeichnung);
    if (nummer) {
      const re = new RegExp(`\\b(whg|wohnung|we|einheit|wohneinheit|apartment|app|top|nr)\\s*0*${nummer[1]}\\b`);
      if (re.test(n)) return e;
    }
    if (e.lage && n.includes(` ${normalisiere(e.lage)} `)) return e;
  }
  return null;
}

// ---------- Personen ----------

export function sollBetrag(p: Person): number {
  return rundeGeld((p.soll.kalt ?? 0) + (p.soll.nebenkosten ?? 0) + (p.soll.hausgeld ?? 0));
}

interface Kandidat {
  person: Person;
  punkte: number;
  gruende: string[];
}

function bewertePerson(p: Person, u: AbgleichUmsatz, k: AbgleichKontext, nameTokens: string[], zweckTokens: string[]): Kandidat {
  const gruende: string[] = [];
  let punkte = 0;
  const iban = ibanNormalisiert(u.iban);
  if (iban && p.ibans.some((i) => ibanNormalisiert(i) === iban)) {
    punkte += 100;
    gruende.push("IBAN bekannt");
  }
  const nn = nachnamen(p.name);
  const imNamen = nn.find((n) => enthaeltToken(nameTokens, n));
  const imZweck = nn.find((n) => enthaeltToken(zweckTokens, n));
  if (imNamen) {
    punkte += 30;
    gruende.push(`Name „${p.name}“ im Auftraggeber`);
  } else if (imZweck) {
    punkte += 25;
    gruende.push(`Name „${p.name}“ im Verwendungszweck`);
  }
  if (imNamen || imZweck) {
    const vornamen = tokens(p.name).filter((t) => !nn.includes(t));
    if (vornamen.some((v) => enthaeltToken(nameTokens, v) || enthaeltToken(zweckTokens, v))) punkte += 5;
  }
  const einheit = p.einheitId ? k.einheiten.find((e) => e.id === p.einheitId) : null;
  if (einheit) {
    const gefunden = einheitImZweck(u.verwendungszweck, [einheit]);
    if (gefunden) {
      punkte += 40;
      gruende.push(`Einheit ${einheit.bezeichnung} im Verwendungszweck`);
    }
  }
  const soll = sollBetrag(p);
  if (soll > 0 && u.betrag > 0) {
    if (gleich(u.betrag, soll, k.toleranz)) {
      punkte += 20;
      gruende.push(`Betrag = Soll (${soll.toFixed(2).replace(".", ",")} €)`);
    } else if (gleich(u.betrag, soll / 2, k.toleranz)) {
      punkte += 10;
      gruende.push("Betrag = halbes Soll");
    } else if ([2, 3].some((n) => gleich(u.betrag, soll * n, k.toleranz))) {
      punkte += 10;
      gruende.push("Betrag = mehrere Monate Soll");
    } else if (p.soll.kalt > 0 && gleich(u.betrag, p.soll.kalt, k.toleranz)) {
      punkte += 8;
      gruende.push("Betrag = Kaltmiete");
    }
  }
  return { person: p, punkte, gruende };
}

function personenFuerKonto(k: AbgleichKontext): Person[] {
  const aktiv = k.personen.filter((p) => p.aktiv);
  if (k.konto.objektId) return aktiv.filter((p) => p.objektId === k.konto.objektId);
  return aktiv;
}

function artFuerPerson(p: Person): Zuordnung["art"] {
  return p.rolle === "eigentuemer" ? "hausgeld" : "mieteingang";
}

function zuordnung(teil: Partial<Zuordnung>): Zuordnung {
  return { art: "offen", personId: null, belegId: null, rechnungId: null, kostenartCode: null, monat: null, sicherheit: "unsicher", quelle: "regel", begruendung: "", ...teil };
}

// ---------- Eingänge ----------

function eingangZuordnen(u: AbgleichUmsatz, k: AbgleichKontext): Zuordnung {
  const zweckNorm = normalisiere(u.verwendungszweck);
  const nameTokens = tokens(u.name);
  const zweckTokens = tokens(u.verwendungszweck);

  // Eigene Rechnung: Nummer im Verwendungszweck
  const rechnungNr = k.rechnungen.find((r) => r.nummer.length >= 4 && zweckNorm.includes(normalisiere(r.nummer)));
  if (rechnungNr) {
    return zuordnung({ art: "honorar", rechnungId: rechnungNr.id, sicherheit: "sicher", begruendung: `Rechnungsnummer ${rechnungNr.nummer} im Verwendungszweck` });
  }

  const kandidaten = personenFuerKonto(k).map((p) => bewertePerson(p, u, k, nameTokens, zweckTokens)).filter((c) => c.punkte > 0).sort((a, b) => b.punkte - a.punkte);
  const istKaution = /kaution/.test(zweckNorm);
  const bester = kandidaten[0];
  const zweiter = kandidaten[1];
  const abstand = bester ? bester.punkte - (zweiter?.punkte ?? 0) : 0;

  if (bester) {
    let sicherheit: Zuordnung["sicherheit"] | null = null;
    if (bester.punkte >= 100) sicherheit = "sicher";
    else if (bester.punkte >= 50 && abstand >= 20) sicherheit = "sicher";
    else if (bester.punkte >= 30 && abstand >= 10) sicherheit = "wahrscheinlich";
    else if (bester.punkte >= 20 && (zweiter?.punkte ?? 0) < 20) sicherheit = "wahrscheinlich";
    if (sicherheit) {
      const { monat, quelle } = monatAusZweck(u.verwendungszweck, u.buchungstag);
      const gruende = [...bester.gruende];
      if (!istKaution) gruende.push(quelle === "zweck" ? `Monat aus Verwendungszweck` : `Monat aus Buchungstag`);
      return zuordnung({
        art: istKaution ? "kaution" : artFuerPerson(bester.person),
        personId: bester.person.id,
        monat: istKaution ? null : monat,
        sicherheit,
        begruendung: gruende.join(", "),
      });
    }
    if (zweiter && bester.punkte >= 20) {
      return zuordnung({ art: "offen", begruendung: `Mehrere Personen passen: ${bester.person.name}, ${zweiter.person.name}` });
    }
  }

  // Eigene Rechnung nur über Betrag und Empfängername
  const rechnungBetrag = k.rechnungen.filter((r) => gleich(u.betrag, r.brutto, 0.01));
  if (rechnungBetrag.length === 1) {
    const r = rechnungBetrag[0];
    const empfaenger = tokens(r.empfaenger.name);
    if (empfaenger.some((t) => t.length >= 4 && (enthaeltToken(nameTokens, t) || enthaeltToken(zweckTokens, t)))) {
      return zuordnung({ art: "honorar", rechnungId: r.id, sicherheit: "wahrscheinlich", begruendung: `Betrag und Empfänger der Rechnung ${r.nummer}` });
    }
  }

  if (istKaution) return zuordnung({ art: "kaution", sicherheit: "wahrscheinlich", begruendung: "„Kaution“ im Verwendungszweck, Person unklar" });
  return zuordnung({ art: "offen" });
}

// ---------- Ausgänge ----------

const ENTGELT = /entgelt|geb(ü|ue)hr|kontof(ü|ue)hrung|abschluss|kontoabrechnung|kontopreis|buchungsposten|zinsen\s*\/\s*(kosten|entgelte)|kosten konto/i;
const BANKNAME = /\b(bank|sparkasse|spk|volksbank|raiffeisenbank|dkb|ing|commerzbank|postbank|comdirect|n26|qonto|finom|targobank|hypovereinsbank|unicredit|consorsbank|norisbank|kreissparkasse|stadtsparkasse|sparda|psd)\b/i;

/** Bankentgelt: Buchungstext der Bank sagt es, oder Zweck/Name sagen es und es gibt keine Gegen-IBAN bzw. die Bank selbst ist der Empfänger. */
function istBankentgelt(u: AbgleichUmsatz): boolean {
  if (ENTGELT.test(u.buchungstext)) return true;
  if (/miete|hausgeld|rechnung|\brg\b|\bre\b/i.test(u.verwendungszweck)) return false;
  if (!ENTGELT.test(`${u.verwendungszweck} ${u.name}`)) return false;
  return !u.iban || !u.name || BANKNAME.test(u.name);
}

function lieferantTokens(name: string): string[] {
  return tokens(name).filter((t) => t.length >= 4 && !/^(gmbh|firma|service|services|dienst|technik|bau|haus)$/.test(t));
}

function belegZuordnen(u: AbgleichUmsatz, k: AbgleichKontext, nameTokens: string[], zweckTokens: string[], zweckKompakt: string): Zuordnung | null {
  const betrag = Math.abs(u.betrag);
  const iban = ibanNormalisiert(u.iban);
  let bester: { beleg: Beleg; punkte: number; gruende: string[] } | null = null;
  for (const b of k.belege) {
    if (b.bezahltAm || b.bankumsatzId) continue;
    const gruende: string[] = [];
    let punkte = 0;
    const betragPasst = gleich(betrag, b.bruttoGesamt, 0.01);
    if (betragPasst) {
      punkte += 20;
      gruende.push("Betrag = Rechnungsbetrag");
    }
    const nr = normalisiere(b.rechnungsnummer).replace(/\s+/g, "");
    if (nr.length >= 3 && zweckKompakt.includes(nr)) {
      punkte += 40;
      gruende.push(`Rechnungsnummer ${b.rechnungsnummer} im Verwendungszweck`);
    }
    if (iban && b.lieferant.iban && ibanNormalisiert(b.lieferant.iban) === iban) {
      punkte += 40;
      gruende.push("IBAN des Lieferanten");
    }
    const lt = lieferantTokens(b.lieferant.name);
    if (lt.some((t) => enthaeltToken(nameTokens, t) || enthaeltToken(zweckTokens, t))) {
      punkte += 25;
      gruende.push(`Lieferant ${b.lieferant.name}`);
    }
    if (punkte > 0 && (!bester || punkte > bester.punkte)) bester = { beleg: b, punkte, gruende };
  }
  if (!bester) return null;
  const betragPasst = bester.gruende.includes("Betrag = Rechnungsbetrag");
  if (betragPasst && bester.punkte >= 45) return zuordnung({ art: "belegzahlung", belegId: bester.beleg.id, sicherheit: "sicher", begruendung: bester.gruende.join(", ") });
  if (bester.punkte >= 40) return zuordnung({ art: "belegzahlung", belegId: bester.beleg.id, sicherheit: "wahrscheinlich", begruendung: `${bester.gruende.join(", ")}, Betrag weicht ab (Skonto/Teilzahlung?)` });
  if (betragPasst && bester.punkte >= 20) {
    const gleicherBetrag = k.belege.filter((b) => !b.bezahltAm && gleich(betrag, b.bruttoGesamt, 0.01)).length;
    if (gleicherBetrag === 1) return zuordnung({ art: "belegzahlung", belegId: bester.beleg.id, sicherheit: "unsicher", begruendung: "Nur der Betrag passt" });
  }
  return null;
}

function ausgangZuordnen(u: AbgleichUmsatz, k: AbgleichKontext): Zuordnung {
  const zweckNorm = normalisiere(u.verwendungszweck);
  const zweckKompakt = normalisiere(`${u.verwendungszweck} ${u.name}`).replace(/\s+/g, "");
  const nameTokens = tokens(u.name);
  const zweckTokens = tokens(u.verwendungszweck);

  if (istBankentgelt(u)) {
    return zuordnung({ art: "gebuehr", kostenartCode: "BANKGEBUEHREN", sicherheit: "sicher", begruendung: "Bankentgelt laut Buchungstext" });
  }

  const beleg = belegZuordnen(u, k, nameTokens, zweckTokens, zweckKompakt);
  if (beleg) return beleg;

  const rechnung = k.rechnungen.find((r) => r.nummer.length >= 4 && zweckNorm.includes(normalisiere(r.nummer)));
  if (rechnung) return zuordnung({ art: "honorar", rechnungId: rechnung.id, sicherheit: "sicher", begruendung: `Rechnungsnummer ${rechnung.nummer} im Verwendungszweck` });
  const firmaIban = ibanNormalisiert(k.firma.iban);
  if (firmaIban && ibanNormalisiert(u.iban) === firmaIban) {
    const passend = k.rechnungen.filter((r) => gleich(Math.abs(u.betrag), r.brutto, 0.01));
    return zuordnung({ art: "honorar", rechnungId: passend.length === 1 ? passend[0].id : null, sicherheit: passend.length === 1 ? "sicher" : "wahrscheinlich", begruendung: "Empfänger ist das Konto der Verwaltung" });
  }

  const objekt = k.konto.objektId ? k.objekte.find((o) => o.id === k.konto.objektId) : null;
  if (objekt) {
    const eigentuemer = nachnamen(objekt.auftraggeber.name).concat(tokens(objekt.auftraggeber.name).filter((t) => t.length >= 5));
    const imNamen = eigentuemer.some((t) => enthaeltToken(nameTokens, t));
    const zweckSagtAuszahlung = /\b(auszahlung|entnahme|ueberschuss|ausschuettung|abschlag|vorschuss)\b/.test(zweckNorm);
    if (imNamen) return zuordnung({ art: "auszahlung_eigentuemer", sicherheit: zweckSagtAuszahlung ? "sicher" : "wahrscheinlich", begruendung: `Empfänger ist der Auftraggeber ${objekt.auftraggeber.name}` });
  }

  if (/kaution/.test(zweckNorm)) {
    const person = personenFuerKonto(k).find((p) => nachnamen(p.name).some((n) => enthaeltToken(nameTokens, n) || enthaeltToken(zweckTokens, n)));
    return zuordnung({ art: "kaution", personId: person?.id ?? null, sicherheit: person ? "wahrscheinlich" : "unsicher", begruendung: "Kautionsrückzahlung laut Verwendungszweck" });
  }
  return zuordnung({ art: "offen" });
}

/** Ordnet einen Umsatz nach den Regeln zu. Ergebnis mit art "offen" heißt: Regeln greifen nicht. */
export function ordneZu(u: AbgleichUmsatz, k: AbgleichKontext): Zuordnung {
  if (u.betrag > 0) return eingangZuordnen(u, k);
  if (u.betrag < 0) return ausgangZuordnen(u, k);
  return zuordnung({ art: "sonstiges", sicherheit: "sicher", begruendung: "Nullbuchung" });
}
