import { describe, expect, it } from "vitest";
import { parseEml } from "./eml";

const mail = [
  "From: =?UTF-8?Q?Sabine_Kr=C3=BCger?= <beirat@example.de>",
  "Subject: =?UTF-8?B?QW5mcmFnZSBWZXJ3YWx0dW5nIExpbmRlbnN0cmHDn2UgMTQ=?=",
  "Date: Fri, 21 Aug 2026 10:00:00 +0200",
  'Content-Type: multipart/mixed; boundary="GRENZE"',
  "",
  "--GRENZE",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Guten Tag, unsere WEG in der Lindenstra=C3=9Fe 14 sucht eine Verwaltung.",
  "--GRENZE",
  'Content-Type: application/pdf; name="rechnung.pdf"',
  "Content-Transfer-Encoding: base64",
  'Content-Disposition: attachment; filename="rechnung.pdf"',
  "",
  "JVBERi0xLjQK",
  "--GRENZE--",
  "",
].join("\r\n");

describe("parseEml", () => {
  it("liest Betreff, Absender, Text und Anhänge", () => {
    const e = parseEml(new TextEncoder().encode(mail));
    expect(e.betreff).toBe("Anfrage Verwaltung Lindenstraße 14");
    expect(e.von).toContain("Sabine Krüger");
    expect(e.text).toContain("Lindenstraße 14");
    expect(e.anhaenge).toHaveLength(1);
    expect(e.anhaenge[0].dateiname).toBe("rechnung.pdf");
    expect(new TextDecoder().decode(e.anhaenge[0].bytes)).toBe("%PDF-1.4\n");
  });
});
