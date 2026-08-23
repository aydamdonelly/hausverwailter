# Hausverwailter

Belege, Bank, Angebote und Rechnungen einer Hausverwaltung: gelesen, geprüft, gebucht.
Next.js 16, React 19, TypeScript, Tailwind 4, Dexie (IndexedDB), Zod 4, Anthropic SDK mit
`claude-sonnet-5`. Alles auf Deutsch, auch der Code.

## Wenn du dieses Repo zum ersten Mal öffnest

1. Lies `docs/START-HIER.md`: warum es die App gibt, was angenommen wurde, wie sie entstanden
   ist und wie man weiterbaut.
2. Lies `docs/ARCHITEKTUR.md`: Aufbau, Datenmodell, Modulgrenzen, Verträge zwischen Modulen.
3. Lies `docs/DESIGN.md`, bevor du irgendetwas an der Oberfläche änderst.
4. `docs/BEISPIELE.md` ist das Drehbuch der Demo (welche Beispieldatei welche Falle enthält).
5. `AGENTS.md` enthält die Hinweise von Next.js 16 zu aktuellen APIs (Version 16 hat einige
   Dinge umbenannt; bei Unsicherheit dort und in `node_modules/next/dist/docs/` nachsehen).

## Starten und prüfen

```bash
npm install
cp .env.example .env.local        # ANTHROPIC_API_KEY eintragen
npm run dev                       # http://localhost:3000
npm run typecheck && npm run lint && npm test
```

Der Dev-Server lädt Änderungen automatisch. `node scripts/screenshot.mjs http://localhost:3000/ aus.png --beispiel`
macht einen Screenshot mit geladenem Beispielbetrieb (braucht Chrome oder Chromium).

## Regeln, die hier gelten

- **Die KI liest, der Code rechnet.** Geld, Steuer, Fristen, Nummern, Zuordnungen mit Geldfolge
  werden nie von der KI entschieden. KI-Aufrufe nur serverseitig über `src/lib/ki/client.ts`.
- **Nichts passiert ohne Klick.** Buchen, Zahlen, Versenden sind Nutzeraktionen. Jede fachliche
  Aktion geht durch `protokolliere()`.
- **`src/lib/domain/schema.ts` ist die Wahrheit.** Neue Felder zuerst dort (Zod), dann überall.
- **Reine Fachlogik in `src/lib/*` ohne React und ohne Datenbank**, mit Vitest-Test daneben.
  Datenbankzugriff in `src/lib/store/*` oder in Seiten/Komponenten.
- **Oberfläche nur aus `src/components/ui`** und nach `docs/DESIGN.md`. Keine neuen Farben,
  keine Icon-Pakete, keine Schatten, keine Attrappen.
- **Deutsch** in Bezeichnern, Kommentaren, UI, Tests. Formate über `src/lib/format.ts`.
- **Structured-Output-Schemas** (`src/lib/belege/schema-ki.ts`): höchstens 16 nullable/union-
  Felder pro Schema, flach; Textfelder als `string` mit `""` für "fehlt".
- **Keine Schlüssel im Repo.** `.env.local` ist ignoriert. Niemals einen API-Key in Code, Doku
  oder Commit-Nachrichten schreiben.

## Wo was liegt

| Was | Wo |
|---|---|
| Datenmodell (Zod) | `src/lib/domain/schema.ts`, Standardwerte `src/lib/domain/standard.ts` |
| Speicher (IndexedDB), Nummernkreise, Protokoll, Export/Import | `src/lib/store/` |
| Belege lesen (KI-Prompts, Schemas, Prüfregeln) | `src/lib/belege/` |
| KI-Client (einziger Ort mit Anthropic-SDK) | `src/lib/ki/client.ts` |
| Bank: Formate, Import, Abgleich, Soll/Ist, Mahnvorschläge | `src/lib/bank/` |
| Preise, Angebote, Rechnungen | `src/lib/preise/`, `src/lib/angebote/`, `src/lib/rechnungen/` |
| Exporte: DATEV, Excel, CSV, SEPA; XRechnung | `src/lib/export/`, `src/lib/xrechnung/` |
| PDF-Dokumente (DIN 5008) | `src/lib/pdf/`, Route `src/app/api/pdf/[art]` |
| Seiten | `src/app/` (Posteingang `page.tsx`, `belege/[id]`, `bank`, `angebote`, `rechnungen`, `buchungen`, `stammdaten`, `protokoll`) |
| Design-Bausteine | `src/components/ui/` |
| Beispielbetrieb und Beispieldokumente | `src/lib/beispiel/`, `public/beispiel/`, `scripts/beispieldaten.mjs` |

## Typische Aufgaben

- Neue Bank unterstützen: Profil in `src/lib/bank/formate.ts`, Fixture unter `src/lib/bank/fixtures/`, Test.
- Prüfregel ergänzen: `src/lib/belege/pruefung.ts` plus Test in `pruefung.test.ts`.
- KI-Anweisungen ändern: `src/lib/belege/prompts.ts` (Belege), `src/lib/angebote/anschreiben.ts` (Texte).
- Briefkopf oder Dokumentlayout ändern: `src/lib/pdf/`, prüfen mit `scripts/pdf-probe.mjs` und `pdftoppm`.
- Export für eine andere Verwaltungssoftware: neue Datei in `src/lib/export/`, Knopf in `src/app/buchungen`.
- Kostenarten/Konten des Steuerberaters: in der App unter Stammdaten, Standard in `src/lib/domain/standard.ts`.
