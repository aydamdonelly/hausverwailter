# Nachrecherche: Belegerkennung, Versicherungsteuer-Prüfregel

Stand: 23.08.2026. Ziel: eine deterministische Plausibilitätsprüfung für den Versicherungsteuerbetrag (VersSt) auf Beitragsrechnungen von Versicherern, die weder Wohngebäudeversicherungen (16,34 %) noch Haftpflicht/Glas (19 % voll) noch reine Feuerversicherungen (13,2 %) fälschlich als rechnerisch falsch markiert.

Hinweis zur Arbeitsweise: Das WebSearch-Kontingent der Session war aufgebraucht; alle Quellen wurden per Direkt-URL (WebFetch/curl) geholt. Rohtexte liegen in diesem Ordner: `versstg_gesamt.txt`, `feuerschstg_gesamt.txt`, `versstdv.txt`, `bzst_faq_gdv.txt`, `law_versstg___5.txt`, `law_versstg___6.txt`.

---

## 1. Rechtsgrundlagen (Primärquellen, wörtlich)

### 1.1 § 6 VersStG, Steuersatz [hoch]
Quelle: https://www.gesetze-im-internet.de/versstg/__6.html (VersStG i. d. F. der Bekanntmachung vom 27.04.2021, BGBl. I S. 874; Volltext https://www.gesetze-im-internet.de/versstg/BJNR004000922.html)

> (1) Die Steuer beträgt vorbehaltlich des folgenden Absatzes 19 Prozent des Versicherungsentgelts ohne Versicherungsteuer.
> (2) Die Steuer beträgt
> 1. bei der Feuerversicherung und bei der Feuer-Betriebsunterbrechungsversicherung 22 Prozent (§ 5 Absatz 1 Satz 1 Nummer 3 Buchstabe a);
> 2. bei der Wohngebäudeversicherung 19 Prozent (§ 5 Absatz 1 Satz 1 Nummer 3 Buchstabe b) und
> 3. bei der Hausratversicherung 19 Prozent (§ 5 Absatz 1 Satz 1 Nummer 3 Buchstabe c);
> 4. [Agrar-Mehrgefahren] 0,3 Promille der Versicherungssumme;
> 5. bei der Seeschiffskaskoversicherung 3 Prozent ...;
> 6. bei der Unfallversicherung mit Prämienrückgewähr 3,8 Prozent des Versicherungsentgelts.

### 1.2 § 5 Abs. 1 Satz 1 Nr. 3 VersStG, Bemessungsgrundlage (der entscheidende Teil) [hoch]
Quelle: https://www.gesetze-im-internet.de/versstg/__5.html

> (1) Die Steuer wird für die einzelnen Versicherungen berechnet, und zwar
> 1. regelmäßig vom Versicherungsentgelt, [...]
> 3. nur bei
> a) der Feuerversicherung und der Feuer-Betriebsunterbrechungsversicherung (§ 3 Absatz 1 Nummer 1 des Feuerschutzsteuergesetzes) von einem Anteil von 60 Prozent des Versicherungsentgelts,
> b) der Wohngebäudeversicherung (§ 3 Absatz 1 Nummer 2 des Feuerschutzsteuergesetzes) von einem Anteil von 86 Prozent des Versicherungsentgelts,
> c) der Hausratversicherung (§ 3 Absatz 1 Nummer 3 des Feuerschutzsteuergesetzes) von einem Anteil von 85 Prozent des Versicherungsentgelts.

§ 5 Abs. 3 VersStG (Rechnungsausweis):
> In der Rechnung über das Versicherungsentgelt ist der Steuerbetrag offen auszuweisen und der Steuersatz sowie die vom Bundeszentralamt für Steuern erteilte Versicherungsteuernummer, zu der die Steuer abgeführt wird, anzugeben. Bei steuerfreien Versicherungsentgelten ist die zugrunde liegende Steuerbefreiungsvorschrift anzugeben.

Folge für die Erkennung: Auf jeder Beitragsrechnung MUSS stehen: (a) Steuerbetrag in EUR, (b) Steuersatz, (c) Versicherungsteuernummer des BZSt (Format i. d. R. `xxxx/xxxxx` bzw. numerisch; Feld `versicherungsteuer_nr`), bei steuerfreien Anteilen die Befreiungsvorschrift (§ 4 Nr. ... VersStG). Der angegebene "Steuersatz" ist der NOMINALE Satz nach § 6 (also "19 %" auch bei Wohngebäude!), der Betrag ist aber nur 86 % × 19 % = 16,34 % des Entgelts. Viele Versicherer drucken deshalb den effektiven Satz ("16,34 %"), andere den nominalen ("19 %") plus Betrag. Die Prüfregel darf daher NIE `angegebener Satz × Netto` rechnen, sondern muss den Betrag gegen die Kandidatenmenge effektiver Sätze prüfen (siehe Abschnitt 3).

### 1.3 § 3 VersStG, Versicherungsentgelt [hoch]
Quelle: https://www.gesetze-im-internet.de/versstg/__3.html
Versicherungsentgelt = "jede Leistung, die für die Begründung und zur Durchführung des Versicherungsverhältnisses an den Versicherer zu bewirken ist", insbesondere Prämien, Beiträge, Vorbeiträge, Vorschüsse, Nachschüsse, Umlagen, Eintrittsgelder, Gebühren für die Ausfertigung des Versicherungsscheins und sonstige Nebenkosten. NICHT dazu: Sonderleistungen / in der Person des VN liegende Gründe, z. B. Kosten für Ersatzurkunde, **Mahnkosten**. Und § 4 Abs. 3 FSchStG: "Die Versicherungsteuer gehört nicht zum Versicherungsentgelt."
Folge: Bemessungsgrundlage = alle Beitrags-/Gebührenzeilen der Rechnung ohne Mahnkosten/Ersatzurkunde; Mahngebühren des Versicherers dürfen NICHT in die VersSt-Prüfsumme.

### 1.4 § 4 VersStG, Steuerbefreiungen [hoch]
Quelle: https://www.gesetze-im-internet.de/versstg/__4.html
Steuerfrei u. a.: Rückversicherung; Sozialversicherung (SGB VII Unfall, SGB III); Lebens-, Kranken-, Pflege-, Berufsunfähigkeitsversicherungen (Kapital-/Rentenleistungen bei Tod, Alter, Krankheit, Pflegebedürftigkeit); betriebliche Altersversorgung; Viehversicherung bis 4.000 EUR; grenzüberschreitende Transportgüterversicherung; Brandunterstützungsvereine bis 5.500 EUR je Schadensfall. Für die Hausverwaltung relevant: Belege mit "steuerfrei nach § 4 Nr. ... VersStG" (z. B. bAV/Direktversicherung für Angestellte des Verwalters, private Krankenversicherung) haben VersSt = 0, das ist korrekt und keine Warnung.

### 1.5 Feuerschutzsteuergesetz (FeuerschStG), §§ 1, 3, 4, 5 [hoch]
Quellen: https://www.gesetze-im-internet.de/feuerschstg_1979/__1.html, .../__3.html, .../__4.html, .../__5.html; Volltext-PDF https://www.gesetze-im-internet.de/feuerschstg_1979/FeuerschStG.pdf (i. d. F. der Bek. v. 10.01.1996, BGBl. I S. 18, zuletzt geändert durch Art. 12 G v. 25.06.2021, BGBl. I S. 2056)

§ 1 Abs. 1 Satz 1:
> Der Feuerschutzsteuer unterliegt die Entgegennahme des Versicherungsentgelts nur aus den folgenden Versicherungen, wenn die versicherten Gegenstände sich bei der Entgegennahme des Versicherungsentgelts im Geltungsbereich dieses Gesetzes befinden:
> 1. Feuerversicherungen einschließlich Feuer-Betriebsunterbrechungsversicherungen,
> 2. Wohngebäudeversicherungen, bei denen die Versicherung teilweise auf Gefahren entfällt, die Gegenstand einer Feuerversicherung sein können,
> 3. Hausratversicherungen, bei denen die Versicherung teilweise auf Gefahren entfällt, die Gegenstand einer Feuerversicherung sein können.
> Das Versicherungsentgelt aus Versicherungen, die nicht in Satz 1 Nummer 1 bis 3 genannt werden, die jedoch teilweise auf Gefahren entfallen, die Gegenstand einer Feuerversicherung sein können, unterliegt nicht der Feuerschutzsteuer.

§ 3 Abs. 1 (Bemessungsgrundlage FSchSt):
> 1. bei Feuerversicherungen ein Anteil von 40 Prozent des Versicherungsentgelts,
> 2. bei Wohngebäudeversicherungen ein Anteil von 14 Prozent des Gesamtbetrages des Versicherungsentgelts und
> 3. bei Hausratversicherungen ein Anteil von 15 Prozent des Gesamtbetrages des Versicherungsentgelts.

§ 4 (Steuersatz FSchSt): "(1) Der Steuersatz beträgt – vorbehaltlich des folgenden Absatzes – 19 Prozent. (2) Die Steuer beträgt bei Feuerversicherungen (§ 1 Absatz 1 Satz 1 Nummer 1) 22 Prozent. (3) Die Versicherungsteuer gehört nicht zum Versicherungsentgelt."

§ 5 Abs. 1: "Steuerschuldner ist der Versicherer." (VersSt dagegen: Steuerschuldner ist der Versicherungsnehmer, § 7 Abs. 1 VersStG, der Versicherer entrichtet sie nur.)

§ 14 (Evaluation): Die Anteile in § 3 Abs. 1 FSchStG und § 5 Abs. 1 Nr. 3 VersStG werden "jährlich, beginnend mit dem 1. Januar 2012, durch Rechtsverordnung der Bundesregierung ... angepasst", damit das FSchSt-Aufkommen nicht unter den Durchschnitt 2009 bis 2011 sinkt. Im aktuellen Gesetzestext stehen weiterhin 40/14/15 bzw. 60/86/85; eine abweichende Verordnung ist nicht ersichtlich (FSchStG zuletzt geändert 2021, VersStG Neufassung 2021, keine Sätze-Änderung 2025/2026 gefunden). Konsequenz: Anteile und Sätze als versionierte Konfiguration mit Gültigkeitsdatum ablegen, nicht hart codieren.

### 1.6 Herleitung der effektiven Sätze [hoch, reine Arithmetik aus 1.1, 1.2, 1.5]

| Sparte (Gesetzesbegriff) | VersSt-Anteil × Satz | effektive VersSt auf Entgelt | FSchSt-Anteil × Satz (trägt Versicherer) | effektive FSchSt | Summe |
|---|---|---|---|---|---|
| Feuerversicherung / Feuer-BU (§ 6 Abs. 2 Nr. 1) | 60 % × 22 % | **13,20 %** | 40 % × 22 % | 8,80 % | 22,00 % |
| Wohngebäudeversicherung (§ 6 Abs. 2 Nr. 2) | 86 % × 19 % | **16,34 %** | 14 % × 19 % | 2,66 % | 19,00 % |
| Hausratversicherung (§ 6 Abs. 2 Nr. 3) | 85 % × 19 % | **16,15 %** | 15 % × 19 % | 2,85 % | 19,00 % |
| alle anderen Sachversicherungen (Regelsatz § 6 Abs. 1): Haftpflicht, Glas, Gewerbegebäude verbunden, Elektronik, Rechtsschutz, Kfz, Unfall ohne Prämienrückgewähr, Bauleistung, Vertrauensschaden, D&O, Mietausfall (Kreditvers.) | 100 % × 19 % | **19,00 %** | 0 | 0 | 19,00 % |
| Unfallversicherung mit Prämienrückgewähr | 100 % × 3,8 % | 3,80 % | 0 | 0 | 3,80 % |
| Seeschiffskasko | 3 % | 3,00 % | | | |
| steuerfrei (§ 4 VersStG): Leben, Kranken, Pflege, BU, bAV, Rückversicherung | | **0,00 %** | | | |

Sekundärbestätigung der Zahlen 13,2/8,8, 16,34/2,66, 16,15/2,85: https://de.wikipedia.org/wiki/Feuerschutzsteuer (Abschnitt Deutschland, Sätze seit 01.07.2010).

Wichtig: Die Feuerschutzsteuer wird auf der Rechnung an den Versicherungsnehmer NICHT gesondert ausgewiesen (keine Ausweispflicht im FSchStG; Steuerschuldner ist der Versicherer, § 5 FSchStG; sie ist in die Nettoprämie einkalkuliert). Die Rechnungssumme ist daher `Entgelt + VersSt`, nicht `Entgelt + VersSt + FSchSt`. Die Formulierung im Domänen-Report ("16,34 % zzgl. Feuerschutzsteuer") ist steuerlich richtig, führt aber in einer Prüfregel in die Irre: Auf dem Beleg gibt es keine FSchSt-Zeile, gegen die man prüfen könnte.

---

## 2. Sparten-Zuordnung bei kombinierten/verbundenen Verträgen (BZSt/GDV-FAQ, mit BMF abgestimmt) [hoch für die Regel, Dokument selbst "ohne Bindungswirkung"]

Quelle: FAQ des GDV zum Verkehrsteueränderungsgesetz, "mit dem BMF abgestimmt", Ergänzte Fassung FAQ-III, Stand 30.01.2015, veröffentlicht vom BZSt: https://www.bzst.de/SharedDocs/Downloads/DE/Versicherung_Feuerschutz/FAQ_GDV.pdf (lokal: `bzst_faq_gdv.txt`). BZSt-Fachseite: https://www.bzst.de/DE/Unternehmen/Versicherungen/VersicherungFeuerschutzsteuer/versicherungfeuerschutzsteuer_node.html

Kernaussagen (wörtlich):

- Frage 7: "Bei der verbundenen Wohngebäudeversicherung, der verbundenen Hausratversicherung, der Unfallversicherung mit Prämienrückgewähr und der sog. agrarischen Mehrgefahrenversicherung sind die Steuersätze des § 6 Abs. 2 Nr. 2, 3, 4 und 6 VersStG n. F. anzuwenden – unabhängig davon, ob die einzelnen Prämien des jeweiligen Versicherungsvertrages gesondert ausgewiesen werden oder nicht. Bei diesen Steuersätzen handelt es sich um abschließende Spezialregelungen."
  → Die verbundene Wohngebäudeversicherung (Feuer + Leitungswasser + Sturm/Hagel, ggf. Elementar) wird als GANZES mit 86 %/19 % = 16,34 % besteuert, auch wenn der Feueranteil separat ausgewiesen ist.

- Frage 9 (Wohngebäude): "Werden nur Leitungswasser und Sturm oder zusätzlich auch das Feuerrisiko abgesichert, wird auf 86 Prozent der Prämie Versicherungsteuer und auf 14 Prozent der Prämie Feuerschutzsteuer zum Steuersatz von 19 Prozent erhoben. Wird dagegen nur das Feuerrisiko abgesichert, handelt es sich um eine reine Feuerversicherung (s.o.). Wird bei verbundenen Wohngebäudeversicherungen die Prämie für die Absicherung des Feuerrisikos gesondert ausgewiesen, hat dies keine Auswirkungen."
  → Reine Feuerversicherung eines Wohngebäudes (nur Gefahr Feuer): 60 % × 22 % = 13,2 %. Mietverlustversicherung beim Wohngebäude: wie Wohngebäude (16,34 %).

- Frage 9/10 (gewerblich genutzte Gebäude): Gebäude, "die ganz oder überwiegend gewerblich genutzt werden und durch rechtlich selbständigen Vertrag gegen die Gefahren Feuer, Leitungswasser und Sturm zusammen versichert werden, unterliegen dem Regelsteuersatz von derzeit 19 Prozent (BMF-Schreiben vom 12.05.2010, BStBl. I S. 544 ...)". "Wird nur das Risiko Feuer versichert, handelt es sich dagegen um eine reine Feuerversicherung, deren Prämie zu 60 Prozent der Versicherungsteuer und zu 40 Prozent der Feuerschutzsteuer zum Steuersatz von jeweils 22 Prozent unterliegt. Letzteres gilt auch dann, wenn in einem Gesamtvertrag die Prämie für das Feuerrisiko gesondert ausgewiesen wird; die übrigen Teile des Vertrages unterliegen in diesem Fall dem Regelsteuersatz."
  → Verbundene Gewerbe-/Sachgewerbeversicherung: 19 % voll auf alles; NUR wenn der Feueranteil als eigenständige Feuerversicherung gesondert ausgewiesen ist: dieser Anteil 13,2 %, Rest 19 %.

- Frage 8: Allgefahrenversicherungen (All-Risk): Regelsteuersatz 19 %.
- Frage 6: Komponenten mit gleichem Satz und gleicher Bemessungsgrundlage dürfen aggregiert ausgewiesen werden → auf Rechnungen erscheinen oft nur ein oder zwei Steuerzeilen ("19 %" und "16,34 %"), nicht je Gefahr.
- Frage 2/3: Bei Kombiverträgen mit unterschiedlichen Sätzen genügt der gesonderte Ausweis der Prämienanteile im Vertrag bzw. in der Prämienrechnung (BFH 13.12.2011, II R 26/10).
- Frage 11 (Rechnungsbeispiel mit steuerfreiem Anteil, Muster des BZSt): "Versicherungsentgelt (Nettoprämie): 1.000 € / davon steuerfrei nach § 4 Nr. 10 VersStG: 700 € / steuerpflichtig: 300 € / Steuersatz: 19% / Steuerbetrag: 57 € / Gesamt: 1057 €".

Abgrenzung Wohngebäude vs. Gewerbegebäude [mittel]: Gesetz definiert "Wohngebäudeversicherung" nicht näher; das mit dem BMF abgestimmte FAQ stellt auf "ganz oder überwiegend gewerblich genutzt" (→ Regelsatz) ab, im Umkehrschluss: überwiegend Wohnnutzung → Wohngebäudeversicherung. Marktpraxis (Wikipedia Wohngebäudeversicherung): "Das versicherte Objekt muss dabei mindestens zu 50 % zu Wohnzwecken genutzt werden, ansonsten ist eine allgemeine Gebäudeversicherung abzuschließen." (https://de.wikipedia.org/wiki/Wohngeb%C3%A4udeversicherung). Für die App: die Einstufung trifft der Versicherer; die App muss sie nicht selbst entscheiden, sondern nur prüfen, ob der Betrag zu EINEM zulässigen effektiven Satz passt und die Sparte dazu plausibel ist.

---

## 3. Die Prüfregel (Empfehlung zur Implementierung)

### 3.1 Prinzip
Nicht "Satz × Netto" rechnen, sondern den ausgewiesenen Steuerbetrag je Steuerzeile gegen eine Kandidatenmenge effektiver Sätze prüfen und daraus die Sparte rückschließen (Klassifikation über die Zahl, nicht über den Text). Das LLM extrahiert Zeilen und Sparten-Text; der deterministische Code prüft.

### 3.2 Konfiguration (versioniert, mit `valid_from`)
```ts
// insuranceTax.config.ts  (Stand 23.08.2026; § 5 Abs. 1 Nr. 3, § 6 VersStG; §§ 3, 4 FSchStG)
export const VERSST_RATES = [
  { key: "feuer",       label: "Feuer / Feuer-BU (reine Feuerversicherung)", nominal: 0.22, base: 0.60, effective: 0.1320, fschst: 0.088,  legal: "§ 6 Abs. 2 Nr. 1, § 5 Abs. 1 Nr. 3a VersStG" },
  { key: "wohngebaeude",label: "Verbundene Wohngebäudeversicherung",          nominal: 0.19, base: 0.86, effective: 0.1634, fschst: 0.0266, legal: "§ 6 Abs. 2 Nr. 2, § 5 Abs. 1 Nr. 3b VersStG" },
  { key: "hausrat",     label: "Verbundene Hausratversicherung",              nominal: 0.19, base: 0.85, effective: 0.1615, fschst: 0.0285, legal: "§ 6 Abs. 2 Nr. 3, § 5 Abs. 1 Nr. 3c VersStG" },
  { key: "regel",       label: "Regelsatz (Haftpflicht, Glas, Gewerbegebäude, Elektronik, Rechtsschutz, Kfz, Unfall o. PRG, Bauleistung, All-Risk)", nominal: 0.19, base: 1.00, effective: 0.19, fschst: 0, legal: "§ 6 Abs. 1 VersStG" },
  { key: "unfall_prg",  label: "Unfall mit Prämienrückgewähr",                nominal: 0.038, base: 1.00, effective: 0.038, fschst: 0, legal: "§ 6 Abs. 2 Nr. 6 VersStG" },
  { key: "steuerfrei",  label: "steuerfrei § 4 VersStG (Leben, Kranken, bAV, Rückvers.)", nominal: 0, base: 1.00, effective: 0, fschst: 0, legal: "§ 4 VersStG" },
] as const;
export const VERSST_TOLERANCE_PER_LINE = 0.02; // EUR; Rundung je Zeile/Vertrag
```

### 3.3 Algorithmus
```ts
type TaxLine = { net: number; tax: number; statedRate?: number; text?: string };

function checkVersSt(lines: TaxLine[], sparteHint?: string) {
  const findings = [];
  for (const l of lines) {
    // Kandidaten: alle effektiven Sätze, deren Betrag innerhalb Toleranz liegt
    const matches = VERSST_RATES.filter(r => Math.abs(round2(l.net * r.effective) - l.tax) <= VERSST_TOLERANCE_PER_LINE);
    if (matches.length === 0) {
      findings.push({ level: "error", code: "VERSST_AMOUNT_MISMATCH",
        msg: `VersSt ${l.tax} passt zu keinem Satz (13,2/16,15/16,34/19/3,8/0 %) auf ${l.net}` });
      continue;
    }
    // Plausibilität Sparte vs. Satz (nur Warnung, nie Fehler)
    const spart = classifySparte(l.text ?? sparteHint); // regex-basiert, s. 3.4
    if (spart && !matches.some(m => allowedFor(spart).includes(m.key))) {
      findings.push({ level: "warn", code: "VERSST_SPARTE_RATE_UNUSUAL",
        msg: `Satz ${matches.map(m=>m.key).join("/")} untypisch für Sparte ${spart}` });
    }
    // Nominaler Satz auf dem Beleg ("19 %") darf vom effektiven abweichen -> KEINE Warnung
  }
  // Summenprüfung: Brutto = Σ net + Σ tax (+ Mahnkosten/Ersatzurkunde außerhalb der Bemessungsgrundlage)
  return findings;
}
```
Eindeutigkeit: Die Sätze 13,2 / 16,15 / 16,34 / 19 liegen so weit auseinander, dass ab einem Netto von ca. 12 EUR (16,15 vs. 16,34: Differenz 0,19 % → 0,02 EUR bei 10,53 EUR) eindeutig erkannt wird; bei Kleinbeträgen mehrere Treffer zulassen und keine Warnung.

### 3.4 Sparte → zulässige Sätze (allowedFor)
| Erkannte Sparte (Text auf Beleg / Vertragsart) | erwartete effektive VersSt | Erkennungs-Hinweise (Regex, case-insensitive) |
|---|---|---|
| Verbundene Wohngebäudeversicherung (VGB), inkl. Leitungswasser, Sturm/Hagel, Elementar-Baustein, Mietverlust, Gebäude-Glas als Einschluss | 16,34 % (Gesamtvertrag) | `wohngeb[äa]ude`, `VGB`, `verbundene Geb[äa]ude`, `Leitungswasser`, `Sturm`, `Elementar` |
| Reine Feuerversicherung / Feuer-Rohbau / Feuer-BU (nur Gefahr Feuer) | 13,20 % | `Feuerversicherung`, `Feuer-Rohbau`, `Brandversicherung`, `Feuer-Betriebsunterbrechung`; NICHT wenn zusätzlich Leitungswasser/Sturm im selben Vertrag |
| Gewerbe-/Sachgewerbe-/Allgemeine Gebäudeversicherung (überwiegend gewerblich, Mischnutzung < 50 % Wohnen), All-Risk | 19,00 % voll; bei gesondert ausgewiesenem reinen Feueranteil: dieser 13,2 % + Rest 19 % | `Gesch[äa]ftsgeb[äa]ude`, `gewerblich`, `Sachgewerbe`, `Allgefahren`, `All Risk`, `Inhaltsversicherung` |
| Haus- und Grundbesitzerhaftpflicht, Gewässerschaden (Öltank), Bauherrenhaftpflicht, Betriebshaftpflicht, Vermögensschaden-HP des Verwalters, Rechtsschutz, Elektronik/Photovoltaik (sofern eigener Vertrag), Bauleistung, Kfz, Unfall ohne Prämienrückgewähr, Mietausfall (Kreditversicherung), D&O, Vertrauensschaden | 19,00 % | `Haftpflicht`, `Gew[äa]sserschaden`, `Rechtsschutz`, `Photovoltaik`, `Elektronik`, `Bauleistung`, `Kfz`, `Unfall` |
| Glasversicherung als eigenständiger Vertrag | 19,00 % [mittel: keine Sonderregel im Gesetz → Regelsatz] | `Glasversicherung`, `Glasbruch` |
| Hausrat (bei Hausverwaltung selten; z. B. möbliertes Objekt) | 16,15 % | `Hausrat`, `VHB` |
| Unfall mit Prämienrückgewähr | 3,80 % | `Prämienrückgewähr`, `UPR` |
| Leben/Kranken/Pflege/BU/bAV/Direktversicherung (Verwalter-Mitarbeiter) | 0 % + Befreiungsvorschrift muss genannt sein (§ 5 Abs. 3 S. 2) | `Lebensversicherung`, `Direktversicherung`, `Krankenversicherung`, `§ 4 Nr.` |

Regel bei Sammelrechnungen (mehrere Verträge/Bausteine auf einer Rechnung): jede Steuerzeile einzeln prüfen; typisches WEG-Paket "Wohngebäude + Haus-/Grundbesitzerhaftpflicht + Glas" liefert zwei Steuerzeilen: 16,34 % auf den Gebäudeanteil, 19 % auf HP/Glas. Wird auf der Rechnung nur EIN Steuerbetrag für das Paket ausgewiesen, Mischsatz zulassen: `tax ≈ net_geb × 0,1634 + net_rest × 0,19` sofern Nettoanteile je Sparte erkennbar; sonst nur Summenprüfung `Brutto = Netto + Steuer` und Hinweis "Mischsatz, nicht eindeutig prüfbar".

### 3.5 Weitere deterministische Prüfungen auf Versicherungsbelegen
- Pflichtangaben nach § 5 Abs. 3 VersStG: Steuerbetrag, Steuersatz, Versicherungsteuernummer → fehlt eine, Warnung "Beleg unvollständig" (kein Fehler, da nur den Versicherer betrifft).
- Umsatzsteuer: Versicherungsleistungen sind nach § 4 Nr. 10 Buchst. a UStG umsatzsteuerfrei; ein Beleg vom Versicherer mit "19 % USt"/"MwSt" oder USt-IdNr.-Ausweis als Steuer ist ein Erkennungsfehler → Fehler "USt auf Versicherungsbeleg". Keine Vorsteuer, kein BU-Schlüssel, Bruttobuchung (Netto + VersSt) auf 4360 (SKR03) / 6400 (SKR04) bzw. Betriebskostenkonto § 2 Nr. 13 BetrKV.
- Mahnkosten/Ersatzurkunde des Versicherers: außerhalb der Bemessungsgrundlage (§ 3 VersStG); in der Summenprüfung als steuerfreie Zeile führen.
- Zahlweise-Zuschläge (Ratenzahlungszuschlag 3 bis 5 %): gehören zum Versicherungsentgelt ("sonstige Nebenkosten") → in die Bemessungsgrundlage einbeziehen.
- Nachtrag/Beitragsänderung: Erstattungen (negative Beträge) mit negativer VersSt im gleichen Satz → Vorzeichen konsistent prüfen.
- Umlagefähigkeit § 2 Nr. 13 BetrKV: Gebäude (Feuer, Sturm, Wasser, Elementar), Glas, Haus- und Grundbesitzerhaftpflicht, Öltank; NICHT umlagefähig: Rechtsschutz, Vermögensschaden-HP des Verwalters, Hausrat, Reparaturkosten-/Mietausfall (Mietausfall als Bestandteil der Gebäudeversicherung ist umlagefähig, BGH VIII ZR 38/17). Diese Zuordnung folgt aus der Sparte, nicht aus dem Steuersatz.

---

## 4. Auflösung der im Auftrag genannten Widersprüche

### 4.1 Versicherungsteuer (mein Thema)
- Rechts-Report 1.7 ("22 % Feuer, 19 % Wohngebäude vom Versicherungsentgelt") gibt nur § 6 wieder und unterschlägt die Bemessungsgrundlage aus § 5 Abs. 1 Nr. 3 → als Prüfregel FALSCH (würde jede Wohngebäudeversicherung verwerfen).
- Domänen-Report 2.3 ("16,34 % bei Feuer-Anteil zzgl. Feuerschutzsteuer") ist im Ergebnis richtig für die verbundene Wohngebäudeversicherung, aber ohne Herleitung und irreführend: die FSchSt erscheint nicht auf der Rechnung; und "bei Feuer-Anteil" ist ungenau (der Satz gilt für die Wohngebäudeversicherung als Ganzes, unabhängig vom Feueranteil; reine Feuerversicherung hat 13,2 %).
- Korrekte Regel: Kandidatenmenge {13,20 %, 16,15 %, 16,34 %, 19,00 %, 3,80 %, 0 %} auf das Entgelt ohne VersSt; Sparte nur als Plausibilitäts-Warnung (Tabelle 3.4). Beide Reports entsprechend korrigieren.

### 4.2 Kurzbewertung der übrigen Widersprüche (nicht mein Thema, nur aus vorhandenen Notizen; keine neue Recherche)
- DATEV Belegfeld 1: Format-Grenze 36 Zeichen (DATEV-Format 7, datenformate-import-export.md Z. 86/213) ist die Feldspezifikation; "max. 12" im Domänen-Report ist unbelegt; "9-stellig" ist eine PowerHaus-Restriktion (powerhaus_datev.txt). Empfehlung: eigene Rechnungsnummern ≤ 12 Zeichen wählen (z. B. `RE26-00001` = 10 Zeichen oder `2026-00001` = 10) und die Länge als Mandanten-Einstellung `belegnummer_max_len` (Default 36, PowerHaus-Profil 9) konfigurierbar machen; der Export kürzt nie stillschweigend, sondern warnt.
- § 14 Abs. 4 UStG: der Gesetzestext (law_ustg_1980___14.txt Z. 20 f.) hat zehn Nummern (Nr. 9 Aufbewahrungshinweis, Nr. 10 "Gutschrift"); Checkliste mit zehn Punkten bauen, Nr. 9 und Nr. 10 sind bedingt (nur in den jeweiligen Fällen).
- ZUGFeRD: ferd_zugferd24_pm.txt bestätigt ZUGFeRD 2.4 / Factur-X 1.08 auf CII D22B, rückwärtskompatibel zu D16B; Rechts-Report 2.7 (in Kraft 15.01.2026) ist maßgeblich, Format-Report 6.2 veraltet. Erkennung eingehender Hybrid-PDFs muss XMP `fx:Version` 1.0 bis 1.08 und `fx:ConformanceLevel` MINIMUM/BASIC WL/BASIC/EN 16931/EXTENDED/XRECHNUNG akzeptieren; für eigene Ausgabe 2.4 schreiben (Namespace bleibt `...CrossIndustryInvoice:100`).
- Mahngebühr Verbraucher: Rechts-Report 6.3 (BGH VIII ZR 95/18: Pauschale 2,50 EUR unwirksam, nur nachgewiesene Sachkosten, im Urteil 0,7643 EUR) ist die belastbare Quelle; Domänen-Report "1 bis 2,50" und Sonderleistungstabelle "10 bis 45 EUR" betreffen andere Verhältnisse (Verwalter ↔ Eigentümer als Sonderleistung nach Vertrag, nicht Gläubiger ↔ Verbraucher). Default für Mahnungen an Mieter/Eigentümer als Verbraucher: 0,00 EUR, optional Portokosten (0,95 EUR) mit Nachweis; erste Mahnung nie; B2B 40-EUR-Pauschale § 288 Abs. 5 BGB.
- Reverse Charge Reinigung: Rechts-Report 1.6 ist richtig; die Kontierungstabelle (datenformate-import-export.md Z. 242 "Gebäudereiniger mit § 13b Abs. 2 Nr. 8: BU 94") darf nur greifen, wenn der Mandant selbst nachhaltig Gebäudereinigungs-/Bauleistungen erbringt (USt 1 TG-Bescheinigung im Mandantenprofil). Standard für Hausverwaltung/WEG/Vermieter: Netto-Rechnung mit § 13b-Hinweis → Warnung "Rechnung vermutlich fehlerhaft, USt vom Lieferanten nachfordern", kein BU 94.

---

## 5. Quellenliste
- VersStG § 5: https://www.gesetze-im-internet.de/versstg/__5.html
- VersStG § 6: https://www.gesetze-im-internet.de/versstg/__6.html
- VersStG § 3: https://www.gesetze-im-internet.de/versstg/__3.html
- VersStG § 4: https://www.gesetze-im-internet.de/versstg/__4.html
- VersStG Volltext (Bek. 27.04.2021, BGBl. I S. 874): https://www.gesetze-im-internet.de/versstg/BJNR004000922.html
- FeuerschStG § 1: https://www.gesetze-im-internet.de/feuerschstg_1979/__1.html
- FeuerschStG § 3: https://www.gesetze-im-internet.de/feuerschstg_1979/__3.html
- FeuerschStG § 4: https://www.gesetze-im-internet.de/feuerschstg_1979/__4.html
- FeuerschStG § 5: https://www.gesetze-im-internet.de/feuerschstg_1979/__5.html
- FeuerschStG Volltext-PDF (zuletzt geändert Art. 12 G v. 25.06.2021): https://www.gesetze-im-internet.de/feuerschstg_1979/FeuerschStG.pdf
- FeuerschStG Änderungshistorie (buzer): https://www.buzer.de/gesetz/3925/index.htm
- VersStDV (Bek. 27.04.2021, BGBl. I S. 938; enthält KEINE Aufteilungsregeln): https://www.gesetze-im-internet.de/versstgdb/BJNR007970937.html
- BZSt Fachseite Versicherung- und Feuerschutzsteuer: https://www.bzst.de/DE/Unternehmen/Versicherungen/VersicherungFeuerschutzsteuer/versicherungfeuerschutzsteuer_node.html
- BZSt/GDV FAQ Verkehrsteueränderungsgesetz (FAQ-III, 30.01.2015, mit BMF abgestimmt): https://www.bzst.de/SharedDocs/Downloads/DE/Versicherung_Feuerschutz/FAQ_GDV.pdf
- BMF-Schreiben 12.05.2010, BStBl. I S. 544 (gewerbliche Gebäude → Regelsatz), zitiert im FAQ; BMF-Schreiben 27.03.2012, BStBl. I S. 370; BFH 13.12.2011, II R 26/10 (gesonderter Prämienausweis bei Kombiverträgen)
- Wikipedia Feuerschutzsteuer (Sekundärquelle für 13,2/8,8, 16,34/2,66, 16,15/2,85): https://de.wikipedia.org/wiki/Feuerschutzsteuer
- Wikipedia Wohngebäudeversicherung (50 %-Wohnnutzung, Sekundärquelle): https://de.wikipedia.org/wiki/Wohngeb%C3%A4udeversicherung
- UStG § 4 Nr. 10 (Umsatzsteuerfreiheit): https://www.gesetze-im-internet.de/ustg_1980/__4.html
