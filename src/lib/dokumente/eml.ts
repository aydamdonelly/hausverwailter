/**
 * Minimaler Leser für E-Mails im .eml-Format: Betreff, Absender, Textkörper und Anhänge
 * (PDF/Bilder). Reicht für "Rechnung per Mail" und "Anfrage per Mail"; exotische Mails
 * (S/MIME, verschachtelte Weiterleitungen) landen als Text.
 */
export interface EmlAnhang {
  dateiname: string;
  mime: string;
  bytes: Uint8Array;
}

export interface Eml {
  betreff: string;
  von: string;
  datum: string;
  text: string;
  anhaenge: EmlAnhang[];
}

interface Teil {
  headers: Record<string, string>;
  body: string;
}

function headerWert(headers: Record<string, string>, name: string): string {
  return headers[name.toLowerCase()] ?? "";
}

function parameter(headerWert: string, name: string): string {
  const m = new RegExp(`${name}\\*?=(?:"([^"]*)"|([^;\\s]*))`, "i").exec(headerWert);
  return (m?.[1] ?? m?.[2] ?? "").replace(/^utf-8''/i, "");
}

function splitHeaders(roh: string): Teil {
  const idx = roh.search(/\r?\n\r?\n/);
  const headerBlock = idx === -1 ? roh : roh.slice(0, idx);
  const body = idx === -1 ? "" : roh.slice(idx).replace(/^\r?\n\r?\n/, "");
  const headers: Record<string, string> = {};
  let letzter = "";
  for (const zeile of headerBlock.split(/\r?\n/)) {
    if (/^[ \t]/.test(zeile) && letzter) {
      headers[letzter] += " " + zeile.trim();
    } else {
      const m = /^([^:]+):\s*(.*)$/.exec(zeile);
      if (m) {
        letzter = m[1].toLowerCase();
        headers[letzter] = m[2];
      }
    }
  }
  return { headers, body };
}

function dekodiereEncodedWords(s: string): string {
  return s.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, charset: string, enc: string, text: string) => {
    try {
      const bytes = enc.toUpperCase() === "B" ? base64ZuBytes(text) : qpZuBytes(text.replace(/_/g, " "));
      return new TextDecoder(charsetName(charset)).decode(bytes);
    } catch {
      return text;
    }
  });
}

function charsetName(cs: string): string {
  const c = cs.trim().toLowerCase();
  if (c === "utf8") return "utf-8";
  if (c === "latin1" || c === "iso8859-1") return "iso-8859-1";
  return c || "utf-8";
}

function base64ZuBytes(text: string): Uint8Array {
  const sauber = text.replace(/[^A-Za-z0-9+/=]/g, "");
  const bin = atob(sauber);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function qpZuBytes(text: string): Uint8Array {
  const ohneSoftBreaks = text.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < ohneSoftBreaks.length; i++) {
    const c = ohneSoftBreaks[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(ohneSoftBreaks.slice(i + 1, i + 3))) {
      out.push(parseInt(ohneSoftBreaks.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(c.charCodeAt(0) & 0xff);
    }
  }
  return new Uint8Array(out);
}

function dekodiereBody(teil: Teil): Uint8Array {
  const enc = headerWert(teil.headers, "content-transfer-encoding").trim().toLowerCase();
  if (enc === "base64") return base64ZuBytes(teil.body);
  if (enc === "quoted-printable") return qpZuBytes(teil.body);
  return new TextEncoder().encode(teil.body);
}

function htmlZuText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sammle(teil: Teil, ergebnis: { text: string[]; html: string[]; anhaenge: EmlAnhang[] }): void {
  const ct = headerWert(teil.headers, "content-type");
  const typ = (ct.split(";")[0] ?? "").trim().toLowerCase() || "text/plain";
  const disposition = headerWert(teil.headers, "content-disposition");
  if (typ.startsWith("multipart/")) {
    const boundary = parameter(ct, "boundary");
    if (!boundary) return;
    const stuecke = teil.body.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?\\r?\\n?`));
    for (const s of stuecke) {
      if (!s.trim() || s.trim() === "--") continue;
      sammle(splitHeaders(s), ergebnis);
    }
    return;
  }
  const dateiname = dekodiereEncodedWords(parameter(disposition, "filename") || parameter(ct, "name"));
  const istAnhang = /attachment/i.test(disposition) || (dateiname && !typ.startsWith("text/"));
  if (istAnhang || typ === "application/pdf" || typ.startsWith("image/")) {
    ergebnis.anhaenge.push({ dateiname: dateiname || `anhang.${typ.split("/")[1] ?? "bin"}`, mime: typ, bytes: dekodiereBody(teil) });
    return;
  }
  const charset = charsetName(parameter(ct, "charset"));
  const text = new TextDecoder(charset).decode(dekodiereBody(teil));
  if (typ === "text/html") ergebnis.html.push(text);
  else ergebnis.text.push(text);
}

export function parseEml(bytes: Uint8Array): Eml {
  const roh = new TextDecoder("utf-8").decode(bytes);
  const wurzel = splitHeaders(roh);
  const ergebnis = { text: [] as string[], html: [] as string[], anhaenge: [] as EmlAnhang[] };
  sammle(wurzel, ergebnis);
  const text = ergebnis.text.length ? ergebnis.text.join("\n\n") : ergebnis.html.map(htmlZuText).join("\n\n");
  return {
    betreff: dekodiereEncodedWords(headerWert(wurzel.headers, "subject")),
    von: dekodiereEncodedWords(headerWert(wurzel.headers, "from")),
    datum: headerWert(wurzel.headers, "date"),
    text: text.trim(),
    anhaenge: ergebnis.anhaenge,
  };
}
