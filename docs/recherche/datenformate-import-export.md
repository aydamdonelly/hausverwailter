# Technische Datenformate für Import und Export (Hausverwaltungs-App)

Stand der Recherche: 23.08.2026. Rohmaterial (PDF-Texte) liegt im selben Ordner:
`anlage3.txt` (DK Anlage 3 V26.11, gültig ab 15.11.2026), `anlage3_v38.txt` (DK Anlage 3 V3.8, enthält noch MT940-Kapitel 8.2),
`xrechnung302.txt` (KoSIT Spezifikation XRechnung 3.0.2), `skr.txt` (EduMedia-Kontenrahmen SKR03/SKR04 Stand 01/2024),
`mt940.txt` (Omikron/MultiCash MT940-Datenstruktur), `camt053_chapter.txt` (Kapitel 7.1 aus Anlage 3 V26.11).

Konfidenz-Legende: **[H]** Primärquelle/mehrfach belegt, **[M]** eine belastbare Sekundärquelle, **[L]** unsicher/veraltet/abgeleitet.

---

## 1. DATEV-Format Buchungsstapel (EXTF, Version 700)

### 1.1 Dateiaufbau
- Zeile 1: Header (31 Felder, Semikolon-getrennt). Zeile 2: Spaltenüberschriften (125 Spalten). Ab Zeile 3: eine Buchung pro Zeile. **[H]**
  Quellen: https://github.com/ledermann/datev/blob/master/examples/EXTF_Buchungsstapel.csv ,
  https://github.com/ledermann/datev/blob/master/lib/datev/base/header.rb , https://github.com/ledermann/datev/blob/master/lib/datev/base/booking.rb ,
  https://docs101.com/help/de/concepts/datev-format , https://investmentgarage.de/datev-buchungsstapel-erzeugen-mit-r/ ,
  offizielle Beschreibung (JS-App, per WebFetch nicht lesbar): https://developer.datev.de/de/file-format/details/datev-format/format-description/booking-batch und
  https://developer.datev.de/de/file-format/details/datev-format/format-description/header , DATEV Hilfe-Dok. 1036228: https://wissensplattform.apps.datev.de/help/document/1036228
- Trennzeichen `;`, Textfelder in doppelten Anführungszeichen `"..."`, Zahlen ohne Anführungszeichen, Zeilenende CRLF. **[H]** (docs101, ledermann-Beispiel)
- Zeichensatz: **ANSI / Windows-1252 (CP1252)**, kein UTF-8-BOM. UTF-8 ist laut DATEV-Community nur für Debitoren-/Kreditoren-Stammdaten (Name/Adresse) zugelassen. **[H]**
  Quellen: https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/UTF-8-Format-bei-Stapelverarbeitung/td-p/45095 ,
  https://support.magicline.com/hc/de/articles/4556480912401-Aufbau-der-DATEV-Exportdatei , https://hilfe.shopsoftware.com/o13/datev-format/
- Dateiname: Konvention `EXTF_<beliebig>.csv` (DATEV-Import erkennt die Datei am Header, nicht am Namen). **[M]**

### 1.2 Header-Zeile (Positionen 1–31) **[H]** (ledermann header.rb + access-im-unternehmen + investmentgarage)

| Pos | Feld | Typ/Länge | Pflicht | Inhalt |
|---|---|---|---|---|
| 1 | DATEV-Format-KZ | Text 4 | ja | `"EXTF"` (Datei von Fremdprogramm erzeugt; `"DTVF"` = von DATEV exportiert) |
| 2 | Versionsnummer | Zahl 3 | ja | `700` (Header-Version des DATEV-Formats 7.x) |
| 3 | Datenkategorie | Zahl 2 | ja | `21` = Buchungsstapel (16 = Debitoren/Kreditoren, 20 = Kontenbeschriftungen, 46 = Zahlungsbedingungen, 48 = Diverse Adressen, 65 = Wiederkehrende Buchungen) |
| 4 | Formatname | Text | ja | `"Buchungsstapel"` |
| 5 | Formatversion | Zahl 3 | ja | `13` (aktuelle Formatversion Buchungsstapel; ältere Dateien mit `12` bzw. `7` werden ebenfalls importiert) **[M]** |
| 6 | Erzeugt am | Zahl 17 | ja | Zeitstempel `JJJJMMTThhmmssfff`, z. B. `20260823143000000` |
| 7 | Importiert | Datum | nein | leer lassen (wird von DATEV gefüllt) |
| 8 | Herkunft | Text 2 | nein | Kürzel des erzeugenden Systems, z. B. `"RE"`, `"SV"`; frei wählbar/leer |
| 9 | Exportiert von | Text 25 | nein | Benutzername |
| 10 | Importiert von | Text 10 | nein | leer |
| 11 | Beraternummer | Zahl 7 | ja | 1001–9999999 |
| 12 | Mandantennummer | Zahl 5 | ja | 1–99999 |
| 13 | WJ-Beginn | Zahl 8 | ja | Wirtschaftsjahresbeginn `JJJJMMTT`, z. B. `20260101` |
| 14 | Sachkontenlänge | Zahl 1 | ja | 4–8 (Standard 4; Personenkonten sind eine Stelle länger) |
| 15 | Datum vom | Zahl 8 | ja | Stapelbeginn `JJJJMMTT` |
| 16 | Datum bis | Zahl 8 | ja | Stapelende `JJJJMMTT` (alle Belegdaten müssen in [vom, bis] und im WJ liegen) |
| 17 | Bezeichnung | Text 30 | nein | Stapelname, z. B. `"Rechnungsausgang 08/2026"` |
| 18 | Diktatkürzel | Text 2 | nein | z. B. `"AM"` |
| 19 | Buchungstyp | Zahl 1 | nein | `1` = Finanzbuchführung (Standard), `2` = Jahresabschluss |
| 20 | Rechnungslegungszweck | Zahl 2 | nein | leer/`0` = unabhängig; 30 Steuerrecht, 40 Kalkulatorik, 50 Handelsrecht, 64 IFRS **[M]** |
| 21 | Festschreibung | 0/1 | nein | `0` = Stapel bleibt bearbeitbar (empfohlen für Vorschlag), `1` = Buchungen werden bei Import festgeschrieben (GoBD) |
| 22 | WKZ | Text 3 | nein | `"EUR"` |
| 23 | reserviert | | | leer |
| 24 | Derivatskennzeichen | | | leer |
| 25 | reserviert | | | leer |
| 26 | reserviert | | | leer |
| 27 | SKR | Text | nein | `"03"` oder `"04"` |
| 28 | Branchenlösung-Id | Zahl | nein | leer |
| 29 | reserviert | | | leer |
| 30 | reserviert | | | leer |
| 31 | Anwendungsinformation | Text 16 | nein | leer |

Beispiel-Header (ledermann/datev, verifiziert):
```
"EXTF";700;21;"Buchungsstapel";13;20180306102500000;;"XY";"Chief Accounting Officer";;1001;456;20180101;4;20180201;20180228;"Beispiel-Buchungen";;1;;0;"EUR";;;;;;;;;
```
Beispiel-Header (access-im-unternehmen.de, Formatversion 12, SKR 03):
```
"EXTF";700;21;Buchungsstapel;12;20211206000000000;;;;;1234567;12345;20210101;4;20211101;20211130;Export 11/2021;AM;1;0;1;EUR;;;;;03;;;;
```

### 1.3 Spalten der Buchungszeilen (1–125) **[H]** (ledermann booking.rb, identisch mit DATEV-Spaltenüberschriften der Beispieldatei)

| Nr | Spaltenname (exakt, Zeile 2) | Typ/Länge | Pflicht | Bemerkung |
|---|---|---|---|---|
| 1 | Umsatz (ohne Soll/Haben-Kz) | Dezimal 12,2 | ja | immer positiv, Komma als Dezimaltrenner, keine Tausenderpunkte, max. 2 Nachkommastellen, z. B. `1190,00` |
| 2 | Soll/Haben-Kennzeichen | Text 1 | ja | `"S"` oder `"H"` (bezieht sich auf das Konto in Spalte 7) |
| 3 | WKZ Umsatz | Text 3 | nein | `"EUR"` oder leer (leer = Header-WKZ) |
| 4 | Kurs | Dezimal 10,6 | nein | nur bei Fremdwährung |
| 5 | Basisumsatz | Dezimal 12,2 | nein | Umsatz in Basiswährung bei Fremdwährung |
| 6 | WKZ Basisumsatz | Text 3 | nein | |
| 7 | Konto | Zahl bis 9 | ja | Sach- oder Personenkonto |
| 8 | Gegenkonto (ohne BU-Schlüssel) | Zahl bis 9 | ja | Gegenkonto ohne vorangestellten BU-Schlüssel |
| 9 | BU-Schlüssel | Text 4 | nein | Steuerschlüssel, siehe 1.5; leer bei Automatikkonten |
| 10 | Belegdatum | Zahl 4 | ja | **`TTMM`** ohne Jahr (Jahr kommt aus Header Datum vom/bis), z. B. `2308` = 23.08. |
| 11 | Belegfeld 1 | Text 36 | nein | Rechnungs-/Belegnummer; erlaubte Zeichen: Ziffern, Buchstaben, `$ & % * + - /` (kein Leerzeichen am Ende); Pflicht für OPOS bei Personenkonten |
| 12 | Belegfeld 2 | Text 12 | nein | oft Fälligkeit als `TTMMJJ` oder zweite Belegnummer |
| 13 | Skonto | Dezimal 10,2 | nein | Skontobetrag |
| 14 | Buchungstext | Text 60 | nein | |
| 15 | Postensperre | 0/1 | nein | Mahn-/Zahlsperre |
| 16 | Diverse Adressnummer | Text 9 | nein | |
| 17 | Geschäftspartnerbank | Zahl 3 | nein | |
| 18 | Sachverhalt | Zahl 2 | nein | z. B. 31 = Mahnzins, 40 = Mahngebühr |
| 19 | Zinssperre | 0/1 | nein | |
| 20 | Beleglink | Text 210 | nein | Verweis auf Beleg z. B. `"BEDI ""<GUID>"""` (DATEV Unternehmen online) |
| 21–36 | Beleginfo – Art 1 … Beleginfo – Inhalt 8 | Text 20 / 210 | nein | 8 Paare |
| 37 | KOST1 – Kostenstelle | Text 36 | nein | z. B. Objekt/Liegenschaft |
| 38 | KOST2 – Kostenstelle | Text 36 | nein | z. B. Kostenträger/Wohneinheit |
| 39 | Kost Menge | Dezimal 11,2 | nein | |
| 40 | EU-Land u. USt-IdNr. | Text 15 | nein | z. B. `"DE123456789"` |
| 41 | EU-Steuersatz | Dezimal 4,2 | nein | |
| 42 | Abw. Versteuerungsart | Text 1 | nein | I = Ist, K = keine, P = Pauschal, S = Soll |
| 43 | Sachverhalt L+L | Zahl 3 | nein | §13b-Sachverhalt (z. B. 11 Bauleistungen) |
| 44 | Funktionsergänzung L+L | Zahl 3 | nein | |
| 45 | BU 49 Hauptfunktionstyp | Zahl 1 | nein | |
| 46 | BU 49 Hauptfunktionsnummer | Zahl 2 | nein | |
| 47 | BU 49 Funktionsergänzung | Zahl 3 | nein | |
| 48–87 | Zusatzinformation – Art 1 … Zusatzinformation – Inhalt 20 | Text 20 / 210 | nein | 20 Paare |
| 88 | Stück | Zahl 8 | nein | |
| 89 | Gewicht | Dezimal 10,2 | nein | |
| 90 | Zahlweise | Zahl 2 | nein | 1 Lastschrift, 2 Mahnung, 3 Zahlung |
| 91 | Forderungsart | Text 10 | nein | |
| 92 | Veranlagungsjahr | JJJJ | nein | |
| 93 | Zugeordnete Fälligkeit | TTMMJJJJ | nein | |
| 94 | Skontotyp | Zahl 1 | nein | |
| 95 | Auftragsnummer | Text 30 | nein | |
| 96 | Buchungstyp | Text 2 | nein | AA, AG, AV, SR, SU, SG, SO |
| 97 | USt-Schlüssel (Anzahlungen) | Zahl 2 | nein | |
| 98 | EU-Mitgliedstaat (Anzahlungen) | Text 2 | nein | |
| 99 | Sachverhalt L+L (Anzahlungen) | Zahl 3 | nein | |
| 100 | EU-Steuersatz (Anzahlungen) | Dezimal 4,2 | nein | |
| 101 | Erlöskonto (Anzahlungen) | Zahl 9 | nein | |
| 102 | Herkunft-Kz | Text 2 | nein | |
| 103 | Leerfeld | Text 36 | nein | |
| 104 | KOST-Datum | TTMMJJJJ | nein | |
| 105 | SEPA-Mandatsreferenz | Text 35 | nein | |
| 106 | Skontosperre | 0/1 | nein | |
| 107 | Gesellschaftername | Text 76 | nein | |
| 108 | Beteiligtennummer | Zahl 4 | nein | |
| 109 | Identifikationsnummer | Text 11 | nein | |
| 110 | Zeichnernummer | Text 20 | nein | |
| 111 | Postensperre bis | TTMMJJJJ | nein | |
| 112 | Bezeichnung | Text 30 | nein | |
| 113 | Kennzeichen | Zahl 2 | nein | |
| 114 | Festschreibung | 0/1 | nein | pro Zeile |
| 115 | Leistungsdatum | TTMMJJJJ | nein | |
| 116 | Datum Zuord. | TTMMJJJJ | nein | Datum Zuordnung Steuerperiode |
| 117 | Fälligkeit | TTMMJJJJ | nein | |
| 118 | Generalumkehr | Text 1 | nein | `0`/`1` |
| 119 | Steuersatz | Dezimal 4,2 | nein | |
| 120 | Land | Text 2 | nein | |
| 121 | Abrechnungsreferent | Text 50 | nein | |
| 122 | BVV-Position | Zahl 1 | nein | |
| 123 | EU-Mitgliedstaat u. UStID (Ursprung) | Text 15 | nein | |
| 124 | EU-Steuersatz (Ursprung) | Dezimal 4,2 | nein | |
| 125 | Abw. Skontokonto | Zahl 8 | nein | |

Exakte Spaltenüberschriftenzeile (Zeile 2, aus ledermann/datev, entspricht DATEV-Export):
```
Umsatz (ohne Soll/Haben-Kz);Soll/Haben-Kennzeichen;WKZ Umsatz;Kurs;Basisumsatz;WKZ Basisumsatz;Konto;Gegenkonto (ohne BU-Schlüssel);BU-Schlüssel;Belegdatum;Belegfeld 1;Belegfeld 2;Skonto;Buchungstext;Postensperre;Diverse Adressnummer;Geschäftspartnerbank;Sachverhalt;Zinssperre;Beleglink;Beleginfo – Art 1;Beleginfo – Inhalt 1;Beleginfo – Art 2;Beleginfo – Inhalt 2;Beleginfo – Art 3;Beleginfo – Inhalt 3;Beleginfo – Art 4;Beleginfo – Inhalt 4;Beleginfo – Art 5;Beleginfo – Inhalt 5;Beleginfo – Art 6;Beleginfo – Inhalt 6;Beleginfo – Art 7;Beleginfo – Inhalt 7;Beleginfo – Art 8;Beleginfo – Inhalt 8;KOST1 – Kostenstelle;KOST2 – Kostenstelle;Kost Menge;EU-Land u. USt-IdNr.;EU-Steuersatz;Abw. Versteuerungsart;Sachverhalt L+L;Funktionsergänzung L+L;BU 49 Hauptfunktionstyp;BU 49 Hauptfunktionsnummer;BU 49 Funktionsergänzung;Zusatzinformation – Art 1;Zusatzinformation – Inhalt 1;Zusatzinformation – Art 2;Zusatzinformation – Inhalt 2;Zusatzinformation – Art 3;Zusatzinformation – Inhalt 3;Zusatzinformation – Art 4;Zusatzinformation – Inhalt 4;Zusatzinformation – Art 5;Zusatzinformation – Inhalt 5;Zusatzinformation – Art 6;Zusatzinformation – Inhalt 6;Zusatzinformation – Art 7;Zusatzinformation – Inhalt 7;Zusatzinformation – Art 8;Zusatzinformation – Inhalt 8;Zusatzinformation – Art 9;Zusatzinformation – Inhalt 9;Zusatzinformation – Art 10;Zusatzinformation – Inhalt 10;Zusatzinformation – Art 11;Zusatzinformation – Inhalt 11;Zusatzinformation – Art 12;Zusatzinformation – Inhalt 12;Zusatzinformation – Art 13;Zusatzinformation – Inhalt 13;Zusatzinformation – Art 14;Zusatzinformation – Inhalt 14;Zusatzinformation – Art 15;Zusatzinformation – Inhalt 15;Zusatzinformation – Art 16;Zusatzinformation – Inhalt 16;Zusatzinformation – Art 17;Zusatzinformation – Inhalt 17;Zusatzinformation – Art 18;Zusatzinformation – Inhalt 18;Zusatzinformation – Art 19;Zusatzinformation – Inhalt 19;Zusatzinformation – Art 20;Zusatzinformation – Inhalt 20;Stück;Gewicht;Zahlweise;Forderungsart;Veranlagungsjahr;Zugeordnete Fälligkeit;Skontotyp;Auftragsnummer;Buchungstyp;USt-Schlüssel (Anzahlungen);EU-Mitgliedstaat (Anzahlungen);Sachverhalt L+L (Anzahlungen);EU-Steuersatz (Anzahlungen);Erlöskonto (Anzahlungen);Herkunft-Kz;Leerfeld;KOST-Datum;SEPA-Mandatsreferenz;Skontosperre;Gesellschaftername;Beteiligtennummer;Identifikationsnummer;Zeichnernummer;Postensperre bis;Bezeichnung;Kennzeichen;Festschreibung;Leistungsdatum;Datum Zuord.;Fälligkeit;Generalumkehr;Steuersatz;Land;Abrechnungsreferent;BVV-Position;EU-Mitgliedstaat u. UStID (Ursprung);EU-Steuersatz (Ursprung);Abw. Skontokonto
```
(Hinweis: das Zeichen zwischen "Beleginfo" und "Art" ist ein Gedankenstrich U+2013, in Windows-1252 = Byte 0x96.)

### 1.4 Minimal importierbarer Satz **[H]**
Pflicht: Spalte 1 Umsatz, 2 S/H, 7 Konto, 8 Gegenkonto, 10 Belegdatum. Praktisch immer mitgeben: 9 BU-Schlüssel (außer Automatikkonto), 11 Belegfeld 1 (Rechnungsnummer; Pflicht für OPOS-Buchungen auf Debitor/Kreditor), 14 Buchungstext, 37/38 KOST1/KOST2, 105 SEPA-Mandatsreferenz bei Lastschrift-Mietern, 115 Leistungsdatum.
Alle übrigen 125 Spalten müssen als leere Felder (`;`) vorhanden sein; DATEV akzeptiert auch kürzere Zeilen, aber das vollständige Raster ist am robustesten.

Beispielzeilen (ledermann/datev, verifiziert):
```
24,95;"H";;;;;1200;4940;"8";2102;;;;"Fachbuch: Controlling für Dummies";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
5950,00;"S";;;;;10000;8400;;2202;"RE201802-135";;;"Honorar FiBu-Seminar";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
```
Lesart Zeile 2: 5.950,00 EUR Soll auf Debitor 10000, Gegenkonto 8400 (Erlöse 19 %, Automatikkonto → kein BU), Beleg 22.02., Rechnungsnr. RE201802-135.

Beispiele für die Hausverwaltung (SKR03, Sachkontenlänge 4, Buchung Bruttobetrag):
```
1190,00;"S";"EUR";;;;10001;8400;;1508;"AR-2026-0117";;;"Hausmeisterservice August Objekt Musterstr. 1";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
595,00;"H";"EUR";;;;70012;4260;"9";1208;"ER-4711";;;"Reparatur Haustür";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
1190,00;"H";"EUR";;;;10001;1200;;2008;"AR-2026-0117";;;"Zahlungseingang";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
```
(Zeile 2: Kreditor 70012 im Haben, Gegenkonto 4260 mit BU 9 → DATEV rechnet 19 % Vorsteuer automatisch heraus. Zeile 3: Bank 1200 gegen Debitor 10001.)

### 1.5 BU-Schlüssel (Steuerschlüssel) **[M]**
Quellen: https://epago.de/lexikon/steuern/datev-buchungsschluessel-guide/ , https://docs.reybex.com/kb/datev-bu-schluessel-steuerschluessel/ ,
https://belegmeister.de/blog/2022/06/15/steuerschluessel/ , offizielle Tabelle (JS-App): https://wissensplattform.apps.datev.de/help/document/1008613 ,
DATEV-Community Reverse-Charge: https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Steuerschl%C3%BCssel-DATEV-19-oder-94-bei-reverse-charge/td-p/154778

| BU | Bedeutung |
|---|---|
| (leer) | keine Steuer bzw. Automatikkonto (das Konto kennt seinen Steuersatz selbst, z. B. 8400/4400 = 19 % USt, 3106/5906 = 19 % VSt) |
| 1 | umsatzsteuerfrei mit Vorsteuerabzug (§ 4 Nr. 2–7 UStG, nicht EU) |
| 2 | Umsatzsteuer 7 % |
| 3 | Umsatzsteuer 19 % |
| 5 | Umsatzsteuer 16 % (Corona-Zeitraum 07–12/2020) |
| 7 | Vorsteuer 16 % |
| 8 | Vorsteuer 7 % |
| 9 | Vorsteuer 19 % |
| 10 | nicht steuerbare Lieferung EU |
| 11 | steuerfreie innergemeinschaftliche Lieferung mit USt-IdNr. (§ 4 Nr. 1b UStG) |
| 12–15 | ig. Lieferungen ohne USt-IdNr. (versch. Sätze) |
| 18 | steuerpflichtiger ig. Erwerb § 1a UStG 7 % |
| 19 | steuerpflichtiger ig. Erwerb § 1a UStG 19 % |
| 40 | Aufhebung der Automatik (bucht ohne Steuer auf ein Automatikkonto) |
| 91 | erhaltene Leistung § 13b UStG, alle Steuertatbestände, 7 % (mit VSt-Abzug) |
| 92 | wie 91, ohne Vorsteuerabzug |
| 94 | erhaltene Leistung § 13b UStG (Reverse Charge, z. B. Bauleistungen § 13b Abs. 2 Nr. 4, Gebäudereinigung Nr. 8), 19 % mit VSt-Abzug |
| 95 | wie 94, ohne Vorsteuerabzug |
| 2x | Generalumkehr: eine `2` vor den Schlüssel (20 = GU ohne Steuer, 23 = GU USt 19 %, 29 = GU VSt 19 %) — alternativ Spalte 118 Generalumkehr = 1 |

Regeln: BU nur auf Konten ohne Automatikfunktion (sonst Import-Fehler "Steuerschlüssel bei Automatikkonto nicht zulässig"); bei Steuer-BU immer **Bruttobetrag** buchen; für Reverse-Charge (Handwerker mit § 13b, z. B. Bauleistung an bauleistenden Unternehmer) BU 94 auf Konto 3120/3123 (SKR03) bzw. 5920/5923 (SKR04) oder Aufwandskonto, Sachverhalt L+L (Spalte 43) = 11 (Bauleistungen) bzw. Tabelle DATEV Dok. 1003613.

Steuerfrei (Vermietung § 4 Nr. 12 UStG): Automatikkonto 8100/4100 (steuerfreie Umsätze § 4 Nr. 8 ff.) bzw. 2751/4861 (Erlöse Vermietung USt-frei) ohne BU.

### 1.6 Kontonummernkreise **[H]**
- Sachkontenlänge Standard 4 (Header Pos. 14), erweiterbar bis 8.
- Debitoren 10000–69999, Kreditoren 70000–99999 bei 4-stelligen Sachkonten (Personenkonten = Sachkontenlänge + 1). Bei Sachkontenlänge 5 → Personenkonten 6-stellig (100000–699999 / 700000–999999); DATEV hängt beim Verlängern rechts eine 0 an.
  Quellen: https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Debitoren-Kreditorennummern-erweitern/td-p/95657 , https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Konten-Nummernbereich-ändern/td-p/86033 , SKR03-PDF (EduMedia): "Debitorenkonten 10000–69999, Kreditorenkonten 70000–99999".
- Empfehlung App: Debitor = Mieter/Eigentümer/Kunde (10000+), Kreditor = Handwerker/Versorger (70000+); Nummern im Kundenstamm frei belegbar, aber pro Mandant eindeutig.

### 1.7 Weitere Import-Regeln **[M]**
- Belegdatum muss innerhalb Datum vom/bis (Header 15/16) liegen, sonst Import-Fehler.
- Umsatz > 0; Stornos über S/H-Tausch oder Generalumkehr.
- Belegfeld 1 max. 36 Zeichen, Sonderzeichen außer `$&%*+-/` vermeiden; Buchungstext max. 60 Zeichen (Umlaute in CP1252 kodieren).
- KOST1/KOST2 müssen als Kostenstellen im Mandanten existieren (sonst Warnung).
- Festschreibung=1 nur setzen, wenn der Kunde explizit GoBD-festschreiben will; für "Vorschlagsstapel" 0.

---

## 2. SKR03 / SKR04 Kontenzuordnung für Hausverwaltung / Gebäudedienstleister **[H]**
Quelle: EduMedia-Kontenrahmen basierend auf DATEV SKR03/SKR04, Stand 01/2024: https://cdn.prod.website-files.com/65f81479247b425fc6342b7f/667ed3736d56e8de92f7d69d_SKR03_SKR04.pdf (lokal: `skr.txt`), Haufe: https://www.haufe.de/id/beitrag/reparaturaufwendungen-1-so-kontieren-sie-richtig-HI2390673.html .
AV = Automatikkonto Vorsteuer, AM = Automatikkonto Umsatzsteuer (kein BU-Schlüssel angeben).

| Kostenart / Vorgang | SKR03 | SKR04 | Automatik | Bemerkung |
|---|---|---|---|---|
| Erlöse 19 % USt (Verwaltergebühr, Hausmeister-/Reinigungsleistung gegenüber Unternehmern) | 8400 Erlöse 19 % USt | 4400 Erlöse 19 % USt | AM | Gegenkonto Debitor |
| Erlöse weiterberechnete Nebenkosten 19 % | 8401* | 4401* | AM | (*individuell im EduMedia-Rahmen) |
| Erlöse 7 % USt | 8300 | 4300 | AM | selten |
| Erlöse aus Vermietung/Verpachtung USt-frei (§ 4 Nr. 12 UStG) | 2751 (bzw. 8100 Steuerfreie Umsätze § 4 Nr. 8 ff.) | 4861 (bzw. 4100) | AM bei 8100/4100 | Mieteinnahmen bei Eigenbestand |
| Erlöse Vermietung 19 % (Option § 9 UStG, Gewerbe) | 2752 | 4862 | AM | |
| Erlöse aus Leistungen § 13b UStG (Reverse Charge an bauleistende Unternehmer) | 8337 | 4337 | AM | |
| Steuerfreie sonstige Umsätze (z. B. § 4 Nr. 27) | 8150 | 4150 (analog) | AM | |
| Erlöse Kleinunternehmer § 19 | 8195 | 4185 | | |
| Fremdleistungen 19 % VSt (Subunternehmer) | 3106 Fremdleistungen 19 % VorSt (bzw. 4909 Fremdleistungen/Fremdarbeiten) | 5906 (bzw. 6303) | AV bei 3106/5906 | 4909/6303 ohne Automatik → BU 9 |
| Bauleistungen § 13b UStG erhalten (mit VSt-Abzug) | 3120 Bauleistungen eines im Inland ansässigen Unternehmers 19 % VSt/19 % USt | 5920 | AV/AM | alternativ 3160/5960 Leistungen § 13b mit VSt-Abzug |
| Instandhaltung betrieblicher Räume / Reparaturen Gebäude | 4260 | 6335 | nein → BU 9 | Haufe: Instandhaltung betrieblich genutzter Gebäude |
| Sonstige Reparaturen und Instandhaltung (Aufzug, Heizungsanlage als techn. Anlage) | 4800 Reparaturen u. Instandhaltung techn. Anlagen u. Maschinen / 4809 Sonstige Rep. | 6460 / 6490 | nein → BU 9 | Aufzugswartung: 4800/6460 oder 4260/6335 (Wahl des StB) |
| Wartungskosten (Verträge) | 4809 Sonstige Reparaturen/Instandhaltung (bzw. 4806 nur Hard-/Software) | 6490 | nein → BU 9 | |
| Grundstücksaufwendungen betrieblich (Grundsteuer, Straßenreinigung, Winterdienst) | 4290 | 6350 | nein | Grundsteuer ohne VSt |
| Sonstige Grundstücksaufwendungen (neutral) | 2350 | 6352 | nein | |
| Heizung | 4230 | 6320 | nein → BU 9 (Gas/Öl/Fernwärme 19 %) | |
| Strom, Gas, Wasser | 4240 | 6325 | nein → BU 9 (Wasser 7 %: BU 8) | |
| Reinigung | 4250 | 6330 | nein → BU 9 | Gebäudereiniger mit § 13b Abs. 2 Nr. 8: BU 94 |
| Gartenpflege | 4250/4260/4280 Sonstige Raumkosten (keine eigene Kontovorgabe) | 6345 | nein → BU 9 | Empfehlung: 4280/6345 oder Unterkonto 4285 |
| Hausmeister (extern) | 4909 Fremdleistungen bzw. 4280 | 6303 bzw. 6345 | nein → BU 9 | Hausmeister angestellt: 4110/6020 Gehälter |
| Versicherungen (Gebäude, Haftpflicht) | 4360 | 6400 | nein | versicherungsteuerpflichtig, keine VSt |
| Beiträge (Verbände, IHK) | 4380 | 6420 | nein | |
| Abfallbeseitigung / Müll | 4969 Aufwendungen für Abraum und Abfallbeseitigung | 6859 | nein → BU 9 | kommunale Gebühren ohne VSt |
| Bankgebühren | 4970 Nebenkosten des Geldverkehrs | 6855 | nein | USt-frei |
| Miete (unbewegliche WG) | 4210 | 6310 | nein | |
| Sonstige Raumkosten | 4280 | 6345 | nein | |
| Porto / Telefon / Bürobedarf | 4910 / 4920 / 4930 | 6800 / 6805 / 6815 | nein → BU 9 (Porto ohne) | |
| Rechts- und Beratungskosten / Abschluss- und Prüfungskosten | 4950 / 4957 | 6825 / 6827 | nein → BU 9 | |
| Sonstige betriebliche Aufwendungen | 4900 | 6300 | nein | |
| Vorsteuer 19 % / 7 % | 1576 / 1571 | 1406 / 1401 | (Steuerkonten) | vom Automatik/BU bebucht |
| Vorsteuer § 13b UStG 19 % | 1577 | 1407 | | |
| Umsatzsteuer 19 % / 7 % | 1776 / 1771 | 3806 / 3801 | | |
| Umsatzsteuer § 13b UStG 19 % | 1787 | 3837 | | |
| USt-Vorauszahlungen | 1780 | 3820 | | |
| Bank / Kasse | 1200 / 1000 | 1800 / 1600 | | zweites Bankkonto 1210…/1810… |
| Geldtransit | 1360 | 1460 | | |
| Forderungen aus L+L (Sammelkonto Debitoren) | 1400 | 1200 | | Debitoren 10000–69999 |
| Verbindlichkeiten aus L+L (Sammelkonto Kreditoren) | 1600 | 3300 | | Kreditoren 70000–99999 |
| Kautionen (erhalten) | 1525 (Kautionen gezahlt) / 1700 Sonstige Verbindlichkeiten | 3500 | | WEG/Mietkautionen getrennt führen |
| Durchlaufende Posten (Fremdgeld der WEG/Eigentümer) | 1590 | 1370 | | für Treuhandkonten der Verwaltung |

Hinweis: Für WEG-/Mietverwaltung im Auftrag (Fremdvermögen) gibt es keinen SKR03/04-Standard; hier arbeiten Verwalterprogramme mit eigenem Objektkontenrahmen. Die obige Tabelle betrifft die eigene Buchhaltung des Verwalters/Dienstleisters (Verwaltergebühren, Fremdleistungen). Konten 4260/6335 gelten für betrieblich genutzte Räume; bei Eigenbestand (Vermietungsobjekt der Firma) ebenfalls 4260/6335 bzw. 4800/6460.

---

## 3. Bank-Exportformate

### 3.1 Übersicht CSV je Bank
Allgemein: deutsche Banken → `;`-getrennt, Betrag `1.234,56` bzw. `-53,94` (Komma-Dezimal, teils Tausenderpunkt), Datum `TT.MM.JJJJ` (Sparkasse alt `TT.MM.JJ`), Encoding ISO-8859-1/CP1252 (Sparkasse, ING alt, comdirect, HVB) oder UTF-8 mit BOM (DKB neu, Commerzbank, VR/agree21, Postbank/Deutsche Bank neu). Neobanken (N26, Qonto, Finom, Vivid) → `,`-getrennt, Punkt-Dezimal, ISO-Datum, UTF-8.
Parser-Strategie: (1) BOM entfernen, (2) Encoding-Sniffing (UTF-8 valid? sonst CP1252), (3) Kopf-/Vorspannzeilen überspringen bis eine Zeile mit bekannter Spaltensignatur beginnt (`"Buchungstag`, `Buchung;`, `Auftragskonto`, `Bezeichnung Auftragskonto`, `"Booking Date"`, `Buchungsdatum`), (4) Signatur → Bankprofil, (5) Betrag normalisieren (Regex: entferne `EUR`, Tausenderpunkte, ersetze Komma), (6) Soll/Haben-Spalten (Deutsche Bank/Postbank/VR-alt) zu signiertem Betrag zusammenführen.

#### Sparkasse (Finanz Informatik, bundesweit identisch) **[H]**
Quellen: https://homebanking-hilfe.de/forum/topic.php?t=17336 , https://dokuwandel.de/ratgeber/sparkasse-csv-datev-import , https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/sparkasse.py , https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/mt940.py
- Dateiname `Umsaetze_DE..._YYYYMMDD.csv`, Encoding ISO-8859-1 (bzw. CP1252), `;`, alle Felder in `"…"`, Datum Buchungstag `TT.MM.JJ`, Valutadatum `TT.MM.JJJJ` (je nach Institut auch beide `TT.MM.JJ`), Betrag `-53,94`.
- **CSV-CAMT (17 Spalten)**:
  `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"`
  Beispiel: `"DE12345678901234567890";"24.03.14";"01.04.14";"ERSTLASTSCHRIFT";"Rundfunkbeitrag 04.2014-06.2014";"DE3000000000012345";"MREF-123";"EREF-456";"";"";"";"Rundfunk ARD, ZDF, DRadio";"DE55370500000123456789";"COLSDE33XXX";"-53,94";"EUR";"Umsatz gebucht"`
- **CSV-MT940 (11 Spalten)**: `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Beguenstigter/Zahlungspflichtiger";"Kontonummer";"BLZ";"Betrag";"Waehrung";"Info"` — SEPA-Tags (EREF+, MREF+, CRED+, SVWZ+) stehen im Feld Verwendungszweck; SVWZ+ herausparsen.
- Sparkasse liefert zusätzlich echte MT940 (.sta/.txt) und CAMT.053 XML (ZIP).

#### Volksbank / Raiffeisenbank / GLS / Sparda / PSD (Atruvia agree21) **[H für VR-Format, M für Sparda/PSD]**
Quellen: https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/README.md , https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/fiducia.py
- Neues Format (VR-NetWorld/Online-Banking seit ca. 2020), 18 Spalten, `;`, UTF-8 mit BOM, Datum `TT.MM.JJJJ`, Betrag `-1234,56`:
  `Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;Saldo nach Buchung;Bemerkung;Gekennzeichneter Umsatz;Glaeubiger ID;Mandatsreferenz`
  Identisch bei GLS Bank und Sparda-Bank West (RechnungsFee-Vorlagen `gls-bank.csv`, `sparda-bank-west.csv`); PSD Banken nutzen ebenfalls Atruvia → sehr wahrscheinlich gleich **[M]**.
- Altes Fiducia-Format (12 Vorspannzeilen, ISO-8859-15, `;`): `Buchungstag;Valuta;Auftraggeber/Zahlungsempfänger;Empfänger/Zahlungspflichtiger;Konto-Nr.;IBAN;BLZ;BIC;Vorgang/Verwendungszweck;Kundenreferenz;Währung;Umsatz;` + unbenannte Spalte Soll/Haben (`S`/`H`); Fußzeilen mit `Anfangssaldo`/`Endsaldo` in Kundenreferenz überspringen; Vorgang/Verwendungszweck ist mehrzeilig (Zeilenumbrüche im Feld).
- DZ-Bank-Firmenkunden: CAMT.053 / MT940 statt CSV.

#### Deutsche Bank / Postbank / norisbank (gemeinsame Plattform seit 2023) **[M]**
Quellen: RechnungsFee README (postbank.csv), https://www.kontocsv.de/ratgeber/norisbank-kontoauszug-csv , https://smartkontoauszug.de/loesungen/deutsche-bank
- 18 Spalten, `;`, UTF-8 mit BOM, Datum `T.M.JJJJ` bzw. `TT.MM.JJJJ`, getrennte Spalten Soll (negativ) / Haben (positiv):
  `Buchungstag;Wert;Umsatzart;Begünstigter / Auftraggeber;Verwendungszweck;IBAN / Kontonummer;BIC;Kundenreferenz;Mandatsreferenz;Gläubiger ID;Fremde Gebühren;Betrag;Abweichender Empfänger;Anzahl der Aufträge;Anzahl der Schecks;Soll;Haben;Währung`
- Deutsche Bank: mehrere Vorspannzeilen (Kontobezeichnung, IBAN, Zeitraum, "Alter Kontostand") und Schlusszeile "Neuer Kontostand"; Header-Zeile beginnt mit `Buchungstag;Wert;` → daran erkennen. Ältere Exporte: `Buchung;Valuta;Vorgang;...;Soll;Haben;Währung` **[L]**.

#### Commerzbank **[M]**
Quellen: RechnungsFee README, https://www.commerzbank.de/service/wie-kann-ich-meine-umsaetze-exportieren/
- `;`, UTF-8 mit BOM, `TT.MM.JJJJ`, Betrag `-12,34`:
  `Buchungstag;Wertstellung;Umsatzart;Buchungstext;Betrag;Währung;IBAN Kontoinhaber;Kategorie`
- Gegenpartei/IBAN/Verwendungszweck stecken zusammen im Feld Buchungstext (Muster `Name  Verwendungszweck End-to-End-Ref.: ... Mandatsref: ... Gläubiger-ID: ...`) → per Regex zerlegen. Commerzbank bietet zusätzlich MT940.

#### comdirect (Commerzbank-Tochter) **[M]**
Quelle: https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/comdirect.py , https://community.comdirect.de/t5/Website-Apps/Umsätze-exportieren-im-CSV-Format/td-p/3134
- ISO-8859-15, `;`, Felder in `"…"`, Vorspannzeilen bis Zeile mit `"Buchungstag"`, Datum `TT.MM.JJJJ` (offene Posten mit Suffix ` Neu`), Betrag `-1.234,56`:
  `"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR";` — Buchungstext enthält `Auftraggeber: ... Buchungstext: ... Ref. ...` (regex-zerlegen). Kreditkarte: `"Buchungstag";"Umsatztag";"Vorgang";"Referenz";"Buchungstext";"Umsatz in EUR"`.

#### ING (ehem. ING-DiBa) **[H]**
Quellen: https://dokuwandel.de/ratgeber/ing-csv-datev-import , https://gist.github.com/pce/bd8c3a1a3dadfd445aeb , ynab ing_checking.py
- Dateiname `Umsatzanzeige_DEXX..._JJJJ-MM-TT.csv`, `;`, Encoding CP1252/latin1 (ältere) bzw. UTF-8 (neuere), Vorspann: `Umsatzanzeige;` / `IBAN;DE…;` / `Kontoname;Girokonto;` / `Bank;ING;` / `Kunde;…;` / `Zeitraum;…;` / `Saldo;1.234,56;EUR;` / Leerzeile / Sortierung; dann Header:
  `Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag;Währung` (9 Spalten, mit Saldo) oder `Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Betrag;Währung` (7 Spalten); Business-Konten zusätzlich `Glaeubiger ID;Mandatsreferenz;Kundenreferenz`.
  Datum `TT.MM.JJJJ`, Betrag `-1.234,56` (Währung eigene Spalte; in manchen Exporten `1.234,56 EUR` im Feld).

#### DKB **[H]**
Quellen: RechnungsFee README (dkb.csv), https://github.com/hamvocke/dkb2homebank , ynab dkb_checking.py
- Neu (Portal ab 2023): `;`, UTF-8 mit BOM, Vorspann `"Girokonto";"DE…"` / `""` / `"Kontostand vom …:";"1.234,56 €"` / Leerzeile, Header:
  `"Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige*r";"Zahlungsempfänger*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag (€)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"` — Datum `TT.MM.JJ`, Betrag `-12,34` (Status `Gebucht`/`Vorgemerkt`).
- Alt (bis 2023): latin1, Vorspann bis `"Buchungstag"`, Header `"Buchungstag";"Wertstellung";"Buchungstext";"Auftraggeber / Begünstigter";"Verwendungszweck";"Kontonummer";"BLZ";"Betrag (EUR)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"`.

#### HypoVereinsbank (UniCredit) **[M, älteres Muster 2012]**
Quelle: https://homebanking-hilfe.de/forum/topic.php?t=18429
- `;`, ISO-8859-1, `TT.MM.JJJJ`, Betrag `99,95`: `Kontonummer;Buchungsdatum;Valuta;Empfaenger 1;Empfaenger 2;Verwendungszweck;Betrag;Waehrung`
  Beispiel: `123456789;28.11.2012;28.11.2012;AMAZON.DE;;12345678901234;99,95;EUR`. Neueres HVB-Online-Banking exportiert außerdem MT940/CAMT und "DATEV EXTF" direkt **[L]**.

#### Consorsbank (BNP Paribas) **[L]**
Nur Desktop-Banking exportiert CSV/XLS; Spaltenlayout nicht belastbar dokumentiert (typisch `Buchung;Valuta;Sender / Empfänger;IBAN / Konto-Nr.;BIC / BLZ;Buchungstext;Verwendungszweck;Betrag in EUR`). Quelle: https://depotstudent.de/consorsbank-export-csv-excel/ . → per Spalten-Mapping-Assistent abdecken.

#### Targobank **[M]**
Quellen: RechnungsFee README (targobank-duesseldorf.csv), https://matrica.de/wiki/index.php/Importfilter
- **Keine Kopfzeile**; `;`, UTF-8, `TT.MM.JJJJ`, Betrag `-12,34` (Variante mit Punkt-Dezimal beobachtet): Spalten `Datum;Buchungstext(Zweck);Betrag;;;;IBAN;BIC` (moneyplex-Filter: `Datum;Zweck;Betrag;;;Iban;Bic`).

#### N26 **[H]**
Quelle: https://scripting-forum.derrichter.de/viewtopic.php?t=1876 , https://homebanking-hilfe.de/forum/topic.php?t=27517
- `,`-getrennt, UTF-8, ISO-Datum `JJJJ-MM-TT`, Punkt-Dezimal `-16.80`:
  `"Booking Date","Value Date","Partner Name","Partner Iban",Type,"Payment Reference","Account Name","Amount (EUR)","Original Amount","Original Currency","Exchange Rate"`
  Beispiel: `2018-03-01,,"LOGPAY FINANCIAL SERVICES GMBH",DE75500400000XXXXXX100,"Direct Debit","LogPay OnlineTicket i.A.v. Muenchner Verkehrs",Hauptkonto,-16.80,,,`
  Ältere Exporte: `"Date","Payee","Account number","Transaction type","Payment reference","Amount (EUR)","Amount (Foreign Currency)","Type Foreign Currency","Exchange Rate"` **[M]**.

#### Qonto **[M]**
Quellen: https://support-de.qonto.com/hc/en-us/articles/23949243220369-How-can-I-export-my-transactions , https://support.qonto.com/hc/en-us/articles/360000453758-What-do-the-fields-of-the-full-Export-CSV-format-mean- (Volltext per Fetch gesperrt), https://dev.classmethod.jp/articles/retrieve-qontos-transactions-via-api/
- Simple Export: `Settlement date (UTC)`, `Counterparty name`, `Total amount (incl. VAT)`. Full Export (Standard-Template) enthält u. a. `Transaction ID, Settlement date (UTC), Settlement date (local), Emitted date, Value date, Counterparty name, Counterparty IBAN, Reference, Total amount (incl. VAT), VAT amount, VAT rate, Currency, Category, Initiator, Card last digits, Attachment, Note, Status, Payment method`; Trennzeichen wählbar `,`/`;`, Datum `DD-MM-YYYY HH:mm:ss`, Punkt-Dezimal. Custom-Templates erlauben Spaltenauswahl. Empfehlung: Qonto-API (OAuth) statt CSV.

#### Finom **[H]**
Quelle: RechnungsFee README (finom.csv)
- `,`, UTF-8 ohne BOM, `TT.MM.JJJJ`, Punkt-Dezimal, leere Felder als `N/A`, 20 Spalten:
  `Buchungsdatum,Time completed,Status,Transaktionsart,Auftraggeber/Empfänger,Counterparty BIC,Counterparty IBAN,Verwendungszweck,Tags,Zahlungsfreigeber,Kartennummer,Ursprungswährung,Ursprungsbetrag,Zahlungswährung,Zahlungsbetrag,Wallet-Saldo nach Transaktion,Wallet-Name,Wallet-IBAN,Begleitende Dokumente,Transaktions-ID`

#### Vivid **[H]** (RechnungsFee): `Completed date,Counterparty name,Reference,Payment amount,Payment currency` (`,`, UTF-8, `TT.MM.JJJJ`, Punkt-Dezimal).

#### Santander Consumer Bank DE **[L]**
Datei `transactions.csv` aus Online-Banking; Spalten nicht belastbar dokumentiert (Buchungstag, Valuta, Verwendungszweck, Betrag, Saldo). Quelle: https://homebanking-hilfe.de/forum/topic.php?t=23609 . → Mapping-Assistent; PDF-Kontoauszug per LLM als Fallback.

#### Triodos Bank DE **[L]**
CSV-Export der letzten 6 Monate möglich, Layout nicht dokumentiert (Triodos DE lief bis 2023 auf GAD/Atruvia-Plattform → vermutlich VR-Format). Quelle: https://www.kritische-anleger.de/triodos-bank/erfahrungen/1200/ , https://sbco.cloud/triodos-import-datev/ . → Mapping-Assistent.

#### Hibiscus (Jameica) CSV-Export **[M]** (für Kunden, die Hibiscus nutzen)
`"#";"Kontonummer";"BLZ";"Konto";"Gegenkonto";"Gegenkonto BLZ";"Gegenkonto Inhaber";"Betrag";"Valuta";"Datum";"Verwendungszweck";"Verwendungszweck 2";"Zwischensumme";"Primanota";"Kundenreferenz";"Kategorie";"Notiz";"Weitere Verwendungszwecke";"Art";"Vormerkbuchung";"End-to-End ID"` — Quelle: https://homebanking-hilfe.de/forum/topic.php?t=21420

#### Korrekturen aus der Nachrecherche vom 23.08.2026 (Beispielzeilen, siehe `nachrecherche-bankabgleich--fehlende-beispielzeilen-der-csv-layouts.md`)
- Sparkasse: Buchungstag **und** Valutadatum sind `TT.MM.JJ` (drei unabhängige Exporte 2024 bis 2026); Betrag ohne Tausenderpunkt (`-1143,41`); vorgemerkte Umsätze enthalten (`Info` = `Umsatz vorgemerkt`).
- Deutsche Bank/Postbank (Postbank-Plattform): `Betrag` ist gefüllt und signiert, `Soll` = derselbe negative Wert, `Haben` = positiver Wert; Datum `D.M.JJJJ` ohne führende Nullen; Tausenderpunkt vorhanden (`-1.000,00`), Nachkommanullen oft weggelassen (`750`, `-6`). Altes DB-Format (bis 2024, 19 Spalten mit `Abweichender Auftraggeber`): `Betrag` leer.
- ING: kein `EUR`-Suffix im Betrag (2020 bis 2026), Tausenderpunkt ja (`2.647,74`); Spalte 2 heißt seit 2025 `Wertstellungsdatum`; optionale Spalten `Notiz` (2026) bzw. `Kategorie` (2020); keine IBAN der Gegenpartei im Export.
- DKB neu: `Betrag (€)` mit Tausenderpunkt und ohne Nachkommanullen (`1.000` = 1000,00!), 2023 teils mit ` €`-Suffix; Vorgemerkt-Zeilen mit leerer `Wertstellung`.
- Commerzbank: kein Tausenderpunkt, Nachkommanullen weggelassen (`-2040`, `-3,9`).
- VR/agree21 neu: immer 2 Nachkommastellen, kein Tausenderpunkt (`2950,68`); `Saldo nach Buchung` kann leer sein; SEPA-Tags als `EREF: … MREF: … CRED: …` im Verwendungszweck. VR alt: `Umsatz` unsigniert mit Tausenderpunkt + `S`/`H`-Spalte, Feld `Vorgang/Verwendungszweck` mehrzeilig (CRLF in Quotes).
- Targobank: 7 Felder `Datum;Buchungstext;Soll(neg);Haben(pos);;;'eigene IBAN'`, kein `BIC`-Feld; Dezimaltrenner `,` oder `.` je Datei.
- Finom: `Time completed` im Original nur `HH:MM`; leere Felder gemischt `N/A`/leer; Quoting nur bei Komma im Feld.

### 3.2 CAMT.053 XML (Bank to Customer Statement) **[H]**
Quellen: DK Anlage 3 V26.11 Kapitel 7.1 (lokal `camt053_chapter.txt`; Download https://www.ebics.de/de/datenformate), Beispiel v02: https://github.com/moiristo/camt/blob/master/spec/sample_files/camt_germany_01.xml , https://validatefin.com/en/blog/camt053-bank-statement
- Versionen: deutsche Banken liefern seit 11/2025 **camt.053.001.08** (Namespace `urn:iso:std:iso:20022:tech:xsd:camt.053.001.08`, EBICS BTF `EOP/DE//camt.053/ZIP`, Auftragsart C53); Altbestand camt.053.001.02 (`…camt.053.001.02`) bis 2025 üblich → Parser muss beide Namespaces akzeptieren (namespace-agnostisch per local-name()).
- camt.052 = untertägige Umsätze, camt.054 = Sammler-Details/Avise.
- Struktur (Pfade relativ zu `/Document/BkToCstmrStmt`):
  - `GrpHdr/MsgId`, `GrpHdr/CreDtTm`
  - `Stmt/Id`, `Stmt/ElctrncSeqNb`, `Stmt/LglSeqNb` (Auszugsnummer), `Stmt/CreDtTm`, `Stmt/FrToDt/FrDtTm|ToDtTm`
  - Konto: `Stmt/Acct/Id/IBAN`, `Stmt/Acct/Ccy`, `Stmt/Acct/Ownr/Nm`, `Stmt/Acct/Svcr/FinInstnId/BICFI` (v08; v02: `BIC`)
  - Salden: `Stmt/Bal[Tp/CdOrPrtry/Cd='OPBD']` Anfangssaldo, `CLBD` Schlusssaldo (v02 oft `PRCD` = previously closed), `CLAV` verfügbar, `FWAV`; je mit `Amt[@Ccy]`, `CdtDbtInd` (CRDT/DBIT), `Dt/Dt`
  - Umsatz `Stmt/Ntry` (0..n): `Amt[@Ccy]` (immer positiv), `CdtDbtInd` (`CRDT` Gutschrift / `DBIT` Belastung), `RvslInd` (true = Storno), `Sts/Cd` (`BOOK`; v02: `Sts` direkt), `BookgDt/Dt` (Buchungstag), `ValDt/Dt` (Valuta), `AcctSvcrRef` (Bankreferenz), `BkTxCd/Domn/Cd|Fmly/Cd|Fmly/SubFmlyCd` (ISO-BTC z. B. PMNT/RCDT/ESCT) und `BkTxCd/Prtry/Cd` = `"<SWIFT-Code>+<GVC>[+Primanota[+Textschlüsselergänzung]]"` mit `Prtry/Issr` = `DK` (v08) bzw. `ZKA` (v02), Beispiele `NTRF+116+9002/405` (SEPA-Überweisung), `NDDT+105` (SEPA-Basislastschrift), `NRTI+109++901` (Rücklastschrift), `NCHK+101+9208`.
  - Details `Ntry/NtryDtls/Btch/PmtInfId|NbOfTxs` (Sammler), `Ntry/NtryDtls/TxDtls` (bei Sammlern 1..n):
    - `Refs/MsgId`, `Refs/AcctSvcrRef`, `Refs/PmtInfId`, `Refs/InstrId`, `Refs/EndToEndId` (EREF), `Refs/TxId`, `Refs/MndtId` (Mandatsreferenz, MREF), `Refs/ChqNb`
    - `Amt`, `CdtDbtInd`, `AmtDtls/TxAmt/Amt`
    - `RltdPties/Dbtr/Pty/Nm` (v08; v02: `RltdPties/Dbtr/Nm`), `RltdPties/Dbtr/Pty/Id/OrgId|PrvtId/Othr/Id`, `RltdPties/DbtrAcct/Id/IBAN`, `RltdPties/UltmtDbtr/Pty/Nm` (ABWA), `RltdPties/Cdtr/Pty/Nm`, `RltdPties/Cdtr/Pty/Id/PrvtId/Othr/Id` (= Gläubiger-ID CRED bei Lastschrift, `SchmeNm/Prtry` = SEPA), `RltdPties/CdtrAcct/Id/IBAN`, `RltdPties/UltmtCdtr/Pty/Nm` (ABWE)
    - `RltdAgts/DbtrAgt/FinInstnId/BICFI`, `RltdAgts/CdtrAgt/FinInstnId/BICFI` (v02: `BIC`)
    - `LclInstrm/Cd` (CORE/B2B/INST), `Purp/Cd` (Purpose-Code, z. B. RENT, SALA), `RmtInf/Ustrd` (Verwendungszweck, 0..n × 140 Zeichen, zusammenfügen), `RmtInf/Strd/CdtrRefInf/Ref` (strukturierte Referenz, z. B. RF-Creditor-Reference), `RtrInf/Rsn/Cd` (Rückgabegrund z. B. AC04, MD01), `RtrInf/AddtlInf`
  - `Ntry/AddtlNtryInf` (Klartext Buchungstext, z. B. "SEPA GUTSCHRIFT", "LASTSCHRIFT").
- Für die App relevante Extraktion je Ntry: Betrag = `Amt` × (CdtDbtInd==DBIT ? −1 : 1); Datum = BookgDt; Gegenpartei = (DBIT ? Cdtr : Dbtr)/Pty/Nm; IBAN = (DBIT ? CdtrAcct : DbtrAcct)/Id/IBAN; Verwendungszweck = join(Ustrd); EREF = Refs/EndToEndId; MREF = Refs/MndtId; GVC = 2. Teil von Prtry/Cd.
- Minimalbeispiel (v02, moiristo, gekürzt): siehe `camt_germany_01.xml`; v08 unterscheidet sich nur durch `Pty`-Zwischenebene bei Parteien und `BICFI`.

### 3.3 MT940 (SWIFT-Kontoauszug, DK-Variante) **[H]**
Quellen: DK Anlage 3 V3.8 Kap. 8.2 (lokal `anlage3_v38.txt` ab Zeile ~30400), Omikron MultiCash-Beschreibung https://www.national-bank.de/fileadmin/user_upload/Service/Electronic_Banking_Center/swift_mt940.pdf (lokal `mt940.txt`), https://www.hettwer-beratung.de/sepa-spezialwissen/sepa-technische-anforderungen/sepa-gesch%C3%A4ftsvorfallcodes-gvc-mt-940/
- Status: DK hat MT940 im November 2025 abgekündigt (Anlage 3 V26.11 enthält kein MT940-Kapitel mehr); Banken liefern es aber vielfach weiter (Sparkasse, Commerzbank, Targobank). Parser bleibt nötig.
- Datei: Textdatei (.sta/.txt/.mta), CP1252/ISO-8859-1, Zeilen mit CRLF, jede Nachricht beginnt mit `:20:` und endet mit `-`.
- Felder: `:20:` Auftragsreferenz (16), `:21:` Bezugsreferenz, `:25:` Konto `BLZ/Kontonummer` oder `/IBAN`, `:28C:` Auszugsnummer `xxxxx/yyy`, `:60F:`/`:60M:` Anfangssaldo (`C|D` + `JJMMTT` + Währung + Betrag mit Komma, z. B. `C131101EUR2200,95`), `:61:` Umsatzzeile, `:86:` Mehrzweckfeld, `:62F:`/`:62M:` Schlusssaldo, `:64:` verfügbarer Saldo, `:65:` künftiger Saldo.
- `:61:` Subfelder (fortlaufend, ohne Trenner): 1 Valuta `JJMMTT` (6), 2 Buchungsdatum `MMTT` (4, optional), 3 Soll/Haben `C`/`D`/`RC`/`RD` (Storno), 4 optional Währungsart (3. Buchstabe, z. B. `R` bei EUR), 5 Betrag mit Komma (15), 6 Buchungsschlüssel `N`+3 Zeichen (SWIFT-Transaction-Code, z. B. `NTRF`, `NDDT`, `NMSC`, `NCHK`), 7 Kundenreferenz (16, `NONREF` wenn leer), 8 `//` + Bankreferenz (16), 9 optional neue Zeile mit Ursprungsbetrag/Gebühren `/OCMT/EUR12,34//CHGS/EUR1,50/`.
  Beispiel: `:61:1311121111CR155,34NTRFNONREF//55555` → Valuta 12.11.2013, Buchung 11.11., Credit, EUR, 155,34, Überweisung.
- `:86:` strukturiert: 3-stelliger **GVC** (Geschäftsvorfallcode) am Anfang, dann Subfelder mit Feldschlüssel `?nn` (Steuerzeichen `?`):
  `?00` Buchungstext (27), `?10` Primanota (10), `?20`–`?29` Verwendungszweck (10 × 27), `?30` BIC des Auftraggebers/Zahlungsempfängers (12), `?31` IBAN/Konto Auftraggeber/Zahlungsempfänger (34), `?32`–`?33` Name Auftraggeber/Zahlungsempfänger (2 × 27), `?34` Textschlüsselergänzung (3, Rückgabegrund), `?60`–`?63` Fortsetzung Verwendungszweck (4 × 27).
  Innerhalb `?20`–`?29`/`?60`–`?63` SEPA-Bezeichner, jeder Bezeichner am Anfang eines Subfelds, Fortsetzung ohne Wiederholung im nächsten Subfeld, Reihenfolge: `EREF+` Ende-zu-Ende-Referenz, `KREF+` Kundenreferenz, `MREF+` Mandatsreferenz, `CRED+` Gläubiger-ID, `DEBT+` Originator-ID, `COAM+` Rücklastschrift-Entgelt, `OAMT+` Ursprungsbetrag, `SVWZ+` SEPA-Verwendungszweck (bei R-Transaktionen `SVWZ+RETURN/REFUND` bzw. `REJECT`), `ABWA+` abweichender Auftraggeber, `ABWE+` abweichender Empfänger, optional `BREF+`, `RREF+`, `PURP+` Purpose-Code, `IBAN+`/`BIC+`.
  Beispiel (Anlage 3 V3.8):
  ```
  :86:166?00SEPA-UEBERWEISUNG?109315?20EREF+987654123456?21SVWZ+Rechnung-Nr.?22734 und 123455056735?30COLSDE33XXX?31DE91370501980100558000?32Max Mustermann
  :86:105?00SEPA-BASIS-LASTSCHRIFT?109316?20EREF+987654123497?21MREF+10023?22CRED+DE54ZZZ09999999999?23SVWZ+Versicherungsbeitrag 2?24013?30WELADED1MST?31DE87240501501234567890?32XYZ Versicherungs AG?34991
  ```
  Parsing: Subfelder ?20–?29 und ?60–?63 in Reihenfolge konkatenieren (ohne Leerzeichen einzufügen), dann per Regex `(EREF|KREF|MREF|CRED|DEBT|COAM|OAMT|SVWZ|ABWA|ABWE|BREF|RREF|PURP)\+` splitten. GVC 999 = unstrukturiert (Freitext, max. 387 Zeichen).
- Wichtige GVC: 105 SEPA-Basislastschrift (Belastung), 104 SEPA-Firmenlastschrift, 108/109 Rücklastschrift, 116 SEPA-Überweisung (Belastung), 166 SEPA-Gutschrift, 171 SEPA-Lastschrift-Gutschrift (Einzug), 152 Dauerauftrag, 159 Rücküberweisung, 201 Auslandsüberweisung, 808 Entgelte/Gebühren, 814 Zinsen; Stelle 1 = Sparte (0/1 Inland, 2 Ausland, 3 Wertpapier, 8 Sonstige, 9 unstrukturiert).
- Bibliotheken: Node `mt940-js` (npm), Python `mt-940`, Java Hibiscus-Parser; MT940 → CSV-MT940 der Sparkasse ist nur eine Flachdarstellung davon.

---

## 4. SEPA pain.001 / pain.008 (Zahlungsdatei) **[H]**
Quellen: DK Anlage 3 V26.11 (gültig ab 15.11.2026; Vorgänger V3.9 gültig 23.11.2025–14.11.2026) https://www.ebics.de/de/datenformate ; DZ Bank FAQ https://firmenkunden.dzbank.de/content/dam/firmenkunden/leistungen/zahlungsverkehr/iso20022/FAQ_ISO20022_Migration_082025.pdf ; Hettwer pain.001 https://www.hettwer-beratung.de/sepa-spezialwissen/sepa-technische-anforderungen/pain-format-sepa-pain-001-sct/ ; Hettwer pain.008 https://www.hettwer-beratung.de/sepa-spezialwissen/sepa-technische-anforderungen/pain-format-sepa-pain-008-sdd/ ; Template https://github.com/sebastienrousseau/pain001/blob/main/pain001/templates/pain.001.001.09/template.xml ; https://finisma.de/blog/pain-001-001-09-umstellung
- **Versionen 2026**: Überweisung **pain.001.001.09** (DK-Schema `pain.001.001.09_GBIC_5.xsd`), Lastschrift **pain.008.001.08** (`pain.008.001.08_GBIC_4.xsd`), Status-Report pain.002.001.10, Kontoauszug camt.053.001.08. Alte pain.001.001.03 / pain.008.001.02 sind seit November 2025 abgekündigt; einzelne Banken nahmen sie in einer Übergangsphase bis 11/2026 noch an (Deutsche Bank: DTAZV/MT101/pain V02 bis November 2026). Ab 15.11.2026 (Anlage 3 V26.11) nur noch die neuen Versionen. Namespaces: `urn:iso:std:iso:20022:tech:xsd:pain.001.001.09`, `urn:iso:std:iso:20022:tech:xsd:pain.008.001.08`.
- Zeichensatz: UTF-8 ohne BOM, eingeschränkt auf "Latin Character Set" (a–z A–Z 0–9 / - ? : ( ) . , ' + Leerzeichen); Umlaute nach EPC-Regeln umsetzen (ä→ae usw.) oder durch die Bank konvertieren lassen. XML-Sonderzeichen escapen.
- Wesentliche Änderungen 09 vs 03: `BIC` → `BICFI`; `ReqdExctnDt` ist Choice `<ReqdExctnDt><Dt>2026-09-01</Dt></ReqdExctnDt>`; strukturierte Adresse `PstlAdr` (StrtNm, BldgNb, PstCd, TwnNm, Ctry) statt AdrLine (AdrLine in der Übergangszeit noch erlaubt, Hybrid ab 2026 gefordert bei Angabe); `DbtrAgt` optional (IBAN-only); `LEI` möglich.

### 4.1 Minimal-Sammelüberweisung pain.001.001.09 (SEPA, IBAN-only)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09 pain.001.001.09_GBIC_5.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>HV-20260823-0001</MsgId>                 <!-- max 35, eindeutig -->
      <CreDtTm>2026-08-23T14:30:00</CreDtTm>
      <NbOfTxs>2</NbOfTxs>
      <CtrlSum>1785.00</CtrlSum>                      <!-- Summe InstdAmt, Punkt-Dezimal -->
      <InitgPty><Nm>Muster Hausverwaltung GmbH</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>HV-20260823-0001-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>                      <!-- Sammelbuchung auf dem Kontoauszug -->
      <NbOfTxs>2</NbOfTxs>
      <CtrlSum>1785.00</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>2026-08-25</Dt></ReqdExctnDt>
      <Dbtr><Nm>Muster Hausverwaltung GmbH</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>DE02120300000000202051</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BICFI>BYLADEM1001</BICFI></FinInstnId></DbtrAgt>   <!-- optional in 09 -->
      <ChrgBr>SLEV</ChrgBr>
      <CdtTrfTxInf>
        <PmtId><EndToEndId>ER-4711</EndToEndId></PmtId>          <!-- max 35 oder NOTPROVIDED -->
        <Amt><InstdAmt Ccy="EUR">595.00</InstdAmt></Amt>
        <Cdtr><Nm>Schlosserei Meier GmbH</Nm></Cdtr>               <!-- max 70 -->
        <CdtrAcct><Id><IBAN>DE89370400440532013000</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>Rechnung 4711 vom 12.08.2026 Objekt Musterstr. 1</Ustrd></RmtInf>  <!-- max 140 -->
      </CdtTrfTxInf>
      <CdtTrfTxInf>
        <PmtId><EndToEndId>ER-4712</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">1190.00</InstdAmt></Amt>
        <Cdtr><Nm>Stadtwerke Musterstadt</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>DE75512108001245126199</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>Kundennr 123456 Abschlag 08/2026</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
```
Regeln (DK/EPC): `PmtMtd` nur `TRF`; `SvcLvl/Cd` = `SEPA` (Echtzeit: zusätzlich `LclInstrm/Cd` = `INST`); `ChrgBr` = `SLEV`; `InstdAmt` 0.01–999999999.99, `Ccy="EUR"`; `EndToEndId` max 35, sonst `NOTPROVIDED`; `Ustrd` max 140 Zeichen, 1× (DK erlaubt 0..1 bei SCT); `Cdtr/Nm` max 70; `CdtrAgt` bei IBAN-only weglassen; `NbOfTxs`/`CtrlSum` müssen stimmen; Beträge mit Punkt und max. 2 Nachkommastellen.

### 4.2 Minimal-Lastschrift pain.008.001.08 (SEPA Core, z. B. Mieteinzug)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>HV-LS-202609-0001</MsgId>
      <CreDtTm>2026-08-23T14:35:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>850.00</CtrlSum>
      <InitgPty><Nm>Muster Hausverwaltung GmbH</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>HV-LS-202609-0001-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>850.00</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>          <!-- oder B2B -->
        <SeqTp>RCUR</SeqTp>                            <!-- FRST/RCUR/OOFF/FNAL; seit 2016 darf auch die erste Lastschrift RCUR sein -->
      </PmtTpInf>
      <ReqdColltnDt>2026-09-03</ReqdColltnDt>          <!-- Vorlauf: CORE mind. 1 Bankarbeitstag (D-1), B2B D-1 -->
      <Cdtr><Nm>Muster Hausverwaltung GmbH</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>DE02120300000000202051</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><BICFI>BYLADEM1001</BICFI></FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr>
        <Id>DE98ZZZ09999999999</Id>                     <!-- Gläubiger-Identifikationsnummer (Bundesbank) -->
        <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
      </Othr></PrvtId></Id></CdtrSchmeId>
      <DrctDbtTxInf>
        <PmtId><EndToEndId>MIETE-2026-09-WE12</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">850.00</InstdAmt>
        <DrctDbtTx><MndtRltdInf>
          <MndtId>MANDAT-WE12-2024</MndtId>            <!-- max 35 -->
          <DtOfSgntr>2024-06-01</DtOfSgntr>
          <AmdmntInd>false</AmdmntInd>
        </MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>  <!-- IBAN-only -->
        <Dbtr><Nm>Erika Musterfrau</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>DE89370400440532013000</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>Miete 09/2026 Musterstr. 1 WE 12</Ustrd></RmtInf>
      </DrctDbtTxInf>
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>
```
Hinweis: Lastschrift-Einreichung erfordert Inkassovereinbarung mit der Bank und Gläubiger-ID; für die MVP-Ausgabe reicht pain.001 (Zahlungsvorschlag Überweisungen). Validierung vor Ausgabe gegen die DK-XSD (im ZIP "Ergänzende Dokumente" auf ebics.de) oder mit `sepa-xml`-Bibliotheken (Node: `sepa` npm-Paket unterstützt pain.001.001.09/pain.008.001.08 **[M]**; Python `sepaxml`, Ruby `sepa_king` / `sepa_rator`, PHP `php-sepa-xml`).

---

## 5. XRechnung (UBL 2.1) **[H]**
Quellen: KoSIT Spezifikation XRechnung 3.0.2 (PDF https://xeinkauf.de/app/uploads/2024/07/302-XRechnung-2024-06-20.pdf, lokal `xrechnung302.txt`), Testsuite-Beispiel https://github.com/itplr-kosit/xrechnung-testsuite/blob/master/src/test/business-cases/standard/01.01a-INVOICE_ubl.xml , Status 4.0: https://xeinkauf.de/aktuelles/xrechnung/xrechnung-4-umsetzung/ (17.03.2026), https://blog.cosinex.de/2026/03/25/xrechnung-4-0/ , https://factora.software/blog/xrechnung-4-0-aenderungen/ , Peppol-Regeln https://docs.peppol.eu/poacc/billing/3.0/rules/ubl-tc434/BR-CO-13/ , Validator https://github.com/itplr-kosit/validator-configuration-xrechnung/releases
- **Gültige Version (23.08.2026): XRechnung 3.0.2** (in Kraft seit 01.02.2024, 3.0.2 = redaktionelles Maintenance-Release vom 03.07.2024). XRechnung 4.0 (auf EN 16931-1:2026) ist angekündigt "Mitte bis Ende 2026", nur Vorabversion, Übergangsfrist geplant; bis dahin und in der Übergangszeit bleibt 3.0.2 gültig. Neue CustomizationID für 4.0 noch nicht veröffentlicht.
- **CustomizationID (BT-24), exakt:** `urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0`
  (Extension: `urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0#conformant#urn:xeinkauf.de:kosit:extension:xrechnung_3.0`)
- **ProfileID (BT-23):** `urn:fdc:peppol.eu:2017:poacc:billing:01:1.0`
- Namespaces UBL: `ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"`, `cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`, `cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"`; Gutschrift: Root `CreditNote-2` mit `cbc:CreditNoteTypeCode 381` und `cac:CreditNoteLine`/`cbc:CreditedQuantity`.
- Für den B2B-Pflichtaustausch ab 2025/2027 (§ 14 UStG) ist jede EN-16931-konforme Rechnung zulässig; XRechnung ist die sichere Wahl (öffentliche Auftraggeber verlangen sie; Leitweg-ID dann in BT-10).

### 5.1 Deutsche Pflichtregeln BR-DE (aus Spezifikation 3.0.2, Kap. Geschäftsregeln)
BR-DE-1 Zahlungsangaben BG-16 (PaymentMeans) Pflicht · BR-DE-2 Seller Contact BG-6 Pflicht · BR-DE-3/4 Seller city/post code · BR-DE-5/6/7 Seller contact point, telephone, email · BR-DE-8/9 Buyer city/post code · BR-DE-10/11/12 Deliver-to city/PLZ falls BG-15 · BR-DE-14 VAT category rate BT-119 Pflicht · **BR-DE-15 Buyer reference BT-10 Pflicht** (B2G Leitweg-ID, B2B beliebiger vom Käufer vorgegebener String, sonst z. B. Kundennummer) · BR-DE-16 bei Steuercodes S,Z,E,AE,K,G,L,M mindestens Seller VAT-ID BT-31 oder Steuernummer BT-32 · BR-DE-17 InvoiceTypeCode ∈ {326, 380, 384, 389, 381, 875, 876, 877} · BR-DE-18 Skonto in PaymentTerms/Note als `#SKONTO#TAGE=14#PROZENT=2.00#` (Großbuchstaben, Zeilenumbruch nach jedem Eintrag, optional `#BASISBETRAG=…#`) · BR-DE-19 IBAN korrekt bei Code 58 · BR-DE-21 BT-24 = XRechnung-Kennung · BR-DE-22 eindeutige Dateinamen bei Anhängen · **BR-DE-23 bei Code 30/58 muss BG-17 CREDIT TRANSFER (PayeeFinancialAccount) vorhanden sein**, BG-18/19 nicht · BR-DE-25 bei 59 (Lastschrift) BG-19 mit BT-90 Gläubiger-ID (BR-DE-30) und BT-91 IBAN des Zahlers (BR-DE-31) · BR-DE-26 bei 384 (korrigierte Rechnung) BG-3 Vorgängerrechnung · BR-DE-27 Telefon ≥ 3 Ziffern · BR-DE-28 gültige E-Mail.
- Peppol/EN-Regel PEPPOL-EN16931-R061: bei Lastschrift Mandatsreferenz BT-89 Pflicht. BR-CO-25: bei PayableAmount > 0 entweder DueDate (BT-9) oder PaymentTerms (BT-20).

### 5.2 Rechenregeln Summen (EN 16931, XPath aus Peppol BIS)
- BR-CO-10: `LegalMonetaryTotal/LineExtensionAmount` = Σ `InvoiceLine/LineExtensionAmount`
- BR-CO-11/12: AllowanceTotalAmount = Σ Dokument-Nachlässe, ChargeTotalAmount = Σ Dokument-Zuschläge
- BR-CO-13: `TaxExclusiveAmount` = LineExtensionAmount − AllowanceTotalAmount + ChargeTotalAmount (auf 2 Stellen gerundet)
- BR-CO-14: `TaxTotal/TaxAmount` = Σ `TaxSubtotal/TaxAmount`
- BR-CO-15: `TaxInclusiveAmount` = TaxExclusiveAmount + TaxTotal/TaxAmount
- BR-CO-16: `PayableAmount` = TaxInclusiveAmount − PrepaidAmount + PayableRoundingAmount
- BR-CO-17: je TaxSubtotal: `TaxAmount` = round(TaxableAmount × Percent/100, 2) (Toleranz ±1 Cent nicht vorgesehen: Abweichung < 1 EUR wird von der Regel toleriert, aber sauber auf 2 Stellen rechnen)
- BR-S-08 / BR-CO-18: je Steuerkategorie/-satz genau ein TaxSubtotal; TaxableAmount = Σ LineExtensionAmount der Zeilen dieser Kategorie ± Dokument-Nachlässe/Zuschläge dieser Kategorie.
- BR-DEC-*: alle Beträge max. 2 Nachkommastellen (Preis BT-146 darf mehr haben); InvoiceLine: LineExtensionAmount = round(InvoicedQuantity × PriceAmount / BaseQuantity, 2) ± Zeilen-Nachlässe.
- Steuerkategorien (UNTDID 5305): `S` Standard (19/7), `Z` Nullsatz, `E` steuerfrei (mit `cbc:TaxExemptionReason` oder `TaxExemptionReasonCode` z. B. `VATEX-EU-79-C`… für § 4 Nr. 12 kein EU-Code → Freitext "Steuerfrei nach § 4 Nr. 12 UStG"), `AE` Reverse Charge (§ 13b, Text "Steuerschuldnerschaft des Leistungsempfängers"), `K` ig. Lieferung, `G` Ausfuhr, `O` nicht steuerbar.

### 5.3 Vollständiges Minimalbeispiel B2B (XRechnung 3.0.2, UBL 2.1, Elemente in Schema-Reihenfolge)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>AR-2026-0117</cbc:ID>                                  <!-- BT-1 -->
  <cbc:IssueDate>2026-08-23</cbc:IssueDate>                       <!-- BT-2 -->
  <cbc:DueDate>2026-09-06</cbc:DueDate>                           <!-- BT-9 (oder PaymentTerms) -->
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>                  <!-- BT-3 -->
  <cbc:Note>Leistungszeitraum 01.08.2026 bis 31.08.2026</cbc:Note>  <!-- BT-22, optional -->
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>        <!-- BT-5 -->
  <cbc:BuyerReference>WEG-MUSTERSTR-1</cbc:BuyerReference>        <!-- BT-10, BR-DE-15 -->
  <cac:InvoicePeriod>                                             <!-- BG-14, optional: Leistungszeitraum -->
    <cbc:StartDate>2026-08-01</cbc:StartDate>
    <cbc:EndDate>2026-08-31</cbc:EndDate>
  </cac:InvoicePeriod>
  <cac:OrderReference><cbc:ID>Auftrag 2026-55</cbc:ID></cac:OrderReference>   <!-- BT-13, optional -->
  <cac:AccountingSupplierParty>                                   <!-- BG-4 Verkäufer -->
    <cac:Party>
      <cbc:EndpointID schemeID="EM">rechnung@muster-hv.de</cbc:EndpointID>     <!-- BT-34, Pflicht (Peppol) -->
      <cac:PartyName><cbc:Name>Muster Hausverwaltung GmbH</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Verwalterweg 5</cbc:StreetName>            <!-- BT-35 -->
        <cbc:CityName>Musterstadt</cbc:CityName>                   <!-- BT-37 -->
        <cbc:PostalZone>12345</cbc:PostalZone>                     <!-- BT-38 -->
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>  <!-- BT-40 -->
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>DE123456789</cbc:CompanyID>                 <!-- BT-31 USt-IdNr. (oder BT-32 Steuernummer mit TaxScheme/ID=FC) -->
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Muster Hausverwaltung GmbH</cbc:RegistrationName>   <!-- BT-27 -->
        <cbc:CompanyID>HRB 12345</cbc:CompanyID>                                    <!-- BT-30, optional -->
        <cbc:CompanyLegalForm>Amtsgericht Musterstadt HRB 12345, Geschäftsführer Max Muster</cbc:CompanyLegalForm>  <!-- BT-33 -->
      </cac:PartyLegalEntity>
      <cac:Contact>                                                <!-- BG-6, BR-DE-2/5/6/7 -->
        <cbc:Name>Buchhaltung</cbc:Name>
        <cbc:Telephone>+49 30 1234560</cbc:Telephone>
        <cbc:ElectronicMail>rechnung@muster-hv.de</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>                                   <!-- BG-7 Käufer -->
    <cac:Party>
      <cbc:EndpointID schemeID="EM">buchhaltung@kunde.de</cbc:EndpointID>       <!-- BT-49 -->
      <cac:PartyIdentification><cbc:ID>K-10001</cbc:ID></cac:PartyIdentification>   <!-- BT-46, optional -->
      <cac:PartyName><cbc:Name>WEG Musterstraße 1</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Musterstraße 1</cbc:StreetName>
        <cbc:CityName>Musterstadt</cbc:CityName>                   <!-- BT-52 -->
        <cbc:PostalZone>12345</cbc:PostalZone>                     <!-- BT-53 -->
        <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>WEG Musterstraße 1</cbc:RegistrationName>   <!-- BT-44 -->
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>                                              <!-- BG-16, BR-DE-1 -->
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>                <!-- BT-81: 58 = SEPA credit transfer, 30 = Überweisung, 59 = SEPA-Lastschrift -->
    <cbc:PaymentID>AR-2026-0117</cbc:PaymentID>                    <!-- BT-83 Verwendungszweck -->
    <cac:PayeeFinancialAccount>                                    <!-- BG-17, BR-DE-23 -->
      <cbc:ID>DE02120300000000202051</cbc:ID>                      <!-- BT-84 IBAN -->
      <cbc:Name>Muster Hausverwaltung GmbH</cbc:Name>              <!-- BT-85 -->
      <cac:FinancialInstitutionBranch><cbc:ID>BYLADEM1001</cbc:ID></cac:FinancialInstitutionBranch>  <!-- BT-86 BIC, optional -->
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:PaymentTerms>
    <cbc:Note>Zahlbar innerhalb 14 Tagen ohne Abzug.</cbc:Note>     <!-- BT-20; Skonto: #SKONTO#TAGE=7#PROZENT=2.00# -->
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">190.00</cbc:TaxAmount>          <!-- BT-110 -->
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">1000.00</cbc:TaxableAmount>   <!-- BT-116 -->
      <cbc:TaxAmount currencyID="EUR">190.00</cbc:TaxAmount>            <!-- BT-117 -->
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>                                          <!-- BT-118 -->
        <cbc:Percent>19</cbc:Percent>                               <!-- BT-119 -->
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>   <!-- BT-106 -->
    <cbc:TaxExclusiveAmount currencyID="EUR">1000.00</cbc:TaxExclusiveAmount>     <!-- BT-109 -->
    <cbc:TaxInclusiveAmount currencyID="EUR">1190.00</cbc:TaxInclusiveAmount>     <!-- BT-112 -->
    <cbc:PayableAmount currencyID="EUR">1190.00</cbc:PayableAmount>               <!-- BT-115 -->
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>                                               <!-- BG-25 -->
    <cbc:ID>1</cbc:ID>                                            <!-- BT-126 -->
    <cbc:InvoicedQuantity unitCode="MON">1</cbc:InvoicedQuantity>   <!-- BT-129/130 -->
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>   <!-- BT-131 -->
    <cac:InvoicePeriod><cbc:StartDate>2026-08-01</cbc:StartDate><cbc:EndDate>2026-08-31</cbc:EndDate></cac:InvoicePeriod>
    <cac:Item>
      <cbc:Description>Verwaltervergütung gemäß Verwaltervertrag vom 01.01.2025</cbc:Description>  <!-- BT-154 -->
      <cbc:Name>Hausverwaltung August 2026</cbc:Name>                                         <!-- BT-153 -->
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent>                                       <!-- BT-151/152 -->
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">1000.00</cbc:PriceAmount>   <!-- BT-146 Nettopreis -->
      <cbc:BaseQuantity unitCode="MON">1</cbc:BaseQuantity>          <!-- BT-149, optional -->
    </cac:Price>
  </cac:InvoiceLine>
</ubl:Invoice>
```
Reihenfolge Root-Elemente (UBL-Schema, verbindlich): CustomizationID, ProfileID, ID, IssueDate, DueDate, InvoiceTypeCode, Note, TaxPointDate, DocumentCurrencyCode, TaxCurrencyCode, AccountingCost, BuyerReference, InvoicePeriod, OrderReference, BillingReference, DespatchDocumentReference, ReceiptDocumentReference, OriginatorDocumentReference, ContractDocumentReference, AdditionalDocumentReference, ProjectReference, AccountingSupplierParty, AccountingCustomerParty, PayeeParty, TaxRepresentativeParty, Delivery, PaymentMeans, PaymentTerms, AllowanceCharge, TaxTotal, LegalMonetaryTotal, InvoiceLine.
Reihenfolge in `cac:Party`: EndpointID, PartyIdentification, PartyName, PostalAddress, PartyTaxScheme, PartyLegalEntity, Contact.
Reihenfolge in `cac:InvoiceLine`: ID, Note, InvoicedQuantity, LineExtensionAmount, AccountingCost, InvoicePeriod, OrderLineReference, DocumentReference, AllowanceCharge, Item, Price.
Reihenfolge in `cac:Item`: Description, Name, BuyersItemIdentification, SellersItemIdentification, StandardItemIdentification, OriginCountry, CommodityClassification, ClassifiedTaxCategory, AdditionalItemProperty.
Reverse-Charge-Zeile (§ 13b): ClassifiedTaxCategory/ID `AE`, Percent `0`; TaxSubtotal Kategorie `AE` mit `cbc:TaxExemptionReason>Steuerschuldnerschaft des Leistungsempfängers</cbc:TaxExemptionReason>`; Käufer-USt-IdNr. in AccountingCustomerParty/PartyTaxScheme Pflicht (BR-AE-*).
Steuerfrei (§ 4 Nr. 12): Kategorie `E`, Percent 0, `TaxExemptionReason` "Steuerfrei nach § 4 Nr. 12 UStG".

### 5.4 Mengeneinheiten (UN/ECE Rec. 20/21, `unitCode`) **[H]**
`C62` Stück/Einheit (Standard), `H87` Stück (Rec. 21, ebenfalls gebräuchlich), `XPP` Stück (Rec. 21), `HUR` Stunde, `MIN` Minute, `DAY` Tag, `WEE` Woche, `MON` Monat, `ANN` Jahr, `MTK` m², `MTQ` m³, `MTR` m, `KMT` km, `KGM` kg, `TNE` t, `LTR` l, `KWH` kWh, `MWH` MWh, `LS` Pauschale (lump sum), `E48` Service-Einheit, `SET` Satz, `P1` Prozent, `ZZ` gegenseitig vereinbart. Quellen: https://www.invoice-converter.com/en/resources/code-lists/unit-codes , https://unece.org/trade/uncefact/cl-recommendations , https://www.zugferdpro.com/unitcodes-fuer-die-menge-in-zugferd-xrechnung-xinvoice/
Empfehlung Hausverwaltung: Verwaltergebühr `MON`, Hausmeister/Reinigung `HUR` oder `MON`, Reparaturpositionen `C62`, Flächen `MTK`, Pauschalen `LS`.

### 5.5 Validierung
KoSIT-Validator (Java, XSD+Schematron) mit `validator-configuration-xrechnung` Release 3.0.2 (2024-10-31 bzw. Folgeversionen 2025/2026): https://github.com/itplr-kosit/validator-configuration-xrechnung/releases ; Schematron XSLT-2.0 → in Node nicht nativ; Validierung serverseitig per Java-CLI oder Online-Validator (z. B. https://www.invoicexml.com/api/validate/xrechnung , https://erechnungsvalidator.service-bw.de/ ).

---

## 6. E-Mail-Eingang und ZUGFeRD/Factur-X-Erkennung **[H]**

### 6.1 Formate
- `.eml` = RFC 5322/MIME-Text (Header + multipart/mixed; PDF-Anhänge als `Content-Type: application/pdf; name=…`, `Content-Disposition: attachment; filename=…`, `Content-Transfer-Encoding: base64`). Outlook-Export ebenfalls .eml oder `.msg`.
- `.msg` = Outlook-Binärformat (OLE2/CFB-Container, MAPI-Properties; Anhänge als Streams `__attach_version1.0_#00000000`).
- Node-Bibliotheken: **postal-mime** (empfohlen, Nachfolger von mailparser; `PostalMime.parse(buffer)` → `{subject, from{name,address}, to[], date, text, html, attachments[{filename, mimeType, disposition, contentId, content: ArrayBuffer}]}`) https://github.com/postalsys/postal-mime ; **mailparser** (`simpleParser(source)` → `attachments[{filename, contentType, content: Buffer, size, checksum, contentDisposition}]`, im Maintenance-Modus) https://github.com/nodemailer/mailparser ; **@kenjiuno/msgreader** für .msg (`new MsgReader(buffer).getFileData()` → `{subject, senderEmail, senderName, body, recipients[], attachments[{dataId, fileName, contentLength}]}`, `reader.getAttachment(att)` → `{fileName, content: Uint8Array}`) https://github.com/HiraokaHyperTools/msgreader ; **eml-parser** (npm) für .eml und .msg gemeinsam. Python-Referenz: `email` stdlib, `extract-msg`.
- Eingangswege für die App: (a) Upload .eml/.msg/.pdf, (b) IMAP-Abruf (Node `imapflow`, BODY.PEEK, Filter `HEADER Content-Type multipart` + `.pdf`/`.xml`-Anhänge), (c) Weiterleitungs-Postfach (z. B. eingang@… über Mailgun/Postmark Inbound-Webhook, das bereits geparste Anhänge liefert).
- Extraktionsregeln: alle Anhänge mit mimeType `application/pdf` oder Dateiendung `.pdf` (auch `application/octet-stream` + `.pdf`), zusätzlich `.xml` (XRechnung UBL/CII) und `.zip` (entpacken); inline `related`-Bilder (Signatur-Logos) ignorieren; verschachtelte `.eml`-Anhänge (`message/rfc822`) rekursiv parsen; PDF-Anhänge mit `Content-Disposition: inline` nicht verwerfen (häufig bei Versorgern). Duplikate per SHA-256 des Anhangs.

### 6.2 ZUGFeRD / Factur-X / XRechnung-PDF erkennen
Quellen: https://pypi.org/project/factur-x/ , https://github.com/stafyniaksacha/facturx , https://www.pdflib.com/pdf-knowledge-base/zugferd-and-factur-x/ , https://www.invoicenavigator.eu/blog/factur-x-technical-reference , https://www.textcontrol.com/blog/2021/01/18/extract-zugferd-facturx-attachments-from-adobe-pdf-documents/
- Hybridrechnung = **PDF/A-3** (a/b/u) mit eingebettetem XML im `EmbeddedFiles`-Name-Tree des Katalogs (`/Names /EmbeddedFiles`), zusätzlich im Katalog `/AF` (Associated Files) und im Filespec `/AFRelationship` = `/Alternative` (Profile BASIC, EN 16931, EXTENDED, XRECHNUNG; Pflicht in DE), `/Data` (MINIMUM, BASIC WL) oder `/Source`. MIME `text/xml` bzw. `application/xml`.
- Dateinamen des eingebetteten XML: `factur-x.xml` (Factur-X / ZUGFeRD 2.1+ Standard), `zugferd-invoice.xml` (ZUGFeRD 2.0), `ZUGFeRD-invoice.xml` (ZUGFeRD 1.0), `xrechnung.xml` (XRechnung-Profil), `order-x.xml` (Bestellungen, ignorieren). Toleranter Matcher: case-insensitiv `factur-x.xml|zugferd-invoice.xml|xrechnung.xml`; Fallback: erstes eingebettetes `.xml`, dessen Root `rsm:CrossIndustryInvoice` (CII, ZUGFeRD 2.x/Factur-X) oder `rsm:CrossIndustryDocument` (ZUGFeRD 1.0) oder `ubl:Invoice` ist.
- XMP-Metadaten (`/Metadata` des Katalogs) enthalten den Profil-Hinweis: Namespace `urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#` (Präfix `fx`), Properties `fx:DocumentType=INVOICE`, `fx:DocumentFileName=factur-x.xml`, `fx:Version=1.0`, `fx:ConformanceLevel` ∈ {MINIMUM, BASIC WL, BASIC, EN 16931, EXTENDED, XRECHNUNG}. ZUGFeRD 1.0: Namespace `urn:ferd:pdfa:CrossIndustryDocument:invoice:1p0#`, `zf:ConformanceLevel` ∈ {BASIC, COMFORT, EXTENDED}.
- Profil-URN im XML (`rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID`): `urn:factur-x.eu:1p0:minimum`, `urn:factur-x.eu:1p0:basicwl`, `urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic`, `urn:cen.eu:en16931:2017` (EN 16931/COMFORT), `urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended`, XRechnung-CII: `urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0`. **[M]** (aus Sekundärquellen; MINIMUM/BASIC WL sind in DE keine Rechnungen i. S. d. § 14 UStG, nur die Profile BASIC/EN 16931/EXTENDED/XRECHNUNG sind "E-Rechnung").
- CII-Namespaces: `rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"`, `ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"`, `udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"`, `qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"`. Aktuelle Version: ZUGFeRD 2.3 / Factur-X 1.0.07 (Mai 2025); technische Basis EN 16931 / CII D22B. **[M]**
- Node-Umsetzung: `@stafyniaksacha/facturx` → `const { xml, flavor, level } = await extract({ pdf })` (pdf-lib-basiert, erkennt Profil aus XMP); alternativ `pdf-lib`: `PDFDocument.load(bytes)` → Katalog `Names/EmbeddedFiles/Names` iterieren → Filespec `/EF /F` Stream dekodieren; oder `pdfjs-dist` `doc.getAttachments()` → `{ [name]: { filename, content: Uint8Array } }`; Python: `facturx.get_xml_from_pdf(pdf)`; CLI `pdfdetach -list`. Reihenfolge im Ingest: (1) Anhang ist `.xml` → XRechnung/CII direkt parsen; (2) PDF hat eingebettetes Invoice-XML → XML verwenden, PDF nur Anzeige; (3) sonst PDF → Text (pdf-parse/pdfjs, bei Scans OCR) → LLM-Extraktion mit Pflichtfeldern (§ 14 Abs. 4 UStG).
- Für **ausgehende** ZUGFeRD-PDFs: `node-zugferd` (https://github.com/jslno/node-zugferd) oder `@stafyniaksacha/facturx` `generate()` erzeugen PDF/A-3 + factur-x.xml (Profil EN 16931 oder XRECHNUNG); PDF/A-3-Konvertierung des Layout-PDFs nötig (Ghostscript `-dPDFA=3` oder pdf-lib mit XMP/OutputIntent).

---

## 7. Offene Punkte / Unsicherheiten
- DATEV Formatversion Buchungsstapel: 12 (ältere Exporte) vs. 13 (aktuell) – beide werden von DATEV importiert; offizielle Formatbeschreibung (Developer-Portal, JS-App) konnte nicht maschinell gelesen werden → beim ersten DATEV-Import mit dem Steuerberater testen.
- Header-Positionen 20 (Rechnungslegungszweck) und 27 (SKR) sind aus Sekundärquellen; leer lassen ist zulässig.
- Bank-CSV: Consorsbank, Santander, Triodos, PSD, Sparda (außer Sparda West), HVB aktuell: nur Teilbelege → generischer Mapping-Assistent mit Spaltenerkennung (Header-Heuristik + LLM-Vorschlag) einplanen, zusätzlich PDF-Kontoauszug-Extraktion als Fallback.
- Qonto Full-Export: Spaltenliste nicht aus Primärquelle bestätigt (Support-Seiten blockieren Fetch) → Qonto-API bevorzugen.
- XRechnung 4.0: Veröffentlichung "Mitte bis Ende 2026", CustomizationID unbekannt; Architektur: CustomizationID als Konfiguration halten.
- DK Anlage 3: V26.11 gilt ab 15.11.2026 (pain.001.001.09 bleibt), heute (08/2026) gilt V3.9 mit identischen Nachrichtenversionen.
- MT940 von DK abgekündigt (11/2025), Banken liefern es aber weiter; CAMT.053 v08 als Primärformat für XML-Import.

---

## 8. Nachtrag 23.08.2026 (siehe `nachrecherche-datev-export--objektbuchhaltung-ohne-kontenrahmen.md`)
- Belegfeld 1 = 36 Zeichen bestätigt (DATEV Dok. 9231364 "Erweiterung von Feldlängen", ledermann/datev booking.rb mit Regex `[a-zA-Z0-9$&%*+-/]`); 12 Zeichen = Belegfeld 2 bzw. altes KNE-Format; 9 Zeichen = PowerHaus-interne Grenze. Rechnungsnummer `RE-2026-00001` ist DATEV-konform; Kurzformat ≤ 9 Ziffern nur für Zielsystem PowerHaus.
- Abschnitt 2, Zeile Reinigung: BU 94 **nur** wenn der Mandant selbst eine gültige Bescheinigung USt 1 TG hat (§ 13b Abs. 5 S. 5 UStG); Hausverwaltung/Vermieter/WEG nie. Netto-Rechnung mit § 13b-Hinweis → Prüfwarnung "Rechnung fehlerhaft".
- Abschnitt 2 gilt nur für Fall A (eigene Fibu). Objektbuchhaltung WEG/Miete/SEV: eigener Objektkontenrahmen + Mapping auf Fremdkontonummern des Steuerberaters (Abschnitt 2 und 3 der Nachrecherche); Hausgeld/Rücklage/Kaution nie auf 8400/1590 der eigenen Fibu.
- 6.2: ZUGFeRD aktuell **2.5.2 / Factur-X 1.09.2** (veröffentlicht 04.08.2026, gültig ab 01.09.2026; 2.5 vom 10.06.2026 ab 01.07.2026; 2.4 ab 15.01.2026), Basis CII D22B, rückwärtskompatibel D16B. Profil-URNs und Dateiname `factur-x.xml` unverändert.
