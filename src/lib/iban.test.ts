import { describe, expect, it } from "vitest";
import { ibanGueltig, ustIdNrPlausibel } from "./iban";

describe("iban", () => {
  it("prüft die Prüfziffer", () => {
    expect(ibanGueltig("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(ibanGueltig("DE89370400440532013001")).toBe(false);
    expect(ibanGueltig("DE00370400440532013000")).toBe(false);
    expect(ibanGueltig("")).toBe(false);
  });
  it("prüft USt-IdNr-Form", () => {
    expect(ustIdNrPlausibel("DE123456789")).toBe(true);
    expect(ustIdNrPlausibel("DE 123 456 789")).toBe(true);
    expect(ustIdNrPlausibel("12345678")).toBe(false);
  });
});
