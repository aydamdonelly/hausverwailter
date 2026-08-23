# Architektur

## Die eine Idee

Dokumente rein, geprüfte Daten und fertige Dokumente raus. Die KI liest (Belege, Fotos, Mails,
unbekannte CSV-Formate) und schlägt vor (Zuordnungen, Texte). Alles mit Geld, Steuer, Nummern
und Fristen ist deterministischer Code, der getestet ist. Nichts wird gebucht, bezahlt oder
verschickt ohne Klick eines Menschen. Jeder Schritt steht im Protokoll.

## Aufbau

```
Browser (Next.js App Router, React 19)
  IndexedDB (Dexie)            ← alle Daten des Nutzers liegen hier, nicht auf dem Server
  lib/store/*                  ← Lesen/Schreiben, Nummernkreise, Protokoll, Export/Import
  lib/belege/pruefung.ts       ← Prüfregeln (reiner Code, läuft auch auf dem Server)
  lib/bank/*                   ← CSV/CAMT/MT940 lesen, Umsätze zuordnen, Soll/Ist, Mahnvorschläge
  lib/angebote/*, lib/rechnungen/*, lib/export/*, lib/xrechnung/*  ← Fachlogik, reiner Code
        │  fetch (JSON / multipart)
Server (Route Handlers, Node-Runtime, zustandslos)
  /api/status                  ← was der Server kann
  /api/erkennen                ← Datei → KI (Klassifikation, dann Extraktion) → Entwurf
  /api/bank/spalten            ← unbekanntes CSV-Format → Spaltenzuordnung (KI)
  /api/bank/zuordnen           ← offene Umsätze → Zuordnungsvorschlag (KI)
  /api/angebot-text            ← Anfrage + Angebot → Anschreiben und Antwortmail (KI)
  /api/pdf/[art]               ← Angebot/Rechnung/Mahnung → PDF (@react-pdf/renderer)
        │
  lib/ki/client.ts             ← der einzige Ort mit Anthropic-SDK (claude-sonnet-5, Structured Outputs)
```

Der Server speichert nichts. Deshalb läuft die App auf Vercel und auf einem Laptop identisch,
und ein Beleg verlässt den Rechner nur für den KI-Aufruf. Sichern = "Arbeitsbereich exportieren".

## Datenmodell

`src/lib/domain/schema.ts` ist die Wahrheit (Zod). Wichtigste Objekte:

- **Objekt** (verwaltetes Haus, WEG oder Mietobjekt) → **Einheit** → **Person** (Mieter/Eigentümer
  mit monatlichem **Soll** und bekannten IBANs).
- **Dokument** (Datei + Status: neu → wird_gelesen → erkannt | freigabe → gebucht | abgelehnt)
  → **Beleg** (die erkannte Eingangsrechnung mit **Befunden** und **Herkunft** je Feld)
  → **Buchung** (je Steuersatz ein Satz; Konto aus **Kostenart**, Kostenstelle = Objekt).
- **Bankkonto** → **Bankumsatz** mit **Zuordnung** (Person/Beleg/Rechnung, Sicherheit, Quelle).
  **Sollstellung** wird berechnet, nicht gespeichert.
- **Anfrage** → **Angebot** (Positionen aus **Leistung**en des Katalogs, Staffel, Mindesthonorar).
- **Rechnung** (Honorarlauf, Sonderleistung, aus Angebot) → PDF + XRechnung-XML.
- **Mahnung** (Stufe 1 Zahlungserinnerung, 2, 3) aus offenen Sollstellungen oder Rechnungen.
- **Einstellungen** (Firma/Briefkopf, Nummernkreise, Kontenrahmen SKR03/04, DATEV, Mahnwesen).

Geld: `number` in Euro, gerechnet wird in Cent (`lib/geld.ts`). Daten: ISO-Strings. Formate
für Menschen: `lib/format.ts` (1.234,56 €, 23.08.2026, IBAN in Vierergruppen).

## Module und Zuständigkeiten

| Modul | Ordner | Aufgabe |
|---|---|---|
| kern | `lib/domain`, `lib/store`, `lib/ki`, `lib/belege`, `components/ui`, `app/page.tsx`, `app/belege` | Modell, Speicher, KI-Client, Belegerkennung und -prüfung, Design-Bausteine, Posteingang |
| bank | `lib/bank`, `app/bank`, `app/api/bank`, `components/bank` | Kontoauszüge lesen (jede Bank), zuordnen, Mieteingang, Mahnvorschläge |
| pdf | `lib/pdf`, `app/api/pdf` | Briefkopf nach DIN 5008, Angebot, Rechnung, Mahnung als PDF |
| export | `lib/export`, `lib/xrechnung`, `app/buchungen`, `components/buchungen` | Buchungsjournal, DATEV-Buchungsstapel, Excel, CSV, XRechnung UBL |
| angebote | `lib/angebote`, `app/angebote`, `app/api/angebot-text`, `components/angebote` | Preislogik, Anfrage → Angebot, Anschreiben, Angebotsliste |
| rechnungen | `lib/rechnungen`, `app/rechnungen`, `components/rechnungen` | Honorarlauf, Sonderrechnungen, Rechnung aus Angebot |
| stammdaten | `app/stammdaten`, `app/protokoll`, `components/stammdaten` | Alles pflegen, Arbeitsbereich sichern, Protokoll lesen |
| beispiel | `lib/beispiel`, `scripts`, `public/beispiel` | Beispielbetrieb und Beispieldokumente |

Verträge zwischen den Modulen:

- PDF: `POST /api/pdf/angebot|rechnung|mahnung` mit `{ dokument, firma }` → `application/pdf`.
  Im Browser: `pdfHerunterladen()` / `pdfVorschau()` aus `lib/client/pdf.ts`.
- XRechnung: `xrechnungUbl(rechnung, firma)` aus `lib/xrechnung/ubl.ts` → XML-String.
- Nummern: `naechsteNummer("angebot" | "rechnung" | "mahnung", datum)` aus `lib/store/nummern.ts`.
- Protokoll: `protokolliere(akteur, aktion, bezug, details)` aus `lib/store/protokoll.ts`.
- KI: nur über `strukturiert()` / `freitext()` aus `lib/ki/client.ts`, nur serverseitig.
  Schemas für Structured Outputs: höchstens 16 nullable/union-Felder, keine tiefen Verschachtelungen
  (die API kompiliert eine Grammatik und lehnt zu große Schemas ab). Textfelder als `string`
  mit `""` für "nicht vorhanden".

## Regeln für alle, die hier bauen (Menschen und Agenten)

1. Deutsch in Code-Bezeichnern, Kommentaren, UI und Doku. Fachbegriffe der Branche verwenden.
2. Kein Geld, keine Steuer, kein Datum in der KI berechnen lassen. Die KI liest, Code rechnet.
3. Jede fachliche Aktion protokollieren. Jede Änderung eines KI-Feldes durch den Nutzer wird
   in `herkunft` als `manuell` markiert.
4. Reine Fachlogik in `lib/*` ohne React und ohne `db`-Zugriff, damit sie testbar ist
   (`*.test.ts`, Vitest). Datenbankzugriff in `lib/store/*` oder in Seiten/Komponenten.
5. Oberfläche nur aus `components/ui` und den Regeln in `docs/DESIGN.md`. Keine neuen Farben,
   keine Icons aus Paketen, keine Attrappen.
6. Vor Abgabe: `npm run typecheck`, `npm run lint`, `npm test` müssen grün sein.
7. Große Dateien: Uploads über 4,5 MB scheitern auf Vercel (Body-Limit). Fotos werden im
   Browser verkleinert (`lib/client/bilder.ts`). PDFs über 4,5 MB brauchen lokalen Betrieb.
