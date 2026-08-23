/** IBAN-Prüfung nach ISO 7064 (mod 97-10). */
export function ibanGueltig(roh: string | null | undefined): boolean {
  const iban = (roh ?? "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  const ziffern = umgestellt.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (let i = 0; i < ziffern.length; i += 7) {
    rest = Number(String(rest) + ziffern.slice(i, i + 7)) % 97;
  }
  return rest === 1;
}

/** Deutsche USt-IdNr: DE + 9 Ziffern. */
export function ustIdNrPlausibel(roh: string | null | undefined): boolean {
  const s = (roh ?? "").replace(/\s+/g, "").toUpperCase();
  return /^DE\d{9}$/.test(s);
}
