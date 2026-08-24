import { describe, expect, it } from "vitest";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { sepaEndToEndId, sepaText, sepaUeberweisung, verwendungszweckFuer, zahlungAusPosten, type SepaAuftrag } from "./sepa";
import { offeneVerbindlichkeiten } from "./offene-posten";
import { TEST_OBJEKTE, testBeleg, testDokument } from "./testdaten";

const AUFTRAG: SepaAuftrag = {
  auftraggeber: { name: "Hausverwaltung Mustermann GmbH", iban: "DE02120300000000202051", bic: "BYLADEM1001" },
  ausfuehrungAm: "2026-08-25",
  erstelltAm: "2026-08-23T14:30:00",
  zahlungen: [
    { endToEndId: "ER-4711", betrag: 595, empfaengerName: "Schlosserei Müller & Söhne GmbH", iban: "DE89370400440532013000", verwendungszweck: "Rechnung 4711 vom 12.08.2026 Objekt Musterstr. 1" },
    { endToEndId: "ER-4712", betrag: 1190, empfaengerName: "Stadtwerke Köln", iban: "DE75512108001245126199", verwendungszweck: "Kundennr 123456 Abschlag 08/2026" },
  ],
};

describe("SEPA pain.001.001.09", () => {
  it("ist wohlgeformt, hat Namespace, Anzahl und Kontrollsumme", () => {
    const xml = sepaUeberweisung(AUFTRAG);
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
    expect(doc.Document["@_xmlns"]).toBe("urn:iso:std:iso:20022:tech:xsd:pain.001.001.09");
    const init = doc.Document.CstmrCdtTrfInitn;
    expect(init.GrpHdr.MsgId).toBe("HV-20260823143000");
    expect(init.GrpHdr.CreDtTm).toBe("2026-08-23T14:30:00");
    expect(init.GrpHdr.NbOfTxs).toBe(2);
    expect(String(init.GrpHdr.CtrlSum)).toBe("1785");
    expect(xml).toContain("<CtrlSum>1785.00</CtrlSum>");
    const pmt = init.PmtInf;
    expect(pmt.PmtMtd).toBe("TRF");
    expect(pmt.BtchBookg).toBe(true);
    expect(pmt.PmtTpInf.SvcLvl.Cd).toBe("SEPA");
    expect(pmt.ReqdExctnDt.Dt).toBe("2026-08-25");
    expect(pmt.Dbtr.Nm).toBe("Hausverwaltung Mustermann GmbH");
    expect(pmt.DbtrAcct.Id.IBAN).toBe("DE02120300000000202051");
    expect(pmt.DbtrAgt.FinInstnId.BICFI).toBe("BYLADEM1001");
    expect(pmt.ChrgBr).toBe("SLEV");
    expect(pmt.CdtTrfTxInf).toHaveLength(2);
    const t = pmt.CdtTrfTxInf[0];
    expect(t.PmtId.EndToEndId).toBe("ER-4711");
    expect(t.Amt.InstdAmt["@_Ccy"]).toBe("EUR");
    expect(xml).toContain('<InstdAmt Ccy="EUR">595.00</InstdAmt>');
    expect(t.Cdtr.Nm).toBe("Schlosserei Mueller + Soehne GmbH");
    expect(t.CdtrAcct.Id.IBAN).toBe("DE89370400440532013000");
    expect(t.RmtInf.Ustrd).toBe("Rechnung 4711 vom 12.08.2026 Objekt Musterstr. 1");
    expect(xml).not.toContain("CdtrAgt");
  });

  it("hält den EPC-Zeichensatz ein und begrenzt Längen", () => {
    expect(sepaText("Müller & Söhne „Dach“ #1 <x>", 140)).toBe("Mueller + Soehne Dach 1 x");
    expect(sepaText("a".repeat(200), 140)).toHaveLength(140);
    expect(sepaEndToEndId("RE 2026/0815")).toBe("RE2026/0815");
    expect(sepaEndToEndId("")).toBe("NOTPROVIDED");
    expect(sepaEndToEndId("x".repeat(50))).toHaveLength(35);
  });

  it("baut Zahlungen aus offenen Posten mit Verwendungszweck 'Rechnung <Nr> vom <Datum>'", () => {
    const [posten] = offeneVerbindlichkeiten([testBeleg()], [testDokument()], TEST_OBJEKTE, "2026-08-23");
    expect(verwendungszweckFuer(posten)).toBe("Rechnung RE-2026/0815 vom 12.08.2026 Kundennr K-4711");
    const z = zahlungAusPosten(posten);
    expect(z).toEqual({
      endToEndId: "RE-2026/0815",
      betrag: 595,
      empfaengerName: "Schlosserei Müller & Söhne GmbH",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      verwendungszweck: "Rechnung RE-2026/0815 vom 12.08.2026 Kundennr K-4711",
    });
    const xml = sepaUeberweisung({ ...AUFTRAG, zahlungen: [z] });
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(xml).toContain("<CtrlSum>595.00</CtrlSum>");
  });

  it("lehnt ungültige IBAN, leere Liste und Betrag 0 ab", () => {
    expect(() => sepaUeberweisung({ ...AUFTRAG, zahlungen: [] })).toThrow(/Keine Zahlungen/);
    expect(() => sepaUeberweisung({ ...AUFTRAG, auftraggeber: { ...AUFTRAG.auftraggeber, iban: "" } })).toThrow(/Auftraggeber-IBAN/);
    expect(() => sepaUeberweisung({ ...AUFTRAG, zahlungen: [{ ...AUFTRAG.zahlungen[0], betrag: 0 }] })).toThrow(/größer 0/);
    expect(() => sepaUeberweisung({ ...AUFTRAG, zahlungen: [{ ...AUFTRAG.zahlungen[0], iban: "DE12" }] })).toThrow(/IBAN von/);
  });
});
