/**
 * SEPA-Bezeichner im Verwendungszweck. MT940 und die Sparkassen-CSV-MT940 kleben sie ohne
 * Trenner aneinander ("EREF+…MREF+…SVWZ+…"), das VR-Format schreibt sie mit Doppelpunkt
 * ("EREF: … MREF: …"), Commerzbank in Klartext ("End-to-End-Ref.: … Mandatsref: …").
 */

export interface SepaTags {
  /** Der eigentliche Verwendungszweck (SVWZ) oder der Text ohne Bezeichner */
  zweck: string;
  eref: string;
  mref: string;
  cred: string;
  abwa: string;
  abwe: string;
  iban: string;
  bic: string;
}

const TAG_PLUS = /(EREF|KREF|MREF|CRED|DEBT|COAM|OAMT|SVWZ|ABWA|ABWE|BREF|RREF|PURP|IBAN|BIC)\+/g;
const TAG_DOPPELPUNKT = /\b(EREF|KREF|MREF|CRED|DEBT|COAM|OAMT|SVWZ|ABWA|ABWE|BREF|RREF|PURP|IBAN|BIC):\s*/g;

function leer(): SepaTags {
  return { zweck: "", eref: "", mref: "", cred: "", abwa: "", abwe: "", iban: "", bic: "" };
}

function zuordnen(tags: SepaTags, schluessel: string, wert: string): void {
  const w = wert.trim();
  switch (schluessel) {
    case "SVWZ": tags.zweck = w; break;
    case "EREF": tags.eref = w; break;
    case "MREF": tags.mref = w; break;
    case "CRED": tags.cred = w; break;
    case "ABWA": tags.abwa = w; break;
    case "ABWE": tags.abwe = w; break;
    case "IBAN": tags.iban = w; break;
    case "BIC": tags.bic = w; break;
    default: break;
  }
}

/** Zerlegt einen Verwendungszweck mit SEPA-Bezeichnern (beide Schreibweisen). Ohne Bezeichner bleibt der Text der Zweck. */
export function sepaTags(text: string): SepaTags {
  const tags = leer();
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return tags;
  const muster = /(EREF|KREF|MREF|CRED|DEBT|COAM|OAMT|SVWZ|ABWA|ABWE|BREF|RREF|PURP|IBAN|BIC)\+/.test(t) ? TAG_PLUS : /\b(EREF|MREF|CRED|SVWZ|ABWA|ABWE|IBAN|BIC):/.test(t) ? TAG_DOPPELPUNKT : null;
  if (!muster) {
    tags.zweck = t;
    return tags;
  }
  muster.lastIndex = 0;
  const treffer: { schluessel: string; start: number; ende: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = muster.exec(t))) treffer.push({ schluessel: m[1], start: m.index, ende: m.index + m[0].length });
  const vorspann = t.slice(0, treffer[0].start).trim();
  for (let i = 0; i < treffer.length; i++) {
    const wert = t.slice(treffer[i].ende, i + 1 < treffer.length ? treffer[i + 1].start : t.length);
    zuordnen(tags, treffer[i].schluessel, wert);
  }
  // VR-Format: der Klartext steht vor den Bezeichnern, ein SVWZ gibt es dort nicht.
  if (!tags.zweck) tags.zweck = vorspann;
  else if (vorspann && muster === TAG_DOPPELPUNKT) tags.zweck = `${vorspann} ${tags.zweck}`.trim();
  return tags;
}

/** Ende-zu-Ende-Referenzen, die nur "keine" bedeuten. */
export function referenzBereinigt(ref: string): string {
  const r = (ref ?? "").trim();
  if (!r || /^(NOTPROVIDED|NONREF|N\/A)$/i.test(r)) return "";
  return r;
}
