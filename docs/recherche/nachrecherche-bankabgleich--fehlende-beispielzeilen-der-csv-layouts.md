# Nachrecherche Bankabgleich: Beispielzeilen der CSV-Layouts (Stand 23.08.2026)

Ziel: Für jedes Bankprofil mindestens eine echte (anonymisierte) Datenzeile, damit Parser-Fixtures geschrieben werden können. Offene Punkte aus dem Format-Report (Abschnitt 3.1) werden hier beantwortet: Vorzeichen bei getrennten Soll/Haben-Spalten, `Betrag` zusätzlich gefüllt?, EUR-Suffix bei ING, Tausenderpunkt je Bank, DKB `Betrag (€)`-Format, Quoting/Zeilenumbrüche, Sparkasse Datumsformate.

Alle Rohdateien liegen lokal unter `scratchpad/research/bankcsv/` (RechnungsFee-Vorlagen als `rf_*.csv`, GitHub-Fixtures unter `bankcsv/gh/`). Sie können 1:1 als Test-Fixtures übernommen werden (alle sind anonymisiert bzw. synthetisch).

Konfidenz-Legende: **[H]** = mehrere unabhängige echte Exporte, **[M]** = ein echter Export oder mehrere synthetische Fixtures, **[L]** = nur Sekundärquelle/Vermutung.

Methodischer Hinweis: WebSearch-Budget der Session war erschöpft; die Recherche lief über GitHub-Code-Suche (`gh api search/code`), Raw-Downloads von Fixtures/Parsern sowie einzelne WebFetch-Abrufe. Sekundärquellen wie dokuwandel.de/kontocsv.de erwiesen sich als unzuverlässig (siehe ING).

Wichtiger Befund zu Quellenqualität: Mehrere "Vorlagen" (RechnungsFee `postbank.csv`, `gls-bank.csv`, `sparda-bank-west.csv`, `dkb.csv`, comdirect `kruemelnerd`) wurden vom Einreicher durch Excel geöffnet und neu gespeichert. Erkennbar an `6,17761250170673E+025` in Referenzfeldern, weggefallenen Nachkommanullen (`-39,2`), `;` als Dezimaltrenner oder kaputten Quotes (`;Firma";`). Solche Dateien sind für Vorzeichen/Spaltenreihenfolge brauchbar, für Zahlenformat aber nur eingeschränkt. Ich habe deshalb pro Bank nach nicht-Excel-berührten Dateien gesucht (erkennbar an erhaltenen `,00`-Nachkommastellen und intakten langen Referenzen).

---

## 0. Zusammenfassung der Antworten auf die offenen Fragen

| Frage | Antwort | Konfidenz |
|---|---|---|
| Deutsche Bank/Postbank: Vorzeichen in `Soll`? | `Soll` enthält den **negativen** Wert (`-180,00`), `Haben` den positiven (`750`). Je Zeile ist genau eine der beiden gefüllt. | H |
| Deutsche Bank/Postbank: `Betrag` zusätzlich gefüllt? | **Ja**, im aktuellen Format (seit Postbank-Plattform, DB-Export 06/2026, Postbank 12/2023 und 12/2025): `Betrag` = signierter Wert, identisch mit Soll bzw. Haben. Im alten Deutsche-Bank-Format (bis Anfang 2024, 19 Spalten inkl. "Abweichender Auftraggeber") war `Betrag` **leer**. | H |
| ING: `EUR`-Suffix im Betragsfeld? | **Nein** in allen echten Exporten 2020 bis 01/2026: `Betrag` = `-13,98`, Währung in eigener Spalte. Die Behauptung "1.234,56 EUR" stammt nur von dokuwandel.de (dort auch falscher Header). Parser soll Suffix defensiv strippen, aber nicht erwarten. | H |
| Tausenderpunkt je Bank | **Ja**: ING (`2.647,74`), DKB (`1.234,12`, `8.837,21`, auch `1.000` für 1000,00), comdirect (`-1.234,56`), Deutsche Bank (`-1.000,00`), VR-Altformat (`1.202,10`), Sparkasse in synthetischem Fixture (`1.234,56`) aber nicht in echtem (`-2396,74`). **Nein**: VR/agree21 neu (`2950,68`, `-1121,58`), Commerzbank (`-2040`), Sparkasse echt (`-2396,74`, `-1143,41`), Postbank-Datenzeilen (nur Kopfzeile `Letzter Kontostand;;;;1.290,15`). | H/M je Bank |
| DKB `Betrag (€)` | `"-62,3"`, `"200"`, `"1.234,12"`, `"37"`, `"1.000"` (= 1000,00!), `"-2,75"`. Komma-Dezimal, Tausenderpunkt, **Nachkommanullen werden weggelassen** ("General"-Formatierung). Frühe Exporte 2023 hatten zusätzlich ` €`-Suffix: `"100.000,00 €"`, `"-10,22 €"`. | H |
| Quoting / Zeilenumbrüche im Verwendungszweck | Nur VR-Altformat (Fiducia "Umsatzanzeige") hat echte CRLF innerhalb gequoteter Felder. Alle aktuellen Formate sind einzeilig. Finom quotet nur Felder mit Komma. comdirect quotet alles, endet jede Zeile mit `;`. | H |
| Sparkasse Buchungstag/Valutadatum | **Beide `TT.MM.JJ`** (`"05.12.25";"08.12.25"`), in allen drei CSV-Varianten (CSV-CAMT V2, V8, CSV-MT940) und in drei unabhängigen Quellen (LZO 2025, Sparkasse Schwelm-Sprockhövel 2024, fewohbee 2026). Die Angabe "Valuta TT.MM.JJJJ" im Format-Report ist zu streichen. | H |
| Targobank Spalten | **Kein** `Datum;Zweck;Betrag;;;;IBAN;BIC`, sondern 7 Felder: `Datum;Buchungstext;Soll;Haben;;;'eigene IBAN'`. Belastung negativ in Feld 3, Gutschrift positiv in Feld 4, IBAN in einfachen Anführungszeichen. | M |

---

## 1. Deutsche Bank / Postbank / norisbank (gemeinsame Plattform) **[H]**

### 1.1 Aktuelles Format (Postbank seit 2023; Deutsche Bank spätestens seit 04/2025)

Quellen (echte, anonymisierte Exporte):
- Deutsche Bank, Zeitraum 06/2026, Datei `deutsche_bank.csv` aus RechnungsFee-Issue #247 (Konto "AktivKonto", meine.deutsche-bank.de): https://github.com/nicolettas-muggelbude/RechnungsFee/issues/247 , Datei https://github.com/user-attachments/files/30011395/deutsche_bank.csv (lokal `bankcsv/deutschebank_issue247_2026.csv`)
- Postbank, 12/2023, "Postbank Giro plus": https://github.com/RtCryo/cash-cockpit/blob/master/handler/src/test/resources/Kontoumsaetze_367_6139117_00_20231218_105036.csv (lokal `gh/postbank_cashcockpit.csv`). Dateiname-Muster der Postbank: `Kontoumsaetze_<Filiale>_<Kontonummer>_<Unterkonto>_<JJJJMMTT>_<HHMMSS>.csv`
- Postbank Business Giro 03/2025 (BananaAccounting-Testfall, dort als "Deutsche Bank Format 5" geführt, was den Plattformwechsel belegt): https://github.com/BananaAccounting/Germany/blob/master/importApps/deutschebank_import_bank_statement_csv/test/testcases/csv_deutschebank_example_format5_20250414.csv
- Postbank 12/2025 bis 01/2026 (RechnungsFee `postbank.csv`, Excel-berührt): https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/postbank.csv
- fewohbee-Fixture 2026 (synthetisch, gleiches Layout): https://github.com/developeregrem/fewohbee/blob/master/tests/Fixtures/BankImport/postbank-girokonto-anonymized.csv
- norisbank: kein Fixture gefunden. kontocsv.de bestätigt nur "gehört zur Deutsche-Bank-Familie, ähnliche Layoutmuster" ( https://www.kontocsv.de/ratgeber/norisbank-kontoauszug-csv ). Annahme: identisch zur Postbank-Datei **[L]**.

Eigenschaften:
- Encoding **UTF-8 mit BOM** (`EF BB BF`), Trenner `;`, **keine Anführungszeichen** (auch nicht bei Kommas im Text), Zeilenende LF (Postbank-Originale) bzw. CRLF (Excel-berührte Datei).
- **7 Vorspannzeilen**, dann Header (Zeile 8), dann Daten, dann **1 Fußzeile** `Kontostand;<Datum>;;;<Saldo>;EUR`:
  ```
  Umsätze
  Konto;Filial-/Kontonummer;IBAN;Währung
  AktivKonto;123 1234567 00;DE89370400440532013000;EUR

  1.6.2026 - 30.6.2026
  Letzter Kontostand;;;;2.500,00;EUR
  Vorgemerkte und noch nicht gebuchte Umsätze sind nicht Bestandteil dieser Übersicht.
  Buchungstag;Wert;Umsatzart;Begünstigter / Auftraggeber;Verwendungszweck;IBAN / Kontonummer;BIC;Kundenreferenz;Mandatsreferenz;Gläubiger ID;Fremde Gebühren;Betrag;Abweichender Empfänger;Anzahl der Aufträge;Anzahl der Schecks;Soll;Haben;Währung
  ```
  (Bei Excel-berührten Dateien sind die Vorspannzeilen mit `;;;;` auf 18 Felder aufgefüllt.)
- **Datum `D.M.JJJJ` ohne führende Nullen**: `1.6.2026`, `30.6.2026`, `19.4.2026`, `2.1.2026`; im Dezember natürlich `18.12.2023`. Parser: `\d{1,2}\.\d{1,2}\.\d{4}`.
- **Beträge**: Komma-Dezimal, **Tausenderpunkt vorhanden** (`-1.000,00`, Kopfzeile `2.500,00`), **Nachkommanullen teilweise weggelassen** (`750`, `-30`, `34`, `-6`, `-100,8`, `-12,9`). Beide Varianten kommen in derselben Datei vor.
- **`Betrag` ist immer gefüllt und signiert.** `Soll` = derselbe negative Wert bei Belastung, `Haben` = derselbe positive Wert bei Gutschrift; die jeweils andere Spalte ist leer. Empfehlung: `Betrag` nutzen, Soll/Haben nur als Plausibilitätsprüfung (Betrag == Soll || Betrag == Haben).
- `Umsatzart`-Werte gesehen: `SEPA Lastschrift`, `SEPA Überweisung`, `SEPA Überweisung (Dauerauftrag)`, `SEPA Echtzeitüberweisung`, `SEPA-Gutschrift`, `Gutschrift`, `Kartenzahlung`, `Kontoabrechnung`, `Entgeltabrechnung`, `Zinsen/Kosten/Auslagen`, `Lastschrift`.
- `Kundenreferenz` bei Überweisungen ohne Referenz = `NOTPROVIDED`; bei Kartenzahlungen 34-stellige Ziffernfolge (Excel macht daraus `6,17761250170673E+025`, deshalb Excel-berührte Dateien als Fixture meiden).
- `Abweichender Empfänger` ist bei Lastschriften mit abweichendem Gläubigernamen gefüllt (`Westdeutscher Rundfunk Koln Anstalt des offentlichen R`).

Beispiel-Datenzeilen (wörtlich, Deutsche Bank 06/2026):
```
30.6.2026;30.6.2026;SEPA Lastschrift;Bank AG;Baufinanzierung 123 1234567 21, Leistungen zum 30.06.2026;DE89370400440532013000;;12345678901234;CMLP12345678901;DE12CML12345678901;;-1.000,00;;;;-1.000,00;;EUR
29.6.2026;29.6.2026;SEPA Überweisung (Dauerauftrag);Max Mustermann;Miete;DE89370400440532013000;;NOTPROVIDED;;;;750;;;;;750;EUR
15.6.2026;15.6.2026;SEPA Lastschrift;GEZ 05.2026 - 07.2026 Beitragsnr. 123456789 Aenderungen ganz bequem: www.rundfunkbeitrag.de;DE89370400440532013000;;123456789 2026061123456789;1234567891301;DE3000112345678901;;-55,00;Westdeutscher Rundfunk Koln Anstalt des offentlichen R;;;-55,00;;EUR
Kontostand;30.6.2026;;;1.200,00;EUR
```
Beispiel Postbank 12/2023 (echt, nicht Excel-berührt):
```
18.12.2023;18.12.2023;Kartenzahlung;LIDL SAGT DANKE;LIDL SAGT DANKE//Grasberg/DE 16-12-2023T11:47:04  Folgenr. 04  Verfalld. 1226;DE61300500000008000119;;6015979513224416122311470403405359;194439;DE73DAB00000052684;;-228,18;;;;-228,18;;EUR
18.12.2023;18.12.2023;SEPA Lastschrift;Telefonica Germany GmbH + Co. OHG;Kd-Nr.: 6084341688, Rg-Nr.: 1882980744/7, Ihr Ratenplan;DE16700202700005713153;;3203981932670001882980744007RCUR;T0010001B000006084341688;DE9700000000142462;;-6;;;;-6;;EUR
```
Beispiel Postbank 12/2025 Gutschrift (RechnungsFee, Excel-berührt, Struktur trotzdem korrekt):
```
30.12.2025;30.12.2025;SEPA Überweisung;Bundesagentur für Arbeit-Service-Ha us;26106//0028408 / 26106 1/ 311,00 EUR 2/ 495,95 EUR 064061475009/1700124528164;DE94760000000076001601;;64061475009;;;;806,95;;;;;806,95;EUR
```

### 1.2 Altes Deutsche-Bank-Format (bis ca. Anfang 2024, eigene DB-Plattform) **[H]**

Quelle: BananaAccounting-Testfälle Format 1 (2010), Format 2 (2014), Format 3 (01/2024): https://github.com/BananaAccounting/Germany/tree/master/importApps/deutschebank_import_bank_statement_csv/test/testcases , Parser mit Formatbeschreibung: https://github.com/BananaAccounting/Germany/blob/master/importApps/deutschebank_import_bank_statement_csv/ch.banana.germany.import.deutschebank.js

- Encoding **ISO-8859-1** (Umlaute in UTF-8-Ansicht kaputt), `;`, 4 bis 5 Vorspannzeilen ohne "Umsätze"-Zeile, Datum `TT.MM.JJJJ` mit führenden Nullen, Fußzeile beginnt mit Kontobezeichnung + Datum + Saldo.
- Format 3 (2024), **19 Spalten**, Header wörtlich (Achtung: `Mandatsreferenz ` mit angehängtem Leerzeichen, `IBAN` statt `IBAN / Kontonummer`, zusätzlich `Abweichender Auftraggeber`):
  `Buchungstag;Wert;Umsatzart;Begünstigter / Auftraggeber;Verwendungszweck;IBAN;BIC;Kundenreferenz;Mandatsreferenz ;Gläubiger ID;Fremde Gebühren;Betrag;Abweichender Empfänger;Abweichender Auftraggeber;Anzahl der Aufträge;Anzahl der Schecks;Soll;Haben;Währung`
- **`Betrag` leer**, `Soll` negativ (`-59,00`), `Haben` positiv (`494,96`, `1.380,00` mit Tausenderpunkt), immer 2 Nachkommastellen. `Umsatzart` in Anführungszeichen (`"Kartenzahlung"`), sonst kein Quoting.
  ```
  07.11.2023;07.11.2023;"LIBO-Usupartubit hat";Rediconumensi lis Pluruction Cohoc-Cohoc pEriA;VI/Cere. 152066 / 4773115 Reneri Ramirobtiontem an 52.41.2766;IN37353858307115101770;XFYERUWQ635;260749-02.11.2023 10:37:39;VI-304-X-U-4773115-8;LN72KSG34818637572;;;;;;;-243,00;;EUR
  ```
- Format 2 (2014), 16 Spalten: `Buchungstag;Wert;Umsatzart;Begünstigter / Auftraggeber;Verwendungszweck;IBAN;BIC;Kundenreferenz;Mandatsreferenz ;Gläubiger ID;Fremde Gebühren;Betrag;Abweichender Empfänger;Soll;Haben;Währung` mit `...;;;;;;;;;-23,97;;EUR` bzw. `...;;;;;;;;;;2.577,16;EUR`.
- Format 1 (2010), 6 Spalten: `Buchungstag;Wert;Verwendungszweck;Soll;Haben;Währung`, Verwendungszweck gequotet: `26.08.2010;26.08.2010;"BY NERAPPAREM OS SAN A";-42,33;;EUR`.
- Format 4 (02/2024, vermutlich Kreditkarten-/App-Export): Header in Zeile 1, `Datum;Auftraggeber / Empfänger;Verwendungszweck;Kategorie;IBAN / Kontonummer;Bank;Produkt;Betrag`, z. B. `29.12.2023;Hayal Kosmetik;Description;Unkategorisiert;DE12345678900000000000;Deutsche Bank;Persönliches Konto;-59,00`.

Erkennung: Header enthält `Buchungstag;Wert;`. Wenn erste Zeile `Umsätze` (nach BOM) → Postbank-Plattform (1.1). Wenn Header 19 Spalten mit `Abweichender Auftraggeber` → altes DB-Format, `Betrag` leer, Soll/Haben auswerten. Robuste Regel für beide: `betrag = Betrag != "" ? parse(Betrag) : (Soll != "" ? parse(Soll) : parse(Haben))`, wobei Soll bereits negativ ist (kein zusätzliches Negieren!).

---

## 2. Volksbank / Raiffeisenbank / GLS / Sparda / PSD (Atruvia agree21) **[H]**

### 2.1 Neues Format (Online-Banking/VR Banking App, 18 Spalten)

Quellen (echte Exporte): Volksbank Kraichgau 07/2026 https://github.com/Schick333r/Groschen/blob/main/vr_csv/Ums%C3%A4tze_Juli_2026.csv (lokal `gh/vr_2026_groschen.csv`); VR-Teilhaberbank 11 bis 12/2025 https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/vr-teilhaberbank.csv ; GLS und Sparda-Bank West (Excel-berührt) im selben Ordner; synthetische Fixtures: https://github.com/sercxanto/go-homebank-csv/blob/main/pkg/parser/testfiles/volksbank/Umsaetze_DE12345678901234567890_2023.10.04.csv (Dateinamen-Muster `Umsaetze_<IBAN>_<JJJJ.MM.TT>.csv`), Parser https://github.com/sercxanto/go-homebank-csv/blob/main/pkg/parser/volksbank.go

- **UTF-8 mit BOM**, `;`, **kein Quoting**, CRLF, Header in Zeile 1, keine Vorspann-/Fußzeilen. Datum `TT.MM.JJJJ`.
- Header (wörtlich): `Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;Saldo nach Buchung;Bemerkung;Gekennzeichneter Umsatz;Glaeubiger ID;Mandatsreferenz`
- **Betrag: Komma-Dezimal, immer 2 Nachkommastellen, kein Tausenderpunkt** (`2950,68`, `-1121,58`, `175,00`, `-453,11`; `Saldo nach Buchung` = `14846,94`). Die Varianten `-39,2`, `-20`, `28948,7` in GLS/Sparda-Vorlagen sind Excel-Artefakte.
- `Saldo nach Buchung` kann **leer** sein (Volksbank Kraichgau 2026: alle Zeilen leer). `Bemerkung`, `Gekennzeichneter Umsatz` praktisch immer leer.
- SEPA-Referenzen stehen **im Verwendungszweck als Klartext-Tags mit Doppelpunkt und Leerzeichen**: `EREF: … MREF: … CRED: … IBAN: … BIC: … ABWA: …` (anders als Sparkasse-MT940-CSV mit `EREF+`). Mandatsreferenz und Gläubiger-ID sind zusätzlich in eigenen Spalten. Bei Kartenzahlungen steht in `Mandatsreferenz` der Wert `OFFLINE`.
- `Buchungstext`-Werte: `Gutschrift`, `Basislastschrift`, `Kartenzahlung girocard`, `Abschluss`, `ABSCHLUSS`, `DAUERAUFTRAG`, `Überweisungsauftrag`, `Überweisungsgutschr.`, `Lohn/Gehalt/Rente`; in der 2026-Datei ist `Buchungstext` oft leer und der BIC-Zahlungsbeteiligter leer.
- Bei Abschlussbuchungen sind Name/IBAN/BIC leer.

Beispiel (VR-Teilhaberbank 12/2025, wörtlich):
```
GiroKonto Online;DE89370400440532013000;GENODEF1NEA;VR Bank;01.12.2025;01.12.2025;Max Mustermann;DE89370400440532013000;GENODEF1S05;Gutschrift;Rate;175,00;EUR;14846,94;;;;
GiroKonto Online;DE89370400440532013000;GENODEF1NEA;VR Bank;01.12.2025;01.12.2025;Firma;DE89370400440532013000;WELADEDDXXX;Basislastschrift;40-059254925/HDI Leben/Unser Schreiben vom 26.11.2025 EREF: 134541375034 MREF: M-200-002-644-385-2 CRED: DE74ZZZ00000051890 IBAN: DE62300500000000163568 BIC: WELADEDDXXX;-453,11;EUR;14671,94;;;DE89370400440532013000;M-200-002-644-385-2
GiroKonto Online;DE89370400440532013000;GENODEF1NEA;VR Bank;28.11.2025;30.11.2025;;;;Abschluss;Abschluss per 30.11.2025;-6,00;EUR;15164,95;;;;
```
Beispiel Volksbank Kraichgau 07/2026 (Saldo leer, Buchungstext leer):
```
Kontokorrent;DE62672922000000240770;GENODE61WIE;VOLKSBANK KRAICHGAU;31.07.2026;31.07.2026;Bundeskasse - Dienstort Weiden -;DE08750000000075001007;;;Zahltag Besoldung 08-2026 03142593-2026-05013007-012607 EREF: 03142593-2026-05013007-012607;2950,68;EUR;;;;;
Kontokorrent;DE62672922000000240770;GENODE61WIE;VOLKSBANK KRAICHGAU;30.07.2026;30.07.2026;Deutsche Post AG;DE98700202700048610994;;;HEILBRONN 110/JOERG-RATGEB-PLATZ 3/HEILBRONN/DE 29.07.2026 um 12:27:29 Uhr 65662488/004098/ECTL/ 67292200/0000240770/0/1227;-7,69;EUR;;;;;OFFLINE
```
Die VR-Teilhaberbank liefert dieselben Umsätze auch als MT940 (`.mta`, lokal `rf_vr-teilhaberbank.mta`): `:61:2511271127DR17,90NDDTKREF+` / `:86:105?00Basislastschrift?10931?20EREF+…`, jede Buchung als eigene Nachricht mit `:28C:0`.

### 2.2 Altes Fiducia-Format ("Umsatzanzeige", bis ca. 2020) **[H]**

Quellen: https://github.com/sebwalk/statement/blob/master/tests/Import/samples/volksbank.csv (Volksbank Freiburg 2018), https://github.com/msc01/soacsv2mt940/blob/master/data/test_VR-Bank1.csv (Donau-Iller Bank 2021), https://github.com/sercxanto/small_scripts/blob/master/_archive/tests/fix_fiducia_csv/sample_fiducia_data_fixed.csv (2016), Parser https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/fiducia.py

- ISO-8859-15, `;`, **alle Felder gequotet**, CRLF. Vorspann variabel lang (Freiburg: 24 Zeilen inkl. Leerzeilen, Donau-Iller: 12) → **nicht** "12 Zeilen überspringen", sondern Header per `"Buchungstag";"Valuta";` erkennen.
- Header: `"Buchungstag";"Valuta";"Auftraggeber/Zahlungsempfänger";"Empfänger/Zahlungspflichtiger";"Konto-Nr.";"IBAN";"BLZ";"BIC";"Vorgang/Verwendungszweck";"Kundenreferenz";"Währung";"Umsatz";" "` (letzte Spalte heißt wörtlich ein Leerzeichen und enthält `S`/`H`).
- **`Vorgang/Verwendungszweck` ist mehrzeilig**: erste Zeile = Vorgang (`UEBERWEISUNGSGUTSCHR`, `ÜBERWEISUNG`, `ABSCHLUSS`, `Basislastschrift`…), danach Verwendungszweck in 27-Zeichen-Zeilen, jeweils CRLF innerhalb des gequoteten Felds; teilweise Leerzeilen zwischen Datensätzen. Ein RFC-4180-fähiger CSV-Parser (Quotes über Zeilenenden) ist Pflicht; `line.split(';')` scheitert.
- **`Umsatz` unsigniert mit Tausenderpunkt** (`"1.202,10"`, `"22.257,11"`), Vorzeichen über `S`/`H` in der letzten Spalte (`S` → negativ).
- Fußzeilen `Anfangssaldo`/`Endsaldo` stehen in `Kundenreferenz`.
- Beispiel (Volksbank Freiburg 2018, wörtlich, Feld über 6 Zeilen):
  ```
  "29.12.2017";"29.12.2017";"Sebastian Walker";"Max Mustermann";;"DE89370400440532013000";;"GENODE61FR1";"UEBERWEISUNGSGUTSCHR
  Auslagen Teamtag 2017 Rückz
  ahlung IBAN: DE893704004405
  32013000 BIC: FRSPDE66 ABWA
  : Kreiskasse Breisgau-Hochs
  chwarzwald";;"EUR";"1.202,10";"H"
  ```
  Die 27er-Zeilen müssen **ohne Leerzeichen** konkateniert werden (`Rückz` + `ahlung`).
- Eine dritte Variante (Lexware-Vorlage, https://github.com/K-I-T-Solutions/workmate_os ) hat nur `Buchungstag;Valuta;Auftraggeber/Zahlungsempfänger;Empfänger/Zahlungspflichtiger;Vorgang/Verwendungszweck;Betrag;Zusatzinfo (optional)` **[L]**.

---

## 3. Commerzbank **[H]**

Quellen: echter Export 04/2024 bis 05/2025 mit 514 Zeilen https://github.com/tireminnanzi/HomeExp/blob/main/doc%20banca/202404_202505_CMZB.csv (lokal `gh/commerzbank_homeexp.csv`); RechnungsFee `commerzbank.csv` (12/2024 bis 08/2025); Commerzbank-Hilfe (nur PDF/CSV, 12 Monate, "nicht vollständige Kontoauszüge"): https://www.commerzbank.de/service/wie-kann-ich-meine-umsaetze-exportieren/

- **UTF-8 mit BOM**, `;`, kein Quoting, Header in Zeile 1, keine Vorspann-/Fußzeilen, LF (Original) bzw. CRLF. Datum `TT.MM.JJJJ`.
- Header: `Buchungstag;Wertstellung;Umsatzart;Buchungstext;Betrag;Währung;IBAN Kontoinhaber;Kategorie`
- **Betrag: Komma-Dezimal, kein Tausenderpunkt, Nachkommanullen weggelassen**: `-2040`, `-1000`, `-7,42`, `-3,9`, `0`, `-10,7`, `1100`. In 514 echten Zeilen kein einziger Tausenderpunkt und kein `,00`.
- `Umsatzart`: `Überweisung`, `Dauerauftrag`, `Lastschrift`, `Zinsen/Entgelte`, `Gutschrift`, `Kartenzahlung`… `Kategorie` = Commerzbank-Kategorisierung (`Wohnen`, `Sonstige Ausgaben`), oft leer.
- `Buchungstext` enthält Name, BIC, IBAN, Verwendungszweck und SEPA-Tags in Klartext: `… End-to-End-Ref.: NOTPROVIDED Dauerauftrag`, `… End-to-End-Ref.: 009876584321 Mandatsref: 009876584321 Gläubiger-ID: DE012345678 SEPA-BASISLASTSCHRIFT wiederholend`. Regex-Vorschlag: `^(?<name>.+?)\s+(?<bic>[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?)\s+(?<iban>[A-Z]{2}\d{2}[A-Z0-9]{11,30})\s+(?<zweck>.*?)\s*End-to-End-Ref\.:\s*(?<eref>\S+)(\s+Mandatsref:\s*(?<mref>\S+))?(\s+Gläubiger-ID:\s*(?<cred>\S+))?` (BIC/IBAN fehlen bei Kartenzahlung/Entgelten → optional machen).
- Zinsen/Entgelte-Zeilen enthalten Beträge mit **nachgestelltem Minus** im Text (`9,90- EUR`), das betrifft nur den Text, nicht die Betragsspalte.

Beispiele (wörtlich):
```
02.05.2025;02.05.2025;Dauerauftrag;RALF THURNER GENODEF1M04 DE42700901000008404925 MONATLICH MIETE 1500EUR +540EUR NEB ENKOSTEN End-to-End-Ref.: NOTPROVIDED Dauerauftrag;-2040;EUR;DE58300400000110271400;Wohnen
21.01.2025;21.01.2025;Lastschrift;1x1 Mail & Media GmbH GMX / WEB.DE / KD-Nr. K12345678/ R G-Nr. 12345678 End-to-End-Ref.: 009876584321 Mandatsref: 009876584321 Gläubiger-ID: DE012345678 SEPA-BASISLASTSCHRIFT wiederholend;-12,34;EUR;DE79500400000123456700;
31.12.2024;31.12.2024;Zinsen/Entgelte;Kontoführung Konto  123456700 EUR BLZ   500 400 00 vom 01.12.2024 bis 31.12.2024 Grundpreis              9,90- EUR Auszug                  0,80- EUR;-10,7;EUR;DE79500400000123456700;
```

---

## 4. comdirect **[H]**

Quellen: https://github.com/sercxanto/go-homebank-csv/blob/main/pkg/parser/testfiles/comdirect/umsaetze_1234567890_20231006_1804.csv (echt anonymisiert, 10/2023; Dateinamen-Muster `umsaetze_<Kontonummer>_<JJJJMMTT>_<HHMM>.csv`), Parser https://github.com/sercxanto/go-homebank-csv/blob/main/pkg/parser/comdirect.go ; https://github.com/envelope-zero/frontend/blob/main/cypress/fixtures/comdirect.csv (Verrechnungskonto 06/2023); https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/comdirect.py ; https://github.com/kruemelnerd/finanztool/blob/main/examples/umsaetze_9786831739_20260205-1704.csv (02/2026, aber Excel-berührt: `;` als Dezimaltrenner, unbrauchbar für Zahlen, zeigt aber aktuelle Vorgangstexte)

- **ISO-8859-1/-15**, `;`, **alle Felder gequotet**, **jede Zeile endet mit `;`** (leeres 6. Feld), Zeile 1 ist `;` oder leer, dann `"Umsätze Girokonto";"Zeitraum: 01.09.2023 - 06.10.2023";`, optional `"Neuer Kontostand";"16,94 EUR";`, Leerzeile, Header. Header per `"Buchungstag";"Wertstellung (Valuta)"` erkennen.
- Header: `"Buchungstag";"Wertstellung (Valuta)";"Vorgang";"Buchungstext";"Umsatz in EUR";` (historischer Bug: Spalte hieß zeitweise `Umsatz in {0}`; Kreditkarte: `"Buchungstag";"Umsatztag";"Vorgang";"Referenz";"Buchungstext";"Umsatz in EUR"`).
- Datum `TT.MM.JJJJ`; **vorgemerkte Umsätze**: Buchungstag `offen`, Valuta `--` (ältere Exporte: Datumssuffix ` Neu`). Diese Zeilen überspringen.
- **Betrag: Komma-Dezimal mit Tausenderpunkt, 2 Nachkommastellen**: `"-1.234,56"`, `"1.265,64"`, `"-40,01"`.
- `Vorgang`: `Lastschrift / Belastung`, `Übertrag / Überweisung`, `Kartenverfügung`, `Auszahlung GAA`, `Gutschrift`, `Gebühr`.
- `Buchungstext` ist ein Schlüssel-Wert-Text ohne Trenner: `Auftraggeber: <Name> Buchungstext: <Zweck> Ref. <Ref>/<n>` bzw. `Empfänger: <Name>Kto/IBAN: <IBAN> BLZ/BIC: <BIC>  Buchungstext: <Zweck> Ref. <Ref>/<n>` (Achtung: kein Leerzeichen vor `Kto/IBAN:`). Splitten an den Labels `Auftraggeber:`, `Empfänger:`, `Kto/IBAN:`, `BLZ/BIC:`, `Buchungstext:`, `Ref.` (siehe `splitComdirectBuchungstext` in comdirect.go). Seit 2026 stehen bei Kartenzahlungen zusätzlich `Karte Nr. 4871 78XX XXXX 8491 Kartenzahlung comdirect Visa-Debitkarte 2026-01-31 00:00:00` im Zweck.

Beispiele (wörtlich, 10/2023):
```
"offen";"--";"Kartenverfügung";"Kto/IBAN: 1234567890  Buchungstext: Text1 Text2>Text3 Text4        2023-10-06T17:43:43                 ";"-23,86";
"06.10.2023";"06.10.2023";"Lastschrift / Belastung";"Auftraggeber: Auftraggeber Text Buchungstext: Text1 Text2 Text3 Text4 2023-10-05T18:54:23 Ref. ABCDEF123456/0815";"-40,01";
"02.10.2023";"04.10.2023";"Übertrag / Überweisung";"Empfänger: Name1 Name2Kto/IBAN: DE74823743947247234 BLZ/BIC: AAACCCBBBDDD1  Buchungstext: Buchungstext Ref. DE987654321/1";"-1.234,56";
"05.10.2023";"05.10.2023";"Übertrag / Überweisung";"Auftraggeber: Auftraggeber Text 2 Buchungstext: Text8 Text9 Text10 Ref. A1234567891/0";"1.265,64";
```

---

## 5. ING (ehem. ING-DiBa) **[H]**

Quellen (echte Exporte): 12/2025 https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/ing.csv und `ing-mit-saldo.csv` ; 01/2026 mit 1.030 Zeilen https://github.com/gbviktor/bankdash/blob/main/example/csv/ing.csv (lokal `gh/ing_bankdash.csv`); 08/2020 https://github.com/MatWein/XMC/blob/master/xmc.be/src/test/resources/importing/Umsatzanzeige_DE11100111171110921111_20200828.csv (Dateinamen-Muster `Umsatzanzeige_<IBAN>_<JJJJMMTT>.csv`); synthetisch 02/2026 https://github.com/florivdg/dimetime/blob/main/src/lib/bank-import/parsers/__fixtures__/ing-sample.csv ; Parser https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/ing_checking.py

- Encoding **ISO-8859-1/CP1252** (RechnungsFee-Originale, `file` meldet "ISO-8859 text"), neuere Fixtures teils UTF-8 → Sniffing nötig. `;`, kein Quoting, LF. Datum `TT.MM.JJJJ`.
- Vorspann (Header per Zeilenanfang `Buchung;` erkennen, Position variiert: Zeile 13 ohne Saldo, 14 mit Saldo, 16 im 2020-Export):
  ```
  Umsatzanzeige;Datei erstellt am: 09.12.2025 15:23

  IBAN;DE89370400440532013000
  Kontoname;Girokonto
  Bank;ING
  Kunde;Max Mustermann
  Zeitraum;17.11.2025 - 09.12.2025
  Saldo;66.331,90;EUR          <- nur bei Export "mit Saldo"

  Sortierung;Datum absteigend

  In der CSV-Datei finden Sie alle bereits gebuchten Umsätze. Die vorgemerkten Umsätze werden nicht aufgenommen, auch wenn sie in Ihrem Internetbanking angezeigt werden.

  ```
  2020: IBAN mit Leerzeichen gruppiert (`DE07 3581 8237 0254 8564 22`), zusätzliche Zeile `;Letztes Update: aktuell`, alle Zeilen mit `;;;;;;;;;` aufgefüllt (Excel-Signatur oder damaliges Format).
- **Header-Varianten** (alle beobachtet):
  - 12/2025 ohne Saldo (7 Spalten): `Buchung;Wertstellungsdatum;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Betrag;Währung`
  - 12/2025 "mit Saldo": im RechnungsFee-Beispiel dieselben 7 Spalten (Saldo nur im Vorspann); 01/2026 (bankdash) und 02/2026 (dimetime) 9 bzw. 10 Spalten: `Buchung;Wertstellungsdatum;Auftraggeber/Empfänger;Buchungstext;Notiz;Verwendungszweck;Saldo;Währung;Betrag;Währung` (Spalte `Notiz` nur bei manchen Konten).
  - 2020 (10 Spalten): `Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Kategorie;Verwendungszweck;Saldo;Währung;Betrag;Währung`
  - ältere/synthetische: `Buchung;Valuta;…;Betrag;Währung` (7) oder `…;Saldo;Währung;Betrag;Währung` (9).
  → Spalte 2 heißt seit ca. 2025 `Wertstellungsdatum` (früher `Valuta`); `Währung` kommt doppelt vor → Spalten per Index relativ zu `Betrag` adressieren, nicht per Name-Map allein.
- **Betrag: Komma-Dezimal, Tausenderpunkt, 2 Nachkommastellen, kein EUR-Suffix**: `-13,98`, `2.647,74`, `6.379,61`, `3.250,00`. Ein `1.234,56 EUR`-Suffix wurde in keinem Export 2020 bis 2026 gefunden; die Angabe bei https://dokuwandel.de/ratgeber/ing-csv-datev-import (die auch einen Header `…Betrag;Glaeubiger ID;Mandatsreferenz;Kundenreferenz;` und Vorspann `Kontonummer;…;Von;…;Bis;…` nennt, den kein echter Export zeigt) ist als unzuverlässig einzustufen **[L]**. Defensiv: `betrag.replace(/\s*EUR$/,'')`.
- `Buchungstext`-Werte: `Lastschrift`, `Gutschrift`, `Überweisung`, `Dauerauftrag / Terminueberweisung` (2025) bzw. `Dauerauftrag/Terminueberweisung`, `Gehalt/Rente`, `Kartenzahlung`, `Entgelt`. Kreditkartenumsätze erscheinen als `VISA <Händler>` mit Zweck `NR XXXX 4025 NUERNBERG DE KAUFUMSATZ 05.12 13.98 125423 ARN…` (Betrag im Text mit Punkt!).

Beispiele (wörtlich, 12/2025 ohne Saldo):
```
09.12.2025;09.12.2025;VISA Firma;Lastschrift;NR XXXX 4025 NUERNBERG DE KAUFUMSATZ 05.12 13.98 125423 ARN74830725339312466143652;-13,98;EUR
08.12.2025;08.12.2025;Gerhard Zintel;Dauerauftrag / Terminueberweisung;Nebenkosten Gerhard;-200,00;EUR
28.11.2025;28.11.2025;Rente;97052181157Z00511 RV-RENTE 11.2025;2.647,74;EUR
```
Hinweis zur letzten Zeile: `Auftraggeber/Empfänger` = `Rente`, `Buchungstext` fehlt → das Feld `Buchungstext` kann leer sein bzw. der Export lässt bei Gutschriften ohne Textschlüssel eine Spalte "rutschen"; im Original steht `Rente;97052…;2.647,74;EUR` mit nur 6 Feldern. Parser: Zeilen mit weniger Feldern als Header tolerieren und `Betrag` als vorletztes Feld vor `Währung` nehmen.
Beispiel 01/2026 mit Saldo und Notiz (bankdash):
```
30.12.2025;30.12.2025;VISA ROSSMANN 2295;Lastschrift;;NR XXXX 7029 BRAUNSCHWEI DE KAUFUMSATZ 23.12 28.95 171259 ARN74830725357313108906693;6.379,61;EUR;-28,95;EUR
```

---

## 6. DKB **[H]**

### 6.1 Neues Portal (seit 2023)

Quellen: https://github.com/hamvocke/dkb2homebank/blob/master/testfiles/giro.csv (08/2023, früheste Version mit `€`-Suffix), `tagesgeld.csv` (02/2025), Parser https://github.com/hamvocke/dkb2homebank/blob/master/dkb2homebank.py ; https://github.com/BananaAccounting/Germany/blob/master/importApps/dkb_deutschland_import_bank_statement_cav/test/testcases/csv_dkb_deutschland_example_format1_20250331.csv ; https://github.com/milenvoutchev/2ynab/blob/master/samples/DkbGirokonto2026.csv (05/2026); https://github.com/d-led/auto-ynab-csv/blob/main/data/samples/dkb-giro.csv (12/2024); https://github.com/Skym0sh0/fake-bank-data/blob/master/server/src/test/java/de/sky/regular/income/importing/csv/parsers/NewDKBTurnoverCsvParserTest.java (01/2024 mit Vorgemerkt-Zeilen); https://github.com/eschmidt42/fintl/blob/main/tests/etl/providers/dkb/test_dkb_giro202312.py ; https://github.com/sercxanto/go-homebank-csv/blob/main/pkg/parser/dkb.go

- **UTF-8 mit BOM** (2023-Datei ohne BOM), `;`, **alle Felder gequotet** (einzelne Exporte lassen leere Felder ungequotet: `"-15,18";;;"123456"`), LF.
- Vorspann 4 Zeilen, Varianten:
  ```
  "Girokonto";"DE42120300001033738756"        (oder "Tagesgeld";"DE…")
  ""                                          (oder "Zeitraum:";"01.03.2026 - 31.03.2026")
  "Kontostand vom 09.12.2025:";"4.093,32 €"
  ""
  "Buchungsdatum";"Wertstellung";"Status";"Zahlungspflichtige*r";"Zahlungsempfänger*in";"Verwendungszweck";"Umsatztyp";"IBAN";"Betrag (€)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"
  ```
  Header per Zeile mit `"Buchungsdatum";"Wertstellung"` erkennen (hamvocke: Zeile enthält `Betrag` und `Wertstellung`).
- **Datum `TT.MM.JJ`** (`"08.12.25"`). **Vorgemerkte Umsätze**: `Status` = `Vorgemerkt`, **`Wertstellung` leer** (`"22.01.24";"";"Vorgemerkt";…`). Nur `Gebucht` importieren.
- **`Betrag (€)`: Komma-Dezimal, Tausenderpunkt, Nachkommanullen weggelassen**: `"-62,3"`, `"200"`, `"-48"`, `"37"`, `"1.234,12"`, `"8.837,21"`, `"-1.001"`, `"1.000"` (= 1000,00 EUR). **Gefahr**: `1.000` darf nicht als 1,0 gelesen werden → für DKB `.` immer als Tausenderpunkt entfernen, dann `,`→`.`. Frühe Exporte 08/2023: Suffix ` €` (`"100.000,00 €"`, `"-10,22 €"`) → `replace("€","").trim()`.
- `Umsatztyp`: `Eingang` / `Ausgang`. Bei `Eingang` ist `Zahlungspflichtige*r` die Gegenpartei, bei `Ausgang` `Zahlungsempfänger*in`; `IBAN` ist die Gegen-IBAN. Sonderfall Abrechnung: `Zahlungspflichtige*r` = `Zahlungsempfänger*in` = `DKB AG`, Betrag `0`, Umsatztyp `Eingang` (go-homebank-csv überspringt sie).
- Kreditkarte neu: `"Karte";"Martin-Visa 1234 •••• •••• 9876"` / `"Saldo vom 30.10.2023:";"-0 EUR"` / Header `"Belegdatum";"Wertstellung";"Status";"Beschreibung";"Umsatztyp";"Betrag";"Fremdwährungsbetrag"`, Betrag `"2,49 €"`, `"-2,49 €"` (mit €-Suffix).

Beispiele (wörtlich):
```
"08.12.25";"08.12.25";"Gebucht";"Max Mustermann";"Max Mustermann";"Nebenkosten";"Eingang";"DE89370400440532013000";"200";"";"";""
"28.11.25";"28.11.25";"Gebucht";"Max Mustermann";"Firma";"KTO yyyyy Rechnung xxx / 27,28 EUR faellig 27.11.25";"Ausgang";"DE89370400440532013000";"-27,28";"DE89370400440532013000";"000000775897";"KD.21447822 /030215107456"
"28.04.26";"28.04.26";"Gebucht";"John Doe";"Jane Doe";"verwendungszweck";"Eingang";"DE12345678901234567890";"1.234,12";"";"";"skip"
"22.01.24";"";"Vorgemerkt";"ISSUER";"Netto Marken-Discount    Blaubach    DE";"2024-01-20T08:53 Debitk. 0 2099-12 Zahl.System VISA De bit     (POS)";"Ausgang";"DE15651651561266347791";"-7,02";"";"";"484254466542865"
"25.08.23";"25.08.23";"Gebucht";"John Doe";"Paul Payee";"";"Eingang";"DE33330333331112223334";"100.000,00 €";"";"";""
```

### 6.2 Altes Portal (bis 2023) **[H]**

Quelle: https://github.com/hamvocke/dkb2homebank/blob/master/testfiles/cash.csv (10/2018), Parser https://github.com/ctheune/ynab-bank-imports/blob/master/src/ynab_bank_import/dkb_checking.py

- ISO-8859-1, `;`, alle Felder gequotet, **jede Zeile endet mit `;`**, Datum `TT.MM.JJJJ`, Vorspann 9 Zeilen:
  ```
  "Kontonummer:";"DE33330333331112223334 / Girokonto";
  
  "Von:";"20.09.2018";
  "Bis:";"20.10.2018";
  "Kontostand vom 20.10.2018:";"1.234,56 EUR";
  "Freitextsuche (im Verwendungszweck und Empfängerdaten):";"";"im Verwendungszweck und Empfängerdaten";
  "Betrag von:";"";"bis:";"";
  
  "Buchungstag";"Wertstellung";"Buchungstext";"Auftraggeber / Begünstigter";"Verwendungszweck";"Kontonummer";"BLZ";"Betrag (EUR)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz";
  "19.10.2018";"19.10.2018";"Gutschrift";"Foo Firma";"";"DE12300301111115555666";"FOOBARFO";"45,67";"";"";"FOOFIRMA";
  "17.10.2018";"17.10.2018";"Lastschrift";"SOME ONLINE SHOP";"Some Verwendungszweck";"Some Kontonummer";"Some BLZ";"-16,78";"Some Glaeubiger ID";"Some Mandatsreferenz";"";
  ```
- Erkennung: erste Zeile beginnt mit `"Kontonummer:"` (alt) vs. `"Girokonto"`/`"Tagesgeld"`/`"Karte"` (neu); `"Kreditkarte:"` = alte Kreditkarte.
- Vorsicht: Ein 2026-Fixture (EasyBudgetAI) mischt beide Formate (`"Kontonummer:"`-Vorspann, neue Spaltennamen, `Betrag` ohne `(€)`, `+3200,00`, Datum `TT.MM.JJJJ`) → synthetisch, nicht als Referenz nutzen.

---

## 7. Sparkasse (Finanz Informatik) **[H]**

Quellen: LZO 12/2025 (drei Varianten): https://github.com/nicolettas-muggelbude/RechnungsFee/tree/main/vorlagen/bank-csv (`sparkasse-lzo-camt-v2.csv`, `-v8.csv`, `-mt940.csv`); Sparkasse Schwelm-Sprockhövel 06/2024, 127 echte anonymisierte Zeilen: https://github.com/BananaAccounting/Germany/blob/master/importApps/sparkasse_schwelm_sprockhovel_import_bank_statement_csv/test/testcases/csv_sss_example_format1_20240701.csv ; fewohbee 2026 (synthetisch): https://github.com/developeregrem/fewohbee/blob/master/tests/Fixtures/BankImport/sparkasse-girokonto-anonymized.csv

- Encoding ISO-8859-1 (Umlaute in Spaltennamen sind bewusst als `ae`/`ue` geschrieben: `Glaeubiger ID`, `Waehrung`, `Beguenstigter`), `;`, **alle Felder gequotet**, LF, Header in Zeile 1, keine Vorspann-/Fußzeilen.
- **Buchungstag und Valutadatum beide `TT.MM.JJ`**: `"05.12.25";"08.12.25"`, `"28.06.24";"29.06.24"`, in allen 127 + 10 + 4 Zeilen aus drei Quellen exakt 8 Zeichen. Damit ist die Angabe "Valutadatum TT.MM.JJJJ" aus dem Format-Report zu korrigieren (homebanking-hilfe-Thread von 2014 war die Quelle).
- **Betrag: Komma-Dezimal, 2 Nachkommastellen, kein Tausenderpunkt** in echten Exporten (`"-1143,41"`, `"-2396,74"`, `"-920,47"`); das synthetische fewohbee-Fixture nutzt `"1.234,56"` und `"-2.260,00"` → Parser muss beides akzeptieren.
- `Info`: `Umsatz gebucht` / `Umsatz vorgemerkt` (vorgemerkte Umsätze sind **enthalten**, Valutadatum liegt dann in der Zukunft) → nur `Umsatz gebucht` importieren oder als "pending" markieren.
- CSV-CAMT V2 vs. V8: identische 17 Spalten; Unterschied nur in Buchungstexten (`GUTSCHR. UEBERWEISUNG` vs. `GUTSCHRIFT UEBERWEISUNG`).
- CSV-MT940 (11 Spalten): SEPA-Tags `EREF+`, `MREF+`, `CRED+`, `SVWZ+` **ohne Trennzeichen aneinander** im Verwendungszweck: `MREF+KD-12345-002CRED+DE11ZZZ00000000001SVWZ+Domain-Provider RE123456`; BIC-Spalte heißt `BLZ`.

Beispiele (wörtlich, CSV-CAMT V8 12/2025):
```
"DE89370400440532013000";"05.12.25";"09.12.25";"FOLGELASTSCHRIFT";"KD 123456 RE 001, RE 002";"DE94ZZZ00000000002";"123456";"2512050854-0000010";"";"";"";"Medien GmbH";"DE89370400440532013002";"COBADEFFXXX";"-1143,41";"EUR";"Umsatz vorgemerkt"
"DE89370400440532013000";"03.12.25";"03.12.25";"GUTSCHRIFT UEBERWEISUNG";"Beleg Nr. 203037, Rechnung";"";"";"";"";"";"";"Kunde GmbH";"DE89370400440532013008";"COBADEFFXXX";"119,00";"EUR";"Umsatz gebucht"
"DE89370400440532013000";"03.12.25";"03.12.25";"ECHTZEIT-GUTSCHRIFT";"Beleg 203036";"";"";"";"";"";"";"Max Mustermann";"DE89370400440532013010";"GENODEM1XXX";"35,90";"EUR";"Umsatz gebucht"
```
CSV-MT940:
```
"DE89370400440532013000";"04.12.25";"04.12.25";"ERSTLASTSCHRIFT";"EREF+11063225-1MREF+41310-1CRED+DE11ZZZ00000000003SVWZ+Rechnung 11063225";"Dienstleister GmbH";"DE89370400440532013006";"HASPDEHXXXX";"-29,99";"EUR";"Umsatz gebucht"
```
Echt (Schwelm-Sprockhövel 06/2024, Namen verfremdet):
```
"SE22181624564401062258";"27.06.24";"27.06.24";"SICENDABITQUADICIT";"NATEST 1 ";"";"";"8116905223-0000001LG0000";"8116905223";"";"";"";"";"";"-2396,74";"INE";"Umsatz gebucht"
```

---

## 8. Targobank **[M]**

Quellen: https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/targobank-duesseldorf.csv , `-variation.csv`, `.qif` (11/2025, ein Einreicher, deshalb M). Keine offizielle Targobank-Doku gefunden.

- **Keine Kopfzeile**, UTF-8 ohne BOM, `;`, CRLF, Datum `TT.MM.JJJJ`, letzte Zeile leer (`\r\n`).
- **7 Felder**: `Datum;Buchungstext;Soll;Haben;<leer>;<leer>;'eigene IBAN'`. Belastungen stehen **negativ in Feld 3**, Gutschriften **positiv in Feld 4** (`;;83,16;;;`), die IBAN des eigenen Kontos in **einfachen Anführungszeichen**. Damit ist das alte Profil `Datum;Zweck;Betrag;;;;IBAN;BIC` falsch.
- Dezimal: Variante 1 `-5,00`, Variante 2 `-5.00` (beide vom selben Konto exportiert; vermutlich abhängig von Browser-/Locale-Einstellung) → Dezimaltrenner pro Datei sniffen.
- Buchungstext = Vorgang und Details durch **drei Leerzeichen** getrennt: `Lastschrift   DLS GmbH   DE08000000000000000000   Kd 36910380 Wir sagen Danke  RG-Nr M25072741991 102 39 EUR   0036910380/117926896125   DE4300000000000000   MC-36910380-00000001` (Vorgang, Name, IBAN, Zweck, EREF, Gläubiger-ID, MREF; Punkte/Kommas im Zweck sind entfernt: `102 39 EUR`).
- Zusätzlich QIF (`D03.11.25`, `T-5.00`, `P<Text mit " ; " als Trenner>`) und XLSX.

Beispiele (wörtlich):
```
03.11.2025;Echtzeitüberweisung   CHRISTIAN MUSTERMANN   DE70000000000000000000   TRBKDEBBXXX  B   HBKIN2511012751525 - Bitte bei Rückfragen angeben ;-5,00;;;;'DE67000000000000000000'
04.11.2025;Entgelt Kontoführung   für Oktober 2025;-6,95;;;;'DE67000000000000000000'
10.11.2025;Gutschrift   TEAG   VK 251000326342 RF Strom 1 / 26000 Oldenburg   B 709003642611;;83,16;;;'DE67000000000000000000'
```

---

## 9. Finom **[H]**

Quellen: Original-Issue mit anonymisierten Exportdateien (CSV + MT940) 08/2026: https://github.com/nicolettas-muggelbude/RechnungsFee/issues/342 , Dateien https://github.com/user-attachments/files/30828219/finom.csv und https://github.com/user-attachments/files/30828220/finom-mt940.txt (lokal `bankcsv/finom_issue342*.`); daraus abgeleitete Vorlage `vorlagen/bank-csv/finom.csv` und Test https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/src/backend/tests/test_finom_import.py

- UTF-8 **ohne** BOM, `,`, LF, Header Zeile 1, keine Vorspann-/Fußzeilen, neueste Buchung zuerst. **Quoting nur bei Feldern mit Komma** (`"Annual fee for Basic plan (incl. VAT). Subscription period: 01 Jan, 2026 - 31 Dec, 2026"`).
- Header (20 Spalten, wörtlich): `Buchungsdatum,Time completed,Status,Transaktionsart,Auftraggeber/Empfänger,Counterparty BIC,Counterparty IBAN,Verwendungszweck,Tags,Zahlungsfreigeber,Kartennummer,Ursprungswährung,Ursprungsbetrag,Zahlungswährung,Zahlungsbetrag,Wallet-Saldo nach Transaktion,Wallet-Name,Wallet-IBAN,Begleitende Dokumente,Transaktions-ID`
- `Buchungsdatum` `TT.MM.JJJJ`; **`Time completed` im Original nur `HH:MM`** (`09:57`), in der README-Vorlage `03.03.2026 10:15:00` (nachgebaut) → beide tolerieren.
- **Beträge Punkt-Dezimal, immer 2 Nachkommastellen, signiert**: `-60.00`, `500.00`; `Wallet-Saldo nach Transaktion` `180.00`. Kein Tausendertrenner beobachtet (Beträge < 1000); bei englischem Format wäre `1,234.56` möglich, dann wäre das Feld gequotet **[L]**.
- Leere Felder erscheinen **teils als `N/A`, teils leer** (`,,,N/A,SHOPPING,` : BIC leer, IBAN leer, Verwendungszweck `N/A`). `Zahlungsfreigeber` = Base64-Blob, `Kartennummer` = `***1234`, `Tags` = Kategorie (`SHOPPING`, `SERVICES`), `Begleitende Dokumente` = Belegname (`Rechnung Nr. RE-000001`) oder `N/A`, `Transaktions-ID` = UUID.
- `Transaktionsart`: `Card`, `Transfer`, `FeeByOption`; `Status`: `Completed`.
- MT940-Variante (`.txt`): `:25:FNOMDEB2/0000000000EUR` (BIC/Konto statt IBAN), `:28C:0`, Gegenpartei in `?32`, Zweck in `?60`, alle Umsätze mit `NTRFNONREF`; GVC 166 auch für Belastungen (Parser darf GVC nicht für Vorzeichen nutzen, nur `C`/`D` in `:61:`).

Beispiele (wörtlich, Original 08/2026):
```
05.08.2026,09:57,Completed,Card,SumUp  *Haendler GmbH,,,N/A,SHOPPING,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXovKz09,***1234,EUR,-60.00,EUR,-60.00,180.00,Main,DE89370400440532013000,Rechnung Nr. RE-000001,11111111-1111-1111-1111-111111111111
03.08.2026,16:54,Completed,Transfer,Lieferant GmbH,GENODEF1XXX,DE35370400440532013002,000000000002,N/A,,,EUR,-120.00,EUR,-120.00,240.00,Main,DE89370400440532013000,Rechnung Nr. 000000000002,22222222-2222-2222-2222-222222222222
27.06.2026,17:54,Completed,FeeByOption,PNL Fintech B.V.,FNOMNL22,NL94FNOM0000000000,"Annual fee for Basic plan (incl. VAT). Subscription period: 01 Jan, 2026 - 31 Dec, 2026",N/A,,,EUR,-120.00,EUR,-120.00,360.00,Main,DE89370400440532013000,Rechnung Nr. 0REV-0001,33333333-3333-3333-3333-333333333333
03.03.2026,18:25,Completed,Transfer,Max Mustermann,GENODEF1XXX,DE62370400440532013001,Privateinlage,N/A,,,EUR,500.00,EUR,500.00,500.00,Main,DE89370400440532013000,N/A,55555555-5555-5555-5555-555555555555
```

---

## 10. Vivid **[M]**

Quelle: nur https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/vivid.csv (03/2026; die README verweist auf ein Issue, das Original-Issue #248 ist aber ein PayPal-Bug, das Vivid-Original war nicht auffindbar). Kein weiteres Fixture auf GitHub.

- UTF-8, `,`, LF, Header Zeile 1, kein Quoting, 5 Spalten: `Completed date,Counterparty name,Reference,Payment amount,Payment currency`
- Datum `TT.MM.JJJJ`, Betrag **Punkt-Dezimal, 2 Nachkommastellen, signiert**, keine IBAN/BIC, kein Saldo. Referenz = Verwendungszweck.
```
01.03.2026,Arbeitgeber GmbH,Gehalt März 2026,2500.00,EUR
03.03.2026,Vermieter Name,Miete Büro,-650.00,EUR
```
Offen: Quoting bei Kommas im Namen, Tausendertrenner, ob `Completed date` eine Uhrzeit tragen kann. → Mapping-Assistent mit Vorschau unbedingt anbieten.

---

## 11. Parser-Regeln, die aus den Fixtures folgen

1. **Zahlen deutsch**: `s = s.replace(/\s|€|EUR/g,''); if (s.includes(',')) s = s.replace(/\./g,'').replace(',', '.'); else if (/^\-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'')` → deckt `1.000` (DKB = 1000,00), `-2040`, `-100,8`, `-1.234,56`, `"100.000,00 €"` ab. Für Profile mit Punkt-Dezimal (Finom, Vivid, N26, Targobank-Variante) explizit `decimal='.'` setzen; bei Targobank pro Datei sniffen (`,`- oder `.`-Variante).
2. **Vorzeichen**: Signiertes Betragsfeld ist bei allen aktuellen Formaten vorhanden (auch Deutsche Bank/Postbank `Betrag`). Getrennte Soll/Haben-Spalten sind bereits signiert (Soll negativ) bei Deutsche Bank/Postbank und Targobank; **unsigniert plus `S`/`H`-Kennzeichen nur im VR-Altformat**. Nie doppelt negieren.
3. **Datum**: `TT.MM.JJ` bei Sparkasse (beide Datumsspalten) und DKB neu; `D.M.JJJJ` ohne führende Nullen bei Deutsche Bank/Postbank; sonst `TT.MM.JJJJ`. Leere Wertstellung bei DKB-Vorgemerkt, `offen`/`--` bei comdirect-Vorgemerkt.
4. **Vorgemerkte Umsätze** sind enthalten bei Sparkasse (`Info`), DKB (`Status`), comdirect (`offen`); nicht enthalten bei ING, Deutsche Bank/Postbank (explizite Hinweiszeile). Für den Zahlungsabgleich nur gebuchte Umsätze verwenden, vorgemerkte ggf. als Vorschau.
5. **Header-Erkennung statt Zeilenzählen**: Vorspann variiert (ING 12 bis 15 Zeilen, VR-alt 12 bis 24, DKB 4, comdirect 3 bis 4, Deutsche Bank 7 oder 4). Signaturen: `Buchungstag;Wert;` (DB/Postbank), `"Buchungsdatum";"Wertstellung"` (DKB neu), `"Buchungstag";"Wertstellung"` (DKB alt), `"Buchungstag";"Wertstellung (Valuta)"` (comdirect), `Buchung;` (ING), `"Buchungstag";"Valuta"` (VR alt), `Bezeichnung Auftragskonto;` (VR neu), `"Auftragskonto";"Buchungstag"` (Sparkasse), `Buchungstag;Wertstellung;Umsatzart` (Commerzbank), `Buchungsdatum,Time completed` (Finom), `Completed date,` (Vivid), Zeile ohne Header mit `^\d{2}\.\d{2}\.\d{4};.*;'DE\d{20}'$` (Targobank).
6. **Fußzeilen**: `Kontostand;…` (DB/Postbank), `Anfangssaldo`/`Endsaldo` in Kundenreferenz (VR alt), leere Schlusszeile (Targobank, comdirect).
7. **Encoding-Sniffing**: BOM → UTF-8; sonst UTF-8-Validierung, Fallback CP1252/ISO-8859-15 (Sparkasse, ING, comdirect, DKB alt, VR alt, Deutsche Bank alt).
8. **RFC-4180-Parser mit mehrzeiligen Quotes** ist nur für VR-alt nötig, schadet aber nirgends; `csv-parse`/`papaparse` mit `relax_column_count: true` (ING-Zeilen mit fehlendem Feld, DKB `;;;` ohne Quotes).
9. **Excel-berührte Kundendateien** erkennen (Referenz enthält `E+0`, Nachkommanullen fehlen obwohl Profil sie vorsieht, `;` in Betrag) und Warnung anzeigen: "Bitte die Datei direkt aus dem Online-Banking hochladen, nicht über Excel speichern."
10. **Gegenpartei/IBAN-Herleitung** je Profil: DKB über `Umsatztyp`; DB/Postbank `Begünstigter / Auftraggeber` + `IBAN / Kontonummer`; Commerzbank/comdirect/Targobank per Regex aus dem Buchungstext; ING nur Name (keine IBAN im Export!); Sparkasse `Beguenstigter/Zahlungspflichtiger` + `Kontonummer/IBAN`; VR neu `Name Zahlungsbeteiligter` + `IBAN Zahlungsbeteiligter`.

Fixture-Empfehlung (alle Dateien liegen lokal in `bankcsv/`): `deutschebank_issue247_2026.csv`, `gh/postbank_cashcockpit.csv`, `gh/db_banana_format3_20240131.csv`, `rf_vr-teilhaberbank.csv`, `gh/vr_2026_groschen.csv`, `gh/vr_old_msc01.csv`, `gh/vr_old_sebwalk.csv`, `gh/commerzbank_homeexp.csv`, `rf_commerzbank.csv`, `gh/gohb_comdirect_2023.csv`, `gh/comdirect_envelope.csv`, `rf_ing.csv`, `rf_ing-mit-saldo.csv`, `gh/ing_bankdash.csv`, `gh/ing_xmc.csv`, `gh/dkb_giro.csv`, `gh/dkb_tagesgeld.csv`, `gh/dkb_2ynab_2026.csv`, `gh/dkb_dled.csv`, `gh/dkb_cash.csv`, `rf_sparkasse-lzo-camt-v8.csv`, `rf_sparkasse-lzo-mt940.csv`, `gh/sparkasse_banana_20240701.csv`, `rf_targobank-duesseldorf.csv`, `rf_targobank-duesseldorf-variation.csv`, `finom_issue342.csv`, `finom_issue342_mt940.txt`, `rf_vivid.csv`.

---

## 12. Klärung der übergebenen Widersprüche (nur soweit lokal belegbar)

- **Versicherungsteuer**: Beide Reports sind je halb richtig. § 6 Abs. 2 VersStG (lokal `law_versstg___6.txt`): Steuersatz **22 %** Feuer/Feuer-BU, **19 %** Wohngebäude, **19 %** Hausrat. § 5 Abs. 1 Nr. 3 VersStG (lokal `law_versstg___5.txt`): Bemessungsgrundlage nur **60 %** (Feuer), **86 %** (Wohngebäude), **85 %** (Hausrat) des Versicherungsentgelts. Effektiv: Feuer 13,2 %, Wohngebäude 16,34 %, Hausrat 16,15 % vom Entgelt (zzgl. Feuerschutzsteuer auf den restlichen Anteil, die der Versicherer trägt und nicht offen ausweist). Für die Belegprüfung: Auf Wohngebäudeversicherungsrechnungen muss der ausgewiesene VersSt-Betrag ≈ 16,34 % des Nettoentgelts sein; § 5 Abs. 3 VersStG verlangt offenen Ausweis von Steuerbetrag, Steuersatz und Versicherungsteuernummer. **[H]**
- **§ 14 Abs. 4 UStG**: Der lokale Gesetzestext (`law_ustg_1980___14.txt`) enthält die Nummern 1 bis **10** (Nr. 9 Hinweis auf Aufbewahrungspflicht des Leistungsempfängers bei § 14b Abs. 1 Satz 5, Nr. 10 Angabe "Gutschrift"). Checkliste muss 10 Punkte haben; Nr. 9 gilt nur bei Werklieferungen/Leistungen an Nichtunternehmer im Zusammenhang mit einem Grundstück (relevant bei Handwerkerrechnungen an private Eigentümer), Nr. 10 nur bei Gutschriftsverfahren. **[H]**
- **DATEV Belegfeld 1**: Im DATEV-Format (Buchungsstapel V7, Feld 11) ist Belegfeld 1 als Text mit **36 Zeichen** definiert; 12 bzw. 9 Zeichen sind Grenzen der Zielsysteme (12: historisch DATEV-KNE/Rechnungswesen-Anzeige, 9: PowerHaus laut `powerhaus_datev.txt`). Da die App selbst DATEV-Stapel erzeugt (nicht in PowerHaus importiert), gilt **36** als hartes Limit; `RE-2026-00001` (13 Zeichen) ist zulässig. Empfehlung: Rechnungsnummern-Muster konfigurierbar mit Warnung ab 12 Zeichen ("einige Zielsysteme kürzen"). Konfidenz zur 36-Zeichen-Angabe **[M]** (lokale DATEV-PDFs ließen sich hier nicht per pdftotext auswerten; Angabe aus Format-Report Abschnitt 1.3 und ledermann/datev booking.rb).
- **ZUGFeRD-Version, Mahngebühr, Reverse Charge**: außerhalb dieses Themas; die Bewertung des Rechts-Reports (ZUGFeRD 2.4/Factur-X 1.08 seit 15.01.2026; Mahngebühr-Default 0 EUR bzw. nur Porto; § 13b-Netto-Reinigungsrechnung an Hausverwaltung/WEG = Fehler, kein BU 94) ist die aktuellere und mit Primärquellen belegte; der Format-/Domänen-Report ist entsprechend zu korrigieren. Nicht erneut geprüft.

---

## 13. Quellenliste (URLs)

- https://github.com/nicolettas-muggelbude/RechnungsFee/tree/main/vorlagen/bank-csv (README + 21 Vorlagen; Sparkasse LZO, Commerzbank, DKB, ING, Targobank, VR-Teilhaberbank, Sparda, GLS, Postbank, Vivid, Finom)
- https://github.com/nicolettas-muggelbude/RechnungsFee/issues/247 (Deutsche Bank CSV 06/2026, Originaldatei)
- https://github.com/nicolettas-muggelbude/RechnungsFee/issues/342 (Finom CSV + MT940, Originaldateien)
- https://github.com/BananaAccounting/Germany/tree/master/importApps (Deutsche Bank Formate 1 bis 5, Postbank, DKB, Sparkasse Schwelm-Sprockhövel; JS-Parser mit Formatbeschreibungen)
- https://github.com/RtCryo/cash-cockpit/blob/master/handler/src/test/resources/Kontoumsaetze_367_6139117_00_20231218_105036.csv (Postbank 12/2023)
- https://github.com/eschmidt42/fintl/tree/main/tests/files/csv_files/Postbank (Postbank 2023 + altes Postbank-Format 2021 `Umsatzauskunft` mit `Betrag (€)` als `-12,34 €`)
- https://github.com/hamvocke/dkb2homebank (DKB alt/neu, Giro/Tagesgeld/Visa, Parser)
- https://github.com/sercxanto/go-homebank-csv (Volksbank neu, comdirect, DKB; Go-Parser mit Formatnotizen)
- https://github.com/ctheune/ynab-bank-imports (Parser Sparkasse, Fiducia, comdirect, ING, DKB)
- https://github.com/Schick333r/Groschen/blob/main/vr_csv/Ums%C3%A4tze_Juli_2026.csv (Volksbank Kraichgau 07/2026)
- https://github.com/sebwalk/statement/blob/master/tests/Import/samples/volksbank.csv , https://github.com/msc01/soacsv2mt940/blob/master/data/test_VR-Bank1.csv , https://github.com/sercxanto/small_scripts/tree/master/_archive/tests/fix_fiducia_csv (VR-Altformat)
- https://github.com/tireminnanzi/HomeExp/blob/main/doc%20banca/202404_202505_CMZB.csv (Commerzbank 2024/25)
- https://github.com/envelope-zero/frontend/blob/main/cypress/fixtures/comdirect.csv , https://github.com/kruemelnerd/finanztool/blob/main/examples/umsaetze_9786831739_20260205-1704.csv (comdirect)
- https://github.com/gbviktor/bankdash/blob/main/example/csv/ing.csv , https://github.com/MatWein/XMC/blob/master/xmc.be/src/test/resources/importing/Umsatzanzeige_DE11100111171110921111_20200828.csv , https://github.com/florivdg/dimetime/blob/main/src/lib/bank-import/parsers/__fixtures__/ing-sample.csv (ING)
- https://github.com/milenvoutchev/2ynab/blob/master/samples/DkbGirokonto2026.csv , https://github.com/d-led/auto-ynab-csv/blob/main/data/samples/dkb-giro.csv , https://github.com/Skym0sh0/fake-bank-data/blob/master/server/src/test/java/de/sky/regular/income/importing/csv/parsers/NewDKBTurnoverCsvParserTest.java , https://github.com/eschmidt42/fintl/blob/main/tests/etl/providers/dkb/test_dkb_giro202312.py (DKB inkl. Vorgemerkt)
- https://github.com/developeregrem/fewohbee/tree/master/tests/Fixtures/BankImport (Postbank/DKB/Sparkasse 2026, synthetisch, plus camt.052/053-XML)
- https://github.com/replikativ/kontor/tree/main/modules/bank-de/test/resources (Kopie der RechnungsFee-Vorlagen mit FORMATS.md)
- https://www.commerzbank.de/service/wie-kann-ich-meine-umsaetze-exportieren/ (Commerzbank-Hilfe)
- https://www.kontocsv.de/ratgeber/norisbank-kontoauszug-csv (norisbank, nur Hinweis auf DB-Familie)
- https://dokuwandel.de/ratgeber/ing-csv-datev-import , https://dokuwandel.de/ratgeber/sparkasse-csv-datev-import (Sekundärquellen; ING-Angaben widersprechen allen echten Exporten)
- Lokale Gesetzestexte: `law_versstg___5.txt`, `law_versstg___6.txt`, `law_ustg_1980___14.txt`
