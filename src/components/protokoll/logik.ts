/**
 * Reine Hilfsfunktionen des Protokolls: Details lesbar machen, Bezüge in Links auflösen,
 * Volltextsuche, CSV für Excel (Semikolon, UTF-8 mit BOM, CRLF).
 */
import type { Protokoll } from "@/lib/domain/schema";
import { datum, zeit } from "@/lib/format";
import { lokalesDatum } from "@/components/stammdaten/logik";

export const AKTEUR_TEXTE: Record<Protokoll["akteur"], string> = {
  nutzer: "Nutzer",
  ki: "KI",
  regel: "Regel",
  system: "System",
};

export interface DetailZeile {
  schluessel: string;
  wert: string;
}

function wertText(w: unknown): string {
  if (w === null || w === undefined || w === "") return "leer";
  if (typeof w === "boolean") return w ? "ja" : "nein";
  if (typeof w === "number") return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(w);
  if (typeof w === "string") return /^\d{4}-\d{2}-\d{2}$/.test(w) ? datum(w) : w;
  if (Array.isArray(w)) return w.length ? w.map(wertText).join(w.some((x) => x !== null && typeof x === "object") ? "; " : ", ") : "leer";
  if (typeof w === "object") {
    return Object.entries(w as Record<string, unknown>)
      .map(([k, v]) => `${k} ${wertText(v)}`)
      .join(", ");
  }
  return String(w);
}

/** JSON-Details als Zeilen "Schlüssel: Wert"; Änderungen als "alt → neu". Freitext bleibt eine Zeile. */
export function detailsLesbar(details: string): DetailZeile[] {
  if (!details) return [];
  let roh: unknown;
  try {
    roh = JSON.parse(details);
  } catch {
    return [{ schluessel: "", wert: details }];
  }
  if (roh === null || typeof roh !== "object" || Array.isArray(roh)) return [{ schluessel: "", wert: wertText(roh) }];
  const zeilen: DetailZeile[] = [];
  for (const [k, v] of Object.entries(roh as Record<string, unknown>)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v) && "alt" in v && "neu" in v) {
      const { alt, neu } = v as { alt: unknown; neu: unknown };
      zeilen.push({ schluessel: k, wert: `${wertText(alt)} → ${wertText(neu)}` });
    } else {
      zeilen.push({ schluessel: k, wert: wertText(v) });
    }
  }
  return zeilen;
}

export function detailsKurz(details: string, max = 90): string {
  const zeilen = detailsLesbar(details);
  const text = zeilen.map((z) => (z.schluessel ? `${z.schluessel}: ${z.wert}` : z.wert)).join(" · ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function bezugTeile(bezug: string): { art: string; id: string } | null {
  if (!bezug) return null;
  const i = bezug.indexOf(":");
  if (i < 0) return { art: bezug, id: "" };
  return { art: bezug.slice(0, i), id: bezug.slice(i + 1) };
}

/** Was das Protokoll über die verknüpften Datensätze wissen muss, um Bezüge zu benennen und zu verlinken. */
export interface Nachschlag {
  belege: Map<string, { dokumentId: string; text: string }>;
  dokumente: Map<string, string>;
  objekte: Map<string, string>;
  personen: Map<string, { name: string; objektId: string }>;
  einheiten: Map<string, { bezeichnung: string; objektId: string }>;
  kostenarten: Map<string, string>;
  leistungen: Map<string, string>;
  angebote: Map<string, string>;
  rechnungen: Map<string, string>;
  mahnungen: Map<string, string>;
  anfragen: Map<string, string>;
}

export function leererNachschlag(): Nachschlag {
  return {
    belege: new Map(), dokumente: new Map(), objekte: new Map(), personen: new Map(), einheiten: new Map(), kostenarten: new Map(),
    leistungen: new Map(), angebote: new Map(), rechnungen: new Map(), mahnungen: new Map(), anfragen: new Map(),
  };
}

export interface BezugZiel {
  text: string;
  href: string | null;
}

/** Bezug ("beleg:abc") → lesbarer Text und Link auf die passende Seite. Gelöschte Datensätze bleiben benannt, ohne Link. */
export function bezugZiel(bezug: string, n: Nachschlag): BezugZiel | null {
  const t = bezugTeile(bezug);
  if (!t) return null;
  const kurzId = t.id ? t.id.slice(0, 8) : "";
  switch (t.art) {
    case "beleg": {
      const b = n.belege.get(t.id);
      return b ? { text: `Beleg ${b.text}`.trim(), href: `/belege/${b.dokumentId}` } : { text: `Beleg ${kurzId} (gelöscht)`, href: null };
    }
    case "dokument": {
      const d = n.dokumente.get(t.id);
      return d ? { text: d, href: `/belege/${t.id}` } : { text: `Dokument ${kurzId} (gelöscht)`, href: null };
    }
    case "objekt": {
      const o = n.objekte.get(t.id);
      return o ? { text: `Objekt ${o}`, href: "/stammdaten?reiter=objekte" } : { text: `Objekt ${kurzId} (gelöscht)`, href: null };
    }
    case "person": {
      const p = n.personen.get(t.id);
      return p ? { text: p.name, href: `/stammdaten?reiter=personen&objekt=${encodeURIComponent(p.objektId)}` } : { text: `Person ${kurzId} (gelöscht)`, href: null };
    }
    case "einheit": {
      const e = n.einheiten.get(t.id);
      const objekt = e ? n.objekte.get(e.objektId) : undefined;
      return e ? { text: `Einheit ${e.bezeichnung}${objekt ? `, ${objekt}` : ""}`, href: "/stammdaten?reiter=objekte" } : { text: `Einheit ${kurzId} (gelöscht)`, href: null };
    }
    case "kostenart": {
      const k = n.kostenarten.get(t.id);
      return { text: k ? `Kostenart ${k}` : `Kostenart ${t.id}${k === undefined ? " (gelöscht)" : ""}`, href: k ? "/stammdaten?reiter=kostenarten" : null };
    }
    case "kostenarten":
      return { text: "Kostenarten", href: "/stammdaten?reiter=kostenarten" };
    case "leistung": {
      const l = n.leistungen.get(t.id);
      return l !== undefined ? { text: `Leistung ${l || "(ohne Code)"}`, href: "/stammdaten?reiter=leistungen" } : { text: `Leistung ${kurzId} (gelöscht)`, href: null };
    }
    case "leistungen":
      return { text: "Leistungskatalog", href: "/stammdaten?reiter=leistungen" };
    case "einstellungen":
      return { text: "Einstellungen", href: "/stammdaten?reiter=einstellungen" };
    case "stammdaten":
      return { text: "Stammdaten", href: "/stammdaten" };
    case "arbeitsbereich":
      return { text: "Arbeitsbereich", href: "/stammdaten?reiter=daten" };
    case "anfrage": {
      const a = n.anfragen.get(t.id);
      return { text: a ? `Anfrage ${a}` : `Anfrage ${kurzId}`, href: `/angebote?anfrage=${encodeURIComponent(t.id)}` };
    }
    case "angebot": {
      const a = n.angebote.get(t.id);
      return { text: a ? `Angebot ${a}` : `Angebot ${kurzId}`, href: `/angebote?angebot=${encodeURIComponent(t.id)}` };
    }
    case "rechnung": {
      const r = n.rechnungen.get(t.id);
      return { text: r ? `Rechnung ${r}` : `Rechnung ${kurzId}`, href: `/rechnungen?rechnung=${encodeURIComponent(t.id)}` };
    }
    case "mahnung": {
      const m = n.mahnungen.get(t.id);
      return { text: m ? `Mahnung ${m}` : `Mahnung ${kurzId}`, href: `/rechnungen?mahnung=${encodeURIComponent(t.id)}` };
    }
    case "bankkonto":
    case "bankumsatz":
    case "bankimport":
      return { text: t.art === "bankkonto" ? `Bankkonto ${kurzId}` : t.art === "bankumsatz" ? `Bankumsatz ${kurzId}` : "Bankimport", href: "/bank" };
    default:
      return { text: bezug, href: null };
  }
}

/** Volltextsuche über Aktion, Akteur, Bezug (auch dessen Klartext) und Details, ohne Groß/Klein. */
export function passtZuSuche(e: Protokoll, suche: string, bezugText = ""): boolean {
  const s = suche.trim().toLowerCase();
  if (!s) return true;
  const woerter = s.split(/\s+/);
  const heuhaufen = `${e.aktion} ${AKTEUR_TEXTE[e.akteur]} ${e.bezug} ${bezugText} ${e.details} ${zeit(e.zeit)}`.toLowerCase();
  return woerter.every((w) => heuhaufen.includes(w));
}

const BOM = "﻿";

function csvZelle(v: string): string {
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV für Excel in deutscher Einstellung: Semikolon, UTF-8 mit BOM, CRLF. Details als "Schlüssel: Wert" mit "|" getrennt. */
export function protokollCsv(eintraege: Protokoll[], bezugTexte: (bezug: string) => string = (b) => b): string {
  const kopf = ["Zeit", "Akteur", "Aktion", "Bezug", "Bezug (Schlüssel)", "Details"];
  const zeilen = eintraege.map((e) => [
    zeit(e.zeit),
    AKTEUR_TEXTE[e.akteur],
    e.aktion,
    bezugTexte(e.bezug),
    e.bezug,
    detailsLesbar(e.details)
      .map((z) => (z.schluessel ? `${z.schluessel}: ${z.wert}` : z.wert))
      .join(" | "),
  ]);
  return BOM + [kopf, ...zeilen].map((z) => z.map(csvZelle).join(";")).join("\r\n") + "\r\n";
}

export function csvDateiname(zeitstempelIso: string): string {
  return `protokoll-${lokalesDatum(zeitstempelIso)}.csv`;
}
