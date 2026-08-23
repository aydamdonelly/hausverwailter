# Nachrecherche: DATEV-Export, Objektbuchhaltung ohne Kontenrahmen

Stand: 23.08.2026. Confidence-Tags: [H] hoch (Primärquelle/Gesetz/Handbuch), [M] mittel (Sekundärquelle, Herstellerseite, Forum mit Hersteller-Antwort), [L] niedrig (abgeleitet, nicht bestätigt).
Hinweis zur Arbeitsweise: WebSearch-Budget der Session war erschöpft; Recherche lief über WebFetch (Brave-Suche, Primärseiten), Playwright-Browser (Immoware24-Support, DATEV-Community, DuckDuckGo) und lokale Dateien (`powerhaus_datev.txt`, `law_*.txt`, `nach/*`).

---

## 0. Kurzantwort auf die Kernfrage

**Es gibt drei verschiedene "DATEV-Exporte", die die App auseinanderhalten muss. Für keinen davon darf die App Konten "erfinden"; für die Objektbuchhaltung liefert sie einen eigenen Objektkontenrahmen plus eine Mapping-Tabelle auf die Konten des jeweiligen Steuerberaters (Fremdkontonummern, wie PowerHaus/iX-Haus/haussoft/Immoware24 es auch tun).**

| Fall | Buchungskreis | Rechtsträger / Steuersubjekt | DATEV-Mandant | Kontenrahmen | Wer braucht den Stapel |
|---|---|---|---|---|---|
| A | Eigene Fibu der Verwaltungs-GmbH (oder des Gebäudedienstleisters) | GmbH | 1 Mandant | SKR03/SKR04 (Tabelle in `datenformate-import-export.md` Abschnitt 2 gilt genau hierfür) | Steuerberater der GmbH: USt-VA, JA, Bilanz |
| B | Objektbuchhaltung **Mietverwaltung / SEV** (Fremdvermögen des Eigentümers) | Eigentümer (Privatperson, GbR, GmbH) | 1 Mandant je **Eigentümer**; Objekte als **KOST1** (bei DATEV selbst: "Vermietungsobjekt = Kostenstelle") | Kontenrahmen des Eigentümer-Steuerberaters: DATEV "Vermietung und Verpachtung" (SKR03/04-basiert, 6-stellig), SKR97 (Privatpersonen) oder SKR03/04 mit Kostenstellen | Steuerberater des Eigentümers: Anlage V, EÜR, Bilanz, USt bei Option |
| C | Objektbuchhaltung **WEG** (Gemeinschaft der Wohnungseigentümer, GdWE) | GdWE selbst (rechtsfähig § 9a WEG, "rechtsfähige Personenvereinigung" § 14a Abs. 2 Nr. 3 AO) | falls überhaupt: 1 Mandant je **WEG** (iX-Haus: "Objekt-Mandanten-Tabelle", PowerHaus: "Firma = Mandant") | eigener Objektkontenrahmen (kein SKR-Standard); Steuerberater der WEG legt Fremdkontonummern fest | i. d. R. **niemand**: WEG-Abrechnung ist Jahresabrechnung/Vermögensbericht nach § 28 WEG, keine Bilanz. DATEV nur bei USt-Option (§ 9 UStG, Gewerbeeinheiten), Feststellungserklärung § 180 AO, gewerblicher Tätigkeit (BHKW) oder wenn ein Steuerberater die Jahresabrechnung prüft |

**Konsequenz für den Entwickler:**
1. Fall A ist ein normaler SKR-Stapel (Honorarerlöse 8400/4400, Fremdleistungen, Bank). Hausgeld, Rücklage, Kaution, Miete tauchen dort **nie** auf, weil es Fremdgeld ist ("durchlaufende Posten", Treuhand; Verstoß = Vorwurf § 266 StGB, onlinebilanz.de [M]). Die einzige Berührung: Verwalterhonorar als Erlös (GmbH) und als Kosten (Objekt).
2. Fall B und C sind **Objektbuchhaltungen** (Immoware24: "in Immoware24 wird eine Objektbuchhaltung praktiziert", jedes Objekt hat eigenen Kontenplan aus einem Musterkontenrahmen [H]). Dafür braucht die App einen eigenen Musterkontenrahmen je Verwaltungsart (WEG / Miete / SEV) mit stabilen internen Kontonummern und ein Mapping "internes Konto → DATEV-Konto des Zielmandanten" (Fremdkontonummer). Ohne gepflegtes Mapping wird kein DATEV-Stapel erzeugt, sondern nur die interne Objekt-Auswertung (Jahresabrechnung, Mieteingangsliste, Einnahmen-Ausgaben je Objekt). Genau so machen es PowerHaus ("Fremdkontonummer in den Sachkonten und Personenkonten" [H]), iX-Haus ("Konten-Tabellen zur Zuordnung von iX-Haus-Sachkonten zu DATEV-Konten, Bereiche z. B. 5000-9999 ⇒ 1:1" [H]), haussoft ("Kontenrahmen müssen nicht zwingend gleich sein" [M]) und Immoware24 ("Ordnen Sie Ihre Immoware24-Konten den entsprechenden DATEV-Konten Ihrer Steuerberatung zu" [M]).
3. Keine SKR-Konten der eigenen Fibu (8400/1590 usw.) für Hausgeld/Rücklage/Kaution verwenden. Ein Stapel mit "Hausgeld an 8400" wäre steuerlich falsch (Fremdgeld als Erlös der GmbH) und wird vom Steuerberater abgelehnt.

---

## 1. Was DATEV selbst und die Verwalterprogramme tun (Mandant vs. Kostenstelle)

### 1.1 DATEV-Produkte und -Praxis
- **DATEV "Vermietung und Verpachtung"** (Branchenlösung, buchbar ab 01.01.2023, seit 2025 13 EUR je Mandant): "Objektbezeichnung und Adresse pro Kostenstelle eingeben", "Vermietungsobjekte zuordnen und verwalten mit Blick auf die Relevanz für die Anlage V", "Schnittstelle vom Buchen der Belege bis zur Übergabe in die Anlage(n) V", ausdrücklich "keine Lösung für eine Nebenkostenabrechnung vermieteter Objekte". Quelle: https://www.datev.de/web/de/steuerberatung/loesungen/rechnungswesen/buchfuehrung-erstellen/fachbeitrag-vermietung-und-verpachtung [H]
- Kontenplan dieser Lösung: SKR03- oder SKR04-basiert, **6-stellige Sachkonten** ("5. und 6. Sachkontenstelle" für Untergliederungen der Anlage V), Beispiele aus DATEV-Antwort (Service Jahresabschluss, 26.02.2025): `8470 xx` Mieteinnahmen (Endnummern ursprünglich je Etage), `4232 00` Schornsteinfeger voll abzugsfähig, `4232 20`/`4232 30` Schornsteinfeger nicht abzugsfähig; nur die "im Posten Überschussrechnung nach § 21 EStG grau markierten Konten" fließen in die Anlage V. Quelle: https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Konten-im-Vermietungskontenrahmen/m-p/475034 [M]
- DATEV-Community "Kontenplan / Buchführung für Immobilien" (td-p/50344): DATEV-Service: "in jedem Standard-Kontenrahmen (SKR97 und SKR04) kann die Sachkontenlänge auf max. 8 Stellen erhöht werden"; Sammelfunktionen (S, SAM, SAV) nur einmal je Konto mit Endnummer 0, also **keine mehreren Vorsteuersammelkonten je Objekt**. Praxisbericht einer Kanzlei: "Für jedes Objekt wird eine eigene Kostenstelle angelegt, welche dann bei der Verbuchung angesprochen wird", KOST-Auswertung in Reihenfolge der Anlage V, "Chefübersicht" für alle Objekte nebeneinander; SKR97 = Kontenrahmen für Privatpersonen mit Immobilienkonten. Quelle: https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Kontenplan-Buchf%C3%BChrung-f%C3%BCr-Immobilien/td-p/50344 [M]
- Feldlängen: DATEV Dok.-Nr. 9231364 "Erweiterung von Feldlängen (Überblick)" (zuletzt aktualisiert 06.08.2026, Produkte Kanzlei-Rechnungswesen/Rechnungswesen/Mittelstand Faktura): "Im Feld Belegfeld 1 für die Erfassung der Belegnummer oder der Rechnungsnummer **36 Stellen** zur Verfügung." Quelle: https://wissensplattform.apps.datev.de/help/document/9231364 (Volltext nur mit Login; Zitat über Brave-Snippet der PDF-Fassung https://www.datev.de/dnlexom/v2/content/documents/9231364/pdf) [M-H]

### 1.2 Verwalterprogramme
| Programm | Mandant | Objekt | Personenkonten | Quelle |
|---|---|---|---|---|
| PowerHaus (Aareon) | "Eine Firma in PowerHaus entspricht hierbei einem Mandanten in DATEV"; Objekte werden Firmen zugeordnet (Objekt → Register Bankverb. → Feld Firma) | KOST1 = Objektnummer (Kostenstellenformat "Standard") oder KOST1 = Fremdfirmen-Nr., KOST2 = Objektnummer ("Individuell") | Mieter-/Eigentümer-/SEV-Konten wahlweise als Einzeldebitoren (1 Stelle länger als Sachkonten) oder ersetzt durch **Sammelkonto**; Belegnummer max. 9-stellig | `powerhaus_datev.txt` (Handbuch 09/2025) [H] |
| iX-Haus (CREM) | "Objekt-Mandanten-Tabelle": iX-Objekte oder Objektbereiche → Mandantennummern (also frei: 1 Objekt = 1 Mandant oder mehrere Objekte = 1 Mandant) | Objektkontierung: DATEV-Zielkonto abhängig vom Objekt mit Platzhaltern ("2256xx") | Kreditoren/Debitoren 5-stellig; Sachkonten bis 6-stellig, "Kontenrahmen frei wählbar" | https://wiki.crem-solutions.de/Version.20.22.0/doku.php?id=schnittstellen:datev_schnittstelle:howto , …buchhaltung:konten:main [H] |
| Immoware24 | Export je Auftraggeber/Objekt; Kontenmapping auf DATEV-Konten des StB | Kostenstelle in **KOST2** (VE-ID, VE-Nummer oder Freitext) | interne Konten 6-stellig (z. B. `009988 Durchlaufposten Kautionen`) | https://www.immoware24.de/funktionen/datev/ , Support-Artikel 360013883998 [H] |
| haussoft (GFAD) | "beliebig viele Mandanten-Kontenrahmen" | "Kostenstellen können übergeben werden" | Geschäftspartnerstammdaten werden mit übergeben | https://www.haussoft.de/hausverwaltungssoftwarefunktion/datev-anbindung/ [M] |

**Regel für die App (Ableitung [M]):** Mandant = Rechtsträger, dem das Geld gehört. GdWE → eigener Mandant (eigene Steuernummer, eigene Klagebefugnis, BFH). Eigentümer mit mehreren Mietobjekten → ein Mandant, Objekt = KOST1, Einheit = KOST2. Verwaltungs-GmbH → eigener Mandant. Mandanten-/Beraternummer und Sachkontenlänge sind je Mandant zu konfigurieren (Beraternummer > 1001, PowerHaus-Handbuch [H]).

---

## 2. Musterkontenrahmen Objektbuchhaltung (Vorschlag, mit Belegen aus der Praxis)

Es gibt **keinen** veröffentlichten Standard-Objektkontenrahmen (kein SKR für WEG-Verwaltung). Belegte Fragmente:
- **digisoft (Hausverwalter-Software) Standardkonten Rücklage** ("Nummern sind frei wählbar"): `0700` Instandhaltungsrücklage (Bestandskonto, Passiv), `1070` Anlagekonto Rücklage (Bank), `1517` VRR Rücklagen (Sollstellungen/Verrechnung), `6700` Zuweisungen zur Rücklage, `8700` Rücklageentnahmen, `8770` Zinsertrag aus Rücklage; Buchungskenner RLG=1517, RLGB=0700, RLGA=1070, RLGE=6700, RLGZ=8700, RLGR=8770. Quelle: https://www.digisoft.de/Anleitung/HausgeldabrechnungWohngeldabrech.html [H]
- **Immoware24**: je Erhaltungsrücklage ein **aktives Bestandskonto** (Rücklagen-Bankkonto) und ein **passives Bestandskonto** ("buchhalterische Rücklage, spiegelt den Stand der Ist-Rücklage"); Zuführung = "Zuführung (passiv) an passives Bestandskonto (RL)", Entnahme = "Passives Bestandskonto (RL) an Entnahme (passiv)"; RL-Kostenkonten und RL-Ertragskonten (Zinsen, Geldverkehrskosten, Steuern, Waschmarken, Stellplatzmieten). Kaution: `009988 Durchlaufposten Kautionen` bzw. `009988 Durchlaufposten Kautionen SEV`. Quellen: Support-Artikel 360012000818, 16055462397341, 16890329608093, 360013883998 [H]
- **iX-Haus Buchungsarten** (Hausgeld/Rücklage): BA 10 Sollstellung, BA 01 Zahlung, BA 70 Zinsen Rücklage, BA 71 KapESt/Abgeltungsteuer, BA 72 Soli, BA 73 außerplanmäßige Entnahme, BA 74 Zuführung, BA 99 Saldovortrag; "Rücklagen sind Passivposten der WEG-Buchhaltung, Bestände im Haben". Quelle: https://wiki.crem-solutions.de/Version.20.22.0/doku.php?id=abrechnung:hausgeld_einzelabrechnung:start [H]
- **WISO Hausverwalter**: je Rücklagenart ein zugeordnetes Bankkonto, Assistent mit Buchungsarten Anfangsbestand/Zuführung/Entnahme; "Entnahmen ... über den Assistenten, erst das Begleichen der Rechnung ... normale manuelle Buchung". Quelle: http://update2.buhl-data.com/documents/Tutorials/Hausverwalter/2016/10_Extra_R%C3%BCcklagenhandling.pdf [H]

### 2.1 Vorschlag interner Objektkontenrahmen (4-stellig, SKR-ähnliche Klassenlogik, damit Steuerberater ihn "lesen" können) [M, eigene Ableitung]

Prinzip: Konto-IDs sind intern stabil; je Zielmandant wird `datev_konto` gemappt. Nummernkreise: 0xxx/1xxx Bestand, 2xxx Verrechnung/Durchlauf, 4xxx Kosten (BetrKV-Reihenfolge), 6xxx Kosten nicht umlagefähig, 8xxx Erträge, Debitoren 10000+, Kreditoren 70000+.

| Intern | Bezeichnung | Typ | WEG | Miete | SEV | Bemerkung |
|---|---|---|---|---|---|---|
| 1200 | Objekt-Girokonto (Gemeinschaftskonto / Mietkonto) | Aktiv, Bank | x | x | x | je weiteres Bankkonto 1210, 1220 … |
| 1250 | Rücklagen-Bankkonto (Tagesgeld/Festgeld) | Aktiv, Bank | x | | | pro Rücklage/Bankkonto eines (digisoft 1070) |
| 1280 | Kautionskonto (Treuhand) | Aktiv, Bank | | x | x | § 551 Abs. 3 BGB: getrennt vom Vermögen des Vermieters |
| 1400 | Forderungen Eigentümer (Sammelkonto Debitoren Hausgeld) | Aktiv | x | | | wenn Ziel Sammelkonto statt Einzeldebitoren (PowerHaus-Option) |
| 1410 | Forderungen Mieter (Sammelkonto) | Aktiv | | x | x | |
| 0700 | Erhaltungsrücklage (Ist-Bestand, passiv) | Passiv | x | | | digisoft 0700 / Immoware24 "passives Bestandskonto" |
| 0710 | Sonderrücklage / zweckgebundene Rücklage n | Passiv | x | | | je beschlossener Rücklage eines |
| 0800 | Verbindlichkeiten Kautionen | Passiv | | x | x | Gegenstück zu 1280 (Immoware24 nutzt Durchlaufposten 009988) |
| 1600 | Verbindlichkeiten Kreditoren (Sammelkonto) | Passiv | x | x | x | |
| 2100 | Durchlaufende Posten Kaution | Verrechnung | | x | x | Immoware24-Variante ohne Kautionskonto im Objekt |
| 2200 | Verrechnung Rücklagen-Sollstellung (Soll-Rücklage) | Verrechnung | x | | | digisoft 1517 "VRR Rücklagen" |
| 2300 | Verrechnung Abrechnungsspitze (Nachschuss/Guthaben) | Verrechnung | x | x | x | |
| 2400 | Geldtransit (Bank an Bank) | Verrechnung | x | x | x | Zuführung Giro → Rücklagenkonto |
| 4001 | Grundsteuer (§ 2 Nr. 1 BetrKV) | Kosten umlagefähig | x | x | x | Bescheid, ohne USt |
| 4002 | Wasserversorgung (Nr. 2) | Kosten umlagefähig | x | x | x | 7 % USt enthalten, brutto |
| 4003 | Entwässerung (Nr. 3) | | x | x | x | Gebühr |
| 4004 | Heizung (Nr. 4) Brennstoff/Fernwärme/Wartung | | x | x | x | HeizkostenV |
| 4005 | Warmwasser (Nr. 5) | | x | x | x | |
| 4006 | Verbundene Anlagen (Nr. 6) | | x | x | x | |
| 4007 | Aufzug (Nr. 7) | | x | x | x | |
| 4008 | Straßenreinigung/Müll (Nr. 8) | | x | x | x | |
| 4009 | Gebäudereinigung/Ungeziefer (Nr. 9) | | x | x | x | |
| 4010 | Gartenpflege (Nr. 10) | | x | x | x | |
| 4011 | Beleuchtung/Allgemeinstrom (Nr. 11) | | x | x | x | |
| 4012 | Schornsteinreinigung (Nr. 12) | | x | x | x | |
| 4013 | Sach-/Haftpflichtversicherung (Nr. 13) | | x | x | x | VersSt, kein VSt |
| 4014 | Hauswart (Nr. 14) | | x | x | x | |
| 4015 | Antenne/Breitband (Nr. 15) | | x | x | x | |
| 4016 | Wäschepflege (Nr. 16) | | x | x | x | |
| 4017 | Sonstige Betriebskosten (Nr. 17) | | x | x | x | |
| 6100 | Instandhaltung/Instandsetzung laufend (nicht umlagefähig, § 1 Abs. 2 BetrKV) | Kosten nicht umlagefähig | x | x | x | |
| 6110 | Instandsetzung aus Rücklage finanziert (RL-Kostenkonto) | Kosten RL | x | | | Immoware24 "RL-Kostenkonto", neutralisiert über 8710 |
| 6200 | Verwaltungskosten (Verwalterhonorar) | | x | x | x | Miete: nicht umlagefähig; WEG: Kosten der Gemeinschaft |
| 6210 | Bankgebühren / Kontoführung | | x | x | x | |
| 6220 | Rechts-/Beratungskosten, Gerichtskosten | | x | x | x | |
| 6230 | Rücklastschriftgebühren (Bank) | | x | x | x | wird dem Debitor weiterbelastet (8600) |
| 6300 | Zuführung zur Erhaltungsrücklage (Aufwand aus Sicht Bewirtschaftung) | | x | | | digisoft 6700; nur wenn StB die Zuführung als Aufwandsbuchung will, sonst reine Bestandsumbuchung |
| 8000 | Hausgeld-Vorschüsse (Sollstellung Bewirtschaftung) | Ertrag | x | | | |
| 8010 | Hausgeld-Vorschüsse Rücklage (Sollstellung Rücklagenanteil) | Ertrag/Verrechnung | x | | | digisoft 1517-Logik; Ist-Prinzip (BGH V ZR 44/09) beachten |
| 8020 | Sonderumlage | Ertrag | x | | | Beschlussbezug |
| 8030 | Nachschüsse aus Jahresabrechnung (§ 28 Abs. 2 WEG) | Ertrag | x | | | |
| 8100 | Nettokaltmiete | Ertrag | | x | x | § 4 Nr. 12 UStG steuerfrei (Wohnraum) |
| 8110 | Betriebskostenvorauszahlung | Ertrag | | x | x | |
| 8120 | Heizkostenvorauszahlung | Ertrag | | x | x | |
| 8130 | Garage/Stellplatz | Ertrag | | x | x | Gewerbe/Stellplatz an Nicht-Mieter: 19 % |
| 8140 | Miete Gewerbe mit USt-Option (§ 9 UStG) | Ertrag 19 % | | x | x | im Zielmandanten Automatikkonto (SKR03 2752 / SKR04 4862) |
| 8150 | Nachzahlung Betriebskostenabrechnung | Ertrag | | x | x | |
| 8200 | Einnahmen aus Mieterträgen der WEG (z. B. Dachfläche, Waschmarken) | Ertrag | x | | | Immoware24: "Einnahmen aus Mieterträgen" muss im WEG-Musterkontenrahmen ergänzt werden |
| 8300 | Zinserträge Rücklage | Ertrag RL | x | | | iX-Haus BA 70; KapESt 8310 |
| 8310 | Kapitalertragsteuer/Soli auf Rücklagenzinsen (negativer Ertrag) | | x | | | iX BA 71/72 |
| 8400 | Versicherungserstattungen | Ertrag | x | x | x | |
| 8600 | Weiterbelastung Rücklastschriftgebühr / Mahnkosten an Debitor | Ertrag | x | x | x | Mahnkosten: siehe Abschnitt 5.5 |
| 8700 | Entnahme aus Erhaltungsrücklage (passiv) | | x | | | digisoft 8700; Immoware24 "Entnahme (passiv)" |
| 8710 | Ertrag aus Rücklagenentnahme in Hausgeldabrechnung | Ertrag | x | | | Immoware24-Konstruktion zur Neutralisierung von 6110 |
| 10000+ | Debitoren: Eigentümer (WEG) / Mieter (Miete/SEV), eine Nummer je Einheit+Person | | x | x | x | DATEV: Personenkonto = Sachkontenlänge + 1 |
| 70000+ | Kreditoren: Handwerker, Versorger, Versicherer, Verwalter | | x | x | x | |

Mapping-Tabelle (Datenmodell): `konto_intern`, `mandant_id`, `datev_konto`, `datev_bu_schluessel_default`, `automatikkonto (bool)`, `gueltig_ab`. Export bricht mit Fehlerliste ab, wenn ein bebuchtes Konto kein Mapping hat (analog iX-Haus "Konten-Tabellen", PowerHaus "Fremdkontonummer").

---

## 3. Beispiel-Buchungssätze Objektbuchhaltung (mit DATEV-EXTF-Zeilen)

Konventionen: Objektbuchhaltung ist USt-frei (WEG § 4 Nr. 13 UStG, Wohnraummiete § 4 Nr. 12 UStG), daher **kein BU-Schlüssel**, Beträge **brutto**, Vorsteuer ist Kostenbestandteil. Nur bei Gewerbeeinheiten mit Option (§ 9 UStG) BU 9 bzw. Automatikkonto im Zielmandanten. EXTF-Spalten (aus `datenformate-import-export.md` 1.3): Umsatz;S/H;WKZ;;;;Konto;Gegenkonto;BU;Belegdatum(TTMM);Belegfeld 1;Belegfeld 2;Skonto;Buchungstext;…;KOST1;KOST2. S/H bezieht sich auf "Konto" (Spalte 7). Belegfeld 1 ist der OP-Schlüssel: Zahlung gleicht Sollstellung nur aus, wenn Belegfeld 1 identisch ist (ledermann/datev booking.rb, DATEV Dok. 1036228 [H]). Debitor-Nummern hier 5-stellig (Sachkontenlänge 4).

### 3.1 WEG: Hausgeld-Sollstellung (monatlich, Wirtschaftsplan 260 EUR = 220 Bewirtschaftung + 40 Rücklage)
Zwei OP-Zeilen je Eigentümer und Monat (damit Teilzahlungen quotal zugeordnet werden können, Haufe HI14945431 [M]):
```
220,00;S;EUR;;;;10001;8000;;0108;HG202608;;;Hausgeld 08/2026 WE 01 Bewirtschaftung;…;OBJ-0815;WE-01
40,00;S;EUR;;;;10001;8010;;0108;HG202608;;;Hausgeld 08/2026 WE 01 Ruecklage;…;OBJ-0815;WE-01
```
Alternativ eine Zeile 260,00 an 8000 und Rücklagenanteil nur statistisch; dann verliert man die quotale Zuordnung. Empfehlung: zwei Zeilen.

### 3.2 WEG: Hausgeldeingang auf Gemeinschaftskonto (Kontoauszug 03.08.2026, 260 EUR)
```
260,00;S;EUR;;;;1200;10001;;0308;HG202608;;;Zahlung Hausgeld 08/2026 WE 01;…;OBJ-0815;WE-01
```
Ist-Prinzip: Die **Ist-Rücklage** erhöht sich erst durch die Zuführung (3.4), nicht durch die Sollstellung (BGH V ZR 44/09: nur tatsächlich gezahlte Beträge; Umbuchungen ohne Geldfluss dürfen keine Zahlungen vortäuschen, hausverwalter-vermittlung.de [M]).

### 3.3 WEG: Minderzahlung 200 statt 260 EUR, quotale Verteilung (220:40)
```
169,24;S;EUR;;;;1200;10001;;0308;HG202608;;;Teilzahlung Hausgeld 08/2026 Bewirtschaftung;…;OBJ-0815;WE-01
30,76;S;EUR;;;;1200;10001;;0308;HG202608;;;Teilzahlung Hausgeld 08/2026 Ruecklage;…;OBJ-0815;WE-01
```
Rest 60 EUR bleibt OP (50,76 Bewirtschaftung, 9,24 Rücklage). Abweichende Tilgungsreihenfolge nur per Beschluss (§ 28 Abs. 3 WEG, Haufe [M]).

### 3.4 WEG: Zuführung zur Erhaltungsrücklage (Ist-Zuführung, monatlich oder nach Zahlungseingang)
a) Geldfluss Giro → Rücklagenkonto (Umbuchung 40 EUR):
```
40,00;S;EUR;;;;1250;1200;;0508;RLZ202608;;;Zufuehrung Ruecklage 08/2026 WE 01;…;OBJ-0815;WE-01
```
b) passiver Rücklagenbestand erhöhen (Immoware24: "Zuführung (passiv) an passives Bestandskonto (RL): nur positiver Betrag"):
```
40,00;S;EUR;;;;8010;0700;;0508;RLZ202608;;;Zufuehrung Erhaltungsruecklage 08/2026 WE 01;…;OBJ-0815;WE-01
```
(8010 wird damit gegen die Rücklage abgeschlossen; alternativ nach digisoft: 6700 "Zuweisung" an 0700.) Rücklage darf auch auf dem Girokonto bleiben (KG 24 W 5174/86; BGH V ZR 80/19: "muss nicht von der sonstigen Liquidität getrennt werden"), dann entfällt a), b) bleibt Pflicht, und die Abrechnung muss ausweisen, welcher Teil des Kontoguthabens Rücklage ist (AG Mülheim 23 C 3/21). Quelle: dittmann-wohnungsverwalter.de [M]

### 3.5 WEG: Instandsetzungsrechnung aus der Rücklage bezahlen (Dachreparatur 5.950 EUR brutto, Kreditor 70012, Rechnung R-4711)
```
5950,00;H;EUR;;;;70012;6110;;1008;R-4711;;;Dachreparatur Beschluss TOP 5/2026;…;OBJ-0815;
5950,00;S;EUR;;;;70012;1250;;1508;R-4711;;;Zahlung Dachreparatur aus Ruecklage;…;OBJ-0815;
5950,00;S;EUR;;;;0700;8700;;1508;RLE20260815;;;Entnahme Erhaltungsruecklage Dach;…;OBJ-0815;
```
Immoware24: "Passives Bestandskonto (RL) an Entnahme (passiv)"; wenn die Kosten dennoch in der Hausgeldabrechnung ausgewiesen werden sollen: zusätzlich `6110 an 8710` (Ertrag, "kostenmindernd, neutralisiert rücklagenfinanzierte Kosten"). BGH V ZR 96/24 (11.04.2025): Rücklagenentnahmen dürfen nicht in die Abrechnungsspitze einfließen (Doppelbelastung). Kein BU-Schlüssel: die WEG hat keinen Vorsteuerabzug, § 13b greift nicht (UStAE 13b.3 Abs. 8).

### 3.6 WEG/Miete: Rücklastschrift (Lastschrift 260 EUR zurück, Bankgebühr 3,50 EUR, Weiterbelastung an Debitor)
Reihenfolge (Immoware24: "Eingangszahlung buchen, Rücklastschrift buchen"; erzeugt drei Buchungen: zurückgebuchte Zahlung, Kostenerfassung RLS-Gebühr, Sollstellung RLS-Gebühr [H]):
```
260,00;H;EUR;;;;1200;10001;;0708;HG202608;;;Ruecklastschrift Hausgeld 08/2026;…;OBJ-0815;WE-01
3,50;S;EUR;;;;6230;1200;;0708;RLS20260807;;;Bankgebuehr Ruecklastschrift;…;OBJ-0815;WE-01
3,50;S;EUR;;;;10001;8600;;0708;RLS20260807;;;Weiterbelastung RLS-Gebuehr WE 01;…;OBJ-0815;WE-01
```
Der ursprüngliche OP HG202608 ist wieder offen (gleiches Belegfeld 1). Die dritte Zeile nur, wenn Weiterbelastung vereinbart/beschlossen; beim Debitor Sachverhalt 40 (Mahngebühr) setzen, damit DATEV keine Mahnzinsen darauf rechnet.

### 3.7 Miete: Sollstellung, Mieteingang, Kaution
```
850,00;S;EUR;;;;10021;8100;;0109;MI202609;;;Miete 09/2026 Whg 3;…;OBJ-0042;WE-03
180,00;S;EUR;;;;10021;8110;;0109;MI202609;;;BK-Vorauszahlung 09/2026 Whg 3;…;OBJ-0042;WE-03
90,00;S;EUR;;;;10021;8120;;0109;MI202609;;;HK-Vorauszahlung 09/2026 Whg 3;…;OBJ-0042;WE-03
1120,00;S;EUR;;;;1200;10021;;0309;MI202609;;;Mieteingang 09/2026 Whg 3;…;OBJ-0042;WE-03
```
Kaution (2.550 EUR, geht auf Mietkonto ein, wird auf Kautionskonto weitergeleitet), Variante "Durchlaufposten" (Immoware24 009988): `2550,00;S;1200;2100 Eingang` und `2550,00;S;2100;1200 Weiterleitung`; Variante mit Kautionskonto im Objekt: `2550,00;S;1280;0800` (Kaution ist Verbindlichkeit gegenüber Mieter, Zinsen stehen dem Mieter zu, § 551 Abs. 3 BGB [H]). Rückzahlung: `0800 an 1280`, Verrechnung mit Mietrückstand: `0800 an 10021` (Belegfeld 1 der offenen Sollstellung).

### 3.8 Verwalterhonorar (beide Seiten)
Objekt (WEG, 30 Einheiten × 28 EUR + 19 % = 999,60 EUR, Verwalter = Kreditor 70001):
```
999,60;H;EUR;;;;70001;6200;;0108;RE-2026-00017;;;Verwalterhonorar 08/2026;…;OBJ-0815;
999,60;S;EUR;;;;70001;1200;;0308;RE-2026-00017;;;Entnahme Verwalterhonorar 08/2026;…;OBJ-0815;
```
Eigene Fibu der GmbH (Fall A, SKR03, WEG = Debitor 10815, Automatikkonto 8400, kein BU):
```
999,60;S;EUR;;;;10815;8400;;0108;RE-2026-00017;;;Honorar WEG Musterstr. 1 08/2026;…;OBJ-0815;
999,60;S;EUR;;;;1200;10815;;0308;RE-2026-00017;;;Zahlungseingang Honorar 08/2026;…;OBJ-0815;
```
PowerHaus-Sonderregel bei "Automatikkonten EXTF": Kosten mit 100 % Vorsteueranteil werden gedreht ("S Kosten H Giro Betrag positiv" → "S Giro H Kosten Betrag negativ"), weil der BU-Schlüssel vor dem Gegenkonto steht [H]. Für die eigene App unnötig, wenn Konto/Gegenkonto von Anfang an richtig herum gesetzt werden (BU-Schlüssel wirkt auf das Konto in Spalte 7 bzw. das Automatikkonto).

### 3.9 Versicherungsbeitrag (Wohngebäude, Nettobeitrag 1.000 EUR + VersSt 163,40 = 1.163,40 EUR)
```
1163,40;H;EUR;;;;70020;4013;;1508;VS-2026-123;;;Wohngebaeudeversicherung 2026;…;OBJ-0815;
```
Kein BU (kein Vorsteuerabzug, § 4 Nr. 10 UStG), brutto inkl. Versicherungsteuer; umlagefähig § 2 Nr. 13 BetrKV.

---

## 4. Warum überhaupt ein WEG-Stapel? Steuerliche Pflichten der GdWE (für die Mandanten-Entscheidung)
- Verwalter ist Vermögensverwalter i. S. d. §§ 34, 35 AO und erfüllt die steuerlichen Pflichten der WEG (Bücher, Erklärungen, Zahlungen, Aufbewahrung § 147 AO; Haftung § 69 AO). WEG ist "Unternehmerin nach § 2 UStG"; bei USt-Option 10 Jahre Aufbewahrung; Bauabzugsteuer § 48 EStG bei Bauleistungen am Gemeinschaftseigentum; § 35a-Aufteilung je Eigentümer; Zinsen der Rücklage: Kopie der Steuerbescheinigung an Eigentümer. Quelle: https://vdiv.de/aktuelles/praxistipps-details/steuerliche-pflichten-des-verwalters-als-organ-der-weg [M]
- Zinsen aus der Erhaltungsrücklage sind Einkünfte aus Kapitalvermögen der Eigentümer; "im Regelfall wird von einer gesonderten und einheitlichen Feststellung der anteiligen Zinsen abgesehen; stattdessen teilt der Verwalter die anteiligen Kapitalerträge den Eigentümern nach dem maßgeblichen Verteilungsschlüssel mit"; sonst Feststellung nach § 180 AO. Einzahlungen in die Rücklage sind beim vermietenden Eigentümer erst bei Verwendung Werbungskosten (BFH 14.01.2025). WEG kann gewerbliche Mitunternehmerschaft sein (BHKW; BFH 2018, § 180 Abs. 1 S. 1 Nr. 2a AO), ist aber keine Körperschaft i. S. d. § 1 KStG. Umsatzsteuer: § 4 Nr. 13 UStG steuerfrei (Überlassung, Instandhaltung, Verwaltung, Wärme); Verwaltung des Sondereigentums/fremden Eigentums nicht befreit; WEG wird nicht Reverse-Charge-Schuldner, wenn sie Bau-/TK-Leistungen als § 4 Nr. 13-Leistungen weitergibt; EuGH "WEG Tevesstraße" zur Wärmelieferung offen. Quelle: Dr. S. Korts, "Die Gemeinschaft der Wohnungseigentümer", https://steuerrecht.com/wp-content/uploads/2026/04/Die-Gemeinschaft-der-Wohnungseigentuemer-WEG.pdf (lokal `nach/steuerrecht_weg.txt`) [M]
- Folge: Ein DATEV-Stapel je WEG ist die Ausnahme (Option § 9, Feststellung, Gewerbe). Standard-Deliverable für die WEG sind Jahresabrechnung + Vermögensbericht (§ 28 WEG) und die Rücklagen-/Zinsmitteilung je Eigentümer. Die App sollte den WEG-Export als optionales Feature je Mandant anbieten, nie als Default-Lauf.

---

## 5. Klärung der Widersprüche

### 5.1 Belegfeld 1 (Rechnungsnummer): 36 vs. 12 vs. 9 Zeichen
- DATEV-Format (EXTF Buchungsstapel, Version 700/Formatversion 12/13): **Belegfeld 1 = Text 36 Zeichen**, erlaubte Zeichen `A-Z a-z 0-9 $ & % * + - /`; Belegfeld 2 = 12 Zeichen. Quellen: ledermann/datev `lib/datev/base/booking.rb` (`field 'Belegfeld 1', :string, limit: 36, regex: /\A[a-zA-Z0-9\$\&\%\*\+\-\/]*\z/`, Kommentar "Das Belegfeld 1 ist der Schlüssel für die Verwaltung von Offenen Posten", Referenz DATEV Dok. 1036228) https://github.com/ledermann/datev [H]; DATEV Dok. 9231364 "Erweiterung von Feldlängen": "36 Stellen zur Verfügung" [M-H]; iX-Haus: "Belegnummer eins kann per Systemeinstellung auf die Länge von 36 Zeichen vergrößert werden" [H].
- **12 Zeichen** war die Grenze des alten KNE-/Postversandformats (bis 2017; PowerHaus: "KNE-Format wird ab dem 01.01.2018 nicht mehr unterstützt") und ist heute die Länge von Belegfeld 2. Die Aussage "max. 12 Zeichen" in `domaene_prozesse_hausverwaltung.md` Abschnitt 4 ist veraltet und wird korrigiert.
- **9 Zeichen** ist eine **PowerHaus-interne** Grenze ("PowerHaus unterstützt maximal 9-stellige Belegnummern") und gilt nur, wenn Buchungen in PowerHaus importiert werden sollen.
- Entscheidung: Rechnungsnummern-Muster `RE-2026-00001` (13 Zeichen, nur erlaubte Zeichen) ist DATEV-konform. Zusätzlich je Mandant konfigurierbares Kurzformat für Fremdsysteme (`belegnr_kurz`, ≤ 9 Ziffern, z. B. `260000001`), das in Belegfeld 1 exportiert wird, wenn `zielsystem = powerhaus`. Validierung: Länge ≤ 36, Regex wie oben, kein Leerzeichen, eindeutig je Mandant und Personenkonto (OP-Schlüssel).

### 5.2 Versicherungsteuer: Sätze, Bemessungsgrundlage, Feuerschutzsteuer
- § 6 VersStG: Regelsatz 19 %; Feuer/Feuer-BU 22 %; Wohngebäude 19 %; Hausrat 19 % (lokal `law_versstg___6.txt`) [H].
- § 5 Abs. 1 S. 1 Nr. 3 VersStG: Bemessungsgrundlage nur **60 %** des Entgelts (Feuer), **86 %** (Wohngebäude), **85 %** (Hausrat) (lokal `law_versstg___5.txt`) [H].
- Effektive Versicherungsteuer auf den Nettobeitrag: Feuer 22 % × 60 % = **13,20 %**; Wohngebäude 19 % × 86 % = **16,34 %**; Hausrat 19 % × 85 % = **16,15 %**; alle anderen Sparten (Haftpflicht, Glas, Elementar als eigener Vertrag, Rechtsschutz) **19,00 %** [H, Rechnung].
- Feuerschutzsteuer (FeuerschStG): § 3 Abs. 1 Bemessungsgrundlage 40 % (Feuer), 14 % (Wohngebäude), 15 % (Hausrat) des Entgelts; § 4 Steuersatz 19 %, Feuerversicherung 22 %; § 4 Abs. 3 "Die Versicherungsteuer gehört nicht zum Versicherungsentgelt"; § 5 Abs. 1 "**Steuerschuldner ist der Versicherer**". Effektiv 8,80 % / 2,66 % / 2,85 % des Entgelts, vom Versicherer aus der Prämie abgeführt, **nicht** auf der Beitragsrechnung ausgewiesen. Quellen: https://www.gesetze-im-internet.de/feuerschstg_1979/__3.html , __4.html , __5.html [H]
- Pflichtangaben Beitragsrechnung § 5 Abs. 3 VersStG: Steuerbetrag offen, Steuersatz, Versicherungsteuernummer des BZSt; bei steuerfreien Entgelten die Befreiungsvorschrift [H].
- Prüfregel App: `versst_betrag ≈ netto × satz_effektiv` mit Toleranz 0,02 EUR; Sätze als Tabelle je Sparte: `{feuer: 0.132, wohngebaeude: 0.1634, hausrat: 0.1615, default: 0.19}`. Kombinierte Wohngebäudeverträge mit Elementar-Zuschlag können Mischsätze zeigen (Elementarbaustein 19 %), daher Warnung statt Fehler. Beide Reports korrigieren: 22 %/19 % sind Nominalsätze, 16,34 % ist der effektive Satz für Wohngebäude, "zzgl. Feuerschutzsteuer" ist auf der Rechnung falsch (Versicherer schuldet sie).

### 5.3 § 14 Abs. 4 UStG: zehn Nummern
Gesetzeswortlaut (lokal `law_ustg_1980___14.txt`, https://www.gesetze-im-internet.de/ustg_1980/__14.html) hat **zehn** Nummern: 1 Name/Anschrift, 2 StNr/USt-IdNr, 3 Ausstellungsdatum, 4 Rechnungsnummer, 5 Menge/Art, 6 Leistungszeitpunkt, 7 Entgelt nach Steuersätzen/Befreiungen + vereinbarte Minderungen, 8 Steuersatz und Steuerbetrag bzw. Befreiungshinweis, **9** Hinweis auf Aufbewahrungspflicht (§ 14b Abs. 1 S. 5, Grundstücksleistungen an Nichtunternehmer, 2 Jahre), **10** Angabe "Gutschrift" bei Ausstellung durch den Leistungsempfänger. Checkliste der App mit 10 Punkten; Nr. 9 und Nr. 10 sind bedingt (nur wenn Sachverhalt vorliegt). Domänen-Report 2.1 ("9 Nummern") wird korrigiert [H].

### 5.4 ZUGFeRD-Version (Stand 23.08.2026)
Beide vorhandenen Reports sind überholt:
- ZUGFeRD 2.3.3 / Factur-X 1.07.3: 07.05.2025 (gültig ab 15.05.2025).
- ZUGFeRD 2.4 / Factur-X 1.08: veröffentlicht 04.12.2025, "soll ab 15.01.2026 benutzt werden", CII D22B (rückwärtskompatibel D16B). https://www.ferd-net.de/en/downloads/publications/details/zugferd-24-english [H]
- **ZUGFeRD 2.5 / Factur-X 1.09**: veröffentlicht **10.06.2026** (ursprünglich 20.05.2026, in zwei Etappen), "sollte ab dem **01.07.2026** benutzt werden"; Codelisten/Validierungsartefakte auf EU-Stand, neue EXTENDED-Elemente (BT-215/216 Zahlungsmittel, BG-34 Zahlungen im Auftrag Dritter, negative Einzelpreise, Befreiungsgründe bei Zu-/Abschlägen, BT-160/161 0..1), Hinweis auf CII-Regel R74 "Document MUST not contain empty elements". Quellen: https://www.ferd-net.de/aktuelles-veranstaltungen/aktuelles/news/neue-zugferd-version-25-veroeffentlicht , https://www.ferd-net.de/publikationen-produkte/publikationen/detailseite/zugferd-25-deutsch [H]
- **ZUGFeRD 2.5.2 / Factur-X 1.09.2**: veröffentlicht **04.08.2026**, "ab dem **1. September 2026** gültig"; Korrekturen EXTENDED (BR-CO-27 → CII-SR-470, BT-151 Kardinalität 0..1, BR-FXEXT-Varianten, Rundung BR-FXEXT-08), CII D22B, rückwärtskompatibel D16B; 2.5 ist nicht mehr im Download. Quelle: https://www.ferd-net.de/publikationen-produkte/publikationen/detailseite/zugferd-252-deutsch [H]
- Für die App: Eingangserkennung muss 1.0, 2.0, 2.1–2.3, 2.4, 2.5, 2.5.2 akzeptieren (Profil-URNs unverändert `urn:factur-x.eu:1p0:...`, Dateiname `factur-x.xml`; XMP `fx:Version` bleibt nach bisherigen Quellen "1.0" [L, nicht aus 2.5.2-Paket verifiziert]). Ausgang: Generator-Bibliothek mit 2.5.2-Schematron validieren (Mustang ≥ Version mit 2.5.2-Support prüfen [L]). FeRD aktualisiert halbjährlich mit den EU-Codelisten (Ende 2026 nächste Runde erwartet) [M].

### 5.5 Mahngebühr gegenüber Verbrauchern: Default 0 EUR
- BGH 26.06.2019 VIII ZR 95/18: AGB-Mahnpauschale 2,50 EUR unwirksam (§ 309 Nr. 5a BGB), weil sie nicht ersatzfähige Personal-/Verwaltungskosten enthält; ersatzfähig nur Druck, Kuvert, Porto (im Fall **0,7643 EUR**); keine geltungserhaltende Reduktion. Quelle: https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=26.06.2019&Aktenzeichen=VIII%20ZR%2095%2F18 [H]
- WEG-Sonderfall (Haufe "Mahngebühr" WEMoG): Mahnung ist Grundleistung; eine **Sondervergütung** des Verwalters für Mahnungen ist nur wirksam, wenn im Verwaltervertrag vereinbart (BGH 05.07.2019 V ZR 278/17: Sondervergütungen ohne Obergrenze zulässig; AG Backnang 4 C 333/23 bejahend; AG Duisburg-Ruhrort 28 C 27/18 verneinend). Schuldner der Sondervergütung ist die **Gemeinschaft**; Belastung des säumigen Eigentümers nur per Beschluss über verursacherbezogene Kosten (§ 16 Abs. 2 S. 2 WEG). Quelle: https://www.haufe.de/recht/deutsches-anwalt-office-premium/mahngebuehr-wemog_idesk_PI17574_HI636838.html [M]
- Entscheidung: Konfigurationsschlüssel `mahngebuehr_verbraucher_default = 0,00 EUR`; optional "Materialkosten" ≤ 1,00 EUR (Porto Standardbrief 0,95 EUR) mit Nachweis; B2B: 40 EUR Pauschale § 288 Abs. 5 BGB; WEG: Sondervergütung des Verwalters wird der **WEG** (Objektkonto 6200) berechnet und nur bei entsprechendem Beschluss an den Eigentümer weiterbelastet (8600). Die Sonderleistungstabelle "Mahnung 10–45 EUR" im Domänen-Report ist ein Honorarposten des Verwalters gegenüber dem Auftraggeber, keine Mahngebühr gegenüber dem Schuldner.

### 5.6 Reverse Charge auf Reinigungs-/Bauleistungen: BU 94 nicht als Standard
- § 13b Abs. 5 S. 5 UStG (lokal `law_ustg_1980___13b.txt`): bei Gebäudereinigung (Abs. 2 Nr. 8) schuldet der Leistungsempfänger die Steuer nur, "wenn er ein Unternehmer ist, der nachhaltig entsprechende Leistungen erbringt; davon ist auszugehen, wenn ihm das zuständige Finanzamt eine ... auf längstens drei Jahre befristete Bescheinigung [USt 1 TG] ... erteilt hat". Identische Regel für Bauleistungen in S. 2. S. 8: bei übereinstimmender Annahme in Zweifelsfällen bleibt es dabei, "sofern dadurch keine Steuerausfälle entstehen" [H].
- UStAE 13b.3 Abs. 2: nachhaltig = mindestens 10 % des Weltumsatzes; Abs. 8: Bauträger und WEG (bei Weitergabe als § 4 Nr. 13-Leistung) sind nicht Steuerschuldner. https://www.steuerschroeder.de/steuergesetze/ustae/13b.3 [H]
- Entscheidung: Die Zeile "Reinigung 4250/6330 … Gebäudereiniger mit § 13b Abs. 2 Nr. 8: BU 94" in `datenformate-import-export.md` Abschnitt 2 wird so umformuliert: BU 94 **nur** wenn Mandanten-Flag `ust_1_tg_gueltig_bis >= belegdatum` (Bescheinigung USt 1 TG hinterlegt). Sonst: Netto-Rechnung mit § 13b-Hinweis → Prüfstatus "fehlerhafte Rechnung, Lieferant muss USt nachberechnen", kein Export. In der Objektbuchhaltung (WEG/Miete) nie BU 94.

---

## 6. Konkrete Änderungen an den bestehenden Notizdateien
1. `datenformate-import-export.md` 1.3/1.7: Belegfeld 1 = 36 bestätigt; Ergänzung "12 = Belegfeld 2 / Alt-KNE, 9 = PowerHaus-intern".
2. `datenformate-import-export.md` Abschnitt 2, Zeile Reinigung: "BU 94 nur mit USt 1 TG des Mandanten".
3. `datenformate-import-export.md` 6.2: Version → ZUGFeRD 2.5.2 / Factur-X 1.09.2 (gültig ab 01.09.2026), D22B.
4. `domaene_prozesse_hausverwaltung.md` 2.1: "10 Pflichtangaben"; 2.3: VersSt-Sätze effektiv 13,2/16,34/16,15/19 %, Feuerschutzsteuer nicht auf der Rechnung; Abschnitt 4: "Belegfeld 1 max. 36 (PowerHaus-Import 9)"; 2.11: Mahngebühr Default 0.
5. `rechtliche-pflichten-und-fristen.md` 1.7: Bemessungsanteile § 5 Abs. 1 Nr. 3 ergänzen; 2.7: 2.5/2.5.2 ergänzen.

---

## 7. Offene Punkte
- Kontenmapping-Vorlagen je Steuerberater: DATEV "Vermietung und Verpachtung"-Kontenplan (6-stellig, SKR03/04-basiert) ist nur mit DATEV-Login einsehbar; beim ersten Kunden vom Steuerberater als Kontenplan-Export (CSV) holen und als Mapping-Vorlage einspielen.
- Ob der Kunde WEG-Stapel überhaupt braucht (Option § 9, Feststellung § 180 AO) – beim Kunden klären; sonst WEG-Export deaktivieren.
- XMP `fx:Version` und Mustang-Support für ZUGFeRD 2.5.2 nicht aus dem Release-Paket verifiziert (FeRD-Download war nicht abrufbar).
- Kautionsbuchung: Variante Durchlaufposten (Immoware24) vs. Kautionskonto im Objekt hängt davon ab, ob das Kautionskonto auf den Mieter oder den Vermieter lautet; Datenmodell muss beides erlauben.
- Sammelkonto vs. Einzeldebitoren im DATEV-Ziel (PowerHaus-Option "Sammelkontonummer = 0 → Einzelbuchungen") als Mandanten-Schalter vorsehen; bei Sammelkonto geht die OP-Verwaltung in DATEV verloren (OP bleibt dann in der App).
- DuckDuckGo/Brave lieferten keine Primärquelle für einen "offiziellen" WEG-Kontenrahmen; VDIV/DDIV-Muster (kostenpflichtig) nicht geprüft.

## 8. Quellen (neu in dieser Nachrecherche)
- https://www.datev.de/web/de/steuerberatung/loesungen/rechnungswesen/buchfuehrung-erstellen/fachbeitrag-vermietung-und-verpachtung
- https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Kontenplan-Buchf%C3%BChrung-f%C3%BCr-Immobilien/td-p/50344
- https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Konten-im-Vermietungskontenrahmen/m-p/475034
- https://wissensplattform.apps.datev.de/help/document/9231364 (Dok. 9231364 "Erweiterung von Feldlängen", 06.08.2026)
- https://github.com/ledermann/datev (lib/datev/base/booking.rb)
- https://wiki.crem-solutions.de/Version.20.22.0/doku.php?id=schnittstellen:datev_schnittstelle:howto ; …?id=abrechnung:hausgeld_einzelabrechnung:start ; …?id=buchhaltung:konten:main ; …?id=buchhaltung:sachkontenstamm:parameter
- https://support.immoware24.de/hc/de/articles/360012000818 ; /16055462397341 ; /16890329608093 ; /29110819218461 ; /360013883998 ; /360018135937 ; https://www.immoware24.de/funktionen/datev/
- https://www.digisoft.de/Anleitung/HausgeldabrechnungWohngeldabrech.html
- http://update2.buhl-data.com/documents/Tutorials/Hausverwalter/2016/10_Extra_R%C3%BCcklagenhandling.pdf
- https://www.haussoft.de/hausverwaltungssoftwarefunktion/datev-anbindung/
- https://onlinebilanz.de/buchhaltung-hausverwaltung/
- https://www.haufe.de/id/beitrag/erhaltungsruecklage-7-hausgeld-minderzahlungen-wie-ist-zu-verbuchen-HI14945431.html
- https://www.haufe.de/recht/deutsches-anwalt-office-premium/mahngebuehr-wemog_idesk_PI17574_HI636838.html
- https://www.dittmann-wohnungsverwalter.de/recht-urteile/urteile-wohnungseigentumsrecht/die-erhaltungsruecklage-kann-auch-auf-dem-laufenden-verwaltungskonto-der-weg-gesammelt-verbucht-werden-kein-sep-bankkonto-erforderlich/
- https://easimo.de/instandhaltungsruecklage-in-der-weg/ ; https://www.hausverwalter-vermittlung.de/blog/weg-verwalter-instandhaltungsruecklage-beachten/
- https://vdiv.de/aktuelles/praxistipps-details/steuerliche-pflichten-des-verwalters-als-organ-der-weg
- https://steuerrecht.com/wp-content/uploads/2026/04/Die-Gemeinschaft-der-Wohnungseigentuemer-WEG.pdf
- https://www.gesetze-im-internet.de/feuerschstg_1979/__3.html ; __4.html ; __5.html ; https://www.gesetze-im-internet.de/versstg/__5.html ; __6.html ; https://www.gesetze-im-internet.de/bgb/__551.html ; https://www.gesetze-im-internet.de/ustg_1980/__13b.html ; __14.html
- https://www.steuerschroeder.de/steuergesetze/ustae/13b.3
- https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=26.06.2019&Aktenzeichen=VIII%20ZR%2095%2F18
- https://www.ferd-net.de/aktuelles-veranstaltungen/aktuelles/news/neue-zugferd-version-25-veroeffentlicht ; https://www.ferd-net.de/publikationen-produkte/publikationen/detailseite/zugferd-25-deutsch ; https://www.ferd-net.de/publikationen-produkte/publikationen/detailseite/zugferd-252-deutsch ; https://www.ferd-net.de/en/downloads/publications/details/zugferd-24-english ; https://www.presse-control.de/2026/08/18/zugferd-2-5-und-factur-x-1-09-verzgert-neuer-zeitplan-in-zwei-etappen/
- lokal: `powerhaus_datev.txt` (Aareon PowerHaus DATEV-Schnittstelle, Stand 09/2025)
