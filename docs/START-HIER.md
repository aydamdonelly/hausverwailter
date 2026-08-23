# Start hier

Dieses Dokument ist für den Menschen, der den Ordner zum ersten Mal öffnet, und für sein
Claude Code. Es erklärt, warum es die App gibt, was angenommen wurde, wie sie entstanden ist
und wie man weiterbaut. Es braucht keinen Chatverlauf: alles Wissen steht hier, in
`CLAUDE.md`, in `docs/` und in den Kommentaren im Code.

## Worum es geht

Ein Betrieb aus der Wohnungs- bzw. Hausverwaltung hat vier Leute eingestellt, die Angebote
schreiben, Rechnungen schreiben und die Buchhaltung machen. Diese App zeigt, dass der größte
Teil dieser Arbeit automatisch geht: Dokumente rein, geprüfte Daten und fertige Dokumente raus,
der Mensch entscheidet nur noch. Sie ist so gebaut, dass sie bei diesem Betrieb einfach
funktioniert, egal welche Bank, welche Software oder welche Belege er hat.

## Was wir wissen und was nicht (Stand 23. August 2026)

Wir wissen: "Wohnungsverwaltung, irgendwie sowas"; die Arbeit heißt Angebote, Rechnungen,
Buchhaltung; vier Mitarbeiter dafür. Wir wissen nicht: WEG-Verwaltung, Mietverwaltung oder
Gebäudedienstleister für Verwaltungen; welche Software (Haufe PowerHaus, DOMUS, Immoware24,
Casavi, Excel ...); welche Banken; wie viele Belege im Monat; wie Belege ankommen (Post, Scan,
Mail); wer freigibt.

Deshalb ist die App auf beiden Achsen offen:

- **Branche** umschaltbar (Stammdaten → Firma → Branche): Hausverwaltung rechnet Honorar pro
  Einheit, Dienstleister rechnet Pauschalen und Stundensätze. Beide Kataloge liegen bei.
- **Stammdaten** komplett pflegbar: Firma, Briefkopf, Objekte, Personen, Kostenarten mit
  Konten, Leistungskatalog, Nummernkreise, DATEV, Mahnwesen.
- **Bankformate** aller gängigen Banken, dazu CAMT.053 und MT940; unbekannte CSV-Formate
  erkennt die KI einmal und merkt sich die Spaltenzuordnung.
- **Exporte**, die überall andocken: DATEV-Buchungsstapel, Excel, CSV, XRechnung, SEPA.
- **Belege** in jeder Form: PDF, Foto vom Handy, E-Mail mit Anhang, Text.

## Die Fragen an den Betrieb und was sich mit den Antworten ändert

| Frage | Wenn die Antwort ist ... | ... dann in der App |
|---|---|---|
| Verwaltet er selbst oder ist er Dienstleister? | Dienstleister | Branche umstellen, Katalog Dienstleister laden, Leistungen und Preise eintragen |
| WEG, Miete oder beides? Wie viele Objekte, Einheiten? | z. B. 30 WEGs mit 900 Einheiten | Objekte importieren (Stammdaten), Staffel und Sätze anpassen |
| Welche Software heute? Steuerberater mit DATEV? | DATEV | Berater-/Mandantennummer, Kontenrahmen, Konten je Kostenart eintragen |
| | andere Software | Exportformat dieser Software in `src/lib/export/` ergänzen |
| Wie kommen Belege an? | per Mail | Postfach-Anbindung (IMAP) als nächster Schritt; heute .eml ablegen |
| | Papier/Scan | Foto oder Scan ablegen, das funktioniert schon |
| Welche Banken, welcher Export? | CSV aus dem Onlinebanking | Profil vorhanden oder KI erkennt die Spalten; Beispieldatei einmal testen |
| | EBICS/FinTS-Anbindung gewünscht | eigener Schritt, Grundlage (Bankumsatz-Modell, Abgleich) steht |
| Wer gibt frei, ab welchem Betrag? | z. B. 2.500 € | Freigabegrenze in den Stammdaten |
| Gibt es 2 bis 3 echte (anonymisierte) Dokumente? | ja | Durch den Posteingang schicken; das ist die überzeugendste Demo |

## Wie die App entstanden ist

1. **Konzept.** Vier Use Cases mit je einem Moment, der hängen bleibt: Belegeingang mit
   Fallen, Kontoauszug mit Mieteingang und Mahnung, Anfrage zu Angebot, Honorarlauf mit
   E-Rechnung. Dazu die Regel: die KI liest, der Code rechnet, der Mensch klickt.
2. **Recherche mit Primärquellen.** UStG (§ 14, § 14b, § 19, § 13b), UStDV (§ 33), BetrKV (§ 2),
   WEG (§ 26 bis 28), BGB (§ 286, § 288, § 543, § 556, § 556b), GoBD, E-Rechnungspflicht (BMF),
   XRechnung-Spezifikation (KoSIT), DATEV-Formatbeschreibung, CAMT.053/MT940, Bank-Exportformate,
   Next.js 16, Vercel, react-pdf. Die Notizen liegen in `docs/recherche/`, die wichtigsten Fakten
   stehen als Kommentare direkt im Code.
3. **Bau in Modulen** mit klaren Verträgen (`docs/ARCHITEKTUR.md`), parallel von mehreren
   KI-Agenten in Claude Code, jedes Modul mit Tests. Werkzeug: Claude Code mit Claude Fable 5;
   in der App läuft Claude Sonnet 5.
4. **Prüfung.** Typecheck, Lint, Tests, Screenshots jeder Seite, Gegenlesen der Fachlogik
   (Steuer, DATEV, XRechnung, Bankabgleich) durch unabhängige Prüfer, Klick-Test jeder
   Steuerung im Browser.

## So arbeitest du weiter (mit Claude Code)

Ordner im Terminal öffnen, `claude` starten und sagen:

> Lies CLAUDE.md und docs/START-HIER.md. Dann: *deine Aufgabe*.

Beispiele für Aufgaben, die gut funktionieren:

- "Hier ist ein CSV-Export unserer Bank (Datei liegt in ~/Downloads). Sorge dafür, dass der
  Import ihn ohne KI erkennt, mit Test."
- "Ändere den Briefkopf: unser Logo (Datei), Farbe #1f3a5f, Fußzeile mit unserer Bank."
- "Neue Prüfregel: Rechnungen über 5.000 Euro brauchen einen zweiten Freigeber."
- "Exportiere Buchungen zusätzlich im Importformat von *Software*." (Formatbeschreibung beilegen)
- "Die KI ordnet Wartungsrechnungen unserer Heizungsfirma falsch zu. Passe die Hinweise der
  Kostenarten an." (Das geht auch ohne Code: Stammdaten → Kostenarten → Hinweis.)

Vor jedem Commit: `npm run typecheck && npm run lint && npm test`. Der Dev-Server
(`npm run dev`) zeigt Änderungen sofort. Screenshots mit `node scripts/screenshot.mjs`.

## Wie man es dem Betrieb zeigt (zehn Minuten)

1. **Ihre Anfrage von gestern** (2 min): Anfrage-Mail im Posteingang ablegen, Angebot erstellen,
   Anschreiben formulieren lassen, PDF öffnen. Der Text greift die Dachsanierung aus der Mail auf.
2. **Ihr Posteingang** (5 min): Die Beispielbelege ablegen (`docs/BEISPIELE.md`), zuschauen, wie
   die Stempel erscheinen, dann die Fallen zeigen: Duplikat, Rechenfehler, fehlende
   Steuernummer, Versicherungsfall, Freigabegrenze. Belege ohne Befund mit einem Klick buchen.
   DATEV-Export öffnen: "Das geht so an Ihren Steuerberater."
3. **Ihr Kontoauszug** (3 min): CSV importieren, Mieteingangsliste: eine Wohnung hat nicht
   gezahlt, eine zehn Euro zu wenig, eine doppelt. Zahlungserinnerungen als PDF.
4. **Abschluss**: Zeit und Kosten (ein Beleg 6 bis 10 Minuten von Hand gegen 30 Sekunden plus
   Kontrolle; 5 bis 8 Cent KI-Kosten je Beleg) und der Vorschlag: ein Objekt, ein Monat,
   parallel zum bisherigen Ablauf.

## Datenschutz und Recht, kurz

- **Daten** liegen im Browser des Nutzers, nicht auf dem Server. Für den KI-Aufruf geht der
  Beleg an die Anthropic-API. Für den Produktivbetrieb: Auftragsverarbeitungsvertrag mit
  Anthropic (steht als DPA bereit), Hinweis in der Datenschutzerklärung, Speicherfristen
  des Anbieters beachten (`docs/recherche/`).
- **E-Rechnung**: Seit 1. Januar 2025 muss jeder inländische Unternehmer E-Rechnungen
  empfangen können. Versandpflicht für B2B ab 1. Januar 2027 (Vorjahresumsatz über
  800.000 Euro), ab 1. Januar 2028 für alle. Die App erzeugt XRechnung (UBL); vor dem
  Produktivbetrieb mit dem KoSIT-Validator prüfen.
- **GoBD**: Das Protokoll zeigt, wer wann was getan hat; ein revisionssicheres Archiv
  (Unveränderbarkeit, Aufbewahrung 8 bzw. 10 Jahre) ist ein eigener Schritt.
- **§ 14 UStG**: Die Prüfregeln decken die Pflichtangaben ab, inklusive Kleinbetragsrechnung
  bis 250 Euro (§ 33 UStDV), Kleinunternehmer (§ 19 UStG), Steuerschuldnerschaft (§ 13b UStG).

## Was noch fehlt, ehrlich

Mehrbenutzerbetrieb mit Rechten und Vier-Augen-Freigabe, revisionssicheres Archiv, direkte
Postfach- und Bankanbindung, Betriebskosten- und Hausgeldabrechnung zum Jahresende,
Wirtschaftsplan, Eigentümerversammlung. Die Grundlagen dafür (Kostenarten mit umlagefähig-
Kennzeichen, Buchungen je Steuersatz und Objekt, Protokoll, Sollstellungen) sind so gebaut,
dass diese Schritte darauf aufsetzen.
