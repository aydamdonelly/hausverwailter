/**
 * SEPA-Sammelüberweisung als pain.001.001.09 (DK-Schema pain.001.001.09_GBIC_5), das Format,
 * das deutsche Banken seit November 2025 annehmen (ISO-20022-Migration; die alte Version
 * 001.03 ist abgekündigt). Eine Datei je Auftraggeberkonto, IBAN-only (DbtrAgt nur mit BIC,
 * CdtrAgt entfällt), Service-Level SEPA, Entgelt SLEV, Sammelbuchung auf dem Kontoauszug.
 *
 * Zeichensatz: das eingeschränkte "Latin Character Set" der EPC (a–z A–Z 0–9 / - ? : ( ) . , ' +
 * und Leerzeichen); Umlaute werden umgeschrieben (ä → ae), alles andere wird zum Leerzeichen.
 * Die Datei wird nicht gesendet, sondern vom Nutzer im Online-Banking hochgeladen.
 */
import { datum as datumFmt } from "../format";
import { summe } from "../geld";
import type { OffenerPosten } from "./offene-posten";

export interface SepaZahlung {
  /** Ende-zu-Ende-Referenz, max. 35 Zeichen, sonst NOTPROVIDED. */
  endToEndId: string;
  betrag: number;
  empfaengerName: string;
  iban: string;
  bic?: string;
  verwendungszweck: string;
}

export interface SepaAuftrag {
  auftraggeber: { name: string; iban: string; bic?: string };
  zahlungen: SepaZahlung[];
  /** Gewünschter Ausführungstag (YYYY-MM-DD). */
  ausfuehrungAm: string;
  /** Erstellzeitpunkt als ISO-Zeit ohne Zone, z. B. 2026-08-23T14:30:00. */
  erstelltAm: string;
  msgId?: string;
}

const NAMESPACE = "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09";

/** EPC-Zeichensatz: Umlaute umschreiben, Unerlaubtes zu Leerzeichen, kürzen. */
export function sepaText(text: string, max: number): string {
  const umschrift = text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "+")
    .replace(/[^a-zA-Z0-9/\-?:().,'+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return umschrift.slice(0, max).trim();
}

/** Rechnungsnummer als EndToEndId: nur erlaubte Zeichen, max. 35, sonst NOTPROVIDED. */
export function sepaEndToEndId(nummer: string): string {
  const id = sepaText(nummer.replace(/\s+/g, ""), 35).replace(/ /g, "");
  return id || "NOTPROVIDED";
}

/** "Rechnung <Nr> vom <Datum>", dazu die Kundennummer beim Lieferanten, wenn bekannt. */
export function verwendungszweckFuer(p: OffenerPosten): string {
  const teile = [`Rechnung ${p.nummer}`];
  if (p.datum) teile.push(`vom ${datumFmt(p.datum)}`);
  if (p.kundennummerBeimLieferanten) teile.push(`Kundennr ${p.kundennummerBeimLieferanten}`);
  return sepaText(teile.join(" "), 140);
}

export function zahlungAusPosten(p: OffenerPosten): SepaZahlung {
  return {
    endToEndId: sepaEndToEndId(p.nummer),
    betrag: p.betrag,
    empfaengerName: p.name,
    iban: p.iban,
    bic: p.bic || undefined,
    verwendungszweck: verwendungszweckFuer(p),
  };
}

function xml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function betrag(n: number): string {
  return n.toFixed(2);
}

function zeitOhneZone(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(iso);
  if (!m) throw new Error("erstelltAm muss eine ISO-Zeit sein (JJJJ-MM-TTThh:mm:ss).");
  return `${m[1]}T${m[2]}`;
}

export function sepaMsgId(erstelltAm: string): string {
  return `HV-${erstelltAm.slice(0, 19).replace(/[-:T]/g, "")}`;
}

export function sepaDateiname(auftrag: SepaAuftrag): string {
  return `SEPA_Ueberweisung_${auftrag.ausfuehrungAm}_${auftrag.auftraggeber.iban.slice(-4)}.xml`;
}

/** Baut die pain.001-Datei. Wirft bei fehlender IBAN, leerer Liste oder Betrag ≤ 0. */
export function sepaUeberweisung(auftrag: SepaAuftrag): string {
  const { auftraggeber, zahlungen } = auftrag;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(auftraggeber.iban)) throw new Error("Auftraggeber-IBAN fehlt oder ist ungültig.");
  if (!zahlungen.length) throw new Error("Keine Zahlungen für die SEPA-Datei.");
  for (const z of zahlungen) {
    if (!(z.betrag > 0)) throw new Error(`Betrag muss größer 0 sein (${z.empfaengerName}).`);
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(z.iban)) throw new Error(`IBAN von ${z.empfaengerName} fehlt oder ist ungültig.`);
  }
  const msgId = sepaText(auftrag.msgId ?? sepaMsgId(auftrag.erstelltAm), 35).replace(/ /g, "");
  const creDtTm = zeitOhneZone(auftrag.erstelltAm);
  const summeGesamt = betrag(summe(zahlungen.map((z) => z.betrag)));
  const name = sepaText(auftraggeber.name, 70) || "Auftraggeber";

  const transaktionen = zahlungen
    .map(
      (z) => `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${xml(z.endToEndId)}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${betrag(z.betrag)}</InstdAmt></Amt>
        <Cdtr><Nm>${xml(sepaText(z.empfaengerName, 70) || "Empfaenger")}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${z.iban}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${xml(sepaText(z.verwendungszweck, 140) || "Zahlung")}</Ustrd></RmtInf>
      </CdtTrfTxInf>`,
    )
    .join("\n");

  const dbtrAgt = auftraggeber.bic ? `      <DbtrAgt><FinInstnId><BICFI>${xml(auftraggeber.bic.replace(/\s+/g, "").toUpperCase())}</BICFI></FinInstnId></DbtrAgt>\n` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="${NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${NAMESPACE} pain.001.001.09_GBIC_5.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xml(msgId)}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${zahlungen.length}</NbOfTxs>
      <CtrlSum>${summeGesamt}</CtrlSum>
      <InitgPty><Nm>${xml(name)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xml(msgId)}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${zahlungen.length}</NbOfTxs>
      <CtrlSum>${summeGesamt}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${auftrag.ausfuehrungAm}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${xml(name)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${auftraggeber.iban}</IBAN></Id></DbtrAcct>
${dbtrAgt}      <ChrgBr>SLEV</ChrgBr>
${transaktionen}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}
