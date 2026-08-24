import { describe, expect, it } from "vitest";
import { DIN, FARBEN, akzentFarbe, hexNormalisiert, leuchtdichte, mm } from "./stil";

describe("Maße", () => {
  it("rechnet Millimeter in Punkt um", () => {
    expect(mm(25.4)).toBe(72);
    expect(mm(210)).toBeCloseTo(595.28, 1);
    expect(mm(297)).toBeCloseTo(841.89, 1);
  });
  it("hält die DIN-5008-Positionen für Form B", () => {
    expect(DIN.anschriftOben).toBe(45);
    expect(DIN.anschriftOben + DIN.vermerkzoneHoehe).toBeCloseTo(62.7);
    expect(DIN.anschriftOben + DIN.anschriftHoehe).toBe(90);
    expect(DIN.infoblockLinks + DIN.infoblockBreite).toBe(DIN.blattBreite - DIN.randRechts);
    expect(DIN.falzmarke1).toBe(105);
    expect(DIN.lochmarke).toBe(148.5);
    expect(DIN.falzmarke2).toBe(210);
    expect(DIN.randLinks + DIN.textBreite + DIN.randRechts).toBe(DIN.blattBreite);
  });
});

describe("Farben", () => {
  it("normalisiert Hexwerte und verwirft Unsinn", () => {
    expect(hexNormalisiert("#15201B")).toBe("#15201b");
    expect(hexNormalisiert("2f6b4f")).toBe("#2f6b4f");
    expect(hexNormalisiert("#abc")).toBe("#aabbcc");
    expect(hexNormalisiert("rot")).toBeNull();
    expect(hexNormalisiert("")).toBeNull();
    expect(hexNormalisiert(null)).toBeNull();
  });
  it("misst Leuchtdichte", () => {
    expect(leuchtdichte("#000000")).toBe(0);
    expect(leuchtdichte("#ffffff")).toBeCloseTo(1);
  });
  it("nimmt die Firmenfarbe nur, wenn sie auf Papier lesbar ist", () => {
    expect(akzentFarbe("#2f6b4f")).toBe("#2f6b4f");
    expect(akzentFarbe("#b23a2c")).toBe("#b23a2c");
    expect(akzentFarbe("#ffff00")).toBe(FARBEN.tinte);
    expect(akzentFarbe("#ffffff")).toBe(FARBEN.tinte);
    expect(akzentFarbe("kaputt")).toBe(FARBEN.tinte);
    expect(akzentFarbe(null)).toBe(FARBEN.tinte);
  });
});
