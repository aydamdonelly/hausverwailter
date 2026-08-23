# Tech-Stack-Fakten für die Hausverwaltungs-App (Next.js, lokal + Vercel, Claude Sonnet 5)

Stand: 23. August 2026. Alle Versionsangaben per `npm view` am 23.08.2026 abgefragt, alle Docs per WebFetch am selben Tag gelesen. Confidence-Marker: [H] hoch (Primärquelle gelesen), [M] mittel (Sekundärquelle oder abgeleitet), [L] niedrig (unbestätigt).

---

## 0. Versionsübersicht (npm-Registry, 23.08.2026)

| Paket | Version | Datum | Lizenz | Bemerkung |
|---|---|---|---|---|
| next | 16.3.2 | 2026-08-22 | MIT | Security-Release 16.3.3 für 26.08.2026 angekündigt |
| react / react-dom | 19.2.8 | 2026-08-20 | MIT | |
| typescript | 7.0.2 | 2026-08-23 | Apache-2.0 | Next 16.3 kann TS7 fürs Type-Checking nutzen |
| tailwindcss | 4.3.3 | 2026-08-14 | MIT | |
| @anthropic-ai/sdk | 0.120.0 | 2026-08-19 | MIT | peerDep `zod ^3.25.0 \|\| ^4.0.0` |
| zod | 4.4.3 | 2026-08-20 | MIT | |
| @react-pdf/renderer | 4.8.0 | 2026-08-23 | MIT | peerDep react ^16.8‖17‖18‖19; **fontFeatureSettings neu in 4.8.0** |
| pdf-lib | 1.17.1 | 2022-05-12 | MIT | seit 4 Jahren kein Release |
| pdfmake | 0.3.11 | 2026-06-12 | MIT | |
| @sparticuz/chromium | 149.0.0 | 2026-05-27 | MIT | unpacked 69,7 MB |
| @sparticuz/chromium-min | 149.0.0 | 2026-05-27 | MIT | unpacked 46 KB (lädt Binary zur Laufzeit nach) |
| puppeteer-core | 25.8.0 | 2026-08-17 | Apache-2.0 | |
| react-pdf (Viewer, wojtekmaj) | 10.5.0 | 2026-08-20 | MIT | dependency `pdfjs-dist 5.4.296` (gepinnt) |
| pdfjs-dist | 6.2.108 | 2026-07-28 | Apache-2.0 | nur relevant wenn ohne react-pdf |
| heic2any | 0.0.4 | 2023-03-29 | MIT | 2,7 MB, seit 3 Jahren unverändert |
| heic-to | 1.5.2 | 2026-05-26 | LGPL-3.0 | libheif 1.22.2 als WASM, gepflegt |
| browser-image-compression | 2.0.2 | 2023-03-06 | MIT | |
| dexie | 4.4.5 | 2026-08-14 | Apache-2.0 | |
| dexie-export-import | 4.4.0 | 2026-03-26 | Apache-2.0 | peerDep dexie ^4.4.0 |
| idb-keyval | 6.3.0 | 2026-07-08 | Apache-2.0 | 56 KB |
| idb | 8.0.3 | 2025-05-07 | ISC | |
| exceljs | 4.4.0 | 2024-12-20 | MIT | Projekt inaktiv; Fork `@protobi/exceljs` |
| xlsx (npm-Registry) | 0.18.5 | (Registry veraltet) | Apache-2.0 | aktuell 0.20.3 nur via cdn.sheetjs.com |
| write-excel-file | 4.1.1 | 2026-06-08 | MIT | |
| @vercel/blob | 2.8.0 | 2026-08-10 | Apache-2.0 | |
| vercel (CLI) | 59.5.0 | 2026-08-22 | Apache-2.0 | |

---

## 1. Claude API / TypeScript SDK (aus den lokalen SDK-Referenzen + platform.claude.com)

Quellen:
- lokal: `/private/tmp/claude-501/bundled-skills/2.1.241/.../claude-api/typescript/claude-api/README.md`, `tool-use.md`, `files-api.md`, `streaming.md`, `shared/platform-availability.md`, `shared/models.md`, `shared/model-migration.md` (Abschnitt "Migrating to Claude Sonnet 5"), `shared/prompt-caching.md`, `shared/error-codes.md`
- https://platform.claude.com/docs/en/build-with-claude/pdf-support.md
- https://platform.claude.com/docs/en/build-with-claude/vision.md
- https://platform.claude.com/docs/en/about-claude/pricing.md
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md
- https://platform.claude.com/docs/en/api/sdks/typescript.md

### 1.1 Client-Init [H]

```ts
import Anthropic from "@anthropic-ai/sdk";
// liest ANTHROPIC_API_KEY aus der Umgebung; nie hardcoden
const client = new Anthropic();
// optional: new Anthropic({ apiKey, maxRetries: 2, timeout: 10*60*1000 })
```
- Runtimes: Node.js 20 LTS+, Deno 1.28+, Bun 1.0+, Cloudflare Workers, Vercel Edge Runtime. Browser nur mit `dangerouslyAllowBrowser: true` (nicht tun).
- Default-Timeout 10 Minuten; bei großem `max_tokens` ohne Streaming dynamisch bis 60 Min: `calculated = 60*60*maxTokens/128_000` Sekunden. Nicht-Streaming-Requests, die voraussichtlich >10 Min dauern, wirft das SDK ab (Fehler), außer `stream: true` oder `timeout` gesetzt.
- Retries: default 2, mit Exponential Backoff; retried werden Connection-Errors, 408, 409, 429, >=500. `maxRetries` pro Client oder pro Request.
- `message._request_id` (aus `request-id`-Header) fürs Logging. `.withResponse()` liefert `{ data, response }`, `.asResponse()` die rohe `Response`.
- Der SDK setzt `anthropic-version: 2023-06-01` automatisch.

### 1.2 Modell `claude-sonnet-5` [H]

- Alias `claude-sonnet-5` (Modell-Katalog `shared/models.md`); Kontext 1M Tokens (Default = Maximum), max_output 128K.
- Preis (pricing.md, 23.08.2026): **$2 / MTok Input, $10 / MTok Output**. Cache-Write 5m $2.50, 1h $4, Cache-Read $0.20. Batch $1/$5. Hinweis im Doc: "The $2/$10 ... introductory pricing through August 31, 2026, is now the standard price. The previously scheduled increase to $3/$15 ... on September 1, 2026 will not occur." (Die lokale SDK-Referenz sagt noch "$3/$15 sticker, intro $2/$10 bis 31.08.2026" -> die Online-Doc ist aktueller.)
- Tool-Use-System-Prompt-Overhead auf Sonnet 5: 354 Tokens (auto/none), 474 (any/tool).
- Neuer Tokenizer: ~30 % mehr Tokens für denselben Text als Sonnet 4.6. `count_tokens` immer gegen `claude-sonnet-5` laufen lassen.
- Breaking (400-Fehler): `thinking: {type:"enabled", budget_tokens}` entfernt; `temperature`/`top_p`/`top_k` mit Nicht-Default-Wert -> 400 (einfach weglassen); Assistant-Prefill -> 400.
- **Stille Default-Änderung:** ohne `thinking`-Feld läuft Sonnet 5 mit adaptivem Thinking (4.6 lief ohne). `max_tokens` ist Hard-Limit für Thinking + Antwort. Für reine Extraktion: `thinking: {type:"disabled"}` oder `thinking: {type:"adaptive"}` + `output_config: {effort: "low"|"medium"}`. `effort` Default `high`; Bereich low/medium/high/xhigh/max. Sonnet 5 @ medium ≈ Sonnet 4.6 @ high.
- `thinking.display` Default `"omitted"` (Thinking-Blöcke mit leerem Text) -> im Streaming-UI wirkt das wie eine Pause. Wenn Reasoning gezeigt werden soll: `thinking: {type:"adaptive", display:"summarized"}`.
- Sonnet 5 folgt Instruktionen wörtlicher; Scope von Anweisungen explizit machen ("gilt für jede Position, nicht nur die erste").
- Mid-conversation `role: "system"`-Messages: NICHT auf Sonnet 5 (400 `role 'system' is not supported on this model`); top-level `system` verwenden.
- Prompt-Cache-Minimum auf Sonnet 5: **1024 Tokens**.
- High-Res Vision: 2576 px lange Kante, bis 4784 Bild-Tokens pro Bild.
- Cyber-Safeguards können `stop_reason: "refusal"` liefern (für Buchhaltungsinhalte praktisch irrelevant, aber abfangen).

### 1.3 Strukturierte Ausgabe: `messages.parse` + `zodOutputFormat` [H]

```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const Rechnung = z.object({
  rechnungsnummer: z.string(),
  rechnungsdatum: z.string().describe("ISO 8601 YYYY-MM-DD"),
  lieferant_name: z.string(),
  lieferant_iban: z.string().nullable(),
  positionen: z.array(z.object({
    beschreibung: z.string(),
    menge: z.number(),
    einzelpreis_netto_cent: z.number().int(),
    ust_satz: z.enum(["0", "7", "19"]),
  })),
  brutto_cent: z.number().int(),
  konfidenz: z.enum(["hoch", "mittel", "niedrig"]),
});

const res = await client.messages.parse({
  model: "claude-sonnet-5",
  max_tokens: 8000,
  thinking: { type: "disabled" },          // Extraktion: kein Thinking nötig
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: [
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
    { type: "text", text: "Extrahiere die Rechnungsdaten." },
  ]}],
  output_config: { format: zodOutputFormat(Rechnung) },
});
if (res.stop_reason === "refusal") { /* stop_details.category/explanation */ }
if (res.stop_reason === "max_tokens") { /* abgeschnitten, max_tokens erhöhen */ }
const daten = res.parsed_output; // null bei Parse-Fehler -> guarden
```
- Constrained Decoding: Ausgabe ist schema-konform garantiert. Grammatik-Compile beim ersten Request (Latenz), 24 h gecacht; Cache invalidiert bei Schema- oder Toolset-Änderung.
- **Nicht unterstützt im Schema:** `minimum`/`maximum`/`multipleOf`, `minLength`/`maxLength`/`pattern`, rekursive Schemas, externe `$ref`. `minItems` nur 0 oder 1. Unterstützt: `enum`, `const`, `required`, `additionalProperties:false` (Pflicht), `anyOf`, `allOf` (ohne `$ref`), `$ref`/`$defs`, String-Formate `date-time`, `time`, `date`, `duration`, `email`, `uri`, `uuid`, `ipv4/6`, `hostname`. => Beträge als Integer-Cent modellieren, Bereichsprüfungen im deterministischen Code.
- Änderung von `output_config.format` invalidiert den Prompt-Cache des Threads; leicht höherer Input-Token-Count durch injizierten System-Prompt.
- Alternative ohne Zod: `jsonSchemaOutputFormat(schema)` aus `@anthropic-ai/sdk/helpers/json-schema`. Strict Tool Use: `strict: true` am Tool-Objekt.
- Verfügbarkeit: 1P ✅, Bedrock ✅, Vertex ✅, Foundry β.

### 1.4 PDF als `document`-Block [H]

- Limits (pdf-support.md): **max Request-Größe 32 MB** (gesamter Payload inkl. Base64-Overhead), **max 600 Seiten pro Request (100, wenn Kontextfenster < 1M Tokens)**. Sonnet 5 hat 1M -> 600 Seiten. Kein Passwort/Verschlüsselung.
- Tokenkosten: pro Seite typischerweise **1.500 bis 3.000 Text-Tokens** plus Bild-Tokens (jede Seite wird zusätzlich als Bild verarbeitet, Bildkosten wie Vision). Ein 45.000-Input-Token-Beispiel ist in der Doc.
- Dichte PDFs können vor dem Seitenlimit den Kontext füllen; Empfehlung: splitten, eingebettete Bilder downsamplen.
- Source-Typen: `base64`, `url`, `file` (Files API, `file_id`).
- `cache_control: {type:"ephemeral"}` direkt auf dem `document`-Block möglich (mehrfache Fragen zum selben Dokument).
- `title` und `citations: {enabled: true}` optional am Document-Block.
- Base64-Erzeugung Node: `Buffer.from(arrayBuffer).toString("base64")`. Base64 vergrößert um ~33 %: Roh-PDF bis ~22 MB passt in 32 MB.
- Files API (Beta `files-api-2025-04-14`): max 500 MB/Datei, 100 GB/Org, Upload kostenlos, Nutzung als Input-Tokens abgerechnet. `client.beta.files.upload({ file: await toFile(stream, undefined, {type:"application/pdf"}), betas:[...] })`, dann `source: {type:"file", file_id}`. Nicht auf Bedrock/Vertex.

### 1.5 Bild-Input [H]

- Formate: `image/jpeg`, `image/png`, `image/gif`, `image/webp`. (HEIC NICHT -> vorher konvertieren.)
- Max 10 MB pro Bild (base64-encoded) an der Claude API (5 MB auf Bedrock/Vertex). Max 8000x8000 px. Bis 600 Bilder pro Request (100 bei 200k-Modellen); ab >20 Bildern gilt strengeres Pixel-Limit (dann jede Seite <= 2000 px).
- Tokens: `ceil(w/28) * ceil(h/28)`. High-Res-Tier (Sonnet 5, 4.7+): 2576 px lange Kante, max 4784 Tokens. 1920x1080 = 2691 Tokens, 2000x1500 = 3888 Tokens. Standard-Tier: 1568 px / 1568 Tokens.
- Empfehlung: Fotos client-seitig auf max 2000 px lange Kante und JPEG q≈0,85 verkleinern (spart Tokens, bleibt unter 20-Bilder-Sonderregel, Text bleibt lesbar). Bild VOR dem Text-Block senden; bei mehreren Bildern `Image 1:`-Labels.
- Metadaten werden nicht gelesen; Uploads nicht gespeichert.

### 1.6 Prompt Caching [H]

- Prefix-Match: `tools` -> `system` -> `messages`. Jede Byte-Änderung im Prefix invalidiert alles danach. Kein `Date.now()`/UUID im System-Prompt; JSON deterministisch serialisieren; Tools nicht pro Request variieren.
- `cache_control: {type:"ephemeral"}` (5 Min) oder `{type:"ephemeral", ttl:"1h"}`. Max 4 Breakpoints pro Request. Top-Level `cache_control` am Request cached automatisch den letzten cachebaren Block.
- Ökonomie: Write 1,25x (5m) / 2x (1h), Read 0,1x. Minimum auf Sonnet 5: 1024 Tokens (kürzere Prefixe cachen still nicht, `cache_creation_input_tokens: 0`).
- Verifikation: `usage.cache_read_input_tokens`, `usage.cache_creation_input_tokens`; Gesamt = `input_tokens + cache_creation + cache_read`.
- Für die App: großen System-Prompt (Extraktionsregeln, Kontenrahmen SKR03/04-Auszug, Beispiele) mit `cache_control` markieren; pro Dokument den `document`-Block ebenfalls markieren, wenn mehrere Fragen folgen. Parallel-Requests: Cache erst lesbar, wenn erste Antwort zu streamen beginnt -> erste Extraktion sequentiell, dann parallel.

### 1.7 Fehlerklassen (TypeScript) [H]

`Anthropic.BadRequestError` (400), `AuthenticationError` (401), `PermissionDeniedError` (403), `NotFoundError` (404), `ConflictError` (409), `UnprocessableEntityError` (422), `RateLimitError` (429), `InternalServerError` (>=500), `APIConnectionError` (Netz; in TS Subklasse von `APIError`, deshalb VOR `APIError` prüfen), `APIConnectionTimeoutError`. Basis `Anthropic.APIError` mit `.status`, `.headers`, `.type` (z. B. `"overloaded_error"` bei 529, `"rate_limit_error"`). 413 `request_too_large` bei zu großem Payload (PDF splitten). 429: `retry-after`-Header.

```ts
try { ... } catch (e) {
  if (e instanceof Anthropic.RateLimitError) ...
  else if (e instanceof Anthropic.BadRequestError) ...   // Schema/Parameter
  else if (e instanceof Anthropic.APIConnectionError) ... // Netz/Timeout
  else if (e instanceof Anthropic.APIError) ...           // e.status, e.type
}
```

### 1.8 Streaming-Empfehlung [H]

- `client.messages.stream({...}).on("text", cb)` + `await stream.finalMessage()`; nie `.on()` in `new Promise` wrappen. `client.messages.create({stream:true})` = nur Event-Iterator, weniger Speicher.
- SDK-Warnung: bei großem `max_tokens` ohne Streaming droht Idle-Connection-Drop; ab ~10 Min erwartete Dauer wirft der SDK ohne `stream:true`.
- Für die App: Extraktion einer Rechnung (wenige Tausend Output-Tokens) kann non-streaming über `messages.parse` laufen (Vercel Fluid: 300 s Default). Für lange Ausgaben (Angebotstexte, Mahnungen mit Streaming ins UI) Route Handler mit `ReadableStream`-Response nutzen (Next.js-Doc "Streaming" im route.js). Bei Streaming-Antworten gilt Vercels 4,5-MB-Response-Limit nicht.
- Structured Output + Streaming: `messages.parse` ist non-streaming; für streaming JSON `client.messages.stream` mit `output_config.format` und am Ende `finalMessage()` selbst parsen.

### 1.9 Stop-Reasons [H]

`end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `pause_turn`, `refusal`. Bei `refusal`: `response.stop_details.category` (z. B. `"cyber"`, `"bio"`, `"reasoning_extraction"`, `"frontier_llm"` oder null) und `.explanation`. Vor dem Lesen von `content` prüfen. Server-side Fallbacks (`betas: ["server-side-fallback-2026-06-01"], fallbacks: [{model:"..."}]`) sind ein Fable-5-Feature; für Sonnet 5 nicht dokumentiert -> im Refusal-Fall Nutzer informieren und Datei zur manuellen Erfassung markieren.

### 1.10 Token Counting [H]

`await client.messages.countTokens({ model: "claude-sonnet-5", system, messages })` -> `.input_tokens`. Kein tiktoken (unterzählt 15-20 %). Vor teuren Batch-Läufen Kosten schätzen: `input_tokens * 2e-6 + output * 10e-6` USD.

---

## 2. Next.js (Stand 16.3.2)

Quellen:
- https://nextjs.org/blog/next-16-3 (03.08.2026)
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/docs/app/api-reference/cli/create-next-app
- https://nextjs.org/docs/app/api-reference/file-conventions/route
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- https://nextjs.org/docs/app/api-reference/functions/cookies
- https://nextjs.org/blog/upcoming-nextjs-security-release-august-2026

### 2.1 Version und Anforderungen [H]
- Aktuelles Major: **16**, Patch 16.3.2 (npm 22.08.2026). 16.3 erschienen 03.08.2026. Security-Release 16.3.3 / 15.5.24 für **26.08.2026** angekündigt (eine kritische Lücke) -> nach Projektstart sofort auf 16.3.3 gehen.
- **Node.js >= 20.9.0** (LTS), Node 18 nicht mehr. TypeScript >= 5.1 (TS 7 fürs Type-Checking optional: `pnpm add -D typescript@^7`). Browser: Chrome/Edge/Firefox 111+, Safari 16.4+.
- React: App Router nutzt React Canary mit 19.2-Features; npm react 19.2.8.
- Turbopack ist Default für `next dev` und `next build` (Flag `--turbopack` überflüssig; `--webpack` zum Opt-out). Custom `webpack`-Config lässt `next build` fehlschlagen. Turbopack-Config top-level `turbopack: {...}`; `turbopack.resolveAlias` ersetzt `resolve.fallback`. Filesystem-Cache für dev+build default an.
- `next dev` schreibt nach `.next/dev` (parallel zu `next build` möglich), Lockfile verhindert Doppelstarts.
- `next lint` entfernt, `eslint`-Config-Option entfernt; ESLint Flat Config default. `serverRuntimeConfig`/`publicRuntimeConfig` entfernt (Env-Vars, `NEXT_PUBLIC_`-Prefix für Client). AMP entfernt.
- Async Request APIs: `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` nur noch async (`await`). Codemod: `npx @next/codemod@canary next-async-request-api .`
- `revalidateTag('x', 'max')` braucht zweites Argument. `cacheLife`/`cacheTag` stabil ohne `unstable_`.
- Parallel-Route-Slots brauchen `default.js`.
- `next/image`: `images.qualities` default `[75]`; `minimumCacheTTL` 4 h; lokale Bilder mit Query-String brauchen `images.localPatterns.search`.
- Neu in 16.3: `import.meta.glob`, `next/root-params`, `catchError` Error Boundaries, `cacheComponents` + `partialPrefetching` (opt-in), `reactCompiler: true` stabil (nicht default), `experimental.turbopackRustReactCompiler`, `experimental.useOffline`. `next dev` pflegt einen `AGENTS.md`-Block, der auf `node_modules/next/dist/docs/` zeigt.

### 2.2 create-next-app-Defaults [H]
```
npx create-next-app@latest hausverwaltung
```
Prompt "Would you like to use the recommended Next.js defaults?" -> "TypeScript, ESLint, Tailwind CSS, App Router, AGENTS.md". Flags: `--ts` (default), `--tailwind` (default, **Tailwind v4**, `@import 'tailwindcss'` + `@theme inline {}` in `globals.css`), `--eslint` | `--biome` | `--no-linter`, `--app`, `--src-dir`, `--import-alias "@/*"` (default), `--turbopack` (default), `--react-compiler` (opt-in), `--agents-md` (default: legt `AGENTS.md` + `CLAUDE.md` an), `--yes`, `--skip-install`, `--disable-git`, `--use-pnpm`.
Nicht-interaktiv: `npx create-next-app@latest hausverwaltung --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes`

### 2.3 Route Handlers (Node-Runtime) [H]
- Datei `app/api/.../route.ts`, Exporte `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS`. Web `Request`/`Response`; `NextRequest` mit `.nextUrl.searchParams`, `.cookies.get()`.
- Segment-Config: `export const runtime = 'nodejs'` (Default), `export const dynamic = 'force-dynamic'`, `export const maxDuration = 300` (Vercel liest das).
- Datei-Uploads: `const fd = await request.formData(); const file = fd.get("file") as File; const buf = Buffer.from(await file.arrayBuffer());` Kein `bodyParser`-Config nötig (im Gegensatz zu Pages API Routes). Streaming-Body: `request.body` ist ein `ReadableStream<Uint8Array>`; `for await (const chunk of request.body as any)` bzw. `Readable.fromWeb(request.body)` (Node) für pipe in Parser.
- Streaming-Response: `return new Response(readableStream, { headers: {"Content-Type": "text/event-stream"} })`.
- `params` ist `Promise<...>`: `const { id } = await ctx.params;` `RouteContext<'/api/x/[id]'>` global nach `next typegen`.
- Body-Größe: Next.js selbst setzt für Route Handlers kein Limit; das 1-MB-Limit (`experimental.serverActions.bodySizeLimit`, z. B. `'10mb'`) gilt nur für **Server Actions**. Auf Vercel gilt dann das Plattform-Limit 4,5 MB (Abschnitt 3).
- Cookies setzen nur in Route Handlers/Server Functions: `(await cookies()).set({ name, value, httpOnly:true, secure:true, sameSite:'lax', path:'/', maxAge: 60*60*24*30 })`.

### 2.4 `serverExternalPackages` [H]
```ts
// next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'pdfkit', 'puppeteer-core', '@sparticuz/chromium-min'],
}
export default nextConfig
```
Eingebaute Auto-Opt-out-Liste enthält bereits `@react-pdf/renderer`, `@sparticuz/chromium`, `@sparticuz/chromium-min`, `puppeteer`, `puppeteer-core`, `canvas`, `sharp`, `jsdom`, `pdfkit` NICHT (deshalb ggf. explizit). Quelle der Liste: https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/server-external-packages.jsonc

### 2.5 `proxy.ts` (ehemals middleware) [H]
- Datei `proxy.ts` (Root oder `src/`), Export `export function proxy(request: NextRequest)` oder default. Runtime **nur nodejs** (`runtime`-Option wirft Fehler; `edge` nicht möglich). Codemod `npx @next/codemod@canary middleware-to-proxy .` Config-Flag `skipMiddlewareUrlNormalize` -> `skipProxyUrlNormalize`.
- Matcher-Beispiel: `export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'] }` (läuft trotzdem für `/_next/data`).
- `request.cookies.get('name')`, `NextResponse.redirect(new URL('/login', request.url))`, `NextResponse.next()`, `Response.json({...}, {status:401})` direkt zurückgeben ist erlaubt.
- Server Functions (Server Actions) sind POSTs auf die Seite, auf der sie genutzt werden; Matcher-Ausschluss der Seite überspringt sie. Auth in jeder Server Function zusätzlich prüfen.
- Doku-Hinweis: "not intended for full session management"; nur Cookie-Existenz/Signatur prüfen, keine DB.

---

## 3. Vercel

Quellen:
- https://vercel.com/docs/functions/limitations (last_updated 2026-07-01)
- https://vercel.com/docs/functions/configuring-functions/duration
- https://vercel.com/docs/fluid-compute
- https://vercel.com/docs/vercel-blob/client-upload (2026-07-30)
- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions
- https://vercel.com/docs/cli/env, https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/limits
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting

### 3.1 Function-Limits (Fluid Compute, default für neue Projekte seit 23.04.2025) [H]
| | Hobby | Pro | Enterprise |
|---|---|---|---|
| Max Duration Default | 300 s | 300 s | 300 s |
| Max Duration Maximum | **300 s** | **800 s** (GA), 1800 s (Beta, per Funktion) | 800 s / 1800 s |
| Memory | 2 GB / 1 vCPU | bis 4 GB / 2 vCPU | 4 GB / 2 vCPU |
| Bundle (uncompressed) | 250 MB (Python 500 MB); "Large functions" bis 5 GB (Fluid + Active CPU, neue Projekte default, sonst `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`) | | |
| **Request-/Response-Body** | **4,5 MB** -> 413 `FUNCTION_PAYLOAD_TOO_LARGE`; Streaming-Responses haben dieses Limit nicht | | |
| Concurrency | bis 30.000 | 30.000 | 100.000+ |
| Region default | `iad1` (änderbar; für DSGVO `fra1` setzen) | | |
| File descriptors | 1.024 pro Instanz | | |
| Inkludiert/Monat | 4 Active-CPU-Std, 360 GB-h Memory, 1 Mio Invocations, 100 GB Fast Data Transfer | usage-based | |
| CLI-Source-Upload | 100 MB | 1 GB | |

- Timeout -> 504 `FUNCTION_INVOCATION_TIMEOUT`. Timeout zählt inkl. Streaming.
- `export const maxDuration = 300;` in `app/api/.../route.ts` (Next >= 13.5). Alternativ `vercel.json` `{"functions": {"app/api/**/*": {"maxDuration": 300}}}` (mit `src/`-Prefix falls `src`-Layout). Precedence: Code > vercel.json > Dashboard > Fluid-Defaults.
- Fluid: mehrere Invocations teilen sich eine Instanz (In-Function-Concurrency), Instanzen werden wiederverwendet; `waitUntil` aus `@vercel/functions` für Hintergrundarbeit; Bytecode-Caching nur Production. Unhandled Exceptions crashen nicht die anderen Requests. **Konsequenz: modul-globale Variablen (z. B. Rate-Limit-Map) werden von parallelen Requests in derselben Instanz geteilt, aber nicht zwischen Instanzen/Regionen; sie verschwinden bei Instanz-Recycling.**
- Hobby-Plan: nur nicht-kommerziell (Vercel Fair Use), keine Git-Org-Repos.

### 3.2 Node-Version [H]
Verfügbar 24.x (Default für neue Projekte), 22.x, 20.x. Setzen im Dashboard (Build and Deployment -> Node.js Version) oder `package.json` `"engines": {"node": "24.x"}` (überschreibt Dashboard; `>=20.0.0` mappt auf latest 24.x). Prüfen: `node -v` im Build-Command oder `process.version` loggen.

### 3.3 Uploads über 4,5 MB [H]
Vercel KB empfiehlt ausschließlich: (1) Client-Upload direkt zu Vercel Blob, (2) Pre-signed URLs zu externem Storage, (3) Streaming-Responses (nur für Antworten). Chunking wird nicht erwähnt (geht technisch, aber man braucht dann trotzdem Storage für die Chunks).

Vercel Blob Client-Upload:
```bash
pnpm i @vercel/blob   # 2.8.0
# Store im Dashboard: Storage -> Create Database -> Blob -> Private/Public; Env-Vars automatisch:
# BLOB_STORE_ID + VERCEL_OIDC_TOKEN (Server, kurzlebig) und BLOB_READ_WRITE_TOKEN (nötig für handleUpload)
vercel env pull
```
```tsx
// Client
import { upload } from '@vercel/blob/client';
const blob = await upload(file.name, file, { access: 'private', handleUploadUrl: '/api/upload' });
```
```ts
// app/api/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const json = await handleUpload({
    body, request,
    onBeforeGenerateToken: async (pathname) => {
      // HIER Zugangscode-Cookie prüfen, sonst ist der Store öffentlich beschreibbar
      return { allowedContentTypes: ['application/pdf','image/jpeg','image/png','text/csv'], addRandomSuffix: true, tokenPayload: '{}' };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => { /* läuft NICHT auf localhost (Vercel ruft Callback-URL) */ },
  });
  return Response.json(json);
}
```
- Max Blob 5 TB; ab 100 MB Multipart empfohlen; Cache nur bis 512 MB/Blob. Hobby: kostenlos in Limits, danach 30 Tage gesperrt statt Kosten. Pro-Beispielpreise: Storage $0.023/GB-Monat (5 GB inkl.), Simple Ops $0.40/1M (100K inkl.), Advanced Ops $5/1M (10K inkl.), Data Transfer $0.05/GB (100 GB inkl.). Client-Uploads verursachen keine Data-Transfer-Kosten.
- `onUploadCompleted` lokal nur über Tunnel (ngrok) + `VERCEL_BLOB_CALLBACK_URL`.

**Pragmatik für die Demo:** Vercel Blob würde eine DB-artige Persistenz einführen und Kunden-Belege in einen Cloud-Store legen. Für die Demo besser: (a) Fotos client-seitig verkleinern (Canvas -> JPEG, <= 2000 px, i. d. R. < 1 MB); (b) PDFs client-seitig prüfen: > 4 MB -> mit pdf.js/pdf-lib im Browser in Seiten-Chunks (z. B. 5 Seiten) splitten und jeden Chunk einzeln an den Route Handler schicken; oder Base64-JSON vermeiden und `multipart/form-data` nutzen (Base64 kostet 33 %); (c) alternativ Route Handler nimmt Datei entgegen und leitet an die Anthropic Files API weiter (500 MB), der Client schickt aber trotzdem durch die 4,5-MB-Tür. Typische Handwerkerrechnungen als PDF sind 50 KB bis 2 MB; Scans mit 300 dpi mehrseitig können 5 bis 20 MB sein -> Chunking nötig. Empfehlung: Limit im UI anzeigen ("max 4 MB pro Upload auf der Demo"), Chunking als zweiter Schritt.

### 3.4 Vercel CLI [H]
```bash
npm i -g vercel@latest          # 59.5.0
vercel login
vercel link --yes               # oder einfach `vercel` im Projektordner; legt Projekt an (Name aus Ordner)
vercel --yes                    # erste Deploy = automatisch Production
vercel --prod                   # spätere Production-Deploys
vercel deploy --prod --logs     # mit Build-Logs
vercel build && vercel deploy --prebuilt --archive=tgz   # lokal bauen (System-Env-Vars fehlen dann beim Build)
# Env-Vars
vercel env add ANTHROPIC_API_KEY production < key.txt     # Wert aus Datei (nicht in Shell-History)
printf '%s' "$KEY" | vercel env add ANTHROPIC_API_KEY preview
vercel env add DEMO_ACCESS_CODE production preview       # interaktiv
vercel env add NAME development                           # development separat (sensitive nicht erlaubt)
vercel env add NAME production --force                    # überschreiben
vercel env update NAME production --yes
vercel env ls; vercel env rm NAME production --yes
vercel env pull .env.local                                # development-Vars lokal
vercel env run -e production -- next build
```
- `vercel env add` setzt für production/preview default `sensitive` (nicht mehr lesbar). `--no-sensitive` zum Opt-out.
- `stdout` von `vercel deploy` ist immer die Deployment-URL. `--regions fra1`, `--target=staging`, `--no-wait`.

### 3.5 Rate Limiting auf Vercel [H]
- WAF Rate Limiting (Dashboard, Firewall -> Rules -> Rate Limit): Hobby 1 Regel/Projekt, Fixed Window, Keys IP/JA4, Fenster 10 s bis 10 min, 1 Mio erlaubte Requests inkl.; Pro 40 Regeln. Counter per Region. Sofort wirksam ohne Redeploy. Aktion 429/Deny/Challenge/Log. -> Für die Demo die einfachste externe-Service-freie Absicherung des `/api/*`-Pfads.
- `@vercel/firewall` SDK für app-seitige Keys (User-ID) [M].
- In-Memory-Counter im Route Handler: nur pro Instanz gültig (Fluid teilt Instanz zwischen parallelen Requests, aber nicht zwischen Instanzen/Regionen); reicht als "Brute-Force-Bremse" für den Zugangscode-Endpunkt in Kombination mit WAF, nicht als harte Garantie.

---

## 4. PDF-Erzeugung in Node auf Vercel

Quellen:
- npm view (Versionen), https://react-pdf.org/fonts, https://react-pdf.org/advanced, https://react-pdf.org/styling, https://react-pdf.org/compatibility
- GitHub Releases diegomura/react-pdf (@react-pdf/renderer@4.8.0, 4.7.0; @react-pdf/types@2.13.0; @react-pdf/layout@5.1.0)
- Issues: https://github.com/diegomura/react-pdf/issues/3285 (Monorepo/RSC "Cannot read properties of undefined (reading 'S')"), #2891, #2460
- https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel

### 4.1 @react-pdf/renderer 4.8.0 (23.08.2026) [H]
- React 19 seit v4.1.0. peerDep react ^16.8‖^17‖^18‖^19. Node getestet 18/20/21 (Doc veraltet, 22/24 laufen in der Praxis [M]).
- **Neu 4.8.0:** Upstream `pdfkit 0.20.1` statt Fork; **`fontFeatureSettings`** (PR #3440, in types 2.13.0/layout 5.1.0/stylesheet 6.3.0): `fontFeatureSettings: ['tnum']` (Array = zusätzlich zu Defaults aktivieren) oder Objekt `{ liga: false, tnum: true }`. Doc-Zitat (react-pdf.org/fonts): "React-pdf supports the fontFeatureSettings style property to control OpenType font features, such as tabular numbers ... A common use case is enabling tabular numbers with tnum".
- **Neu 4.7.0:** `<Page experimentalPagination>` (neue Paginierungs-Engine, 300 Seiten ~200 ms statt ~40 s; `<Page layout={Layout}>` für Kopf/Fuß mit `{pageNumber,totalPages}`); Default unverändert.
- 4.6.0: `hyphenationPenalty`-Prop auf `Text`.
- Fonts: `Font.register({ family: 'Vollkorn', fonts: [{ src, fontWeight: 400 }, { src, fontWeight: 700 }, { src, fontStyle: 'italic' }] })`. `src` = URL oder absoluter Pfad (Node). **Nur TTF und WOFF**; Variable Fonts "not recommended" (PDF-Spec) -> statische TTFs nehmen. `Font.registerHyphenationCallback(word => [word])` um Silbentrennung abzuschalten (deutsche Rechnungen: an).
- Layout: Wrapping-Engine default an (`wrap={false}` auf Page zum Abschalten); `break`-Prop erzwingt Seitenumbruch; `fixed`-Prop wiederholt Element auf jeder Seite (Kopf/Fuß); `render={({pageNumber,totalPages}) => ...}` auf Text/View (wird zweimal ausgeführt); `orphans`/`widows` default 2; `minPresenceAhead`; `debug`-Prop zeichnet Boxen. Units pt (default), mm, cm, in, %, vw, vh. Flexbox inkl. `gap`. `size="A4"`.
- Next.js App Router Fallen:
  1. Server-seitig nur `renderToBuffer`/`renderToStream` in einem Route Handler (Node runtime) nutzen; `@react-pdf/renderer` steht in Next' Auto-Extern-Liste, trotzdem `serverExternalPackages: ['@react-pdf/renderer']` explizit setzen (Doc-Empfehlung für Versionen < 14.1.1, schadet nicht).
  2. Die PDF-Komponentendateien dürfen NICHT `'use client'` haben, wenn sie serverseitig gerendert werden; `PDFViewer`/`PDFDownloadLink`/`usePDF` sind Browser-only und gehören in eine `'use client'`-Datei, die per `next/dynamic(() => import(...), { ssr: false })` geladen wird (Fehler sonst: "PDFViewer is a web specific API..." aus Issue #2891).
  3. Nicht aus einem Monorepo-Paket importieren (Issue #3285, Jan 2026, ungelöst: doppelte React-Instanzen -> `TypeError: Cannot read properties of undefined (reading 'S')`); direkt in der Next-App installieren.
  4. Kein `Date.now()` in `Font.register`-Pfaden; Font-Dateien mit `path.join(process.cwd(), 'public/fonts/…')` laden und über `outputFileTracingIncludes` sicherstellen, dass sie im Function-Bundle landen (Vercel packt nur getracte Dateien) [M].
  5. `renderToBuffer` liefert `Buffer`; Response: `new Response(buf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="Rechnung-2026-0001.pdf"' } })`.
- Alternativ komplett im Browser rendern (`pdf(<Doc/>).toBlob()` in einer Client-Komponente): entlastet Vercel-Limits vollständig, Fonts per URL aus `/public/fonts`. Für die Demo (Daten liegen ohnehin in IndexedDB) ist Browser-Rendering die einfachste Variante; Server-Rendering nur für E-Mail-Versand/Archiv.

### 4.2 Alternativen [H/M]
- **pdf-lib 1.17.1** (Mai 2022, unmaintained): Low-Level (Seiten, Text zeichnen, Formulare, PDFs mergen/splitten, Anhang einbetten). Kein Layout/Umbruch. Gut für: PDF/A-3-Anhang der XRechnung/ZUGFeRD (`attach()`), Seiten splitten, Metadaten. Läuft in Browser und Node.
- **pdfmake 0.3.11** (Juni 2026, gepflegt): deklaratives JSON-Layout, Tabellen mit Umbruch, Kopf/Fuß, VFS-Fonts (TTF als Base64 im Bundle). Braucht Font-VFS-Build. Solide, weniger "React".
- **Puppeteer + @sparticuz/chromium-min 149.0.0 + puppeteer-core 25.8.0**: HTML/CSS -> PDF, beste Typografie-Kontrolle (CSS `font-variant-numeric: tabular-nums`, `@page`, `break-inside`). Kosten: Chromium-Binary ~70 MB (`@sparticuz/chromium` unpacked 69,7 MB) bzw. `chromium-min` lädt Pack von URL beim Cold Start (mehrere hundert ms bis Sekunden), Memory 1 bis 2 GB, `serverExternalPackages: ['@sparticuz/chromium-min','puppeteer-core']`. Bundle-Limit 250 MB (bzw. 5 GB Large Functions). Auf Hobby 300 s reicht; Cold Start + Render typischerweise 3 bis 8 s [M]. Lokal braucht man ein lokales Chrome (`executablePath` unterscheiden).

### 4.3 Empfehlung [H]
**@react-pdf/renderer 4.8.0**, Rendering primär im Browser (`pdf().toBlob()`), optional identischer Code serverseitig via Route Handler (`renderToBuffer`). Begründung: React-Komponenten = gleiche Datenmodelle wie das UI, seit 4.8.0 echte Tabellenziffern über `fontFeatureSettings: ['tnum']`, `fixed`-Kopf/Fuß und `render` für Seitenzahlen decken Angebot/Rechnung/Mahnung ab, keine Chromium-Binaries, kein Vercel-Größenproblem, keine Cold-Start-Sekunden. pdf-lib zusätzlich für XRechnung/ZUGFeRD-XML-Anhang und Metadaten, wenn ZUGFeRD-Hybrid gewünscht wird. Puppeteer nur, wenn pixelgenaue HTML-Layouts Pflicht werden.

---

## 5. PDF-/Bild-Anzeige im Browser, HEIC, Verkleinern

Quellen: https://github.com/wojtekmaj/react-pdf (README + `sample/next-app/app/Sample.tsx`), npm view, https://raw.githubusercontent.com/hoppergee/heic-to/main/README.md, https://raw.githubusercontent.com/Donaldcwl/browser-image-compression/master/README.md, Web-Suche iOS-Safari-iframe, Web-Suche Chrome-HEIC.

### 5.1 Native Anzeige [H/M]
- `const url = URL.createObjectURL(blob); <iframe src={url} />` bzw. `<object data={url} type="application/pdf">` funktioniert in Desktop-Chrome/Edge/Firefox/Safari mit eingebautem Viewer. **iOS Safari (WKWebView) zeigt in iframe/object nur die erste Seite als Bild** (mehrere Apple-Community-Threads, Problem seit iOS 8, weiterhin gemeldet). Workarounds: Link in neuem Tab öffnen oder pdf.js-basiert rendern. `URL.revokeObjectURL` nicht vergessen.
- Für die Demo: Desktop primär -> `<iframe>` mit Blob-URL für die erzeugten Ausgangsdokumente; für Eingangsbelege (die man neben dem Extraktionsformular vergleichen will) pdf.js/react-pdf mit Seitennavigation.

### 5.2 react-pdf 10.5.0 (Viewer) in Next.js [H]
```bash
pnpm add react-pdf   # zieht pdfjs-dist 5.4.296
# pnpm < 11: .npmrc  public-hoist-pattern[]=pdfjs-dist ; pnpm 11+: pnpm-workspace.yaml publicHoistPattern: [pdfjs-dist]
# cMaps/Standard-Fonts/wasm nach public kopieren (aus node_modules/pdfjs-dist/cmaps, standard_fonts, wasm)
```
```tsx
// app/belege/page.tsx
'use client';
import dynamic from 'next/dynamic';
const PdfView = dynamic(() => import('./PdfView'), { ssr: false });
export default function Page() { return <PdfView /> }
```
```tsx
// app/belege/PdfView.tsx
'use client';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
const options = { cMapUrl: '/cmaps/', standardFontDataUrl: '/standard_fonts/', wasmUrl: '/wasm/' };
// <Document file={fileOrBlob} options={options} onLoadSuccess={({numPages}) => ...}><Page pageNumber={n} width={w}/></Document>
```
- Worker-Setup muss in derselben Datei stehen wie die `<Document>`-Nutzung (Modul-Reihenfolge). Vor Next 15: `swcMinify: false`; in 16 nicht nötig. Das offizielle Sample nutzt `next ^16.2.11`, `react ^19.2.0`, `react-pdf latest` -> Turbopack-kompatibel [H].
- Alternativ pdf.js direkt (`pdfjs-dist` 6.2.108) mit `getDocument({data})` + Canvas-Render, wenn man Seiten als Bilder (z. B. Thumbnails) braucht; auch nützlich, um Seiten eines großen PDFs im Browser zu splitten (Render -> JPEG) bevor sie an Claude gehen.

### 5.3 HEIC von iPhones [H]
- Chrome/Edge/Firefox können HEIC nicht dekodieren (HEVC-Patente); nur Safari nativ. iPhone-Kamera liefert default HEIC; `<input type="file" accept="image/*" capture="environment">` kann auf iOS trotzdem HEIC liefern. Claude API akzeptiert kein HEIC.
- Erkennung: `file.type === 'image/heic' || 'image/heif'` oder Endung `.heic/.heif` (Type ist manchmal leer) oder `isHeic(file)` aus heic-to.
- **heic-to 1.5.2** (LGPL-3.0, libheif 1.22.2 WASM, gepflegt 05/2026): `import { heicTo, isHeic } from 'heic-to'; const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.85 })`. CSP-Variante `heic-to/csp`, Worker-Variante `heic-to/next`. **heic2any 0.0.4** (MIT) ist seit 2023 unverändert; API `heic2any({ blob, toType: 'image/jpeg', quality: 0.85 })`. Beide nur im Browser, per `await import()` in einem Client-Handler laden (WASM-Bundle mehrere MB). LGPL-Hinweis: dynamisches Laden als separates Modul ist unkritisch, aber im Lizenzhinweis nennen [M].
- Ablauf: Datei -> (HEIC? -> JPEG) -> Verkleinern -> Upload/Base64.

### 5.4 Client-seitig verkleinern [H]
- **browser-image-compression 2.0.2**: `imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.85, preserveExif: false })` -> `Promise<File>`. Unterstützt jpeg/png/webp/bmp (kein HEIC), Web Worker via OffscreenCanvas. Seit 2023 kein Release, funktioniert aber [M].
- Ohne Lib: `createImageBitmap(file, { imageOrientation: 'from-image' })` -> `OffscreenCanvas`/`canvas` -> `canvas.toBlob(cb, 'image/jpeg', 0.85)`; EXIF-Orientation beachten (Safari/Chrome wenden sie bei `createImageBitmap` mit `imageOrientation:'from-image'` an).
- Ziel: <= 2000 px lange Kante (unter Claudes 20-Bilder-Sonderlimit, ~3.900 Tokens bei 2000x1500), JPEG q 0,85 -> meist 300 bis 800 KB.

---

## 6. Browserseitige Persistenz

Quellen: npm view, https://dexie.org/docs/Tutorial/Design, https://dexie.org/docs/Dexie/Dexie.version(), https://dexie.org/docs/ExportImport/dexie-export-import, https://dexie.org/docs/Indexable-Type, MDN Storage quotas, Web-Suche Safari-Blob-Bugs.

### 6.1 Dexie 4.4.5 [H]
```ts
import Dexie, { type EntityTable } from 'dexie';
interface Beleg { id: string; typ: 'eingang'|'ausgang'; datum: string; betragCent: number; lieferantId?: string; datei?: Blob; erstelltAm: number }
const db = new Dexie('hausverwaltung') as Dexie & {
  belege: EntityTable<Beleg, 'id'>;
  buchungen: EntityTable<Buchung, 'id'>;
};
db.version(1).stores({
  belege: 'id, typ, datum, lieferantId, [typ+datum]',   // nur Indizes deklarieren; 'datei' (Blob) nicht indexieren
  buchungen: 'id, belegId, konto, datum',
});
db.version(2).stores({ belege: 'id, typ, datum, lieferantId, [typ+datum], status' })
  .upgrade(tx => tx.table('belege').toCollection().modify(b => { b.status ??= 'neu'; }));
```
- Index-Syntax: `++id` Auto-Increment, `&email` unique, `*tags` Multi-Entry, `[a+b]` Compound. Nur Indizes deklarieren; beliebige weitere Properties werden gespeichert.
- Versionierung: `db.version(n)` monoton steigend; seit Dexie 3 muss man alte Versionsdeklarationen nicht mehr behalten, nur `upgrade()` für Datenmigration. Primärschlüssel-Änderung = neue Tabelle + Kopieren [M].
- Indexierbare Key-Typen: number, Date, string, ArrayBuffer, TypedArrays, Arrays davon. Nicht: boolean, undefined, Object, null.
- Werte: alles, was Structured Clone kann (Blob, File, ArrayBuffer, Date, TypedArrays). Blobs sind als Values erlaubt, nicht als Keys. Bekannte historische Safari-Bugs (iOS 14.5 Blob-Storage, Dexie Issue #1227; WebKit #188438); aktuelle Safari-Versionen ok, aber Blob-Speicherung auf iOS testen [M]. Sicherer Fallback: `ArrayBuffer` statt `Blob` speichern (`await file.arrayBuffer()`), plus `mime`-Feld.
- `dexie-export-import 4.4.0`: `const blob = await db.export({ prettyJson: false, numRowsPerChunk: 2000, progressCallback })`; `await db.import(blob, { overwriteValues: true, clearTablesBeforeImport: true, acceptVersionDiff: true })`; `Dexie.import(blob)` erzeugt neue DB. Format `{ formatName: "dexie", formatVersion: 1, data: { databaseName, databaseVersion, tables: [...], data: [{tableName, inbound, rows}] } }`; Blobs/ArrayBuffers werden als Base64 mit `$types`-Metadaten (`"blob2"`) serialisiert -> Export ist reine JSON-Datei (kann groß werden: Base64 +33 %). Für ZIP: JSZip/fflate drumherum (Belege als Einzeldateien + `db.json`) [M].

### 6.2 idb-keyval 6.3.0 [H]
`get/set/del/keys/entries/createStore('db','store')`. 56 KB, kein Schema, kein Index, keine Queries. Gut für Settings/Draft-Zustand, nicht für Buchungsliste mit Filter. Empfehlung: Dexie für Domänendaten, idb-keyval nur für Kleinkram oder gar nicht (Dexie-Table `settings` reicht).

### 6.3 Speichergrenzen und Persistenz (MDN) [H]
- Chrome/Edge: bis 60 % der Platte pro Origin. Firefox best-effort: min(10 % Platte, 10 GiB) je Site-Gruppe; persistent bis 50 % / 8 TiB. Safari 17+/macOS 14+: ~60 % der Platte (Gesamt 80 %), WebViews ~15 %; **Safari löscht Script-Daten von Origins ohne Interaktion seit 7 Tagen** (ITP) -> Warnung im UI + Export-Funktion.
- localStorage/sessionStorage: 5 MiB je Typ (nicht für Belege).
- `await navigator.storage.persist()` -> boolean; Chrome/Edge/Safari entscheiden still nach Nutzungsheuristik, Firefox zeigt Prompt. `navigator.storage.estimate()` -> `{usage, quota}` (geschätzt). Eviction ist LRU per Origin und löscht alles auf einmal (IndexedDB + Cache API).
- Für die Demo: beim ersten Speichern `persist()` aufrufen, `persisted()` im Settings-Screen anzeigen, JSON-Export als "Backup" prominent.

---

## 7. Excel-/CSV-Export

Quellen: npm view, https://raw.githubusercontent.com/catamphetamine/write-excel-file/master/README.md, docs.sheetjs.com (NodeJS-Installationsseite via curl), Web-Suche exceljs-Status, Web-Suche CSV/Excel-DE.

### 7.1 Bibliotheken [H]
- **exceljs 4.4.0** (MIT): letzte Version 12/2024, Projekt inaktiv (Maintainer-Diskussionen #2884, #2987, #3008); API-kompatibler, gepflegter Fork `@protobi/exceljs` (4.4.0-protobi.10, 05/2026). 21,8 MB unpacked. Kann Styles, Zahlformate, Spaltenbreiten, Freeze Panes, Streaming, Lesen. Bekannte Warnungen bei Install (#3035).
- **SheetJS xlsx**: npm-Registry hängt bei **0.18.5** (Apache-2.0, absichtlich nicht mehr gepflegt); aktuell **0.20.3** nur über `npm i --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (bzw. `yarn add xlsx@https://...`). Community Edition schreibt **keine Styles/Zahlformate-Styles/Spaltenbreiten-Formatierung** (Pro kostenpflichtig). Lockfile mit URL-Dependency ist auf Vercel ok, aber ungewohnt.
- **write-excel-file 4.1.1** (MIT, 06/2026): `import writeXlsxFile from 'write-excel-file'` (Browser) / `'write-excel-file/node'`. Zellen `{ value, type: Number|String|Date|Boolean|'Formula', format: '#,##0.00', fontWeight: 'bold', align, backgroundColor, borderStyle, width (spalte), wrap, columnSpan }`; Optionen `sheet`, `columns: [{width}]`, `dateFormat`, `stickyRowsCount`, mehrere Sheets. Nur Schreiben (Lesen: `read-excel-file`). Für Mieteingangslisten/DATEV-Vorschau/Offene-Posten reicht das vollständig.

**Empfehlung:** write-excel-file (klein, gepflegt, Zahlformate + Breiten, Browser und Node). Nur wenn Pivot/Charts/Lesen nötig: `@protobi/exceljs`.

### 7.2 CSV für Excel-DE [H]
- Excel nutzt das Listentrennzeichen der Windows-Region: Deutsch = **Semikolon**, Dezimaltrenner **Komma**, Tausender Punkt. Datei UTF-8 **mit BOM** (`﻿` als erste Zeichen), sonst Umlaute kaputt beim Doppelklick. Optional erste Zeile `sep=;` (nicht standardisiert; Excel und LibreOffice verstehen es, andere Parser lesen es als Datenzeile) -> **nicht** in DATEV-/Bank-Importdateien setzen, nur in "für Excel"-Exports.
- Zeilenende `\r\n`, Felder mit `;`, `"`, `\n` in Anführungszeichen setzen, `"` verdoppeln. Beträge als `1234,56`, Datum `TT.MM.JJJJ`. Führende Nullen (IBAN, Kontonummern) gehen in Excel verloren -> Excel-Export als Text-Zelle, oder besser XLSX statt CSV.
```ts
const BOM = '﻿';
const esc = (v: string) => /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const csv = BOM + rows.map(r => r.map(esc).join(';')).join('\r\n');
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
```
- DATEV-Buchungsstapel-CSV hat eigene Regeln (Windows-1252/ANSI, Semikolon, feste Header) -> separates Thema.

---

## 8. Schriften: Vollkorn und Source Sans 3

Quellen: GitHub API google/fonts (`ofl/vollkorn`, `ofl/sourcesans3`), METADATA.pb beider Fonts, FAlthausen/Vollkorn-Typeface (`fonts/ttf`), adobe-fonts/source-sans Release 3.052R, eigene fontTools-Analyse der heruntergeladenen TTFs (23.08.2026), https://nextjs.org/docs/app/api-reference/components/font.

### 8.1 Vollkorn [H]
- Lizenz **OFL** (METADATA.pb `license: "OFL"`, OFL.txt im Repo; laut Projektseite seit 19.05.2010 OFL). Designer Friedrich Althausen.
- Google-Fonts-Repo enthält **nur Variable Fonts**: `Vollkorn[wght].ttf` (577.864 B, wght 400 bis 900, Version 5.001, Named Instances Regular/Medium/SemiBold/Bold/ExtraBold/Black) und `Vollkorn-Italic[wght].ttf` (441.264 B).
  - https://raw.githubusercontent.com/google/fonts/main/ofl/vollkorn/Vollkorn%5Bwght%5D.ttf
  - https://raw.githubusercontent.com/google/fonts/main/ofl/vollkorn/Vollkorn-Italic%5Bwght%5D.ttf
  - https://raw.githubusercontent.com/google/fonts/main/ofl/vollkorn/OFL.txt
- **Statische TTFs** (für @react-pdf, das Variable Fonts nicht empfiehlt) im Upstream-Repo `FAlthausen/Vollkorn-Typeface/fonts/ttf/` (Version 5.000, ttfautohint): `Vollkorn-Regular.ttf` (419.116 B), `-Italic`, `-Medium`, `-MediumItalic`, `-SemiBold`, `-SemiBoldItalic`, `-Bold` (429.264 B), `-BoldItalic`, `-ExtraBold`, `-Black` + VollkornSC-Varianten. URL-Muster: `https://raw.githubusercontent.com/FAlthausen/Vollkorn-Typeface/master/fonts/ttf/Vollkorn-Regular.ttf`
- **OpenType-Features (fontTools, GSUB):** `tnum`, `pnum`, `lnum`, `onum`, `zero`, `frac`, `smcp`, `c2sc`, `liga`, `dlig`, `hlig`, `case`, `sups`, `subs`, `numr`, `dnom`, `ss01 bis ss17`, `titl`, `hist`, `calt`. **Default-Ziffern sind proportional** (Advance-Widths 0..9 = 601, 388, 537, 513, 597, 481, 506, 485, 508, 519 units) -> in Tabellen zwingend `tnum` aktivieren (CSS `font-variant-numeric: tabular-nums lining-nums`, react-pdf `fontFeatureSettings: ['tnum','lnum']`). Default-Ziffern sind Oldstyle? (`onum` und `lnum` beide vorhanden; welche Default ist, nicht gemessen) -> `lnum` mit aktivieren, damit Beträge auf einer Linie stehen [M].
- Zeichenumfang 2.303 Glyphen: Latin, Latin-ext, Kyrillisch, Griechisch, Vietnamesisch; € und deutsche Anführungszeichen vorhanden [M].

### 8.2 Source Sans 3 [H]
- Lizenz **OFL** (METADATA.pb, © 2023 Adobe, Reserved Font Name "Source"). Designer Paul D. Hunt.
- Google-Fonts-Repo: Variable `SourceSans3[wght].ttf` (646.340 B, wght 200 bis 900, Version 3.052) und `SourceSans3-Italic[wght].ttf` (395.372 B).
  - https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf
  - https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/SourceSans3-Italic%5Bwght%5D.ttf
- Statische TTFs: Adobe-Release 3.052R (04.04.2023) `https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip` (2,48 MB) -> `TTF/SourceSans3-Regular.ttf`, `-It`, `-Light`, `-Semibold`, `-Bold`, `-Black` etc. Auch OTF/WOFF/WOFF2-Zips dort.
- **OpenType (fontTools):** **KEIN `tnum`, KEIN `lnum`** in GSUB. Grund: **Ziffern sind bereits tabular und lining per Default** (alle Advance-Widths 0..9 identisch: 472 units im VF, 497 im statischen Regular). `pnum` und `onum` existieren als Opt-in. -> Für Source Sans 3 nichts aktivieren; `tnum` anzufordern ist harmlos (Feature fehlt, Default bleibt tabular).

### 8.3 Dieselbe Datei für `next/font/local` und `Font.register` [H]
- Dateien nach `public/fonts/` legen (dann per URL im Browser erreichbar für react-pdf im Browser und per `fs`-Pfad für Node). `next/font/local` liest per relativem Pfad zur aufrufenden Datei zur Build-Zeit; `src` kann auch `../../public/fonts/Vollkorn-Regular.ttf` sein.
```ts
// src/styles/fonts.ts
import localFont from 'next/font/local';
export const vollkorn = localFont({
  src: [
    { path: '../../public/fonts/Vollkorn-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Vollkorn-Italic.ttf',  weight: '400', style: 'italic' },
    { path: '../../public/fonts/Vollkorn-Bold.ttf',    weight: '700', style: 'normal' },
  ],
  variable: '--font-vollkorn', display: 'swap',
  declarations: [{ prop: 'font-feature-settings', value: '"tnum" 1, "lnum" 1' }], // optional global
});
export const sourceSans = localFont({
  src: '../../public/fonts/SourceSans3[wght].ttf', weight: '200 900', variable: '--font-source-sans', display: 'swap',
});
// globals.css (Tailwind v4): @theme inline { --font-sans: var(--font-source-sans); --font-serif: var(--font-vollkorn); }
```
```ts
// src/lib/pdf/fonts.ts  (wird sowohl in Browser als auch Node importiert)
import { Font } from '@react-pdf/renderer';
const base = typeof window === 'undefined'
  ? `${process.cwd()}/public/fonts`          // Node: absoluter Pfad (Vercel: outputFileTracingIncludes!)
  : '/fonts';                                 // Browser: URL
Font.register({ family: 'Vollkorn', fonts: [
  { src: `${base}/Vollkorn-Regular.ttf`, fontWeight: 400 },
  { src: `${base}/Vollkorn-Italic.ttf`,  fontWeight: 400, fontStyle: 'italic' },
  { src: `${base}/Vollkorn-Bold.ttf`,    fontWeight: 700 },
]});
Font.register({ family: 'Source Sans 3', fonts: [
  { src: `${base}/SourceSans3-Regular.ttf`, fontWeight: 400 },
  { src: `${base}/SourceSans3-Semibold.ttf`, fontWeight: 600 },
]});
Font.registerHyphenationCallback(w => [w]);
// Style: { fontFamily: 'Vollkorn', fontFeatureSettings: ['tnum', 'lnum'] }
```
- `next/font/local` akzeptiert woff2/woff/ttf/otf; für react-pdf nur TTF/WOFF -> **statische TTFs als gemeinsamer Nenner**. Die Variable-TTF kann `next/font/local` mit `weight: '200 900'` nutzen; für react-pdf besser die statischen Schnitte.
- `next.config.ts`: `outputFileTracingIncludes: { '/api/pdf/**': ['./public/fonts/**'] }` damit Vercel die TTFs ins Function-Bundle packt, wenn serverseitig gerendert wird [M].

---

## 9. Zugangsschutz für die öffentliche Demo (ohne DB)

Quellen: Next.js proxy.js + cookies() Docs, Vercel Fluid-Compute + WAF-Rate-Limiting Docs, Node/Web Crypto (Standard).

### 9.1 Design [H]
- Env-Vars: `DEMO_ACCESS_CODE` (der Code, den man dem Kunden gibt) und `SESSION_SECRET` (32+ Zufallsbytes, `openssl rand -hex 32`). Beide per `vercel env add ... production` (sensitive).
- Login-Route Handler `POST /api/auth` liest `{code}` aus JSON, vergleicht zeitkonstant (`crypto.timingSafeEqual` auf gleich langen Buffern, z. B. SHA-256 beider Werte), setzt bei Erfolg ein **HMAC-signiertes Cookie**: Payload `exp=<unix>` + `.` + `base64url(HMAC-SHA256(SESSION_SECRET, payload))`. Optionen: `httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*14`. Kein Server-State nötig; Logout = Cookie löschen; Code-Rotation = neuen `DEMO_ACCESS_CODE` und/oder `SESSION_SECRET` setzen und redeployen (alle Sessions ungültig).
- `proxy.ts` mit Matcher `'/((?!api/auth|login|_next/static|_next/image|favicon.ico|fonts).*)'` prüft Cookie-Signatur (Web Crypto `crypto.subtle` steht im Node-Runtime zur Verfügung; `proxy` läuft in Node) und `exp`; ohne gültiges Cookie: Seiten -> `NextResponse.redirect('/login')`, API-Pfade -> `Response.json({error:'unauthorized'},{status:401})`. `/fonts` und `/_next/*` ausnehmen, sonst lädt die Login-Seite keine Assets.
- Zusätzlich in jedem Route Handler, der Claude aufruft, das Cookie erneut prüfen (kleine `requireAuth(request)`-Hilfsfunktion), weil Proxy-Matcher-Änderungen leicht Lücken reißen (Next-Doc-Warnung).
- Kein Basic-Auth: Safari/iOS-UX schlecht und Credentials landen im Cache.

### 9.2 Rate-Limiting ohne externen Service [H]
- In-Memory Token-Bucket pro IP (`x-forwarded-for` erstes Element; auf Vercel `x-real-ip`) auf `/api/auth`: z. B. 5 Versuche/Minute, 20/Stunde. Modul-globale `Map<string, {count, resetAt}>` mit periodischem Aufräumen. Gilt **pro Function-Instanz** (Fluid teilt Instanz zwischen gleichzeitigen Requests; mehrere Instanzen/Regionen zählen getrennt; Recycling setzt zurück). Als Brute-Force-Bremse ausreichend, weil ein 16+-stelliger Code ohnehin nicht erratbar ist; zusätzlich künstliche Verzögerung (`await sleep(500)`) bei Fehlversuch.
- Härtere Garantie kostenlos: **Vercel WAF Rate-Limit-Regel** (Hobby: 1 Regel, IP/JA4-Key, Fixed Window 10 s bis 10 min, z. B. 30 Requests/60 s auf `/api/*`, Aktion 429). Kein Redeploy nötig, sofort aktiv.
- Claude-Kosten-Deckel: pro Session/Tag Zähler im Cookie ist manipulierbar; stattdessen Anthropic-Console Spend-Limit + Workspace-Limit setzen (organisatorisch) [M].
- Für den DSGVO-Aspekt: Demo-Daten bleiben im Browser (IndexedDB), Server ist stateless; nur der Claude-Call transportiert Belege (Anthropic API, ZDR-Optionen laut pdf-support "ZDR eligible" für Standardmodelle). Region der Function auf `fra1` setzen (`vercel.json` `"regions": ["fra1"]`) [M].

---

## 10. Offene Punkte / Risiken
1. `@react-pdf/renderer` 4.8.0 ist vom **selben Tag** (23.08.2026) mit großem Umbau (pdfkit upstream, fontFeatureSettings). Wenn Bugs auftauchen: 4.6.1 (14.08.2026) pinnen, dann aber ohne `tnum` (Workaround: Source Sans 3 für Zahlen, da default tabular).
2. Vercel 4,5-MB-Body-Limit vs. mehrseitige 300-dpi-Scans: entweder Client-Splitting/Rendering per pdf.js oder Vercel Blob (dann Kundendaten in Blob-Store, Auth-Pflicht in `onBeforeGenerateToken`).
3. Safari-ITP löscht IndexedDB nach 7 Tagen Inaktivität; `persist()`-Zusage nicht garantiert -> Backup-Export ist Pflicht-Feature für die Demo.
4. Next.js Security-Patch 16.3.3 am 26.08.2026: bei Projektstart einplanen.
5. Sonnet-5-Tokenizer (+30 %) und Thinking-Default: `max_tokens` und Kostenmodell auf Sonnet 5 messen, nicht aus 4.x-Erfahrung übernehmen.
6. Ob Vollkorns Default-Ziffern Oldstyle (onum) oder Lining sind, wurde nicht gemessen; `lnum` explizit setzen.
7. HEIC-Konvertierung: heic-to ist LGPL-3.0; bei Bedenken heic2any (MIT, aber ungepflegt) oder Server-seitig `sharp` (libheif nicht in Standard-Build, daher unpraktisch auf Vercel) [L].
