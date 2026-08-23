# Nachrecherche Mahnwesen: Verzugszins-Zeitreihe, Zinsmethode, Schuldnertyp GdWE

Stand: 23.08.2026. Ergänzt rechtliche-pflichten-und-fristen.md Abschnitt 6 und domaene_prozesse_hausverwaltung.md Abschnitt 2.11.
Konfidenz-Kürzel: [H] hoch (Primärquelle/Gesetz/BGH), [M] mittel (konsistente Sekundärquellen, keine Primärquelle abrufbar), [L] niedrig (Ableitung/Erinnerung, nicht belegt).

Hinweis zur Recherche: Die WebSearch-Quote der Session war nach der ersten Runde erschöpft; alle weiteren Belege stammen aus direkten Abrufen bekannter Primär-URLs (Bundesbank, gesetze-im-internet.de, dejure, BGH-Besprechungen) und aus den lokal gespeicherten Gesetzestexten.

---

## 1. Basiszinssatz § 247 BGB: vollständige Zeitreihe (für Altrückstände) [H]

Primärquelle: Deutsche Bundesbank, https://www.bundesbank.de/de/bundesbank/organisation/agb-und-regelungen/basiszinssatz-607820 (abgerufen 23.08.2026; die Seite listet die Halbjahreswerte selbst). Bestätigt durch https://www.basiszinssatz.de/ und Kleeberg (https://www.kleeberg.de/2024/01/02/deutsche-bundesbank-erhoht-den-basiszins-nach-%C2%A7-247-bgb-auf-362-zum-01-01-2024/). Bundesbank-Pressenotiz 01.01.2024: https://www.bundesbank.de/de/presse/pressenotizen/bekanntgabe-des-basiszinssatzes-zum-1-januar-2024-anpassung-auf-3-62--920960 (URL aus Suchtreffer, Abruf lieferte 404, Wert deckt sich mit Übersichtsseite).

Mechanik (§ 247 Abs. 1 BGB, Gesetzestext lokal law_bgb___247.txt): Änderung jeweils zum 1. Januar und 1. Juli um die Veränderung des EZB-Hauptrefinanzierungssatzes seit der letzten Änderung; Bekanntgabe durch die Bundesbank im Bundesanzeiger (§ 247 Abs. 2). Der im Gesetz stehende Wert "3,62 Prozent" ist nur der Startwert von 2002 und darf nicht als aktueller Wert verwendet werden.

| gültig ab | Basiszins | Verzugszins § 288 Abs. 1 (+5 PP) | Verzugszins § 288 Abs. 2 (+9 PP) |
|---|---|---|---|
| 01.07.2016 | -0,88 % | 4,12 % | 8,12 % |
| 01.01.2017 … 01.07.2022 | -0,88 % (unverändert, 13 Halbjahre) | 4,12 % | 8,12 % |
| 01.01.2023 | 1,62 % | 6,62 % | 10,62 % |
| 01.07.2023 | 3,12 % | 8,12 % | 12,12 % |
| 01.01.2024 | 3,62 % | 8,62 % | 12,62 % |
| 01.07.2024 | 3,37 % | 8,37 % | 12,37 % |
| 01.01.2025 | 2,27 % | 7,27 % | 11,27 % |
| 01.07.2025 | 1,27 % | 6,27 % | 10,27 % |
| 01.01.2026 | 1,27 % | 6,27 % | 10,27 % |
| 01.07.2026 | 1,52 % | 6,52 % | 10,52 % |

Anmerkungen:
- Die Bundesbank-Seite zeigt die Tabelle ab 01.07.2020 (alle -0,88 %); dass -0,88 % bereits seit 01.07.2016 gilt, ist aus Suchtreffer (Bundesbank-Pressenotiz 2023: "erstmals seit 01.07.2016 angepasst") belegt [M]. Für die App reicht die Reihe ab 2016; ältere Werte nur bei titulierten Forderungen (30 Jahre, § 197 Abs. 1 Nr. 3 BGB) relevant, dann manuell nachtragen.
- Negativer Basiszins: Verzugszins = 5 + (-0,88) = 4,12 %. Kein Floor bei 5 % (Gesetz sagt "Prozentpunkte über dem Basiszinssatz").
- Nächste Änderung: 01.01.2027. Die Tabelle muss datengetrieben sein (z. B. `basiszins.json`, Schlüssel = ISO-Datum) und im Adminbereich ergänzbar; zusätzlich ein Halbjahres-Reminder ("Basiszins für 01.01./01.07. prüfen").

Warum 2023/2024 zwingend nötig: regelmäßige Verjährung 3 Jahre (§ 195 BGB, https://www.gesetze-im-internet.de/bgb/__195.html), Beginn mit Schluss des Entstehungsjahres (§ 199 Abs. 1 BGB, https://www.gesetze-im-internet.de/bgb/__199.html). Am 23.08.2026 sind Forderungen ab 2023 noch nicht verjährt (Verjährung 31.12.2026), 2024er bis 31.12.2027, 2025er bis 31.12.2028. Ein Hausgeld-Rückstand vom 03.03.2023 läuft also über sieben Basiszins-Perioden.

Empfohlene Datenstruktur:
```json
[
  {"from": "2016-07-01", "rate": -0.88},
  {"from": "2023-01-01", "rate": 1.62},
  {"from": "2023-07-01", "rate": 3.12},
  {"from": "2024-01-01", "rate": 3.62},
  {"from": "2024-07-01", "rate": 3.37},
  {"from": "2025-01-01", "rate": 2.27},
  {"from": "2025-07-01", "rate": 1.27},
  {"from": "2026-01-01", "rate": 1.27},
  {"from": "2026-07-01", "rate": 1.52}
]
```
(Quelle je Zeile: Bundesbank-Übersicht; Prozent als Zahl, intern in Basispunkte/Decimal konvertieren.)

---

## 2. Zinsmethode (Tagzählung) für gesetzliche Verzugszinsen

### 2.1 Rechtsrahmen [H]
- § 288 Abs. 1 S. 1 BGB: "Eine Geldschuld ist während des Verzugs zu verzinsen." S. 2: Zinssatz "für das Jahr" (lokal law_bgb___288.txt). Der Satz ist ein Jahreszins (p. a.); für Teilzeiträume ist pro rata temporis zu rechnen.
- § 289 S. 1 BGB: "Von Zinsen sind Verzugszinsen nicht zu entrichten." (Zinseszinsverbot, https://www.gesetze-im-internet.de/bgb/__289.html). Zinsen also nie kapitalisieren; bei mehreren offenen Posten je Posten separat rechnen.
- § 187 Abs. 1 BGB (https://www.gesetze-im-internet.de/bgb/__187.html): Ereignistag wird nicht mitgerechnet. Verzug tritt mit Ablauf des Fälligkeitstags ein (§ 286 Abs. 2 Nr. 1 bei kalendermäßiger Fälligkeit, z. B. Hausgeld/Miete "bis 3. Werktag"), Zinsen laufen ab dem Folgetag.
- Kein Gesetz schreibt eine Zinstage-Konvention vor. Die Praxis (Gerichte, Mahngerichte, Inkasso, Verzugszinsrechner) rechnet taggenau mit dem tatsächlichen Kalenderjahr: 365 Tage, im Schaltjahr 366 ("act/act", auch "Effektivzinsmethode", "kalendergenau") [M, mehrere übereinstimmende Sekundärquellen, keine höchstrichterliche Entscheidung gefunden].

### 2.2 Belege zur Praxis
- zinsen-berechnen.de Verzugszinsrechner (https://www.zinsen-berechnen.de/verzugszinsrechner.php): "Der Rechner ermittelt die Verzugszinsen nach der taggenauen Zinsmethode act/act, wobei das Jahr mit 365 Tagen bzw. bei Schaltjahren mit 366 Tagen angesetzt wird." Verzugszeitraum "beginnt in der Regel frühestens einen Tag nach dem Fälligkeitsdatum". Basiszinswechsel zum 1.1./1.7. werden als getrennte Perioden ausgewiesen.
- Creditreform (https://www.creditreform.de/aktuelles-wissen/praxisratgeber/verzugszinsen): "Bei der taggenauen Abrechnung wird das Kalenderjahr mit 365 Tagen zu Grunde gelegt, Schaltjahre mit 366." Beispiel: 1000 € × (1,52 % + 9 PP) × 32 Tage / 365 = 9,22 €. "Die Verzinsung beginnt am Tag nach der Fälligkeit der Forderung."
- Lexware (https://www.lexware.de/wissen/buchhaltung-finanzen/verzugszinsen-berechnen/): "Nach der Effektivzinsmethode wird das Jahr mit 365 Tagen gerechnet (im Schaltjahr: 366 Tage). Bei der kaufmännischen Methode mit 360 Tagen." Bei Basiszinswechsel innerhalb des Verzugs "ändert sich der Basiszinssatz entsprechend" (Perioden splitten).
- FastBill (https://www.fastbill.com/lexikon/verzugszinsen-berechnen): act/act, Beginn "der erste Tag nach dem verstrichenen Zahlungsdatum", Ende = Zahlungstag; bei zwei Halbjahren "die Zeiträume auch separat behandelt".
- basiszinssatz.de (https://www.basiszinssatz.de/): "Zinsberechnungen im Zeitraum vom 01.01. - 31.12.2026 sind mit 365 Zinstagen durchzuführen." (impliziert 366 in Schaltjahren).
- IHK-Prüfungsnews (Suchtreffer https://www.ihk-aka.de/aktuelles/pruefungsnews/1113, Seite selbst nicht mehr abrufbar): "Nach §§ 187, 188 BGB ist die Berechnung der Verzugszinsen zwingend taggenau." [M]
- zinsmethoden.de (https://zinsmethoden.de/): rechtspolitische Darstellung, empfiehlt act/act, nennt keine Rechtsprechung. Bankübliche Eurozinsmethode act/360 ist eine Vertragskonvention (Kreditverträge), nicht die gesetzliche Methode.
- Zinsbasis Brutto: Verzugszinsen auf den Bruttobetrag inkl. USt, weil die USt zivilrechtlicher Bestandteil des Entgelts ist (BGH 20.07.2010, VIII ZR 186/09, laut Suchtreffer onlinebilanz.de) [M].

### 2.3 Entscheidung für die App
- Default: **act/act (365/366), taggenau, Perioden an jedem 1.1./1.7. und an jedem Jahreswechsel splitten**, erster Zinstag = Tag nach Fälligkeit (bzw. Tag nach Verzugseintritt bei Mahnung/30-Tage-Regel), letzter Zinstag = Tag des Zahlungseingangs (Wertstellung) einschließlich [Ende-Tag-Konvention M; konfigurierbar "inklusive/exklusive Zahltag"].
- Alternativ konfigurierbar: act/365 (immer 365). Abweichung nur in Schaltjahren (2024, 2028): act/365 ergibt 366/365 = +0,27 % mehr Zinsen für Schaltjahrtage; bei 10.000 € Rückstand über das ganze Jahr 2024 zu 8,62/8,37 % sind das rund 2,3 € Differenz. Das ist rechtlich angreifbar in Richtung "zu viel gefordert", daher act/act als Default.
- Nie act/360 (überhöht Zinsen um 1,4 %).
- Zinseszins nie (§ 289). Mahnkosten und Pauschale werden nicht verzinst.
- Rundung: exakte Dezimalarithmetik (Integer-Cents × Bruch oder Decimal-Bibliothek), Summe über alle Perioden eines Postens, erst am Ende kaufmännisch auf Cent runden; Zwischenergebnisse nicht runden. Der Mahnbrief soll die Periodentabelle ausweisen (von, bis, Tage, Basiszins, Satz, Zinsbetrag), so ist der Betrag nachprüfbar.
- Der Zinssatz eines Tages ist der Basiszins der Periode, in die der Tag fällt (nicht der Satz bei Verzugsbeginn). Belegt durch alle Rechner und Creditreform/Lexware ("ändert sich entsprechend").

### 2.4 Referenzimplementierung (TypeScript, ohne Rundung in Zwischenschritten)
```ts
type RatePoint = { from: string; rate: number }; // rate in Prozent, z. B. 3.37
const BASISZINS: RatePoint[] = [
  { from: "2016-07-01", rate: -0.88 },
  { from: "2023-01-01", rate: 1.62 }, { from: "2023-07-01", rate: 3.12 },
  { from: "2024-01-01", rate: 3.62 }, { from: "2024-07-01", rate: 3.37 },
  { from: "2025-01-01", rate: 2.27 }, { from: "2025-07-01", rate: 1.27 },
  { from: "2026-01-01", rate: 1.27 }, { from: "2026-07-01", rate: 1.52 },
];

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInYear = (y: number) => (isLeap(y) ? 366 : 365);

function basiszinsAt(d: Date): number {
  const iso = d.toISOString().slice(0, 10);
  let r = BASISZINS[0].rate;
  for (const p of BASISZINS) if (p.from <= iso) r = p.rate; else break;
  return r;
}

/** Zinsen in Cent (als Zahl mit Nachkommastellen, erst am Ende runden).
 *  principalCents: Bruttoforderung; spreadPP: 5 oder 9; start: erster Zinstag; end: letzter Zinstag (inkl.)
 *  method: "act/act" (Default) oder "act/365" */
function verzugszinsenCents(principalCents: number, spreadPP: number, start: Date, end: Date,
                            method: "act/act" | "act/365" = "act/act") {
  const periods: { from: string; to: string; days: number; basis: number; rate: number; cents: number }[] = [];
  let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  let total = 0;
  while (cur <= last) {
    const y = cur.getUTCFullYear();
    // Periodenende: nächster 1.1. oder 1.7. minus 1 Tag, oder Zahltag
    const nextCut = cur.getUTCMonth() < 6 ? Date.UTC(y, 6, 1) : Date.UTC(y + 1, 0, 1);
    const pEnd = new Date(Math.min(nextCut - 86400000, last.getTime()));
    const days = Math.round((pEnd.getTime() - cur.getTime()) / 86400000) + 1;
    const basis = basiszinsAt(cur);
    const rate = basis + spreadPP; // Prozent p. a.
    const denom = method === "act/act" ? daysInYear(y) : 365;
    const cents = principalCents * (rate / 100) * days / denom;
    periods.push({ from: cur.toISOString().slice(0, 10), to: pEnd.toISOString().slice(0, 10), days, basis, rate, cents });
    total += cents;
    cur = new Date(pEnd.getTime() + 86400000);
  }
  return { totalCents: Math.round(total), periods }; // Math.round = kaufmännisch bei positiven Werten
}
// Beispiel: Hausgeld 350,00 € fällig 03.03.2023, gezahlt 15.08.2026, Verbraucher (5 PP):
// verzugszinsenCents(35000, 5, new Date("2023-03-04"), new Date("2026-08-15"))
```
Testfälle für die Implementierung:
- 1000,00 € B2B, 32 Tage komplett im 2. Halbjahr 2026 (Basis 1,52 %): 1000 × 10,52 % × 32/365 = 9,22 € (Creditreform-Beispiel).
- 1000,00 € B2C, gleiche Tage: 5,72 €.
- Zeitraum 01.02.2024 bis 29.02.2024 (Schaltjahr, 29 Tage, Basis 3,62 %, 5 PP): act/act 1000 × 8,62 % × 29/366 = 6,83 €; act/365 = 6,85 €.
- Zeitraum 15.06.2024 bis 15.07.2024 muss in zwei Perioden (16 Tage zu 3,62 %, 15 Tage zu 3,37 %) zerfallen.

---

## 3. Schuldnertyp: Ist die Gemeinschaft der Wohnungseigentümer (GdWE) Verbraucher?

### 3.1 Normen [H]
- § 13 BGB (https://www.gesetze-im-internet.de/bgb/__13.html): "Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können." Die GdWE ist keine natürliche Person, sondern rechtsfähiger Verband (§ 9a Abs. 1 WEG, https://www.gesetze-im-internet.de/woeigg/__9a.html: "Die Gemeinschaft der Wohnungseigentümer kann Rechte erwerben und Verbindlichkeiten eingehen, vor Gericht klagen und verklagt werden."). Nach dem Wortlaut wäre sie also kein Verbraucher; der BGH stellt sie aber gleich.
- § 14 Abs. 1 BGB (https://www.gesetze-im-internet.de/bgb/__14.html): Unternehmer handelt "in Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit".
- § 288 Abs. 2 BGB: 9 PP nur "bei Rechtsgeschäften, an denen ein Verbraucher nicht beteiligt ist" (Blick auf beide Vertragsparteien). § 288 Abs. 5 S. 1: 40-€-Pauschale "wenn dieser [der Schuldner] kein Verbraucher ist" (Blick nur auf den Schuldner). § 288 Abs. 6 S. 4: Schutz vor Ausschlussvereinbarungen gilt nicht gegen Verbraucher.

### 3.2 BGH-Linie [H]
BGH, Urteile vom 25.03.2015, VIII ZR 243/13, VIII ZR 360/13 und VIII ZR 109/14 (BGHZ 204, 325; NJW 2015, 3228; NZM 2015, 665; Fundstellen via https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=25.03.2015&Aktenzeichen=VIII+ZR+243/13). Sachverhalt: WEG mit 241 Einheiten, Gasliefervertrag, Preisanpassungsklausel; Verwalter gewerblich.
Leitsatz (zitiert nach Haufe https://www.haufe.de/immobilien/verwaltung/wohnungseigentuemergemeinschaften-sind-verbraucher_258_298384.html, Mayer & Dau https://mayer-dau.de/2015/08/06/bgh-weg-ist-verbraucher-gemaess-%C2%A7-13-bgb/, VDIV https://vdiv.de/publikationen/magazine/detail/die-wohnungseigentuemergemeinschaft-ist-verbraucher, urteile.news https://urteile.news/BGH_VIII-ZR-24313VIII-ZR-36013-und-VIII-ZR-10914_Wohnungseigentuemergemeinschaft-ist-als-Verbraucher-gemaess-Paragraph-13-BGB-anzusehen~N20821):
- "Die Wohnungseigentümergemeinschaft ist im Interesse des Verbraucherschutzes der in ihr zusammengeschlossenen, nicht gewerblich handelnden natürlichen Personen regelmäßig einem Verbraucher gleichzustellen", nämlich "wenn ihr wenigstens ein Verbraucher angehört und sie ein Rechtsgeschäft zu einem Zweck abschließt, der weder einer gewerblichen noch einer selbständigen beruflichen Tätigkeit dient."
- Vertretung durch gewerblichen Verwalter ändert nichts: "Für die Abgrenzung von unternehmerischem und privatem Handeln im Sinne der §§ 13, 14 BGB kommt es bei einer Stellvertretung grundsätzlich auf die Person des Vertretenen an." / "Es kommt nämlich nicht auf die Person des Vertreters, sondern auf die Person des Vertretenen an."
- Eine natürliche Person verliert ihren Verbraucherschutz nicht durch den Erwerb von Wohnungseigentum; Verwaltung des gemeinschaftlichen Eigentums ist private Vermögensverwaltung, auch wenn Eigentümer ihre Wohnungen vermieten.
- Ausnahme (VDIV): Verbraucherschutz entfällt nur, wenn "an ihr ausschließlich Unternehmer beteiligt sind" (z. B. reine gewerbliche Teileigentümergemeinschaft aus GmbHs).
- Beweislast: Wer die Unternehmereigenschaft der GdWE behauptet (hier: der Verwalter, der 9 PP/40 € will), muss darlegen, dass kein Verbraucher Mitglied ist (Ableitung aus der Regel-Ausnahme-Struktur; dk-ra.de https://www.dk-ra.de/wohnungseigentuemergemeinschaften-sind-verbraucher-im-sinne-von-%C2%A7-13-bgb/ "implizit trägt der Unternehmer die Beweislast") [M].

Folgeentscheidungen zum Verwaltervertrag: LG Frankfurt a. M., 24.06.2021, 2-13 S 35/20 (zitiert bei Haus & Grund RLP https://hausundgrund-rlp.de/info-service-artikel/articles/22_12_verwalter): pauschale 4-%-Erhöhungsklausel der Verwaltervergütung unwirksam, "wenn die Wohnungseigentümergemeinschaft auch aus Verbrauchern besteht" (AGB-Kontrolle des Verwaltervertrags nach Verbraucherregeln) [M, dejure hat die Entscheidung nicht]. Sachverständige/Handwerker müssen die GdWE über Widerrufsrechte belehren (Mayer & Dau). Nach dem WEMoG (§ 9a WEG seit 01.12.2020) ist keine gegenteilige Entscheidung bekannt; die Literatur wendet die BGH-Linie unverändert an [M].

### 3.3 Konsequenz für die Verwalter-Honorarrechnung an die GdWE
- Regelfall (mindestens ein privater Eigentümer): GdWE = Verbraucher → Verzugszins **5 Prozentpunkte** über Basiszins (§ 288 Abs. 1), **keine 40-€-Pauschale** (§ 288 Abs. 5), 30-Tage-Automatik des § 286 Abs. 3 nur mit besonderem Hinweis auf der Rechnung, AGB des Verwaltervertrags unterliegen §§ 308, 309 BGB, Widerrufsrecht bei Fernabsatz/außerhalb von Geschäftsräumen.
- Ausnahme nur mit positivem Nachweis: alle Eigentümer sind Unternehmer (Mandanten-Stammdatum `gdwe.alleEigentuemerUnternehmer = true` mit Pflichtbegründung). Dann 9 PP + 40 €.
- Verwalterhonorar ist Entgeltforderung (Definition BGH 16.06.2010, VIII ZR 259/09, NJW 2010, 3226, https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=16.06.2010&Aktenzeichen=VIII%20ZR%20259/09: Forderung "auf die Zahlung eines Entgelts als Gegenleistung für eine vom Gläubiger erbrachte oder zu erbringende Leistung gerichtet ist, die in der Lieferung von Gütern oder der Erbringung von Dienstleistungen besteht"). Das ist Voraussetzung für Abs. 2/Abs. 5 überhaupt, ändert aber am Verbraucherstatus nichts.
- Der Rechts-Report ("WEG/Mieter i. d. R. Verbraucher") ist damit im Ergebnis richtig, die Begründung muss auf BGH VIII ZR 243/13 verweisen und die Ausnahme + Beweislast enthalten.

### 3.4 Weitere Schuldnertypen (Entscheidungsmatrix für den Mahnlauf)
| Gläubiger | Schuldner | Forderung | Zinssatz | 40 € Pauschale | Beleg |
|---|---|---|---|---|---|
| Verwalter (Unternehmer) | GdWE mit ≥1 Verbraucher | Honorar (Entgelt) | 5 PP | nein | BGH VIII ZR 243/13; § 288 Abs. 2, 5 |
| Verwalter | GdWE nur Unternehmer | Honorar | 9 PP | ja | § 288 Abs. 2, 5 |
| Verwalter | privater Eigentümer (Mietverwaltung) | Honorar | 5 PP | nein | § 13 BGB |
| Verwalter | Eigentümer GmbH/gewerblich | Honorar | 9 PP | ja | § 14 BGB |
| GdWE | Wohnungseigentümer (privat oder Unternehmer) | Hausgeld/Nachzahlung | 5 PP | nein | Hausgeld beruht auf Beschluss/Gemeinschaftsverhältnis, ist keine Gegenleistung für eine Lieferung/Dienstleistung → keine Entgeltforderung i. S. d. Abs. 2/5 (Ableitung aus BGH VIII ZR 259/09) [M, keine direkte Entscheidung gefunden] |
| privater Vermieter | Wohnraummieter | Miete/Nachzahlung | 5 PP | nein | Verbraucher |
| Vermieter (jeder) | Gewerbemieter (Unternehmer) | Miete | 9 PP nur wenn auch Vermieter Unternehmer, sonst 5 PP (Abs. 2 verlangt "kein Verbraucher beteiligt") | ja (Abs. 5 sieht nur auf den Schuldner) | LG Darmstadt 14.03.2025, 19 O 271/23: 11 Monatsmieten → 11 × 40 € = 480 € (https://vdiv.de/publikationen/magazine/detail/die-verzugspauschale-gemaess-288-abs-5-bgb-faellt-bei-einer-forderungsmehrheit-die-einheitlich-verfolgt-wird-mehrfach-an) |
Wichtig für das Datenmodell: Abs. 2 braucht **beide** Parteitypen, Abs. 5 nur den Schuldnertyp. Also Felder `glaeubiger.istVerbraucher`, `schuldner.istVerbraucher`, `forderung.istEntgeltforderung` (Hausgeld = false, Miete/Honorar/Handwerkerrechnung = true). Pauschale je Entgeltforderung (je Monatsmiete/Rate, § 288 Abs. 5 S. 2), auf Rechtsverfolgungskosten anzurechnen (S. 3).

---

## 4. Widerspruch Mahngebühr (Domänen-Report 2.11 vs. Rechts-Report 6.3): Auflösung

Es geht um zwei verschiedene Dinge, die in der Sonderleistungstabelle vermischt sind:

(a) **Vergütung des Verwalters für das Mahnen** (Sonderleistung, Schuldner = Auftraggeber):
- Mietverwaltung: VDIV-Mustervertrag 3.1.5 (lokal vdiv_mietverwaltung_vertrag.txt Z. 199-202): "für jede Mahnung Kosten von pauschal _____ Euro in Rechnung gestellt werden dürfen. Sie sollen vom Mieter im jeweiligen Mahnschreiben soweit gesetzlich zulässig sogleich eingefordert werden; die Möglichkeit des Nachweises des Entstehens eines nur geringeren oder eines höheren Schadens bleibt wechselseitig vorbehalten." Das ist die Quelle der "10 bis 45 €"-Werte: Preis der Dienstleistung gegenüber dem Eigentümer, nicht Verzugsschaden des Mieters.
- WEG: BGH 05.07.2019, V ZR 278/17: Sondervergütung für Mahnungen im Verwaltervertrag zulässig; Schuldner ist die Gemeinschaft, Umlage auf den säumigen Eigentümer nur per Beschluss nach § 16 Abs. 2 S. 2 WEG (AG Backnang 29.11.2023, 4 C 333/23). Gegenansicht AG Duisburg-Ruhrort 25.07.2019, 28 C 27/18 und AG Reutlingen 11 C 105/16: Mahnen ist Grundleistung, keine Sondervergütung (Quelle Haufe https://www.haufe.de/recht/deutsches-anwalt-office-premium/mahngebuehr-wemog_idesk_PI17574_HI636838.html, Teaser). Also: umstritten, nicht "unzulässig" [M]. Der Domänen-Report ist hier zu apodiktisch.

(b) **Verzugsschaden, den der Schuldner (Mieter/Eigentümer) ersetzen muss** (§ 280 Abs. 2, § 286 BGB):
- BGH 26.06.2019, VIII ZR 95/18 (https://www.anwalt24.de/urteile/bgh/2019-06-26/viii-zr-95_18, Abruf heute 403, Inhalt gemäß Rechts-Report 6.3): AGB-Pauschale 2,50 € je Mahnung gegenüber Verbrauchern unwirksam (§ 309 Nr. 5a), da Personal-/Verwaltungskosten nicht ersatzfähig; ersatzfähig nur Sachkosten (Porto, Papier, Druck, Kuvert), im Fall 0,7643 €. Keine geltungserhaltende Reduktion.
- Die verzugsbegründende (erste) Mahnung ist nie ersatzfähig; bei kalendermäßiger Fälligkeit (Hausgeld, Miete) besteht Verzug ab Fälligkeit, dann ist schon die erste Mahnung eine Verzugsfolge und ihre Sachkosten ersatzfähig.
- "Mahnung 10-45 €" darf also niemals als Forderung im Mahnbrief an einen Verbraucher stehen.

Konfigurations-Default (löst den Widerspruch):
- `mahnkosten.verbraucher.default = 0,00 €` für die erste Mahnung; ab der zweiten Mahnung `porto + material`, Vorgabe 0,95 € (Standardbrief Deutsche Post seit 01.01.2025, Genehmigung BNetzA bis Ende 2026 [M, Post-/BNetzA-Seiten heute nicht abrufbar, Wert aus Rechts-Report]) + 0,10 € Papier/Druck/Kuvert; Betrag im Brief als "Sachkosten dieser Mahnung" bezeichnen, nie "Mahngebühr". E-Mail-Mahnung: 0,00 €.
- `mahnkosten.unternehmer.default`: 40 € Pauschale einmalig je Entgeltforderung (§ 288 Abs. 5) plus ggf. nachgewiesene weitere Kosten; keine zusätzliche "Mahngebühr".
- `sonderleistung.mahnung` (Honorar gegenüber Auftraggeber, Mietverwaltung): frei, z. B. 10-45 €, erscheint auf der Verwalter-Honorarrechnung, nicht im Mahnbrief.
- WEG Hausgeld: Sachkosten wie (b); Umlage einer Verwalter-Sondervergütung nur, wenn Beschluss nach § 16 Abs. 2 S. 2 WEG hinterlegt ist (Flag am Objekt, Beschlussdatum als Pflichtfeld).
- Domänen-Report 2.11 korrigieren: "~1 bis 2,50 €" → "nur nachgewiesene Sachkosten (Porto + Material, i. d. R. unter 1,50 €); 2,50 € pauschal unwirksam (BGH VIII ZR 95/18)".

---

## 5. Weitere gemeldete Widersprüche (Kurzklärung, soweit belegbar)

### 5.1 DATEV Belegfeld 1 (Rechnungsnummer) [M]
- DATEV-Format Buchungsstapel Version 700, Feld 11 "Belegfeld 1": Text, **36 Zeichen**, erlaubte Zeichen Ziffern, Buchstaben, `$ & % * + - /`, kein Leerzeichen am Ende (datenformate-import-export.md Abschnitt 1.3 mit Quellen ledermann/datev und DATEV-Dok. 1036228; die DATEV-Seiten waren heute nicht maschinell lesbar).
- "12 Zeichen" ist die alte Grenze des DATEV-Rechnungswesens vor der Formaterweiterung [L, nicht belegt]; "9 Zeichen" ist eine Beschränkung von PowerHaus ("PowerHaus unterstützt maximal 9-stellige Belegnummern", powerhaus_datev.txt Z. 183) und betrifft nur Kunden, die PowerHaus als Zielsystem haben.
- Entscheidung: Das Exportformat erlaubt 36; das Nummernschema sollte sich nach dem restriktivsten realistischen Zielsystem richten. Vorschlag `RE2600001` (RE + JJ + 5-stelliger Zähler = 9 Zeichen, erfüllt § 14 Abs. 4 Nr. 4 UStG "fortlaufende Nummer mit einer oder mehreren Zahlenreihen", Buchstaben erlaubt), Zähler pro Jahr und Nummernkreis, keine Bindestriche nötig. Mandantenweit konfigurierbar mit Validierung `^[A-Za-z0-9$&%*+\-/]{1,36}$` und Warnung ab > 12 bzw. > 9 Zeichen, wenn Zielsystem PowerHaus/älteres DATEV gesetzt ist.

### 5.2 Versicherungsteuer [H, Gesetzestext lokal]
- § 6 Abs. 1/2 VersStG: Steuersatz 19 % regulär; Feuer/Feuer-BU 22 %; Wohngebäude 19 %; Hausrat 19 %.
- § 5 Abs. 1 S. 1 Nr. 3 VersStG: Bemessungsgrundlage nur ein Anteil des Entgelts: Feuer 60 %, Wohngebäude 86 %, Hausrat 85 %.
- Effektiv vom Versicherungsentgelt: Feuer 22 % × 60 % = **13,2 %**; Wohngebäude 19 % × 86 % = **16,34 %**; Hausrat 19 % × 85 % = **16,15 %**. Der Rest des Entgelts unterliegt der Feuerschutzsteuer (FeuerschutzStG § 3: Feuer 40 %, Wohngebäude 14 %, Hausrat 15 % der Prämie; Satz 19 %), die der Versicherer schuldet und die nicht offen auf der Rechnung steht [M, FeuerschutzStG heute nicht abgerufen].
- Beide Reports sind damit unvollständig: 1.7 nennt nur die Nominalsätze, 2.3 nur den Wohngebäude-Effektivsatz. Für die App ist die Rechnung ohnehin nicht selbst zu berechnen: § 5 Abs. 3 VersStG verlangt offenen Ausweis von Steuerbetrag, Steuersatz und Versicherungsteuernummer auf der Rechnung → Betrag aus dem Beleg lesen, Plausibilität gegen 13,2/16,34/16,15/19 % prüfen, nie als Vorsteuer buchen.

### 5.3 § 14 Abs. 4 UStG: zehn Nummern [H]
Lokaler Gesetzestext law_ustg_1980___14.txt: Nr. 1 Name/Anschrift, 2 StNr./USt-IdNr., 3 Ausstellungsdatum, 4 Rechnungsnummer, 5 Menge/Art, 6 Leistungszeitpunkt, 7 Entgelt nach Steuersätzen, 8 Steuersatz/Steuerbetrag bzw. Befreiungshinweis, 9 Hinweis auf Aufbewahrungspflicht (§ 14b Abs. 1 S. 5, Bauleistungen an Privat), 10 Angabe "Gutschrift". Checkliste = 10 Punkte, Nr. 9 und 10 bedingt. Der Domänen-Report ist zu korrigieren.

### 5.4 ZUGFeRD-Version [H, FeRD-Pressemitteilung lokal ferd_zugferd24_pm.txt]
"Neue ZUGFeRD-Version 2.4 veröffentlicht", Eschborn/Paris 04.12.2025: "Die neue Version basiert auf UN/CEFACT CII D22B und ist vollständig rückwärtskompatibel zu D16B. Alle fünf Profile verfügen über eigene XSD- und Schematron-Validierungsartefakte ... Die neue Version tritt am 15. Januar 2026 in Kraft." Download-Bezeichnung "ZUGFeRD 2.4/Factur-X 1.08". Der Format-Report 6.2 ("2.3 / Factur-X 1.0.07, Mai 2025") ist veraltet; für die Erkennung eingehender Hybridrechnungen weiterhin alle Versionen ab 2.0.1 akzeptieren (BMF-FAQ), für die eigene Ausgabe 2.4 referenzieren. Offen: exakte XMP-Werte (`fx:Version`) im 2.4-Infopaket prüfen.

### 5.5 Reverse Charge Gebäudereinigung [H, Gesetzestext lokal]
§ 13b Abs. 5 S. 5 UStG (law_ustg_1980___13b.txt): "In den in Absatz 2 Nummer 8 Satz 1 genannten Fällen schuldet der Leistungsempfänger die Steuer ..., wenn er ein Unternehmer ist, der nachhaltig entsprechende Leistungen erbringt; davon ist auszugehen, wenn ihm das zuständige Finanzamt eine ... Bescheinigung [USt 1 TG] ... erteilt hat." Hausverwaltung, Vermieter und GdWE erbringen keine Gebäudereinigungsleistungen → nicht Steuerschuldner; eine Netto-Reinigungsrechnung mit § 13b-Hinweis ist fehlerhaft (Warnung: korrigierte Rechnung mit 19 % USt anfordern). Kontierungstabelle: Zeile "Reinigung 4250/6330" bekommt Default BU 9 (bzw. Bruttobuchung ohne BU bei nicht vorsteuerabzugsberechtigten Mandanten); BU 94 nur, wenn `mandant.ust1tg.gueltigBis >= Leistungsdatum` gesetzt ist. Der Format-Report ist entsprechend zu ändern.

---

## 6. Offene Punkte
- Kein BGH-Volltext von VIII ZR 243/13 abgerufen (BGH-Datenbank per Fetch nicht erreichbar); Leitsatz über vier übereinstimmende Besprechungen belegt.
- Keine Gerichtsentscheidung gefunden, die ausdrücklich act/act für § 288 BGB festschreibt; Konvention ist Praxis-Standard, nicht Gesetz.
- Hausgeld als Nicht-Entgeltforderung ist Ableitung, keine direkte Entscheidung gefunden.
- Porto 0,95 € (Standardbrief ab 01.01.2025) nicht erneut primär belegt (Post/BNetzA-Seiten Timeout/404).
- FeuerschutzStG-Sätze aus Erinnerung, nicht abgerufen.
- DATEV-Dokument 1036228 nicht maschinenlesbar; "12 Zeichen" als Altgrenze unbelegt.
