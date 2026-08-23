/**
 * Der einzige Ort, an dem die App mit der KI spricht (nur serverseitig, nie im Browser).
 *
 * Grundregel: Die KI liest und schlägt vor (Felder aus einem Beleg, Zuordnungen, Text).
 * Sie rechnet nie und entscheidet nie allein. Alles, was sie liefert, geht durch ein
 * Zod-Schema (Structured Outputs) und danach durch die Prüfregeln in lib/belege/pruefung.ts.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const MODELL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
export function kiClient(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

export function kiVerfuegbar(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type Anhang =
  | { art: "pdf"; base64: string }
  | { art: "bild"; mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string }
  | { art: "text"; text: string; titel?: string };

export interface KiAufruf<T extends z.ZodTypeAny> {
  system: string;
  auftrag: string;
  anhaenge?: Anhang[];
  schema: T;
  maxTokens?: number;
}

export interface KiErgebnis<T> {
  daten: T;
  modell: string;
  eingabeTokens: number;
  ausgabeTokens: number;
}

export class KiFehler extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "KiFehler";
  }
}

type Block = Anthropic.Messages.ContentBlockParam;

function anhangZuBlock(a: Anhang): Block {
  if (a.art === "pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: a.base64 } };
  }
  if (a.art === "bild") {
    return { type: "image", source: { type: "base64", media_type: a.mime, data: a.base64 } };
  }
  return { type: "text", text: a.titel ? `${a.titel}:\n${a.text}` : a.text };
}

/** Strukturierter KI-Aufruf: Anhänge + Auftrag rein, validiertes Objekt nach Schema raus. */
export async function strukturiert<T extends z.ZodTypeAny>(aufruf: KiAufruf<T>): Promise<KiErgebnis<z.infer<T>>> {
  if (!kiVerfuegbar()) {
    throw new KiFehler("Kein ANTHROPIC_API_KEY gesetzt. Trage den Key in .env.local ein (siehe README).");
  }
  const content: Block[] = [...(aufruf.anhaenge ?? []).map(anhangZuBlock), { type: "text", text: aufruf.auftrag }];
  try {
    const antwort = await kiClient().messages.parse({
      model: MODELL,
      max_tokens: aufruf.maxTokens ?? 8000,
      system: [{ type: "text", text: aufruf.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(aufruf.schema) },
    });
    if (antwort.stop_reason === "refusal") {
      throw new KiFehler("Die KI hat die Verarbeitung dieses Dokuments abgelehnt.");
    }
    if (antwort.stop_reason === "max_tokens") {
      throw new KiFehler("Die Antwort der KI war zu lang und wurde abgeschnitten. Bitte das Dokument aufteilen.");
    }
    if (!antwort.parsed_output) {
      throw new KiFehler("Die KI-Antwort entsprach nicht dem erwarteten Schema.");
    }
    return {
      daten: antwort.parsed_output,
      modell: antwort.model,
      eingabeTokens: antwort.usage.input_tokens + (antwort.usage.cache_read_input_tokens ?? 0) + (antwort.usage.cache_creation_input_tokens ?? 0),
      ausgabeTokens: antwort.usage.output_tokens,
    };
  } catch (e) {
    if (e instanceof KiFehler) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new KiFehler("Der API-Key ist ungültig.", 401);
    if (e instanceof Anthropic.RateLimitError) throw new KiFehler("Zu viele Anfragen, bitte kurz warten.", 429);
    if (e instanceof Anthropic.BadRequestError) throw new KiFehler(`Die Anfrage wurde abgelehnt: ${e.message}`, 400);
    if (e instanceof Anthropic.APIConnectionError) throw new KiFehler("Keine Verbindung zur KI (Netzwerk).", 503);
    if (e instanceof Anthropic.APIError) throw new KiFehler(`KI-Fehler (${e.status}): ${e.message}`, e.status);
    throw e;
  }
}

/** Kurzer Freitext-Aufruf ohne Schema, z. B. für Anschreiben. */
export async function freitext(system: string, auftrag: string, maxTokens = 2000): Promise<string> {
  if (!kiVerfuegbar()) throw new KiFehler("Kein ANTHROPIC_API_KEY gesetzt.");
  const antwort = await kiClient().messages.create({
    model: MODELL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: auftrag }],
  });
  if (antwort.stop_reason === "refusal") throw new KiFehler("Die KI hat den Auftrag abgelehnt.");
  return antwort.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}
