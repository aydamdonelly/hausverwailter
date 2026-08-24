/**
 * CAMT.053 (Bank to Customer Statement) und CAMT.052 (untertägig) lesen. Deutsche Banken
 * liefern camt.053.001.02 (bis 2025) und camt.053.001.08 (seit 11/2025); der Leser ist
 * namespace-unabhängig und kennt beide Varianten (Pty-Zwischenebene, BIC vs. BICFI).
 * Quelle: DK Anlage 3, Kapitel 7.1 (siehe Recherche datenformate-import-export.md 3.2).
 */
import { XMLParser } from "fast-xml-parser";
import type { LeseErgebnis, UmsatzRoh } from "./typen";
import { referenzBereinigt } from "./sepa";

type Knoten = Record<string, unknown>;

function alsListe<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function text(x: unknown): string {
  if (x === undefined || x === null) return "";
  if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") return String(x).trim();
  if (typeof x === "object" && "#text" in (x as Knoten)) return text((x as Knoten)["#text"]);
  return "";
}

function pfad(k: unknown, ...namen: string[]): unknown {
  let aktuell: unknown = k;
  for (const n of namen) {
    if (!aktuell || typeof aktuell !== "object") return undefined;
    aktuell = (aktuell as Knoten)[n];
    if (Array.isArray(aktuell)) aktuell = aktuell[0];
  }
  return aktuell;
}

function betragUndWaehrung(amt: unknown): { betrag: number | null; waehrung: string } {
  if (amt === undefined || amt === null) return { betrag: null, waehrung: "" };
  const wert = Number(text(amt).replace(",", "."));
  const waehrung = typeof amt === "object" ? text((amt as Knoten)["@_Ccy"]) : "";
  return { betrag: Number.isFinite(wert) ? wert : null, waehrung };
}

function datum(k: unknown): string | null {
  const d = text(pfad(k, "Dt")) || text(pfad(k, "DtTm"));
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(d);
  return m ? m[1] : null;
}

function parteiName(p: unknown): string {
  return text(pfad(p, "Pty", "Nm")) || text(pfad(p, "Nm"));
}

function agentBic(a: unknown): string {
  return text(pfad(a, "FinInstnId", "BICFI")) || text(pfad(a, "FinInstnId", "BIC"));
}

/** Sieht der Text nach CAMT.052/053 aus? */
export function istCamt(textInhalt: string): boolean {
  const kopf = textInhalt.slice(0, 4000);
  return /<(\w+:)?Document[\s>]/.test(kopf) && /BkToCstmr(Stmt|AcctRpt)|camt\.05[234]/.test(kopf);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ["Stmt", "Rpt", "Ntry", "TxDtls", "Ustrd", "Bal", "NtryDtls"].includes(name),
});

function umsatzAusDetails(ntry: Knoten, tx: Knoten | null, sammler: boolean): UmsatzRoh | null {
  const amtQuelle = sammler && tx ? (tx.Amt ?? pfad(tx, "AmtDtls", "TxAmt", "Amt")) : ntry.Amt;
  const { betrag, waehrung } = betragUndWaehrung(amtQuelle);
  if (betrag === null) return null;
  const richtung = (sammler && tx ? text(tx.CdtDbtInd) : "") || text(ntry.CdtDbtInd);
  const vorzeichen = richtung === "DBIT" ? -1 : 1;
  const storno = text(ntry.RvslInd) === "true";
  const buchungstag = datum(ntry.BookgDt) ?? datum(ntry.ValDt);
  if (!buchungstag) return null;
  const parteien = tx ? (tx.RltdPties as Knoten | undefined) : undefined;
  const agenten = tx ? (tx.RltdAgts as Knoten | undefined) : undefined;
  const gegen = vorzeichen < 0 ? "Cdtr" : "Dbtr";
  let name = parteiName(parteien?.[gegen]);
  if (!name) name = parteiName(parteien?.[vorzeichen < 0 ? "UltmtCdtr" : "UltmtDbtr"]);
  const iban = text(pfad(parteien?.[`${gegen}Acct`], "Id", "IBAN"));
  const bic = agentBic(agenten?.[`${gegen}Agt`]);
  const rmtInf = pfad(tx, "RmtInf") as Knoten | undefined;
  const ustrd = alsListe(rmtInf?.Ustrd as string | string[] | undefined).map(text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const strukturiert = text(pfad(tx, "RmtInf", "Strd", "CdtrRefInf", "Ref"));
  const buchungstext = text(ntry.AddtlNtryInf) || text(pfad(ntry, "BkTxCd", "Prtry", "Cd")) || "";
  return {
    buchungstag,
    valuta: datum(ntry.ValDt),
    betrag: vorzeichen * betrag,
    waehrung: waehrung || text(pfad(ntry, "Amt", "@_Ccy")) || "EUR",
    name,
    iban,
    bic,
    verwendungszweck: ustrd || strukturiert,
    buchungstext: storno ? `${buchungstext} (Storno)`.trim() : buchungstext,
    endToEndId: referenzBereinigt(text(pfad(tx, "Refs", "EndToEndId"))),
    mandatsreferenz: text(pfad(tx, "Refs", "MndtId")),
  };
}

/** Liest CAMT.053/052-XML. Sammelbuchungen mit mehreren TxDtls werden einzeln übernommen. */
export function leseCamt(textInhalt: string): LeseErgebnis {
  let doc: Knoten;
  try {
    doc = parser.parse(textInhalt) as Knoten;
  } catch (e) {
    return { format: "camt053", formatName: "CAMT.053 XML", kontoIban: "", umsaetze: [], warnungen: [`XML nicht lesbar: ${e instanceof Error ? e.message : "unbekannt"}`], uebersprungen: 0 };
  }
  const document = (doc.Document ?? doc) as Knoten;
  const stmts = alsListe<Knoten>(pfad(document, "BkToCstmrStmt") ? ((pfad(document, "BkToCstmrStmt") as Knoten).Stmt as Knoten[]) : undefined);
  const rpts = alsListe<Knoten>(pfad(document, "BkToCstmrAcctRpt") ? ((pfad(document, "BkToCstmrAcctRpt") as Knoten).Rpt as Knoten[]) : undefined);
  const auszuege = [...stmts, ...rpts];
  const formatName = rpts.length && !stmts.length ? "CAMT.052 XML (untertägig)" : "CAMT.053 XML";
  const format = rpts.length && !stmts.length ? "camt052" : "camt053";
  if (!auszuege.length) {
    return { format, formatName, kontoIban: "", umsaetze: [], warnungen: ["Kein Stmt/Rpt-Element gefunden: ist das eine camt.053-Datei?"], uebersprungen: 0 };
  }
  const umsaetze: UmsatzRoh[] = [];
  const warnungen: string[] = [];
  let uebersprungen = 0;
  let kontoIban = "";
  for (const stmt of auszuege) {
    const iban = text(pfad(stmt, "Acct", "Id", "IBAN")).replace(/\s+/g, "").toUpperCase();
    if (iban && !kontoIban) kontoIban = iban;
    for (const ntry of alsListe<Knoten>(stmt.Ntry as Knoten[])) {
      const status = text(ntry.Sts) || text(pfad(ntry, "Sts", "Cd"));
      if (status && status !== "BOOK") {
        uebersprungen++;
        continue;
      }
      const details = alsListe<Knoten>(ntry.NtryDtls as Knoten[]);
      const txs = details.flatMap((d) => alsListe<Knoten>(d.TxDtls as Knoten[]));
      if (txs.length > 1) {
        // Sammler: jede Einzeltransaktion für sich, damit Mieteingänge im Sammler auffindbar sind.
        for (const tx of txs) {
          const u = umsatzAusDetails(ntry, tx, true);
          if (u) umsaetze.push(u);
          else uebersprungen++;
        }
        continue;
      }
      const u = umsatzAusDetails(ntry, txs[0] ?? null, false);
      if (u) umsaetze.push(u);
      else uebersprungen++;
    }
  }
  if (!umsaetze.length) warnungen.push("Die Datei enthält keine gebuchten Umsätze.");
  return { format, formatName, kontoIban, umsaetze, warnungen, uebersprungen };
}
