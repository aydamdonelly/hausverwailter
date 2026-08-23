# Hausverwailter

Belege, Bank, Angebote und Rechnungen einer Hausverwaltung: gelesen, geprüft, gebucht.

Eine Web-App, die die Schreibtischarbeit einer Haus- und Wohnungsverwaltung (oder eines
Gebäudedienstleisters) übernimmt: Eingangsrechnungen lesen und prüfen, Kontoauszüge abgleichen,
Mieteingang überwachen, Zahlungserinnerungen schreiben, Angebote aus Anfragen erzeugen,
Honorarrechnungen samt XRechnung stellen, alles als DATEV-Buchungsstapel und Excel exportieren.
Die KI (Claude Sonnet 5) liest Dokumente und schlägt vor; alles mit Geld, Steuer und Fristen
rechnet geprüfter Code. Nichts wird gebucht, bezahlt oder verschickt ohne Klick.

## Schnellstart

```bash
git clone <dieses Repo>
cd hausverwailter
npm install
cp .env.example .env.local     # ANTHROPIC_API_KEY eintragen
npm run dev                    # http://localhost:3000
```

Auf der Startseite "Beispielbetrieb laden": eine fiktive Verwaltung mit fünf Objekten, Mietern
und einem Stapel Beispielbelege, in denen absichtlich Fallen stecken (Duplikat, Rechenfehler,
fehlende Steuernummer, Versicherungsfall, zwei Steuersätze). `docs/BEISPIELE.md` ist das Drehbuch.

Voraussetzungen: Node.js 20 oder neuer, ein Anthropic-API-Key. Optional Google Chrome oder
Chromium für die Screenshot- und Beispiel-Skripte.

## Was die App kann

| Bereich | Was passiert |
|---|---|
| Posteingang | PDF, Foto, E-Mail (.eml), Text oder Kontoauszug ablegen. Die KI erkennt den Dokumenttyp, liest Rechnungsdaten, ordnet Objekt und Kostenart (nach § 2 BetrKV, umlagefähig ja/nein) zu. Prüfregeln nach § 14 UStG, Rechenprüfung, Duplikate, Freigabegrenze. Freigeben und buchen mit einem Klick. |
| Bank | Kontoauszüge aller gängigen Banken (CSV, CAMT.053, MT940) importieren, Umsätze regelbasiert und notfalls per KI zuordnen, Mieteingang/Hausgeld je Monat als Soll/Ist, Zahlungserinnerungen und Mahnungen als PDF. |
| Angebote | Anfrage per Mail oder Text → Angebot mit Positionen aus dem Leistungskatalog, Leistungsumfang je Verwaltungsart, Annahmen für fehlende Angaben, Anschreiben und Antwortmail, PDF nach DIN 5008. |
| Rechnungen | Honorarlauf für alle Objekte pro Monat, Sonderrechnungen, Rechnung aus Angebot; PDF und XRechnung (UBL). |
| Buchungen | Buchungsjournal, Summen je Kostenart, DATEV-Buchungsstapel, Excel, CSV, SEPA-Zahlungsvorschlag, offene Posten. |
| Stammdaten | Firma und Briefkopf (Logo, Farbe), Objekte, Einheiten, Personen mit Soll und IBANs, Kostenarten mit Konten (SKR03/SKR04), Leistungskatalog, Nummernkreise, DATEV-Einstellungen, Mahnwesen; Arbeitsbereich als Datei sichern und umziehen. |
| Protokoll | Wer (Nutzer, KI, Regel, System) hat wann was gemacht. |

## Daten und Datenschutz

Es gibt keine Server-Datenbank. Alle Daten liegen im Browser (IndexedDB) des Rechners, auf dem
die App benutzt wird. Der Server ist zustandslos und tut zwei Dinge: Dokumente an die KI
schicken und PDFs bauen. Ein Beleg verlässt den Rechner also nur für den KI-Aufruf an die
Anthropic-API. Für den Produktivbetrieb gehören ein Auftragsverarbeitungsvertrag mit dem
KI-Anbieter und ein Hinweis in der Datenschutzerklärung dazu; Details in
`docs/START-HIER.md`.

Sichern: Stammdaten → Daten → "Arbeitsbereich exportieren" (eine JSON-Datei mit allem, auch den
Dateien). Der Browser kann lokale Daten löschen, wenn der Speicher knapp wird; die App bittet
deshalb um dauerhaften Speicher.

## Kosten

Ein Beleg kostet mit Claude Sonnet 5 etwa 5 bis 8 Cent (zwei KI-Aufrufe: Typ erkennen, Daten
lesen; rund 11.000 Eingabe- und 2.000 Ausgabe-Tokens). Ein Angebotstext liegt darunter.
Kontoauszüge kosten nur dann etwas, wenn das Format unbekannt ist oder Umsätze offen bleiben.

## Auf Vercel betreiben

```bash
npx vercel                     # Projekt anlegen und deployen
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add ANTHROPIC_MODEL        # claude-sonnet-5
npx vercel env add ZUGANGSCODE            # empfohlen: schützt die öffentliche Adresse
npx vercel --prod
```

Auf Vercel gilt ein Body-Limit von 4,5 MB je Anfrage. Fotos werden im Browser verkleinert,
sehr große PDFs brauchen den lokalen Betrieb.

## Struktur

```
src/app            Seiten und API-Routen (Next.js App Router)
src/components     Oberfläche (ui = Design-Bausteine)
src/lib/domain     Datenmodell (Zod) und Standardwerte
src/lib/store      IndexedDB, Nummernkreise, Protokoll, Export/Import
src/lib/belege     KI-Prompts, KI-Schemas, Prüfregeln, Erkennung
src/lib/bank       Bankformate, Import, Abgleich, Soll/Ist, Mahnvorschläge
src/lib/preise     Honorar-Kalkulation
src/lib/angebote   Angebote aus Anfragen, Leistungsumfang, Anschreiben
src/lib/rechnungen Honorarlauf, Sonderrechnungen
src/lib/export     DATEV, Excel, CSV, SEPA
src/lib/xrechnung  XRechnung (UBL)
src/lib/pdf        PDF-Dokumente nach DIN 5008
src/lib/beispiel   Beispielbetrieb
docs               START-HIER, ARCHITEKTUR, DESIGN, BEISPIELE
scripts            Screenshot- und Beispieldaten-Skripte
```

`npm run typecheck`, `npm run lint`, `npm test` müssen vor jeder Änderung grün sein.

## Was für den Produktivbetrieb noch fehlt

Ehrlich gesagt: Mehrbenutzerbetrieb mit Rechten, ein revisionssicheres Archiv (GoBD:
Unveränderbarkeit, Aufbewahrung), eine direkte Postfach- und Bankanbindung (IMAP, EBICS/FinTS)
statt Datei-Upload, die Validierung der XRechnung mit dem KoSIT-Validator, die Abstimmung der
Konten mit dem Steuerberater, die Jahresabrechnung (Betriebskosten, Hausgeld). Alles davon ist
vorgesehen; die Grundlagen (Protokoll, Kostenarten mit umlagefähig-Kennzeichen, Buchungssätze
je Steuersatz) sind so gebaut, dass es aufsetzen kann.
