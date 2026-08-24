# Beispieldokumente: das Drehbuch der Demo

Der Beispielbetrieb (Stammdaten → „Beispielbetrieb laden“ bzw. der Knopf im leeren Posteingang)
legt die Hausverwaltung Mustermann GmbH mit fünf Objekten, den Mietern der Bahnhofstraße 7, zwei
Eigentümern der WEG Severinstraße 88 und drei Bankkonten an und wirft die 16 Dateien aus
`public/beispiel/` in den Posteingang. Die Stammdaten stehen in `src/lib/beispiel/daten.ts`, die
Dateien erzeugt `node scripts/beispieldaten.mjs` (HTML → PDF/JPG über Chrome; die Ergebnisse
liegen im Repo, der Generator dient nur zum Nachbauen). Nachweis, dass Erkennung und Prüfregeln
das Erwartete liefern: `npx tsx scripts/beispiel-pruefen.ts` (braucht den Dev-Server und den
API-Key, kostet je Datei ein paar Cent).

Alle Firmen, Personen, Nummern und IBANs sind erfunden; die IBANs sind gültig gebaut, gehören aber
niemandem. Das Datum der Demo ist der 23.08.2026: Die Belege stammen aus Juli und August 2026, die
Kontoauszüge sind der Juli 2026.

## Objekte und Konten, auf die sich alles bezieht

| Objekt | Art | Auftraggeber | Konto |
|---|---|---|---|
| OBJ-001 WEG Am Stadtpark 3 | WEG, 24 Wohnungen, 1 Gewerbe, 2 Aufzüge | WEG, Beirat Herbert Klein | (keins im Beispiel) |
| OBJ-002 Bahnhofstraße 7 | Mietobjekt, 8 Wohnungen | Erika Vogel | BK-001 Mietkonto DE41 5001 0517 0123 4567 89 |
| OBJ-003 WEG Rosenhof 5-7 | WEG, 40 Wohnungen, Pauschalhonorar | WEG | (keins im Beispiel) |
| OBJ-004 Gartenweg 21 | Mietobjekt, 6 Wohnungen | Familie Brandt GbR | (keins im Beispiel) |
| OBJ-005 WEG Severinstraße 88 | WEG, 12 Wohnungen, 1 Gewerbe, Dachsanierung 2027 | WEG | BK-002 Gemeinschaftskonto DE27 1007 7777 0209 2997 00 |
| Verwaltung selbst | | | BK-003 Geschäftskonto DE02 1203 0000 0000 2020 51 |

## Die Belege (Reihenfolge = Reihenfolge im Posteingang)

Vier bewusst verschiedene Layouts, damit die Erkennung mit Vielfalt umgehen muss: klassischer
Handwerker mit Tabelle (Kaminski, Meier & Sohn), Versorger/Versicherer mit Abschlagsplan und
Kundenservice-Kasten (Wasserwerke, Gebäudeversicherung), moderne Agentur-Optik ohne Tabellenlinien
(Sauber & Fein, LiftTec), schlichte Word-Vorlage (Garten Grün, Malerbetrieb Fuchs). Dazu ein
Handyfoto eines Thermobons.

| # | Datei | Was | Falle | Erwarteter Befund und Verhalten | Objekt / Kostenart |
|---|---|---|---|---|---|
| 1 | `rechnung-elektro-kaminski-2026-1187.pdf` | Elektro Kaminski GmbH, Rg 2026-1187 vom 07.07.2026, Reparatur Treppenhausbeleuchtung, 3 Positionen, netto 486,00, USt 92,34, brutto 578,34 €, IBAN DE89 3704 0044 0532 0130 00, zahlbar 14 Tage | keine | Sauber: ERKANNT, alle Pflichtangaben, Summen stimmen. Einziger Befund: Warnung UEBERFAELLIG (fällig 21.07.2026), die der Kontoauszug auflöst (Zahlung 09.07.2026). Buchung 4260/6335 nicht umlagefähig. | OBJ-002 / INSTANDHALTUNG (Reparatur, nicht Beleuchtung) |
| 2 | `rechnung-sauber-fein-2026-0711.pdf` | Sauber & Fein Gebäudereinigung GmbH, Rg 2026-0711 vom 01.07.2026, Treppenhausreinigung Juli, netto 190,00, brutto 226,10 €, SEPA-Lastschrift am 08.07.2026 | keine | Sauber: ERKANNT, Hinweis LASTSCHRIFT („nicht überweisen“), Zahlungsart lastschrift. Kleinbetrag (≤ 250 €), trotzdem alle Angaben vorhanden. | OBJ-002 / GEBAEUDEREINIGUNG, umlagefähig § 2 Nr. 9 BetrKV |
| 3 | `rechnung-lifttec-wartung-q3-2026.pdf` | LiftTec Aufzugsservice GmbH, LT-2026-03421 vom 12.08.2026, Wartung Q3/2026 zwei Aufzüge, netto 640,00, brutto 761,60 €, Leistungszeitraum 01.07. bis 30.09.2026, zahlbar bis 11.09.2026 | keine | Sauber: ERKANNT ohne Befund. Wartung ist Betriebskosten (kein WARTUNG_ODER_REPARATUR-Hinweis). | OBJ-001 / AUFZUG, umlagefähig § 2 Nr. 7 BetrKV |
| 4 | `foto-baumarkt-bon-bahnhofstrasse-7.jpg` | Handyfoto eines Baumarktbons (BAUFIX, 05.08.2026): Türschließer, Schrauben, Silikon, Profilzylinder, 87,40 € brutto, girocard, handschriftlich „Bahnhofstr. 7 – Kellertür, Hausmeister K.“ | Foto statt PDF, Kleinbetrag, kein Empfänger, keine Steuernummer, keine Rechnungsnummer im Sinne des UStG | Erkennung liest schräges Foto und den handschriftlichen Vermerk; Objekt kommt aus dem Vermerk. Kleinbetragsrechnung nach § 33 UStDV: keine Fehler wegen fehlender Steuernummer. Hinweis BEREITS_BEZAHLT (Karte): nicht überweisen, nur buchen. (Derzeit zusätzlich Warnung UEBERFAELLIG, weil die KI den Bontag als Fälligkeit setzt; siehe „Bekannte Kanten“.) | OBJ-002 / INSTANDHALTUNG |
| 5 | `sauber-fein-2026-0711-erneut-gesendet.pdf` | Dieselbe Rechnung 2026-0711 als zweite Datei (anderer Dateiname, andere Bytes) | Duplikat | Fehler DUPLIKAT „Rechnung 2026-0711 von Sauber & Fein ... ist bereits erfasst. Nicht doppelt bezahlen.“ → Status FREIGABE, Beleg ablehnen. Voraussetzung: Nr. 2 wurde vorher gelesen. | OBJ-002 / GEBAEUDEREINIGUNG |
| 6 | `abschlag-rheinland-wasserwerke-07-2026.pdf` | Rheinland Wasserwerke GmbH, Abschlag Juli (AB-2026-07-4471, Kd 4471), Trinkwasser 210,00 + 7 % = 14,70, Abwasser 260,00 ohne USt (hoheitlich), gesamt 484,70 €, fällig 15.07.2026, Abschlagsplan | zwei Steuersätze, ein Posten steuerfrei | Zwei Steuerzeilen (7 %: 210,00/14,70 und 0 %: 260,00/0,00), Summen stimmen, kein Rechenfehler. Buchung erzeugt je Steuersatz eine Zeile. Die KI merkt an, dass Wasser und Entwässerung eigentlich zwei Kostenarten sind. Warnung UEBERFAELLIG bis zum Bankimport. | OBJ-002 / WASSER (Trinkwasser), Abwasser gehört zu ENTWAESSERUNG |
| 7 | `rechnung-garten-gruen-2026-31.pdf` | Garten Grün Landschaftspflege GbR, Rg 2026-31 vom 03.08.2026, Gartenpflege Juni und Juli, 340,00 € ohne USt, Hinweis § 19 UStG | Kleinunternehmer ohne Steuernummer und ohne USt-IdNr. | Fehler PFLICHTANGABE (§ 14 Abs. 4 Nr. 2 UStG) → FREIGABE; Hinweis KLEINUNTERNEHMER (kein Vorsteuerabzug). Richtige Reaktion: Rechnung beim Lieferanten nachbessern lassen. | OBJ-004 / GARTENPFLEGE, umlagefähig § 2 Nr. 10 BetrKV |
| 8 | `rechnung-dachdeckerei-meier-26-0842-notreparatur.pdf` | Dachdeckerei Meier & Sohn, Rg 26-0842 vom 14.08.2026, Notreparatur Sturmschaden Dach nach Unwetter vom 09.08.2026, 6 Positionen, netto 2.380,00, brutto 2.832,20 €, zahlbar bis 28.08.2026 | Freigabegrenze, WEG-Instandhaltung, Versicherungsfall | Hinweise FREIGABE (über 1.000 €) → Status FREIGABE, WEG_BESCHLUSS (Notgeschäftsführung § 27 WEG, Erhaltungsrücklage), VERSICHERUNGSFALL (Sturm: Gebäudeversicherung melden). Rechnerisch sauber. | OBJ-003 / INSTANDHALTUNG |
| 9 | `beitragsrechnung-rheinische-gebaeudeversicherung-2026-27.pdf` | Rheinische Gebäudeversicherung AG, Beitragsrechnung 2026/27 (VS-Nr. GB 88-4471-19) vom 15.06.2026, Beitrag 1.630,25 zzgl. 19 % Versicherungsteuer 309,75 = 1.940,00 €, fällig 01.07.2026 | Versicherungsteuer statt Umsatzsteuer | Merkmal versicherungsteuer = true, Hinweis VERSICHERUNGSTEUER (kein Vorsteuerabzug, brutto buchen), Hinweis FREIGABE. Die Steuerzeile 19 % besteht die Spartenprüfung (Regelsatz § 6 Abs. 1 VersStG; eine reine Wohngebäudeversicherung würde 16,34 % zeigen). Warnung UEBERFAELLIG bis zum Bankimport (Zahlung 01.07.2026 auf BK-002). | OBJ-005 / VERSICHERUNG, umlagefähig § 2 Nr. 13 BetrKV |
| 10 | `rechnung-malerbetrieb-fuchs-2026-118.pdf` | Malerbetrieb Fuchs, Rg 2026/118 vom 18.08.2026, Treppenhausanstrich Gartenweg 21, 4 Positionen = netto 1.250,00, USt 237,50, gedruckter Rechnungsbetrag 1.478,50 € (richtig wären 1.487,50), 2 % Skonto bis 25.08.2026 | Rechenfehler (Zahlendreher) | Fehler SUMME_BRUTTO „Netto 1.250,00 € plus Steuer 237,50 € ergibt 1.487,50 €, ausgewiesen sind 1.478,50 €“ → FREIGABE. Dazu Hinweise FREIGABE und SKONTO. Die KI übernimmt den gedruckten Betrag, der Code rechnet nach. | OBJ-004 / INSTANDHALTUNG |

## Anfragen und Angebot

| # | Datei | Was | Falle | Erwartetes Verhalten |
|---|---|---|---|---|
| 11 | `anfrage-weg-lindenstrasse.eml` | Echte .eml (multipart/alternative, quoted-printable, Umlaute, gefalteter Betreff): Dr. Sabine Krüger, Vorsitzende des Verwaltungsbeirats, WEG Lindenstraße 14, 50674 Köln, 18 Wohnungen, 2 Ladenlokale, Tiefgarage 14 Stellplätze, Baujahr 1968, Ölheizung, Aufzug; bisheriger Verwalter kündigt zum 31.12.2026, Beginn 01.01.2027, Dachsanierung steht an, Bitte um Angebot mit Leistungsumfang | förmlich, vollständig | Typ anfrage, Verwaltungsart WEG, alle Zahlen erkannt (18/2/14/1968), Beginn 2027-01-01, Kontakt mit Rolle, Besonderheiten (Aufzug, Tiefgarage, Ölheizung, Rücklage, Kündigung, Dachsanierung), Leistungswünsche als Liste. Daraus lässt sich direkt ein WEG-Angebot rechnen. |
| 12 | `anfrage-whatsapp-vogel.txt` | WhatsApp-Export, 4 Zeilen: Thomas Vogel, Empfehlung über Herrn Klein (Stadtpark 3), Haus Venloer Straße 210 mit 6 Wohnungen, bisher vom Vater selbst verwaltet, Frage nach dem Preis | informell: keine PLZ, kein Ort, kein Beginn, Eigentümer unklar | Typ anfrage, Verwaltungsart MIET, 6 Wohnungen; offene Fragen: vollständige Adresse (PLZ/Ort), Eigentümer, Baujahr/Zustand, Stellplätze/Gewerbe, gewünschter Beginn. Die Antwortmail muss diese Fragen stellen. |
| 13 | `angebot-dachdeckerei-meier-dachsanierung-severinstrasse-88.pdf` | Dachdeckerei Meier & Sohn, Angebot A-26-117 vom 20.08.2026, Dachsanierung Severinstraße 88, 8 Positionen, netto 48.900,00 (brutto 58.191,00), gültig 3 Monate bis 20.11.2026, Ausführung Frühjahr 2027, Zahlungsplan 30/40/30, VOB/B, zwei Seiten | Angebot, keine Rechnung | Typ handwerkerangebot (nicht eingangsrechnung), Objekt OBJ-005, 8 Positionen mit Summe 48.900,00, Gültigkeit, Zahlungsplan und Ausschlüsse als Bedingungen. Es darf keine Buchung entstehen. |

## Kontoauszüge

Die Dateinamen enthalten „kontoauszug“, deshalb bekommen sie im Posteingang automatisch den Typ
Kontoauszug und gehen an den Bankimport statt an die KI.

### `kontoauszug-bahnhofstr7-2026-07.csv` (Sparkasse CSV-CAMT, 17 Spalten, ISO-8859-1, alle Felder in Anführungszeichen, Datum TT.MM.JJ, Beträge „-3.000,00“)

Mietkonto Bahnhofstraße 7 (BK-001, DE41 5001 0517 0123 4567 89), Juli 2026, neueste Buchung zuerst. Soll je Mieter = kalt + Nebenkosten.

| Umsatz | Betrag | Erwartete Zuordnung |
|---|---|---|
| Anna Schmidt, „Miete Juli Schmidt Whg 1“, von ihrer IBAN | +900,00 | P-201, Miete 2026-07, sicher (IBAN), Soll 900 = bezahlt |
| Mehmet Yilmaz, „MIETE 07/2026“, von der IBAN in den Stammdaten | +1.010,00 | P-202 (Familie Yilmaz), sicher (IBAN, anderer Vorname), Soll 1.010 = bezahlt |
| Jonas Weber, „Miete Juli“, IBAN nicht in den Stammdaten | +800,00 | P-203 über Namen, Soll 810: **10 € zu wenig**, teilweise bezahlt, Mahnvorschlag mit Toleranz prüfen |
| Petra Lang | nichts | P-204, Soll 860: **offen**, Zahlungserinnerung |
| Marie Neumann, „Hoffmann Whg 5 Miete Juli“ | +1.170,00 | P-205 (Lukas und Marie Hoffmann): anderer Name, Zuordnung über Verwendungszweck (Name Hoffmann, Whg 5) bzw. KI-Vorschlag; Soll 1.170 = bezahlt |
| Tim Becker, „Miete Juli WG“ und Lena Ott, „Miete Juli WG“ | +545,00 und +545,00 | P-206 (WG Becker / Ott): zwei Zahler, zusammen 1.090 = Soll; jede Hälfte allein wäre „teilweise“ |
| Elif Demir, Buchungstext DAUERAUFTRAG, **ohne Verwendungszweck**, von ihrer IBAN | +875,00 | P-207 nur über die IBAN, Soll 875 = bezahlt |
| Karl Fischer, „Miete Juli Fischer“, **zweimal** (01.07. und 03.07.) | +770,00 und +770,00 | P-208, Soll 770: **Doppelzahlung**, überzahlt um 770, Guthaben oder Rückzahlung |
| Elektro Kaminski GmbH, „Rg 2026-1187“ | −578,34 | Belegzahlung zu Beleg Nr. 1 (Betrag und Rechnungsnummer), Beleg als bezahlt markieren |
| Sauber und Fein Gebaeudereinigung GmbH, FOLGELASTSCHRIFT „RE 2026-0711 ...“, Gläubiger-ID, Mandatsreferenz | −226,10 | Belegzahlung zu Beleg Nr. 2 (nicht zum Duplikat Nr. 5) |
| Rheinland Wasserwerke GmbH, „Abschlag 07/2026 Kd 4471“ | −484,70 | Belegzahlung zu Beleg Nr. 6 |
| Hausverwaltung Mustermann GmbH, „Verwaltungshonorar Juli 2026 R-2026-0127“ | −304,64 | Honorar (8 Einheiten × 32,00 = 256,00 netto + 19 %), passt zur eigenen Rechnung R-2026-0127 |
| ENTGELTABSCHLUSS, „Entgeltabschluss siehe Anlage“, kein Gegenkonto | −12,90 | Gebühr, Kostenart BANKGEBUEHREN |
| Erika Vogel, „Auszahlung Überschuss Q2“ | −3.000,00 | Auszahlung an die Eigentümerin (auszahlung_eigentuemer) |

### `kontoauszug-severinstr88-2026-07.csv` (ING-Format: Vorspann mit IBAN, Kunde, Zeitraum, Saldo; Kopfzeile „Buchung;Wertstellungsdatum;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Betrag;Währung“; UTF-8; keine IBAN der Gegenseite)

Gemeinschaftskonto WEG Severinstraße 88 (BK-002, DE27 1007 7777 0209 2997 00), Juli 2026. Hausgeld = Soll `hausgeld`.

| Umsatz | Betrag | Erwartete Zuordnung |
|---|---|---|
| Dr. Stefan Berger, „Hausgeld 07/2026 WE 3 Severinstr. 88“ | +310,00 | P-501 über den Namen (das ING-Format liefert keine IBAN), Soll 310 = bezahlt |
| Ingrid Sauer, „Hausgeld Juli“ | +280,00 | P-502 über den Namen, Soll 280 = bezahlt |
| Rheinische Gebäudeversicherung AG, „Beitrag 2026/27 VS-Nr. GB 88-4471-19“ | −1.940,00 | Belegzahlung zu Beleg Nr. 9 |

### `kontoauszug-verwaltung-2026-07.sta` (MT940, DK-Variante, CRLF, ISO-8859-1)

Geschäftskonto der Verwaltung (BK-003, `:25:12030000/0000202051`), Anfangssaldo 18.450,12, Schlusssaldo 20.432,66.

| Umsatz | Betrag | Erwartete Zuordnung |
|---|---|---|
| WEG Rosenhof 5-7, GVC 166, „Verwaltungshonorar Juli 2026 R-2026-0124“ | +1.725,50 | Honorareingang (1.450,00 Pauschale + 19 %) zur eigenen Rechnung R-2026-0124 |
| Telekom Deutschland GmbH, GVC 105 Basislastschrift mit EREF/MREF/CRED, „Telekom Rechnung 07/2026 Kd 4487 2201“ | −47,60 | Betriebsausgabe der Verwaltung (VERWALTUNG), kein Objekt |
| Erika Vogel Mietkonto Bahnhofstr. 7, GVC 166, „Verwaltungshonorar Juli 2026 R-2026-0127“ | +304,64 | Honorareingang, Gegenstück zum Abgang auf BK-001 |

## Drehbuch in acht Schritten

1. Posteingang leer → „Beispielbetrieb laden“. 16 Dokumente liegen da, Kontoauszüge schon als Typ Kontoauszug.
2. Die ersten vier Belege lesen: drei PDFs und ein Foto, vier Layouts, alle sauber. Kaminski zeigt, dass Reparatur als Instandhaltung (nicht umlagefähig) erkannt wird, LiftTec das Gegenteil (Wartung, umlagefähig), Sauber & Fein den Lastschrift-Hinweis, der Bon die Kleinbetragsregel und den handschriftlichen Objektvermerk.
3. „Belege ohne Befund buchen“: erzeugt die Buchungssätze mit Konto aus der Kostenart und Kostenstelle Objekt.
4. Die Fallen lesen: Duplikat (Fehler), zwei Steuersätze (zwei Buchungszeilen), fehlende Steuernummer (Fehler), Sturmschaden (Freigabe + WEG + Versicherung), Versicherungsteuer (Hinweis, kein Vorsteuerabzug), Rechenfehler (Fehler mit dem richtigen Betrag im Text). Jeder Befund nennt die Rechtsgrundlage und die nächste Handlung.
5. Bankimport Bahnhofstraße 7: Mieteingänge werden zugeordnet (IBAN, Name, Verwendungszweck), Soll/Ist zeigt Lang offen, Weber 10 € zu wenig, Fischer doppelt; die drei Belegzahlungen setzen Belege auf bezahlt und lösen die UEBERFAELLIG-Warnungen auf.
6. Bankimport Severinstraße 88 (anderes Format, andere Kodierung) und MT940 der Verwaltung: gleiches Ergebnis mit ganz anderer Datei.
7. Anfragen: aus der förmlichen Mail entsteht ein WEG-Angebot mit Anschreiben; aus der WhatsApp-Nachricht eine Rückfrage-Mail mit den offenen Punkten.
8. Handwerkerangebot: wird als Angebot erkannt und nicht gebucht, sondern der WEG Severinstraße 88 (Dachsanierung 2027) zugeordnet.

## Bekannte Kanten

- Die Juli-Belege (Kaminski, Sauber & Fein, Wasserwerke, Versicherung) tragen bis zum Bankimport die Warnung UEBERFAELLIG, weil ihr Fälligkeitsdatum vor dem 23.08.2026 liegt. Das ist gewollt: Der Kontoauszug zeigt die Zahlung, danach ist die Warnung weg.
- Beim Baumarktbon setzt die KI das Bondatum als Fälligkeit; die Regel UEBERFAELLIG greift dann trotz `zahlungsart = bereits_bezahlt`. Sinnvoll wäre, UEBERFAELLIG bei bereits bezahlten Belegen und bei Lastschrift zu unterdrücken (`src/lib/belege/pruefung.ts`).
- Die Regel VERSICHERUNGSFALL sucht nach „brand“ ohne Wortgrenze und würde auch bei „Familie Brandt“ anschlagen. Die Belege für Gartenweg 21 sind deshalb an die Verwaltung adressiert; die saubere Lösung ist eine Wortgrenze im Muster in `pruefung.ts`.
- Das ING-Format hat keine IBAN-Spalte der Gegenseite; die Hausgeldzahler der Severinstraße 88 werden über den Namen zugeordnet (Berger steht mit IBAN in den Stammdaten, das hilft hier nicht). Der Vorspann sagt „Bank;ING“, obwohl BK-002 in den Stammdaten als norisbank angelegt ist, und der Sparkasse-Export gehört zu einem ING-Konto: Die Formate wurden bewusst gemischt, damit der Import über die Kopfzeile erkennt und nicht über den Banknamen.
- Die Versicherungsteuer ist mit 19 % (Regelsatz) ausgewiesen, wie es die Vorgabe wollte. Eine verbundene Wohngebäudeversicherung würde in der Praxis 16,34 % zeigen (§ 5 Abs. 1 Nr. 3, § 6 Abs. 2 VersStG); die Prüfregel akzeptiert beides.
- Die vier Mieter-IBANs von Schmidt, Lang, Demir und Fischer hatten in den ursprünglichen Stammdaten falsche Prüfziffern; sie sind korrigiert (DE31…, DE40…, DE26…, DE04…) und stehen so auch im Kontoauszug.
