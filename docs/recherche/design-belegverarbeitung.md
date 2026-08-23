# Design-Recherche: Belegverarbeitungs-App, die nicht nach Standard-SaaS aussieht

Stand: 23. August 2026. Alle Fundstellen mit URL. Unsicheres ist als (low) / (medium) markiert.
Lokal geprüfte Artefakte (Fonts, PDFs) liegen in `../fonts/`, `../gobd2019.txt`, `../ph.txt` (Haufe PowerHaus Handbuch), `../gobd2019.pdf`.

---

## 1. Der klassische deutsche Kontierungsstempel / Buchungsstempel

### 1.1 Standard-Feldsatz (belegt über Händlervorlagen)

**Trodat Professional 5474 (Abdruck 59 x 39 mm), Vorlage "Kontierungsstempel Rechnung"** (schnell-stempel.de):
Abdrucktext wörtlich: `Rechnung, sachlich richtig, rechnerisch richtig, Zahlung freigegeben, bezahlt am, Konto, Gegenkonto, KST, gescannt`.
Datum-Schrifthöhe 4 mm, Datumsband bis 31.12.2037, Stahlkern/gebürsteter Edelstahl, Laserrubber. Preis 68,00 EUR netto.
Stempelkissen-Farben: Schwarz, Blau, Rot, Grün, Violett; zweifarbig Blau/Rot und Schwarz/Rot; Sonderfarben (+12 EUR) u. a. Signalgelb, Tieforange, Karminrot, Lichtblau, Himmelblau, Gelbgrün, Orangebraun.
Quelle: https://www.schnell-stempel.de/Kontierungsstempel-Buchungsstempel-Rechnungsstempel-mit-Datum/Stempel-Rechnung-Zahlung-gebucht-Konto-Gegenkonto-Kostenstelle-Trodat-Professional-5474::2046.html

**Trodat Professional 5480 (Abdruck 67 x 46 mm, 10 Texteinträge)** (stempel-24.com):
`Rechnung, sachlich richtig, rechnerisch richtig, Zahlung freigegeben, bezahlt am, gebucht von, Konto, Gegenkonto, KST, gescannt`.
Standardfarben Schwarz, Blau, Rot, Grün, Violett; Sonderfarben (je +12 EUR): Fehgrau, Zinkgelb, Signalgelb, Tieforange, Karminrot, Verkehrspurpur, Lichtblau, Himmelblau, Gelbgrün, Orangebraun; 2-farbig Blau/Rot, Schwarz/Rot.
Quelle: https://www.stempel-24.com/KONTIERUNGSSTEMPEL/KONTIERUNGS-STEMPEL-MIT-DATUM-PROFESSIONAL/Kontierungsstempel-Rechnung-Zahlung-gebucht-Konto-Gegenkonto-Kostenstelle-gescannt-5480::628.html

**Buchungsstempel-Vorlagen (stempel-schilder-online.de)**:
- Buchungsstempel: `Konto | Gegenkonto | Kostenstelle | Gebucht am | Bezahlt am | Skonto | Unterschrift`, Größen 30x65, 30x90, 37x58, 40x60 mm.
- Eingangsstempel: `Eingegangen am | Erledigt | Geprüft | Einspruch | Änderung`, 33x56 mm.
- Prüfstempel: `In Ordnung | Einspruch | Datum`, 37x58 mm.
- Wareneingangsstempel: `Wareneingang vorbehaltlich | Menge und Qualität | Beschädigung der Verpackung`, 30x50 mm.
- "Most templates feature horizontal line layouts and designated spaces for dates, signatures, and cost center notations."
Quelle: https://stempel-schilder-online.de/Stempelvorlagen/Buchungsstempel/

**firmenstempel.de (typische Angaben)**: Konto und Gegenkonto, Kostenstelle, Betrag, Belegnummer, Buchungs- oder Prüfdatum, "geprüft von", "freigegeben von", "sachlich und rechnerisch richtig", "überwiesen am". Gestaltung: "Klare, übersichtliche Aufteilung mit Tabellen", "Ausreichend Platz für handschriftliche Einträge", "Keine zu dichte Belegung des Abdrucks".
Quelle: https://www.firmenstempel.de/kontierungsstempel

**stempelservice.de**: Kontierungsstempel "in tabellarischer Form aufgebaut": Konto und Gegenkonto, Kostenstelle und -träger, Bezeichnung, Datum des Zahlungseingangs bzw. der internen Kontierung, "ein Feld für das persönliche Kürzel des Buchhalters". Größenspanne: kleinste Platten 10 x 10 mm, große Modelle bis 120 x 80 mm mit bis zu 16 Zeilen.
Quelle: https://www.stempelservice.de/kontierungsstempel

**easystempel.de Stempellexikon**: Typische Felder Konto, Gegenkonto, Kostenstelle, Kostenträger, Betrag, Datum, Eingangsdatum, Zahlungsnummer, Projektnummer, Unterschriftsfelder. Zweck: Sachbearbeiter erkennen "sofort" den Bearbeitungsstand.
Quelle: https://www.easystempel.de/stempellexikon/kontierungsstempel.html

**Zusammengefasster Standard-Feldsatz (Union aller Vorlagen), in typischer Reihenfolge von oben nach unten:**
1. Kopfzeile: `Rechnung` / `Eingangsrechnung` (manchmal Firmenname)
2. `Eingegangen am ___` (Datum)
3. `Sachlich richtig ___` (Datum/Kürzel/Unterschrift)
4. `Rechnerisch richtig ___` (Datum/Kürzel/Unterschrift)
5. `Zahlung freigegeben ___` / `Zur Zahlung angewiesen`
6. Tabelle: `Konto | Gegenkonto | Kostenstelle (KST) | Kostenträger | Betrag | Steuersatz/Buchungstext`
7. `Belegnummer / Beleg-Nr.`
8. `Gebucht am ___` / `gebucht von ___` (Kürzel)
9. `Bezahlt am ___` / `überwiesen am ___` / `Bar / Bank`
10. `Skonto ___ %` / `Skontodatum`
11. `gescannt` (neuer, seit ersetzendem Scannen üblich)
12. `Unterschrift / Datum`

### 1.2 Bedeutung der Prüfvermerke (öffentliche Haushalte, bindend für Design-Semantik)
- "Sachlich richtig": bescheinigt, dass "die in der Kassenanordnung und den begründenden Unterlagen enthaltenen Angaben richtig sind" und "die Lieferung oder Leistung entsprechend der zugrundeliegenden Vereinbarung sachgemäß und vollständig ausgeführt worden ist"; zusätzlich Wirtschaftlichkeit/Sparsamkeit/Notwendigkeit.
- "Rechnerisch richtig": "der anzunehmende oder auszuzahlende Betrag mit den Berechnungsunterlagen übereinstimmt" und die Rechnung nachgerechnet wurde.
- Form: Zeichnung auf Originalbeleg, "Unterschrift mit Klartextnamen erforderlich; Stempel allein ist nicht ausreichend". Anordnungsbefugnis schließt sachliche Feststellungsbefugnis ein; rechnerische Feststellung ab A5/E3, sachliche ab A9/E9.
Quelle: https://www.uni-heidelberg.de/universitaet/beschaeftigte/service/finanzen/haushalt/feststellungsvermerk.html
- Reihenfolge der Prüfung in der Praxis: formell (Pflichtangaben § 14 UStG), sachlich (Leistung/Bestellung/Lieferschein), rechnerisch (Einzelpreise, Summe, USt) – so auch bei Candis: https://www.candis.io/blog/rechnungsfreigabe und sevdesk: https://sevdesk.de/ratgeber/buchhaltung-finanzen/rechnungen/pruefung/

### 1.3 Wort-/Datumsstempel: GEBUCHT, BEZAHLT, GEPRÜFT, EINGEGANGEN
**Trodat Printy 4750/L Dater (Abdruck 41 x 24 mm, Datumshöhe 4 mm)**: Varianten 4750L1 `EINGEGANGEN`, 4750L2 `BEZAHLT`, 4750L7 `GEBUCHT`, 4750L22 `GESCANNT`. Kissen zweifarbig Blau/Rot (Ersatzkissen 6/4750), Datumsband 12 Jahre (andere Quelle: 10 Jahre), Datumsformat TT. MM. JJJJ (Tag/Monat/Jahr). Preis 23,00 EUR inkl. MwSt. Textsatz: Versalien, serifenlose Grotesk, Text oberhalb, Datum darunter. Im zweifarbigen Kissen ist Text blau, Datum rot (Standardaufteilung "blau/rot" bei Lagertext-Datern) (medium: Aufteilung aus Produktbildern/Verkäuferangaben, nicht aus Trodat-Datenblatt).
Quellen: https://www.stempel-fabrik.de/Trodat-Printy-Classic-4750/L-Dater-41x24-mm-Bezahlt-Gebucht-Gescannt-o.-Eingegangen-Datumstempe.html ; https://www.bueromarkt-ag.de/stempel_trodat_printy-dater_4750l1,p-4750e.html (Böttcher: "rot/blau, Abdruck 40 x 23 mm, Schrifthöhe 4 mm")
**Trodat Professional 5430/L**: gleiche Texte EINGEGANGEN/BEZAHLT/GEBUCHT, blau/rot, Metallgehäuse. https://www.amazon.de/Trodat-Professional-Datumstempel-5430-EINGEGANGEN/dp/B07428CRCX
**Trodat Office Printy 4912 (47 x 18 mm)**: Lagertexte `BEZAHLT, KOPIE, ERLEDIGT, GEPRÜFT, ORIGINAL, GEBUCHT` (ohne Datum), 12,00 EUR.
**Trodat Printy 4817 Dater (Wortband, Abdruck ca. 3,8 x 45 mm)**: 12 Standardtexte `GEFAXT AM, TELEFONIERT AM, EINGEGANGEN AM, BESTELLT AM, ERLEDIGT AM, GEBUCHT AM, BEZAHLT AM, BETRAG ERHALTEN AM, KONTROLLIERT AM, VERSENDET AM, FAKTURIERT AM ...`, Farben Schwarz, Blau, Grün, Rot, Violett.
**Holzstempel**: `BETRAG IN BAR ERHALTEN`.
Quelle: https://www.stempel-bestellen.com/stempel-bezahlt.html
**Colop Printer 55 Dater (60 x 40 mm, 8 Zeilen, Datum mittig 28 x 11 mm)**: Mindestschriftgröße 6 pt, Mindestlinienstärke 1 pt, Vollflächen drucken nicht scharf. Farben Schwarz, Rot, Grün, Violett, Blau, Blau/Rot. 54,50 EUR.
Quelle: https://www.stempel-fabrik.de/Colop-Printer-55-Dater-60x40-mm-8-Zeilen.html
**Colop Printer 20**: Platte max. 38 x 14 mm; **Colop EOS 12**: 64 x 8 mm. Quelle: https://www.stempelhof.de/stempelplatte-fuer-colop-printer-20-tl-colop20.html

### 1.4 Stempelfarben (Tinte)
Trodat 7011 (Büro-Stempelfarbe, ölfrei, "farbstark, sehr ergiebig, relativ gut lichtecht", "~15 sec wischfest (Papier)"); Trodat-Kissen gelten als "dokumentenecht" (DIN 14145-2 laut stempel-fabrik). Fünf Standardfarben: Schwarz, Blau, Rot, Grün, Violett (+ ungetränkt, + zweifarbig Blau/Rot).
Quellen: https://www.stempelpool.de/stempelfarbe/stempelfarbe-trodat-7011-28ml.html ; https://www.stempel-versand.ch/de/trodat-ersatzkissen-6-4750-zu-2-stueck
**RGB-Werte laut Händler Böttcher AG (medium confidence, nur im Suchsnippet sichtbar, Seite per Fetch nicht lesbar):**
- Rot: RGB 226/0/60 = `#E2003C`
- Blau: RGB 0/94/168 = `#005EA8`
- Violett: RGB 56/55/140 = `#38378C`
- Grün: RGB 0/154/133 = `#009A85`
- Schwarz: 0/0/0
Quelle: https://www.bueromarkt-ag.de/stempelfarbe_trodat_7011_rot,p-7011r.html
Praxisbeobachtung (medium): Rot ist die Standardfarbe für Vermerk-/Datumsstempel ("EINGEGANGEN" in Rot), Blau für Firmen-/Adressstempel und Unterschriftsnähe, Violett historisch bei Behörden/Post, Grün selten (Buchhaltungs-Freigabe). Abdrücke sind nie 100 % deckend: ungleichmäßige Kanten, leichte Verdrehung von 1 bis 4 Grad, Ränder heller als Mitte.

### 1.5 GoBD-Bezug: Farbe hat Beweisfunktion
GoBD Rz. 137: "Eine vollständige Farbwiedergabe ist erforderlich, wenn der Farbe Beweisfunktion zukommt (z. B. Minusbeträge in roter Schrift, Sicht-, Bearbeitungs- und Zeichnungsvermerke in unterschiedlichen Farben)." Das heißt: Die digitale Entsprechung des Stempels (Freigabevermerk) muss farbig und unverwechselbar sein und im Archiv-PDF/Protokoll erhalten bleiben.
Quelle: BMF GoBD 28.11.2019 (DATEV-Spiegel) https://www.datev.de/content/dam/markenassets/themen-und-produktgruppen/zielgruppen/zielgruppenuebergreifend/gobd/bmf_gobd_neufassung_2019.pdf

---

## 2. Belegprüfschritt in Rechnungsverarbeitungs-/Buchhaltungs-Tools (Muster, nicht kopieren)

### 2.1 Candis (Freigabe-Workflow)
- Klick auf Rechnung öffnet "die Rechnungsdaten, das Belegbild und den aktuellen Freigabeprozess".
- Buttons "Freigeben" und "Ablehnen" **rechts unten**; Ablehnen öffnet Fenster "Grund für die Ablehnung" (Pflicht).
- Fortschritt "unten rechts in der Freigabeübersicht": "Schritt 2/4", zugewiesene Nutzer/Teams/dynamische Felder, Kreis-Symbole leer/ausgefüllt pro Schritt.
- Workflow = vordefinierte Abfolge von Freigabeschritten; Einzel-/Gruppenfreigaben, Stellvertreterregelung; Kommentar-Funktion mit E-Mail-Benachrichtigung; "Automatische Pflichtfeld-Überprüfung"; KI-Erkennung "91 %-Genauigkeit".
Quellen: https://hilfe.candis.io/de/articles/258607-ich-muss-eine-rechnung-freigeben-was-mache-ich ; https://hilfe.candis.io/de/articles/257632-workflows-erstellen-und-zuordnen ; https://www.candis.io/blog/rechnungsfreigabe

### 2.2 Lexware Office (Belegerfassung)
Feldreihenfolge der Maske: 1 `Belegtyp` (Dropdown) · 2 `Kunde/Lieferant` (Kontaktfeld; Avatar-mit-Häkchen = gespeicherter Kontakt, durchgestrichener Avatar = Einmalkontakt) · 3 `Belegnummer` · 4 `Belegdatum` · 5 `Beschreibung` · 6 `Zahlart` (offen / privat bezahlt / Lastschrift / Kasse) · 7 `Fälligkeitsdatum` (default = Belegdatum) · 8 `Art der Ausgabe` (Kategorie, suchbar nach Firmenname "Aral", Stichwort "Benzin" oder Kontonummer "4530") · 9 `Steuer` (7 %, 19 %, keine). Belegbild-Viewer, mehrseitige Belege, Zwischenspeichern, Statusanzeige. OCR läuft im Hintergrund und füllt Felder vor.
Quelle: https://help.lexware.de/de-form/articles/548136-belege-richtig-erfassen ; https://office.lexware.de/steuerberater/funktionen/belege-erfassen/

### 2.3 sevdesk (Belege erfassen v2)
"links den Beleg hochladen und rechts alle dazugehörigen Informationen eintragen". Automatisch erkannt: Datum, Betrag, Belegnummer, Lieferant, Kategorie; "Erkannte Felder werden mit einem Rahmen markiert". Weitere Felder: `Kategorie/Buchungskonto` (ca. 1500 Optionen), `Verknüpfungen`, `Währung`, `Umsatzsteuerregelung`, `Besteuerungsart` (Brutto/Netto). Formate PDF (mehrseitig), PNG, JPG. Abschluss "Speichern".
Quelle: https://hilfe.sevdesk.de/de/articles/9453113-belege-erfassen ; https://sevdesk.de/belege-erfassen/

### 2.4 Haufe PowerHaus "Digitale Belegerfassung" (Hausverwaltungssoftware, Handbuch 2023, lokal ../ph.txt)
Das ist die direkteste Branchenreferenz:
- Fensteraufbau "Rechnung erfassen": "Im oberen Fensterbereich wird der aktuelle Rechnungsstatus angezeigt ... Darunter angeordnet ist der Bereich Rechnungsdaten ... Im rechten Fensterbereich wird das eingescannte Rechnungsdokument ergänzt." (Daten links, Belegbild rechts.)
- Kopffelder wörtlich: `Lieferant` (Rechnungssteller, aus Adressverwaltung), `Re. Nummer Ext` (externe Rechnungsnummer, muss je Lieferant eindeutig sein, Duplikat gibt Hinweis), `Re. Datum`, `Rechnungseingangsdatum` (muss nach Re. Datum liegen), `Fälligkeit` (nicht vor Re. Datum), `Re. Betrag Brutto`, `Objekt` (Zuordnung; zieht Bankverbindung des Objekts), `Skonto 1 ... / Skonto 2` (Prozent ODER Betrag, gegenseitig gesperrt, jeweils mit Zieldatum; "zuerst die terminlich kürzere Skontobedingung").
- Buchungspositionen: `Konto` (Bankkonto des Objekts), `Sachkonto / Personenkonto` (Sachkonten des Objekts), `Brutto`, `Netto`, `Steuer`, `Steuersatz` (vorbelegt aus Sachkonto), `§ 35a Betrag` (haushaltsnahe Dienstleistungen, Prozent oder Betrag), `Einheit` (Zuordnung zu Verwaltungseinheit), `manuell eingeben` (Checkbox zur Netto/Steuer-Bearbeitung). Summen der Positionen unter Spalten Netto/Brutto; "wird hinter der Gesamtsumme ein grünes Häkchen angezeigt", wenn Positionen = Rechnungsgesamtbetrag; sonst Hinweis beim Speichern; Restbetrag wird mitgeführt.
- Prüfzyklus: Prüfvorlagen mit mehreren Prüfschritten, je Schritt eine Benutzergruppe und optional ein externer Prüfer (aus Adressverwaltung, z. B. Beirat); `Betragslimit` pro Vorlage, wird beim Start automatisch mit Rechnungsbetrag verglichen; Prüfer bewertet Schritt mit Option `Prüfung OK` (+ optionale Begründung) bzw. "Prüfschritt ist nicht in Ordnung"; Buttons `Prüfung durchgeführt` → letzter Schritt `Prüfung abschließen` → "Rechnungsdokument zur Überweisung freigegeben", interne Belegnummer wird angezeigt; `Nächste prüfen` (Pfeiltasten blättern durch Prüfliste).
- **Statusfolge wörtlich:** `In Erfassung` → `In Bearbeitung` → `In Prüfung` → `Erledigt` (nach Prüfung/Überweisung); Sonderstatus `Verworfen` (nicht mehr editierbar, bleibt sichtbar) und `Storniert` (gebuchte Rechnung storniert).
- Nicht bestandene Prüfung: Rechnung wandert zurück "in die Liste der zu bearbeitenden Belege".
- Rollen: Nutzer mit Rolle "Belegprüfer" bekommt Rechte auf Kategorie "Rechnung" und nur auf Belege bestimmter Objektnummern.
Quelle: https://assets-global.website-files.com/645224237dd89d1a436b6791/653773a2cdb4c6829bd6f90e_PowerHaus_Erweiterung_Digitale_Belegerfassung%20.pdf ; https://vdiv.de/publikationen/magazine/detail/3-fragen-an

### 2.5 Immoware24 (Hausverwaltung)
- Rechnungen werden "bereits als offene Posten gebucht (Kreditorenbuchhaltung)", Rechnungsbetrag wird "einer Ausgabenart und einem Gläubiger (Dienstleister) zugeordnet". Sollstellungen (z. B. Mietforderungen) einzeln, je Objekt oder je Verwaltungsart; "Die Forderung wird den Einnahmearten und einem Schuldner (Mieter) zugeordnet." Unter `Buchungen – offene Posten` alle unbezahlten Rechnungen und Sollstellungen.
- Buchungsassistenten (Objektmenü → Buchungen): Anfangsbestand, Sollstellung/automatische Sollstellung, "Rechnung mit Erfassung § 35 EStG und Skonto", benutzerdefinierte Buchung, Bank-Umbuchung, Kosten-Umbuchung, Debitor für Zahlungen ohne offene Posten, wiederkehrende Rechnungen (Abschläge Versorger), Rücklagen (Zuführung/Entnahme), Rücklastschrift, Ratenzahlung.
- Voraussetzung fürs Buchen: Dienstleister/Handwerker im Objekt angelegt und Kostenkonto im Kontenplan des Objekts vorhanden. Buchungsstapel: Freigabe durch anderen Nutzer, Weiterleitung an Objektbetreuer; Pfade `Rechnungswesen → Buchungen → Buchungsstapel → neue Stapel-Buchung` oder `Posteingang → Buchung erstellen → neue Buchung im Buchungsstapel`.
- Marketingbegriffe: "wiederkehrende Sollstellungen für Mieten, Hausgelder und Vorauszahlungen", "flexible Kontenrahmen für Miet-, WEG- & SE-Verwaltung", "Buchen Sie auf Sach-, Debitoren- und Kreditorenkonten", DATEV-Export/-Schnittstelle, "mehrstufige Mahnläufe mit automatischer Berechnung von Zinsen", Kontoauszug-Import/Abgleich. Zyklus: Erfassen → Abwickeln → Überwachen → Abschließen ("Perioden GoBD-konform abschließen").
Quellen: https://content.immoware24.de/content/manual/3_Wichtige_Einstiegstipps.pdf (Handbuch v26, 03/2026) ; https://www.immoware24.de/funktionen/buchhaltung/ ; https://support.immoware24.de/hc/de/articles/360021131178-Buchen-von-Rechnungen (403 beim Fetch, Inhalt aus Suchsnippet) ; https://support.immoware24.de/hc/de/articles/25485469039901-Buchungsstapel-anzeigen

### 2.6 Flowwer (Vier-Augen-Prinzip)
Rollen Prüfer (Korrektheit) und Freigeber (Zahlung); "Eine Person darf nicht in zwei Prüfstufen aktiv werden, auch nicht als Vertretung" ("Scheinlösung"); globale Vertretungslösung mit automatischer Erkennung bereits beteiligter Personen; Beispiel Betragsgrenze "Jede Rechnung über 500 Euro muss vom Fachbereichsleiter und zusätzlich vom kaufmännischen Leiter freigegeben werden"; "Jede Freigabe wird protokolliert", "100 % revisionssicher & GoBD-konform", Übergabe an DATEV, AGENDA, Addison.
Quellen: https://www.flowwer.de/vier-augen-prinzip-rechnungsfreigabe/ ; https://www.flowwer.de/

### 2.7 finway / GetMyInvoices / Spendesk (nur Sekundärquellen, low)
finway: regelbasierte Workflows, Freigeber je Betrag/Team, Budget + Verantwortlicher je Kostenstelle, "Buchungsvorschlag" wird gebündelt an Fibu übergeben. GetMyInvoices: OCR + GoBD-Archiv, Import aus 10.000+ Portalen. Keine belastbaren Screen-Beschreibungen gefunden.
Quellen: https://finway.de/produkt/rechnungsverarbeitung/ ; https://www.getmyinvoices.com/en/

### 2.8 Abgeleitete Konventionen (Muster, kein Kopieren)
1. **Zweispaltiger Prüfschirm**: Belegbild auf einer Seite (sevdesk links, PowerHaus rechts), Datenformular auf der anderen. Konvention ist "Bild und Daten gleichzeitig sichtbar", Seite ist frei wählbar.
2. **Erkannte Werte werden im Bild markiert** (sevdesk "Rahmen"), Felder werden vorbefüllt und gelten als Vorschlag, nicht als Wahrheit.
3. **Kopf-/Fußdaten oben, Positionen/Kontierung als Tabelle darunter**, Summenkontrolle mit Häkchen wenn Positionen = Gesamtbetrag (PowerHaus), Restbetrag sichtbar.
4. **Status als linearer Lebenszyklus** mit klaren deutschen Namen: In Erfassung → In Bearbeitung → In Prüfung → Freigegeben/Erledigt; Ausnahmen Verworfen, Storniert, Abgelehnt (mit Pflichtgrund).
5. **Freigabe-Aktionen rechts unten** (Candis), Fortschritt "Schritt n/m" mit Kreisen; Prüfer bewertet je Schritt OK / nicht OK mit optionaler Begründung.
6. **Harte Validierungen**: Rechnungseingangsdatum ≥ Rechnungsdatum, Fälligkeit ≥ Rechnungsdatum, externe Rechnungsnummer je Lieferant eindeutig (Duplikatwarnung), Skonto Prozent XOR Betrag, kürzere Skontofrist zuerst.
7. **Objektbezug ist Pflicht in der Hausverwaltung**: Objekt → Bankkonto des Objekts → Kontenplan des Objekts → Einheit (optional je Position) → Umlageschlüssel.
8. **Vier-Augen**: Erfasser ≠ Prüfer ≠ Freigeber; Vertretung darf keine zweite Stufe derselben Person erzeugen; Betragslimits steuern Anzahl Stufen.

---

## 3. Deutsche Formate und Branchenbegriffe

### 3.1 Beträge (DIN 5008)
- Geldbeträge: Dreiergruppen von rechts, Trennung mit Punkt bei Geldbeträgen ("1.234,56 €"); für sonstige Zahlen empfiehlt DIN 5008 (2020) das Leerzeichen ("50 000 000 Besucher"), vierstellige Zahlen ungegliedert ("1500 Exemplare"). Dezimalkomma. Leerzeichen zwischen Betrag und Währung. Währung als ISO-4217-Code (EUR) im Finanz-/Tabellenkontext, "€" oder "Euro" im Fließtext.
- Empfehlung für die App: Tabellen `1.234,56 EUR` oder Spaltenkopf "Betrag (EUR)" und Zellen `1.234,56`; im Fließtext `1.234,56 €`. Negative Beträge: `-1.234,56` (Minus als U+2212 oder Hyphen-Minus, konsistent), nie in Klammern (unüblich in DE).
- Implementierung: `new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'})` liefert `1.234,56 €` (geschütztes Leerzeichen U+00A0). Für "EUR": `{style:'currency', currency:'EUR', currencyDisplay:'code'}` → `1.234,56 EUR`.
Quellen: https://www.din-5008-richtlinien.de/startseite/zahlen/ ; https://www.haufe-akademie.de/blog/themen/assistenz-und-office-management/din-5008/ ; https://www.typolexikon.de/zahlengliederung/

### 3.2 Datum (DIN 5008)
- Numerisch: `23.08.2026` (TT.MM.JJJJ, führende Nullen); DIN 5008 erlaubt auch ISO `2026-08-23`; alphanumerisch `23. August 2026`. In Briefen und UI für deutsche Nutzer: `23.08.2026`. Uhrzeit `14:05 Uhr`.
- Implementierung: `Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'})` → `23.08.2026`.
Quellen: https://www.din-5008-richtlinien.de/startseite/datum/ ; https://en.wikipedia.org/wiki/DIN_5008

### 3.3 IBAN/BIC (DIN 5008, ISO 13616-1, EBS 204)
- "The IBAN will be divided from left to right after every fourth character by a space": `IBAN DE89 1234 4762 4758 1234 00` (deutsche IBAN 22 Zeichen = 5 Vierergruppen + Zweiergruppe). BIC ungegliedert: `ERFBDE8E759`. Alte BLZ: `BLZ 416 700 27`.
- Implementierung: `iban.replace(/\s+/g,'').toUpperCase().replace(/(.{4})/g,'$1 ').trim()`; Eingabefeld mit `font-variant-numeric: tabular-nums`, Maskierung nur Anzeige, Speicherung ohne Leerzeichen (elektronische Form ohne Leerzeichen).
Quellen: https://www.din-5008-richtlinien.de/startseite/iban-bic/ ; https://www.arbeiten-im-sekretariat.de/blog/2015/03/05/din-5008-iban-bic/

### 3.4 Rechnungsnummern
- Gesetz: § 14 Abs. 4 Nr. 4 UStG "eine fortlaufende Nummer mit einer oder mehreren Zahlenreihen, die zur Identifizierung der Rechnung vom Rechnungsaussteller einmalig vergeben wird". Mehrere Nummernkreise erlaubt; Lücken erlaubt wenn erklärbar (Storno). Quelle: https://www.gesetze-im-internet.de/ustg_1980/__14.html
- Konventionen: `RE-2026-00001` (Jahrespräfix, Neustart je Jahr), `RE-2026-05-18-00001`, Präfixe RE (Rechnung), AN/AG (Angebot), GS (Gutschrift), MA (Mahnung), AB (Auftragsbestätigung), LS (Lieferschein). Quellen: https://kostenlose-erechnung.de/ratgeber/rechnungsnummer-system-pflichten/ ; https://www.easybill.de/ratgeber/rechnungsnummer/ ; https://help.lexware.de/de-form/articles/548680-jahreswechsel-so-gehen-sie-mit-rechnungsnummern-richtig-um
- GoBD Rz. 77: Belegnummer "z. B. Index, Paginiernummer, Dokumenten-ID, fortlaufende Rechnungsausgangsnummer"; Fremdbelegnummer verwendbar, wenn eindeutig. Interne Belegnummer (Eingangsnummer) zusätzlich zur Lieferanten-Rechnungsnummer ist üblich (PowerHaus: "interne Belegnummer" bei Abschluss der Prüfung; GoBD Rz. 50: "laufende Nummerierung der eingehenden und ausgehenden Rechnungen").

### 3.5 Kunden-/Personenkontonummern (DATEV-Konvention)
- DATEV-Standard: Debitoren `10000` bis `69999`, Kreditoren `70000` bis `99999` (bei 4-stelligen Sachkonten, Personenkonten immer eine Stelle länger; Sachkontenlänge 4 bis 8 → Personenkonten 5 bis 9 Stellen; bei Verlängerung wird rechts eine 0 angehängt). Sammelkonten `10000` (Debitoren) / `70000` (Kreditoren) als Fallback.
- Praxis: Kundennummer = Debitorennummer (z. B. 10001 aufwärts), Lieferantennummer = Kreditorennummer (70001 aufwärts); in der Hausverwaltung oft objektbezogene Nummern (Objekt-Nr. + Einheit + Mieter-Lfd.).
Quellen: https://info.orgamax.de/faq/debitoren-und-kreditorennummer-unter-orgamax-fuehren ; https://www.datev-community.de/t5/Betriebliches-Rechnungswesen/Debitoren-Kreditorennummern-erweitern/td-p/95657 ; https://wissensplattform.apps.datev.de/help/document/1025373 (JS-Seite, nicht fetchbar)

### 3.6 Anrede / Grußformel (DIN 5008)
- Anrede zwei Leerzeilen nach Betreff, linksbündig, endet mit Komma, danach eine Leerzeile, Text beginnt klein weiter: `Sehr geehrte Damen und Herren,` / `Sehr geehrte Frau Müller,` / `Sehr geehrter Herr Dr. Schmidt,`. Bei mehreren Personen: Frau zuerst bzw. Ranghöhere zuerst; Titel (Dr., Prof.) werden mitgeführt, akademische Grade ohne "Herr Dr." Doppelung nur bei Prof. üblich.
- Grußformel eine Leerzeile nach Text: `Mit freundlichen Grüßen` (Standard, ohne Komma), Varianten `Freundliche Grüße`, `Mit freundlichen Grüßen aus Berlin`. Danach Firmenname (eine Leerzeile), drei Leerzeilen für Unterschrift, darunter maschinenschriftlicher Name (Vorname ausgeschrieben). Vertretungszusätze `i. A.` (im Auftrag), `i. V.` (in Vertretung/Vollmacht), `ppa.` (Prokura) vor dem Namen.
- Für Mahnungen üblich: "Sehr geehrte Damen und Herren," + Sachlichkeit; Mahnstufen "Zahlungserinnerung", "1. Mahnung", "2. Mahnung", "Letzte Mahnung".
Quellen: https://www.din-5008-richtlinien.de/startseite/grussformel/ ; https://www.wirtschaftsdeutsch.de/lehrmaterialien/korrespondenz-anrede-unterschrift.pdf ; https://www.haufe-akademie.de/blog/themen/assistenz-und-office-management/din-5008/

### 3.7 Branchenvokabular (mit Rechtsquelle)
- **Beleg**: jeder Nachweis eines Geschäftsvorfalls, "Auf die Bezeichnung als 'Beleg' kommt es nicht an" (GoBD Rz. 61). Belegarten Rz. 62: Aufträge, Auftragsbestätigungen, Bescheide, Kontoauszüge, Gutschriften, Lieferscheine, Lohnabrechnungen, Barquittungen, Rechnungen, Verträge, Zahlungsbelege.
- **Kontierung / Kontierungsvermerk**: Zuordnung zu Konto/Gegenkonto; Handelsbriefe werden "erst mit dem Kontierungsvermerk und der Verbuchung" zum Buchungsbeleg (Rz. 63). Elektronisch reicht "Verbindung mit einem Datensatz mit Angaben zur Kontierung oder eine elektronische Verknüpfung (z. B. eindeutiger Index, Barcode)" (Rz. 64).
- **Sollstellung**: Buchung der periodisch wiederkehrenden Forderung (Miete, Hausgeld) als offener Posten auf dem Debitor, bevor Zahlungen zugeordnet werden ("Sollstellungslauf ist der erste Schritt ... Es kann kein Zahlungslauf ... ohne vorherigen Sollstellungslauf"). Quelle: https://easimo-gmbh.helpscoutdocs.com/article/61-sollstellung ; https://www.digisoft.de/Anleitung/TermineSollstellungen.html
- **Hausgeld** (auch "Wohngeld"): monatlicher Vorschuss der Wohnungseigentümer nach Wirtschaftsplan, inkl. Zuführung zur Erhaltungsrücklage. Quelle: https://fibucom.com/weg-thema/hausgeldabrechnung/1432-rechnungslegung-wirtschaftsplan-hausgeld-und-jahresabrechnung-was-bedeuten-diese-begriffe
- **Wirtschaftsplan / Jahresabrechnung / Vermögensbericht**: § 28 Abs. 1 WEG: Verwalter stellt "jeweils für ein Kalenderjahr einen Wirtschaftsplan" auf (Vorschüsse zur Kostentragung und zu Rücklagen, voraussichtliche Einnahmen/Ausgaben); Abs. 2: Jahresabrechnung → Beschluss über Nachschüsse/Anpassung; Abs. 3: Fälligkeit per Beschluss; Abs. 4: Vermögensbericht (Stand der Rücklagen, wesentliches Gemeinschaftsvermögen). Quelle: https://www.gesetze-im-internet.de/woeigg/__28.html
- **Erhaltungsrücklage** (früher Instandhaltungsrücklage): § 19 Abs. 2 Nr. 4 WEG "die Ansammlung einer angemessenen Erhaltungsrücklage". Quelle: https://www.gesetze-im-internet.de/woeigg/__19.html
- **Sondereigentum / Teileigentum / Gemeinschaftliches Eigentum / Miteigentumsanteil**: § 1 WEG Abs. 2: "Wohnungseigentum ist das Sondereigentum an einer Wohnung in Verbindung mit dem Miteigentumsanteil an dem gemeinschaftlichen Eigentum"; Abs. 3 Teileigentum (nicht Wohnzwecke); Abs. 5 gemeinschaftliches Eigentum = Grundstück und Gebäude, soweit nicht Sondereigentum. Quelle: https://www.gesetze-im-internet.de/woeigg/__1.html
- **Verwaltungsbeirat**: § 29 WEG, "unterstützt und überwacht den Verwalter", prüft Wirtschaftsplan und Jahresabrechnung vor Beschluss und gibt Stellungnahme ab. Quelle: https://www.gesetze-im-internet.de/woeigg/__29.html
- **Zertifizierter Verwalter**: § 19 Abs. 2 Nr. 6 / § 26a WEG.
- **Objekt / Verwaltungseinheit (VE) / Einheit / Mieteinheit / Nutzungseinheit**: Objekt = Liegenschaft (Mehrfamilienhaus); Verwaltungseinheiten = Wohnungen, Gewerbeflächen, Garagen/Stellplätze (mit eigenem Grundbuchblatt), Kellerabteile; Abrechnung der Verwaltervergütung pro Einheit/Monat oder prozentual. Immoware24 nutzt "Gebäude → VE → Zähler". Quelle: https://reasy.de/blog/verwaltungseinheit/ ; Immoware24-Handbuch
- **Verwaltungsarten**: WEG-Verwaltung, Mietverwaltung, SE-Verwaltung (Sondereigentumsverwaltung = Vermietung der Eigentumswohnung für den Eigentümer). Immoware24: "Miet-, WEG- & SE-Verwaltung".
- **Umlageschlüssel**: Verteilschlüssel für Kosten (MEA, Wohnfläche, Personen, Einheiten, Verbrauch).
- **Mieteingangsliste / Mietaufstellung / Mietstand**: Spalten laut Sparkassen-Formular: `Einheit-Nr.` | `Lage im Gebäude (z. B. EG links)` | `Mieter / Leerstand` | `seit` | `Nutzung als (Whg., Büro, Laden, Lager etc.)` | `Mietfläche` | `mtl. Nettokaltmiete` | `Anzahl Stellplatz (SP) / Carport (CP) / Garage (G) / Tiefgarage (TG)` | `mtl. Miete`; Zeile `Summe`; Fuß `Ort / Datum`, `Unterschrift`. Für Soll/Ist-Listen zusätzlich `Soll`, `Ist`, `Differenz`, `Rückstand` (Rückstandsampel). Quelle: https://www.sparkasse-unnakamen.de/content/dam/myif/spk-unna-kamen/work/dokumente/pdf/allgemein/mietaufstellung.pdf ; https://excel-planung.com/vorlage/mietaufstellung-vorlage-excel/
- **Weitere Begriffe** aus Immoware24/PowerHaus: Kreditor (Dienstleister/Lieferant), Debitor (Mieter/Eigentümer), offene Posten (OP), Buchungsstapel, Posteingang, Rechnungseingangsbuch, Kostenkonto/Sachkonto/Ausgabenart/Einnahmeart, Rücklastschrift, SEPA-Mandatsreferenz, Mahnlauf, Überweisungslauf, § 35a EStG (haushaltsnahe Dienstleistungen, Anteil je Rechnung ausweisen), Rücklagenzuführung/-entnahme.

### 3.8 GoBD-Pflichtfelder je Beleg (für das Datenmodell und die UI-Vollständigkeitsprüfung)
GoBD Rz. 77 (BMF 28.11.2019, geändert 11.03.2024 und 14.07.2025): Jedem Geschäftsvorfall muss ein Beleg zugrunde liegen mit
- Eindeutige Belegnummer (Index, Paginiernummer, Dokumenten-ID, fortlaufende Rechnungsausgangsnummer; Fremdbelegnummer zulässig wenn eindeutig)
- Belegaussteller und -empfänger
- Betrag bzw. Mengen-/Wertangaben, aus denen sich der Buchungsbetrag ergibt
- Währungsangabe und Wechselkurs bei Fremdwährung
- Hinreichende Erläuterung des Geschäftsvorfalls
- Belegdatum (zwingend, "evtl. zusätzliche Erfassung der Belegzeit bei umfangreichem Beleganfall")
- Verantwortlicher Aussteller, soweit vorhanden
Rz. 85: zusätzlich Erfassungsdatum (wenn ≠ Buchungsdatum) und Angabe der "Festschreibung". Rz. 94 (Journal): Belegnummer, Buchungsbetrag, Währung, Erläuterung, Belegdatum, Buchungsdatum, Erfassungsdatum, Autorisierung, Buchungsperiode/Voranmeldungszeitraum, Umsatzsteuersatz, Steuerschlüssel, Umsatzsteuerbetrag, Konto/Gegenkonto.
Rz. 47/50: unbare Geschäftsvorfälle innerhalb von zehn Tagen erfassen; Kasse täglich (Rz. 48); Rz. 49: Waren-/Kostenrechnungen, die innerhalb von acht Tagen beglichen werden, müssen nicht kontokorrentmäßig erfasst werden.
Rz. 58/107: keine Änderung, bei der "der ursprüngliche Inhalt nicht mehr feststellbar ist"; Rz. 59/110: Protokollierung, Festschreibung, Löschmerker, Historisierung, Versionierung; "Die Ablage ... in einem Dateisystem erfüllt die Anforderungen der Unveränderbarkeit regelmäßig nicht". Rz. 109: unzulässig sind "Vorerfassungen und Stapelbuchungen ... bis zur Erstellung des Jahresabschlusses ... offen gehalten".
Rz. 136: Organisationsanweisung fürs Scannen (wer, wann, was, bildlich/inhaltlich, Qualitätskontrolle, Fehlerprotokoll); Rz. 139: nach Scan nur noch elektronisch weiterbearbeiten, Papier dem Bearbeitungsgang entziehen; Rz. 140: Papier darf vernichtet werden.
2025-Änderung (BMF 14.07.2025, GZ IV D 2 - S 0316/00128/005/088): bei E-Rechnungen genügt Aufbewahrung des strukturierten Teils; PDF-Teil einer ZUGFeRD-Rechnung nur aufbewahren, wenn "zusätzliche oder abweichende Informationen enthalten sind ... (z. B. Buchungsvermerke)" (Rz. 119/131); OCR-Anreicherung "nach Verifikation und Korrektur ebenfalls aufzubewahren" (Rz. 131).
Quellen: DATEV-Spiegel des BMF-Schreibens 2019 (lokal ../gobd2019.txt) https://www.datev.de/content/dam/markenassets/themen-und-produktgruppen/zielgruppen/zielgruppenuebergreifend/gobd/bmf_gobd_neufassung_2019.pdf ; BMF 14.07.2025 https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Weitere_Steuerthemen/Abgabenordnung/2025-07-14-GoBD-2-aenderung.pdf?__blob=publicationFile&v=3

---

## 4. Typografie und Farbe

### 4.1 Vollkorn (Display/Serif)
- Designer Friedrich Althausen, erste Veröffentlichung 2005 als Studienarbeit an der Bauhaus-Universität Weimar; seit 19.05.2010 SIL OFL 1.1 (vorher CC BY 2.0 DE); "pay what you want". Name = "Brotschrift" (Handsatz-Begriff für Alltagsschrift); Charakter laut Autor: "a quiet, modest and well working body copy typeface" mit "dark and meaty serifs and a bouncing and healthy look". Fontlog-Version 4.106 (Mai 2018); GitHub-Repo liefert **Version 5.000** als Variable Font, Google Fonts liefert **5.001** (lastModified 2025-09-11).
- Gewichte: Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800, Black 900, jeweils mit Italic (12 Schnitte); Variable Font `Vollkorn[wght].ttf` Achse wght 400–900, `Vollkorn-Italic[wght].ttf`, separat `VollkornSC[wght].ttf` (Kapitälchen-Familie). Über 2000 Glyphen (Latin, Kyrillisch, Griechisch, Vietnamesisch).
- **OpenType-Features, lokal per fontTools geprüft (GitHub Vollkorn[wght].ttf v5.000):** aalt, c2sc, calt, case, ccmp, dlig, dnom, frac, hist, hlig, liga, lnum, locl, mgrk, numr, onum, ordn, pnum, rlig, rvrn, salt, smcp, ss01–ss05, ss11, ss13, ss14, ss17, subs, sups, titl, tnum, zero. 451 Kapitälchen-Glyphen. Euro vorhanden.
- **Ziffern-Default = proportionale Mediävalziffern (oldstyle)**: Standard-Vorschubbreiten der Ziffern sind ungleich (601/388/537/513/597/481/506/485/508/519 Einheiten). Für Geldspalten zwingend `font-variant-numeric: lining-nums tabular-nums` (Features `lnum` + `tnum`; Glyphen `.lf`, `.tf`, `.tosf` vorhanden).
- **Google-Fonts-Build (v5.001, Latin-Subset)** enthält GSUB nur: calt, ccmp, dnom, frac, liga, lnum, locl, numr, pnum, rvrn, tnum. **Kein smcp** (Kapitälchen nur über die separate Familie "Vollkorn SC" auf Google Fonts oder Self-Hosting der GitHub-TTF) und kein onum (unnötig, da Default schon oldstyle). Also: lining/tabular klappt mit Google Fonts, Kapitälchen nicht.
- Italic: 1835 Glyphen, ebenfalls lnum/tnum/onum/pnum, keine Kapitälchen.
- beautifulwebtype: Default "Proportional Oldstyle (pnum, onum)", Charakter "dunkel, robust und körnig".
Quellen: https://github.com/FAlthausen/Vollkorn-Typeface/blob/master/Fontlog.txt ; https://github.com/FAlthausen/Vollkorn-Typeface ; https://www.beautifulwebtype.com/vollkorn/ ; https://fonts.google.com/specimen/Vollkorn ; lokale Prüfung ../fonts/

### 4.2 Source Sans 3 (UI/Body Sans)
- Designer Paul D. Hunt, Adobe, erste Open-Source-Familie von Adobe (2012 als Source Sans Pro, seit 2021 "Source Sans 3"), SIL OFL. Vorbild: amerikanische Gothics von Morris Fuller Benton (News Gothic, Franklin Gothic, Lightline Gothic), größere x-Höhe, humanistische Kursive; "entwickelt für UI-Umgebungen". Aktuelle Version **3.052R** (30.03.2023, GitHub Release 04.04.2023); Google Fonts liefert 3.052 (lastModified 2025-09-04).
- Gewichte: ExtraLight 200 bis Black 900 (7 Schnitte + Italics), Variable Font wght 200–900 (`SourceSans3VF-Upright.otf.woff2`, `SourceSans3VF-Italic`).
- **OpenType-Features, lokal geprüft (Release-VF 3.052):** aalt, c2sc, case, ccmp, cv01–cv19, dlig, dnom, frac, hlig, liga, locl, numr, onum, ordn, pnum, salt, sinf, smcp, ss01–ss10, subs, sups, titl, zero. **Kein `tnum` und kein `lnum`, weil tabellarische Versalziffern der Default sind** (alle Ziffern 472 Einheiten breit); `pnum` schaltet auf proportional, `onum` auf Mediäval. Das erklärt GitHub-Issue #236 ("lnum and tnum missing"), es ist kein Fehler. Für Geldspalten also nichts einstellen; für Fließtext optional `pnum`.
- Google-Fonts-Build (Latin-Subset) enthält nur ccmp, dnom, frac, liga, locl, numr, pnum: **kein smcp, kein onum**. Kapitälchen/Mediävalziffern nur mit Self-Hosting des Release-Fonts.
Quellen: https://en.wikipedia.org/wiki/Source_Sans_3 ; https://github.com/adobe-fonts/source-sans/issues/236 ; https://github.com/adobe-fonts/source-sans/releases/tag/3.052R ; https://www.csstypestudio.com/library/font/source-sans-3 ; lokale Prüfung ../fonts/ss/

### 4.3 CSS-Snippets
```css
/* Geldspalten, IBAN, Belegnummern */
.num { font-variant-numeric: lining-nums tabular-nums; font-feature-settings: "lnum" 1, "tnum" 1; }
/* Vollkorn im Fließtext: Mediävalziffern bleiben default; Kapitälchen mit self-hosted TTF: */
.sc { font-variant-caps: small-caps; font-feature-settings: "smcp" 1; }
/* Source Sans 3: tabular lining ist default; im Fließtext proportional: */
.body { font-feature-settings: "pnum" 1; }
```
Self-Hosting: Vollkorn `fonts/variable/Vollkorn[wght].ttf` (GitHub master, OFL) → woff2 konvertieren; Source Sans `WOFF2-source-sans-3.052R.zip` (GitHub Release). Google-Fonts-Link nur wenn keine Kapitälchen/Mediävalziffern gebraucht werden.

### 4.4 Kontrast (WCAG 2.x, SC 1.4.3 Text 4.5:1 / 3:1 für großen Text, SC 1.4.11 Nicht-Text 3:1), lokal berechnet
Ink #14201a (dunkelgrün-schwarz) gegen Papierkandidaten:
| Farbe | Hex | Kontrast zu Ink #14201a |
|---|---|---|
| Weiß | #ffffff | 16,78 |
| Kalkweiß | #f6f3ec | 15,14 |
| Aktenpapier warm | #f4efe4 | 14,64 |
| Pergament | #f3ead5 | 14,02 |
| Karteikarte graugrün | #e6e9df | 13,65 |
| Recycling grau | #ebe8e0 | 13,71 |
| Chamois (Aktendeckel) | #f1e6c8 | 13,50 |
| Löschpapier grau-oliv | #e3e4d8 | 13,07 |
| Manila-Karton | #e9d9b0 | 12,00 |
| Naturbraun (Leitz Alpha Hängemappe) | #d9c9a3 | 10,26 |
Zum Vergleich (zu vermeiden): UI-Kit-Grau #f3f4f6 (15,25), Creme #fdf6e3 (15,56).

Stempelrot auf Papier (Textkontrast; Ziel ≥ 4,5:1):
| Rot | auf #f4efe4 | auf #ffffff | auf #f1e6c8 |
|---|---|---|---|
| Trodat 7011 Rot #e2003c | 4,26 (fail) | 4,88 | 3,93 (fail) |
| #d0122f | 4,81 | 5,51 | 4,43 (fail) |
| #c41230 | 5,27 | 6,04 | 4,86 |
| **#b8102e** | **5,81** | 6,66 | 5,36 |
| #a3122a | 6,84 | 7,84 | 6,31 |
Empfehlung: Stempelrot als Text `#b8102e` (Karminrot, AA auf allen Papiertönen); das hellere `#e2003c` nur als großer Stempelabdruck (≥ 24 px / 18,66 px bold: 3:1 reicht) oder mit `mix-blend-mode: multiply` und Opazität 0,85–0,92 (wirkt wie echte Tinte, Kontrast dann nachmessen).

Weitere Stempel-/Tintenfarben auf #f4efe4: Trodat Blau #005ea8 5,78 (AA) · Violett #38378c 8,75 · Trodat Grün #009a85 3,07 (nur groß) · dunkles Tintengrün #1f4d3a 8,40 · #2a5a42 6,94 · #3f6b52 5,33 (AA, als "gedimmtes Grün" für Sekundärtext) · Blau #1f4e8c 7,25.

Sekundärtext-Inks auf #f4efe4: #4a574f 6,62 · #5f6b64 4,85 (AA-Grenze) · #6b7770 4,07 (nur groß) · #7a857e 3,34 (nur Nicht-Text/Placeholder).

Fokusring (Nicht-Text 3:1 gegen Papier #f4efe4): #14201a 14,64 · #1f4d3a 8,40 · #b8102e 5,81 · #005ea8 5,78 · Ocker #8a6a1f 4,40 · #7a5c12 5,44. Alle erfüllen 3:1.
Formel: WCAG relative Luminanz, (L1+0,05)/(L2+0,05). Skript in dieser Datei reproduzierbar (siehe Bash-Log).

### 4.5 Papier-/Aktentöne (reale Referenzen statt UI-Kit-Grau)
- "chamois" = Standardfarbe deutscher Aktendeckel/Einstellmappen (Falken Manila-RC-Karton 250 g/qm, Leitz Einstellmappe, Elba Canson-Karton): warmes Gelbbeige, digital ca. #f1e6c8 bis #e9d9b0.
- "naturbraun" = Leitz Alpha Hängemappe (1915-00-00) aus Recycling-Natronkarton, ca. #d9c9a3 bis #c9b48a.
- Grünlich-graue Karteikarten/Löschpapier: #e6e9df / #e3e4d8 (beide ≥ 13:1 zu Ink).
Quellen: https://www.pressel.com/leitz-einstellmappe-vertikal-karton-aktendeckel-chamois-a4-100-stuck/cbs/831821.html ; https://www.lz-fachshop.de/Leitz-19150000-Alpha-Haengemappe-Naturbraun-ar1782.aspx (Hex-Werte sind eigene Näherungen, medium)
Empfehlung Palette (ein System, kein Grau-Kit): Seite `#f4efe4` (Aktenpapier), Karten/Belegkarte `#faf7f0` (etwas heller, Kontrast zur Seite über Ton, nicht Linie), Aktendeckel-Akzentfläche `#e9d9b0`, Ink `#14201a`, Ink-2 `#4a574f`, Stempelrot `#b8102e` (Text) / `#e2003c` (Abdruck groß, multiply), Tintenblau `#1f4e8c` (Links, "Unterschrift"), Tintengrün `#1f4d3a` (Freigabe/erledigt). Stempelviolett `#38378c` als seltene Behördenfarbe für "Archiviert/Festgeschrieben".

---

## 5. Interaktions-Konventionen

### 5.1 Tabellen mit Geldbeträgen
- Zahlen rechtsbündig, Text linksbündig, Datum/PLZ als "qualitative Zahlen" links; Ziffern tabellarisch (tnum), Dezimalstellen konstant (immer 2), Einheit/Währung in der Spaltenüberschrift ("Brutto (EUR)"), Summenzeile am Ende bzw. sticky unten; Zeilenhöhen 40 px (condensed) / 48 px (regular) / 56 px (relaxed); Zebra-Streifen vermeiden (Konflikt mit Hover/Disabled), stattdessen 1 px helle Trennlinien im Papierton oder gar keine; Sticky Header, erste Spalte einfrieren, ggf. letzte Spalte mit Summen; Inline-Editing mit Text-Cursor bei Hover; Bulk-Actions erst nach Auswahl anzeigen; Checkboxen bei Hover; Spalten ein-/ausblenden, Breite ändern, "Zurücksetzen".
- Material Design: "Numbers in the column are right-aligned with the column header name".
- NN/g: vier Kernaufgaben einer Tabelle: Datensatz finden, vergleichen, einzeln ansehen/bearbeiten, Aktion auslösen.
Quellen: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables ; https://m2.material.io/components/data-tables/web ; https://www.setproduct.com/blog/data-table-ui-design ; https://medium.com/mission-log/design-better-data-tables-430a30a00d8c (403)
- Deutsch-spezifisch: Summen mit "Summe", "Zwischensumme", "Gesamt", "Netto / USt 19 % / Brutto"; Soll/Haben-Spalten in Buchungsjournalen; negative Beträge in Rot ist Konvention (GoBD Rz. 137 nennt "Minusbeträge in roter Schrift" als Beispiel farbiger Beweisfunktion), aber nie Rot allein: Minuszeichen immer mitführen (WCAG 1.4.1).
- Tastatur (WAI-ARIA APG): Datengrid mit Pfeiltasten zwischen Zellen, Home/End, Ctrl+Home/End; `aria-sort` auf der sortierten Spalte; Sortier-Header als `<button>`; einfache Tabellen bleiben `<table>` ohne grid-Rolle.
Quelle: https://www.w3.org/TR/2021/NOTE-wai-aria-practices-1.2-20211129/examples/table/table.html ; https://bocoup.github.io/aria-practices/examples/grid/dataGrids.html

### 5.2 Drag-and-Drop-Upload (Dropzone)
- Zustände (react-dropzone-Flags als De-facto-Standard): `isDragActive` (etwas wird über die Zone gezogen), `isDragAccept` (Typ/Größe passt), `isDragReject` (passt nicht), `isFocused` (Tastaturfokus), `isFileDialogActive`. Props `accept` (`{'application/pdf': ['.pdf'], 'image/*': ['.png','.jpg','.jpeg','.heic'], 'text/csv': ['.csv'], 'application/xml': ['.xml']}`), `maxSize`, `minSize`, `maxFiles`, `multiple`, `noClick`, `noKeyboard`, `noDrag`, `noPaste` (Einfügen aus Zwischenablage), `useFsAccessApi`. Fehlercodes: `file-too-large`, `file-too-small`, `file-invalid-type`, `too-many-files`. Tastatur: Zone ist fokussierbar (tabIndex 0), Enter/Space öffnet den Dateidialog; Zone selbst `role="presentation"`, Input bleibt echtes `<input type=file>` (kein Uploader: Fortschritt/HTTP separat).
- Weitere Zustände für Business-Software: `idle` (Aufforderung + "Datei auswählen"-Fallback immer sichtbar), `uploading` (Fortschritt pro Datei, abbrechbar), `processing` (OCR/Erkennung läuft, Skeleton statt leerer Felder), `done`, `error` (konkreter Grund + Retry: "PDF ist passwortgeschützt", "Datei größer als 25 MB", "Doppelt: identisch mit Beleg 2026-0143").
- Visuelle Konvention: gestrichelter/gepunkteter Rahmen signalisiert "wird sicher aufgenommen"; Drop-Animation ca. 100 ms; Cursor-Änderung; Accept-Zustand tönt Fläche, Reject-Zustand mit Rot und Erklärung. Immer zusätzlich Klick-Fallback und Einfügen per Strg+V (Screenshots, E-Mail-Anhänge) sowie E-Mail-Postfach-Import als gleichwertigen Weg anbieten.
Quellen: https://raw.githubusercontent.com/react-dropzone/react-dropzone/master/README.md ; https://www.smart-interface-design-patterns.com/articles/drag-and-drop-ux/ ; https://blog.filestack.com/upload-file-ui-design-components-states-and-errors/ ; https://www.saasui.design/blog/saas-file-upload-ux-patterns

### 5.3 Freigabe-Workflow (Vier-Augen-Prinzip)
- Regeln: mind. zwei verschiedene Personen (Prüfer, Freigeber), keine Person in zwei Stufen (auch nicht als Vertretung), Betragsgrenzen bestimmen Stufenzahl (z. B. > 500 EUR zwei Freigaben), Vertretungsregel global mit Kollisionsprüfung, jede Freigabe protokolliert (wer, wann, Schritt, Ergebnis, Begründung), Ablehnung mit Pflichtgrund und Rücksprung in Bearbeitung, Erinnerung bei Fristen (Skonto!), mobil freigebbar.
- Kommunal/öffentlich: Verbot der Selbstkontrolle (Gemeindehaushaltsverordnung); Unternehmen: HGB/GoBD/IKS. GoBD Rz. 100–102: IKS-Beschreibung ist Teil der Verfahrensdokumentation.
- UI-Muster: Fortschritt "Schritt 2/4" mit Kreisen; Freigeben/Ablehnen rechts unten; Prüfoptionen je Schritt "Prüfung OK / nicht OK" + Begründung; nach Abschluss ist der Beleg gesperrt ("kann ab diesem Zeitpunkt nicht mehr geändert werden"); "Nächste prüfen" für Stapelarbeit; Statusbadge oben.
Quellen: https://www.flowwer.de/vier-augen-prinzip-rechnungsfreigabe/ ; https://www.claribill.com/blog/vier-augen-prinzip-rechnungsprozess-rollen ; PowerHaus-Handbuch (oben)

### 5.4 Audit-Log / Protokoll
- Fragen, die jeder Eintrag beantwortet: wer (User, Rolle, Vertretung für wen), was (Objekt: Beleg-ID/Belegnummer), welche Änderung (Feld, alter Wert, neuer Wert), wann (Zeitstempel mit Zeitzone), woher (UI, Import, API, Automation/LLM-Vorschlag), warum (Begründung bei Ablehnung/Storno), `correlation_id` zur Gruppierung einer Aktion.
- Unveränderlich (append-only, keine Updates/Deletes; Korrektur = neuer Eintrag); Feld-Diffs statt Snapshots; Anzeige als Zeitleiste + Diff-Ansicht + Export (Nachweis für Prüfer/Steuerberater).
- GoBD-Konkretisierung: Rz. 58/59/107–111 (Protokollierung von Änderungen, Festschreibung, Historisierung, Versionierung); Rz. 85 "Angabe der Festschreibung"; Rz. 111: auch Änderungen an Stammdaten/Steuerungsdaten (z. B. Steuersätze, Kontierungsregeln) protokollieren; Rz. 60: Nachweis der Kontrollen über Verarbeitungsprotokolle.
- UI-Konvention aus Papierwelt: das Protokoll ist der "Laufzettel"; der Beleg trägt die Vermerke sichtbar (Stempelleiste), das Protokoll liefert die Vollhistorie.
Quellen: https://appmaster.io/blog/audit-logging-internal-tools-activity-feed ; https://letsbuildsolutions.com/blog/system-design/designing-an-audit-log-system-immutable-events-efficient-querying-and-compliance-at-scale/ ; GoBD (oben)

### 5.5 Accessibility-Basics
- WCAG 2.2: 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (Minimum, AA), 2.4.12 (Enhanced, AAA), 2.4.13 Focus Appearance (AAA): Indikatorfläche mind. so groß wie ein 2 CSS-px-Rand des Elements, 3:1 zwischen fokussiert/unfokussiert an denselben Pixeln; 1.4.11 Non-text Contrast 3:1 gegen Nachbarfarben. Praxis: `:focus-visible { outline: 2px solid #14201a; outline-offset: 2px; }`, nie `outline: none` ohne Ersatz, keine 1-px-Haarlinie.
- Tastatur: alles per Tab erreichbar, Reihenfolge = visuelle Reihenfolge; Enter/Space auf Buttons; Escape schließt Dialoge; Freigabe-Aktionen mit Tastenkürzeln (z. B. F = Freigeben nur mit sichtbarem Hinweis); Tabellen s. o.
- Bewegungen: `prefers-reduced-motion` respektieren (s. 6); 2.3.3 Animation from Interactions (AAA) als Ziel.
- Farbe nie alleiniger Träger (1.4.1): Status immer mit Text/Icon; Minus immer als Zeichen.
- Formulare: `<label>` je Feld, Fehlermeldungen mit `aria-describedby`, Pflichtfelder markiert, Zahlfelder `inputmode="decimal"`, Datumsfelder mit deutscher Maske, Autocomplete für Kreditoren.
Quellen: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html ; https://help.siteimprove.com/support/solutions/articles/80000448423-what-is-focus-appearance-wcag-2-4-11- ; https://testparty.ai/blog/wcag-focus-visible-guide

---

## 6. Motion: Stempel, Papier, Akte

### 6.1 Reduced Motion (Pflicht)
- MDN: `@media (prefers-reduced-motion: reduce)` bzw. `no-preference`; "Scaling, Panning, Parallax" sind vestibuläre Trigger; Empfehlung: Standard-Keyframes ohne Bewegung definieren und Bewegung nur unter `no-preference` hinzufügen:
```css
@keyframes stamp-in { from { opacity: 0 } to { opacity: 1 } }              /* reduziert: nur Einblenden */
@media (prefers-reduced-motion: no-preference) {
  @keyframes stamp-in {
    0%   { opacity: 0; transform: scale(1.6) rotate(-8deg); }
    70%  { opacity: 1; transform: scale(0.96) rotate(-3deg); }             /* Aufschlag mit leichtem Overshoot */
    100% { opacity: 1; transform: scale(1) rotate(-3deg); }
  }
  .stamp { animation: stamp-in 220ms cubic-bezier(.2,.9,.3,1.2) both; }
}
```
- web.dev: Bewegung "reduzieren statt entfernen", Opacity/Farbübergänge bleiben ok; JS: `window.matchMedia('(prefers-reduced-motion: reduce)')` mit `change`-Listener (für Motion/Framer: `useReducedMotion()`).
Quellen: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ; https://web.dev/articles/prefers-reduced-motion

### 6.2 Stempel-Aufschlag (Metapher, nicht Kopie)
- Community-Muster (CodePen "stamp animation", "CSS stamp effect"): Rotation von etwa -2° bis -15°, Scale von groß (bis 5×) auf 1 mit Opacity-Einblendung; Grunge über `mask-image`/`-webkit-mask` mit Rausch-Textur; Rand als 3–4 px `border` in Stempelfarbe mit `border-radius` klein; Text in Versalien, letterspacing, `mix-blend-mode: multiply` damit der Abdruck die Belegdarstellung nicht verdeckt; leichte Unschärfe an den Kanten (`filter: blur(0.2px)` oder SVG-Turbulence-Filter `feTurbulence` + `feDisplacementMap`) für "Tinte auf Papier".
Quellen: https://codepen.io/dylango/pen/YPjQMZ ; https://codepen.io/marlafsan/pen/oBawrv ; https://codepen.io/chris22smith/pen/nKGvgO ; https://gist.github.com/A973C/5076039 (Briefmarken-Zackenrand via radial-gradient, background-size 20px, drop-shadow 0 0 10px rgba(0,0,0,.5))
- Authored-Version für dieses Produkt (Vorschlag):
  1. Trigger: Klick auf "Sachlich richtig" / "Freigeben". Kein Auto-Play.
  2. 0–120 ms: Stempel erscheint 1,4× groß, leicht verdreht, Opazität 0 → 1 (ease-out).
  3. 120–200 ms: Aufschlag, Scale 1,4 → 0,97 → 1,0; Rotation bleibt -3°; Papier reagiert nicht (keine Kamerawackler).
  4. 200–260 ms: Tinte "setzt": Opazität 1 → 0,9, `multiply`; Datumszeile im Stempel wird sichtbar (Datum + Kürzel des Nutzers).
  5. Reduced motion: nur Opacity 0 → 0,9 in 150 ms.
  6. Fertiger Abdruck bleibt als statisches Element im Beleg-Header (Stempelleiste), identisch mit dem im PDF-Export/Protokoll gerenderten Vermerk (Farbe erhalten, GoBD Rz. 137).
- Ton: Optionaler kurzer Klick nur bei aktivem Setting, Standard aus.

### 6.3 Blatt einsortieren / Akte
- "Erledigt" schiebt die Belegkarte 24–40 px nach rechts/unten in eine "Ablage" (Transform + Opacity, 250–300 ms, ease-in), die Liste schließt die Lücke (Layout-Animation mit `motion` `layout`-Prop). Bei reduced motion: sofortiges Entfernen + kurze Bestätigungszeile.
- Posteingang: neue Belege "landen" von oben mit 8 px Versatz (nur Y, nie Opacity 0 als Ruhezustand, Inhalt ist immer sichtbar).
- Paginier-/Eingangsnummer läuft beim Anlegen hoch (Zahl zählt in 200 ms, `tabular-nums`, damit nichts springt).
- Motion-Regeln aus der Praxis: Ease-in-out statt linear; Feedback-Animationen als Bestätigung (Linear-"Done"-Bounce, Stripe-Payment-Flash); box-shadow nicht animieren, sondern Pseudo-Element mit Ziel-Schatten und Opacity.
Quellen: https://www.linearity.io/blog/ui-animation-guide/ ; https://medium.muz.li/12-ui-patterns-designers-copy-from-top-saas-products-e68d54ade5e8 ; Lottie-Referenzen "approved stamp" https://iconscout.com/lottie-animations/approved-stamp ; Dribbble-Suche https://dribbble.com/search/stamp-animation (nur Metapher-Inspiration)

---

## 7. Direkt umsetzbare Design-Tokens (Vorschlag, aus den Belegen abgeleitet)
```css
:root {
  --paper:        #f4efe4;   /* Aktenpapier, 14,6:1 zu Ink */
  --paper-2:      #faf7f0;   /* Belegkarte */
  --folder:       #e9d9b0;   /* Manila/Chamois-Fläche, 12,0:1 */
  --rule:         #d9c9a3;   /* Linien, naturbraun */
  --ink:          #14201a;
  --ink-2:        #4a574f;   /* 6,6:1 */
  --ink-3:        #5f6b64;   /* 4,85:1, Sekundär */
  --stamp-red:    #b8102e;   /* Text AA (5,8:1) */
  --stamp-red-ink:#e2003c;   /* Abdruck groß, mit multiply */
  --stamp-blue:   #1f4e8c;   /* 7,25:1 */
  --stamp-green:  #1f4d3a;   /* 8,4:1 */
  --stamp-violet: #38378c;   /* 8,75:1, Archiv */
  --focus:        #14201a;
}
.stamp { color: var(--stamp-red-ink); border: 3px solid currentColor; border-radius: 4px;
  font-family: "Source Sans 3", system-ui, sans-serif; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; transform: rotate(-3deg); mix-blend-mode: multiply; opacity: .9;
  font-variant-numeric: tabular-nums; }
```
Stempelmaße als UI-Proportion: 41:24 (Printy 4750/L) für Wort+Datum, 59:39 (5474) für Kontierungsblock, Schrifthöhe Datum ≈ 4 mm ≈ 15 px bei 96 dpi.

---

## 8. Offene Punkte
- Trodat-RGB-Werte nur aus Händlerangabe (Böttcher), nicht aus Trodat-Datenblatt; Trodat-Infoportal prüfen.
- Immoware24-Supportartikel (Buchen von Rechnungen, Buchungsstapel) per Fetch 403; Feldnamen dort nur aus Snippets. Vollständiges Handbuch-PDF "11_AbrechnungWEG-Verwaltung.pdf" nicht ausgewertet.
- Casavi/Domus: keine belastbaren UI-Beschreibungen gefunden; Casavi ist Kommunikationsplattform, Belegprüfung "in Entwicklung" (VDIV-Interview).
- DATEV-Wissensplattform-Dokument 1025373 ist JS-gerendert; Nummernkreise über orgaMAX/DATEV-Community bestätigt (medium).
- GoBD-Volltext stammt vom DATEV-Spiegel des BMF-Schreibens 2019 (BMF-URL 404); Änderungen 2024/2025 nur als Änderungsschreiben geprüft.
- Vollkorn Google Fonts 5.001 vs GitHub 5.000: Feature-Unterschiede (smcp fehlt bei Google) sind lokal gemessen; ob Google absichtlich strippt oder das Subset-Format die Ursache ist, nicht verifiziert (Google verteilt "Vollkorn SC" separat).
