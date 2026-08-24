#!/usr/bin/env node
/**
 * Erzeugt die Beispieldokumente des Beispielbetriebs (public/beispiel/): neun Eingangsrechnungen
 * in vier deutlich verschiedenen Layouts, ein Handyfoto eines Baumarktbons, zwei Anfragen, ein
 * Handwerkerangebot und drei Kontoauszüge (Sparkasse-CSV, ING-CSV, MT940). Alles passt zu den
 * Stammdaten in src/lib/beispiel/daten.ts; welche Falle in welcher Datei steckt, steht in
 * docs/BEISPIELE.md.
 *
 *   node scripts/beispieldaten.mjs                    schreibt nach public/beispiel/
 *   node scripts/beispieldaten.mjs --vorschau ORDNER  legt zusätzlich PNG-Vorschauen der PDFs ab
 *
 * Die erzeugten Dateien liegen im Repo. Der Generator dient nur zum Nachbauen und Anpassen.
 * HTML → PDF/JPG läuft über Google Chrome bzw. das Chromium aus dem Playwright-Cache
 * (Pfadsuche wie in scripts/screenshot.mjs).
 */
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(WURZEL, "public", "beispiel");
const args = process.argv.slice(2);
const vorschauOrdner = args.includes("--vorschau") ? args[args.indexOf("--vorschau") + 1] : "";

// ---------- Hilfen ----------

function chromePfad() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const kandidaten = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  for (const k of kandidaten) if (existsSync(k)) return k;
  const caches = [path.join(homedir(), "Library/Caches/ms-playwright"), path.join(homedir(), ".cache/ms-playwright")];
  for (const c of caches) {
    if (!existsSync(c)) continue;
    const dirs = readdirSync(c).filter((d) => d.startsWith("chromium-")).sort().reverse();
    for (const d of dirs) {
      for (const rel of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        const p = path.join(c, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("Kein Chrome/Chromium gefunden. CHROME_BIN setzen.");
}

const zahlFormat = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 1234.5 → "1.234,50" */
const eur = (n) => zahlFormat.format(n);
/** 1234.5 → "1.234,50 €" */
const eurZ = (n) => `${eur(n)} €`;
const cent = (n) => Math.round(n * 100);
const runde = (n) => Math.round(n * 100) / 100;
const summe = (xs) => xs.reduce((a, b) => a + cent(b), 0) / 100;
/** "2026-07-07" → "07.07.26" (Sparkasse) */
const deKurz = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ibanGruppen = (iban) => iban.replace(/(.{4})/g, "$1 ").trim();

/** Prüft, dass ein Text nur Zeichen aus ISO-8859-1 enthält (Kontoauszüge alter Banken). */
function alsLatin1(text) {
  for (const ch of text) {
    if (ch.codePointAt(0) > 0xff) throw new Error(`Zeichen "${ch}" ist nicht in ISO-8859-1 darstellbar`);
  }
  return Buffer.from(text, "latin1");
}

/** Quoted-Printable nach RFC 2045 für UTF-8-Text (Zeilenumbruch CRLF, Softbreaks bei 76 Zeichen). */
function quotedPrintable(text) {
  const bytes = Buffer.from(text.replace(/\r?\n/g, "\r\n"), "utf8");
  let aus = "";
  let zeile = "";
  const schreib = (s) => {
    if (zeile.length + s.length > 75) {
      aus += `${zeile}=\r\n`;
      zeile = "";
    }
    zeile += s;
  };
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x0d && bytes[i + 1] === 0x0a) {
      // Leerzeichen am Zeilenende müssen kodiert werden
      if (zeile.endsWith(" ")) zeile = `${zeile.slice(0, -1)}=20`;
      aus += `${zeile}\r\n`;
      zeile = "";
      i++;
      continue;
    }
    if ((b >= 33 && b <= 126 && b !== 61) || b === 32) schreib(String.fromCharCode(b));
    else schreib(`=${b.toString(16).toUpperCase().padStart(2, "0")}`);
  }
  return aus + zeile;
}

const encodedWord = (s) => `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;

// ---------- Beteiligte (IBANs gültig gebaut, gehören niemandem) ----------

const HV = {
  name: "Hausverwaltung Mustermann GmbH",
  strasse: "Kaiserstraße 45",
  plzOrt: "50667 Köln",
  iban: "DE02120300000000202051",
  bic: "BYLADEM1001",
};
/** Die vier Mieter-IBANs stehen so in daten.ts (Prüfziffern korrigiert). */
const MIETER = {
  schmidt: { name: "Anna Schmidt", iban: "DE31100110012626667882", bic: "NTSBDEB1XXX" },
  yilmaz: { name: "Mehmet Yilmaz", iban: "DE11520513735120710131", bic: "HELADEF1ERB" },
  weber: { name: "Jonas Weber", iban: "DE02100110012345678901", bic: "NTSBDEB1XXX" },
  neumann: { name: "Marie Neumann", iban: "DE73370501980056789012", bic: "COLSDE33XXX" },
  becker: { name: "Tim Becker", iban: "DE63120300001098765432", bic: "BYLADEM1001" },
  ott: { name: "Lena Ott", iban: "DE22200411110123456789", bic: "COBADEHDXXX" },
  demir: { name: "Elif Demir", iban: "DE26100100100057021049", bic: "PBNKDEFFXXX" },
  fischer: { name: "Karl Fischer", iban: "DE04100500000190001060", bic: "BELADEBEXXX" },
};
const VOGEL_PRIVAT = { name: "Erika Vogel", iban: "DE93370502990034567890", bic: "COKSDE33XXX" };

const LIEFERANTEN = {
  kaminski: {
    name: "Elektro Kaminski GmbH", strasse: "Venloer Straße 312", plzOrt: "50823 Köln", telefon: "0221 55 09 12-0", email: "service@elektro-kaminski.de", web: "www.elektro-kaminski.de",
    steuernummer: "217/5120/0987", ustId: "DE812345678", register: "Amtsgericht Köln HRB 67890", leitung: "Geschäftsführer: Piotr Kaminski",
    bank: "Commerzbank Köln", iban: "DE89370400440532013000", bic: "COBADEFFXXX",
  },
  sauberFein: {
    name: "Sauber & Fein Gebäudereinigung GmbH", strasse: "Ehrenfeldgürtel 90", plzOrt: "50823 Köln", telefon: "0221 98 76 54-0", email: "rechnung@sauberundfein.de", web: "sauberundfein.de",
    steuernummer: "215/5824/2211", ustId: "DE298765432", register: "Amtsgericht Köln HRB 90123", leitung: "Geschäftsführung: Nadine Feinberg",
    bank: "Sparkasse KölnBonn", iban: "DE75370501981901234567", bic: "COLSDE33XXX", glaeubigerId: "DE55ZZZ00001234567",
  },
  lifttec: {
    name: "LiftTec Aufzugsservice GmbH", strasse: "Industriestraße 17", plzOrt: "51147 Köln", telefon: "02203 40 40 40", email: "buchhaltung@lifttec.de", web: "www.lifttec.de",
    steuernummer: "216/5730/1188", ustId: "DE256789012", register: "Amtsgericht Köln HRB 55210", leitung: "Geschäftsführer: Dipl.-Ing. Rolf Aumann",
    bank: "Commerzbank Köln", iban: "DE47370400440212345600", bic: "COBADEFFXXX",
  },
  wasserwerke: {
    name: "Rheinland Wasserwerke GmbH", strasse: "Wasserwerkstraße 1", plzOrt: "50735 Köln", telefon: "0221 178-0", email: "kundenservice@rheinland-wasserwerke.de", web: "www.rheinland-wasserwerke.de",
    steuernummer: "215/5901/0044", ustId: "DE811234567", register: "Amtsgericht Köln HRB 1234", leitung: "Geschäftsführung: Dr. Katrin Wolters, Jens Bauer",
    bank: "Kreissparkasse Köln", iban: "DE82370502990000112233", bic: "COKSDE33XXX",
  },
  gartenGruen: {
    name: "Garten Grün Landschaftspflege GbR", strasse: "Am Bruch 4", plzOrt: "50997 Köln", telefon: "0176 23 44 51 90", email: "garten-gruen@example.de", web: "",
    steuernummer: "", ustId: "", register: "", leitung: "Gesellschafter: Ulrike Grün, Hakan Demirci",
    bank: "Volksbank Köln Bonn", iban: "DE19380601864012345018", bic: "GENODED1BRS",
  },
  meier: {
    name: "Dachdeckerei Meier & Sohn", strasse: "Bergisch Gladbacher Straße 455", plzOrt: "51067 Köln", telefon: "0221 63 90 17", email: "info@dachdeckerei-meier.de", web: "www.dachdeckerei-meier.de",
    steuernummer: "218/5100/3344", ustId: "DE134567890", register: "Handwerkskammer zu Köln, Betriebs-Nr. 20411", leitung: "Inhaber: Klaus Meier, Dachdeckermeister",
    bank: "Sparkasse KölnBonn", iban: "DE78370501980031122334", bic: "COLSDE33XXX",
  },
  versicherung: {
    name: "Rheinische Gebäudeversicherung AG", strasse: "Hohenzollernring 60", plzOrt: "50672 Köln", telefon: "0221 33 66 99-0", email: "beitrag@rgv-koeln.de", web: "www.rgv-koeln.de",
    steuernummer: "215/5800/0102", ustId: "DE119876543", register: "Amtsgericht Köln HRB 2244", leitung: "Vorstand: Dr. Bernd Haller (Vors.), Simone Ritter",
    bank: "Deutsche Bank Köln", iban: "DE13370700600123456700", bic: "DEUTDEDKXXX", versStNr: "805/V 3421/07",
  },
  fuchs: {
    name: "Malerbetrieb Fuchs", strasse: "Dürener Straße 202", plzOrt: "50931 Köln", telefon: "0221 40 22 87", email: "malerfuchs@example.de", web: "",
    steuernummer: "223/5301/0777", ustId: "", register: "", leitung: "Inhaber: Rainer Fuchs, Malermeister",
    bank: "Postbank", iban: "DE75370100500987654321", bic: "PBNKDEFFXXX",
  },
};

// ---------- Rechnungsdaten ----------

/** Positionen rechnen: gesamt = menge × einzel (Cent-genau). */
function positionen(liste) {
  return liste.map((p, i) => ({ pos: i + 1, ...p, gesamt: runde(p.menge * p.einzel) }));
}

function summen(pos, ustSatz = 19) {
  const netto = summe(pos.map((p) => p.gesamt));
  const ust = runde(netto * (ustSatz / 100));
  return { netto, ust, brutto: summe([netto, ust]) };
}

function pruefeSumme(name, ist, soll) {
  if (cent(ist) !== cent(soll)) throw new Error(`${name}: Summe ${eur(ist)} weicht von erwarteten ${eur(soll)} ab`);
}

// 1) Elektro Kaminski GmbH, sauber
const kaminskiPos = positionen([
  { text: "Fehlersuche und Reparatur Treppenhausbeleuchtung 2. bis 3. OG, Facharbeiterstunden (Meister)", menge: 5, einheit: "Std", einzel: 62 },
  { text: "Bewegungsmelder 180°, Aufputz, IP44, inkl. Montage und Einstellung", menge: 2, einheit: "Stk", einzel: 48.5 },
  { text: "Anfahrt und Kleinmaterial (Klemmen, Leitung NYM 3×1,5, Kabelbinder), pauschal", menge: 1, einheit: "psch", einzel: 79 },
]);
const kaminski = summen(kaminskiPos);
pruefeSumme("Kaminski netto", kaminski.netto, 486);
pruefeSumme("Kaminski brutto", kaminski.brutto, 578.34);

// 2) Sauber & Fein, sauber, Lastschrift (die Datei wird zweimal erzeugt: Duplikat)
const sauberFeinPos = positionen([
  { text: "Treppenhausreinigung wöchentlich inkl. Eingangsbereich und Briefkastenanlage, Bahnhofstraße 7, 50667 Köln, Juli 2026 (4 Reinigungen)", menge: 4, einheit: "Reinigung", einzel: 47.5 },
]);
const sauberFein = summen(sauberFeinPos);
pruefeSumme("Sauber & Fein brutto", sauberFein.brutto, 226.1);

// 3) LiftTec, sauber (Aufzug, umlagefähig)
const lifttecPos = positionen([
  { text: "Wartungspauschale Q3/2026 Personenaufzug Anlage 1 (Fabr.-Nr. 4471-A, Haus 3 links), 3 Monate à 106,67 €: Wartung nach DIN EN 13015, Funktionsprüfung, Schmierung, Notrufprobe", menge: 1, einheit: "Quartal", einzel: 320 },
  { text: "Wartungspauschale Q3/2026 Personenaufzug Anlage 2 (Fabr.-Nr. 4471-B, Haus 3 rechts), Leistungen wie Pos. 1", menge: 1, einheit: "Quartal", einzel: 320 },
]);
const lifttec = summen(lifttecPos);
pruefeSumme("LiftTec brutto", lifttec.brutto, 761.6);

// 4) Rheinland Wasserwerke, Abschlag mit zwei Steuersätzen (Abwasser ohne USt)
const wasserPos = [
  { pos: 1, text: "Trinkwasser, Abschlag Juli 2026 (Zähler W-8812093, Bahnhofstraße 7)", menge: 1, einheit: "Abschlag", einzel: 210, gesamt: 210, ust: 7 },
  { pos: 2, text: "Abwasser (Schmutz- und Niederschlagswasser), Abschlag Juli 2026, hoheitliche Entwässerungsgebühr", menge: 1, einheit: "Abschlag", einzel: 260, gesamt: 260, ust: 0 },
];
const wasser = { netto: 470, ust: 14.7, brutto: 484.7 };
pruefeSumme("Wasserwerke brutto", summe([wasser.netto, wasser.ust]), wasser.brutto);

// 5) Garten Grün GbR, Kleinunternehmer ohne Steuernummer
const gartenPos = positionen([
  { text: "Rasenmähen und Kantenschnitt Vorgarten und Hof, Juni 2026 (2 Termine: 05.06. und 19.06.)", menge: 2, einheit: "Termin", einzel: 60 },
  { text: "Rasenmähen und Kantenschnitt Vorgarten und Hof, Juli 2026 (2 Termine: 03.07. und 17.07.)", menge: 2, einheit: "Termin", einzel: 60 },
  { text: "Heckenschnitt Ligusterhecke zur Straße (ca. 18 m), Abfuhr und Entsorgung Grünschnitt", menge: 1, einheit: "psch", einzel: 100 },
]);
const garten = { netto: summe(gartenPos.map((p) => p.gesamt)), ust: 0, brutto: summe(gartenPos.map((p) => p.gesamt)) };
pruefeSumme("Garten Grün brutto", garten.brutto, 340);

// 6) Dachdeckerei Meier & Sohn, Notreparatur Sturmschaden (Freigabe, WEG, Versicherungsfall)
const meierPos = positionen([
  { text: "Notdiensteinsatz Sonntag 09.08.2026 nach Unwetter: Anfahrt, Bereitstellung, Sonntagszuschlag, pauschal", menge: 1, einheit: "psch", einzel: 280 },
  { text: "Sturmschaden Haus 7, Dach Ostseite: abgedeckte Dachfläche notgesichert, Notabdeckung mit Plane 60 m² verlegt und verankert", menge: 1, einheit: "psch", einzel: 540 },
  { text: "Dachziegel Frankfurter Pfanne rot ersetzt, inkl. Material", menge: 85, einheit: "Stk", einzel: 4.8 },
  { text: "Firstziegel ersetzt, in Mörtel verlegt, inkl. Material", menge: 12, einheit: "Stk", einzel: 11 },
  { text: "Dachdeckerstunden (2 Gesellen, je 5 Std) für Reparatur der Eindeckung und Lattung", menge: 10, einheit: "Std", einzel: 68 },
  { text: "Hubarbeitsbühne 20 m, Tagesmiete inkl. Anlieferung und Abholung", menge: 1, einheit: "Tag", einzel: 340 },
]);
const meier = summen(meierPos);
pruefeSumme("Meier netto", meier.netto, 2380);
pruefeSumme("Meier brutto", meier.brutto, 2832.2);

// 7) Rheinische Gebäudeversicherung AG, Versicherungsteuer statt USt
const versicherung = { beitrag: 1630.25, steuer: 309.75, gesamt: 1940 };
pruefeSumme("Versicherung Steuer", runde(versicherung.beitrag * 0.19), versicherung.steuer);
pruefeSumme("Versicherung gesamt", summe([versicherung.beitrag, versicherung.steuer]), versicherung.gesamt);

// 8) Malerbetrieb Fuchs, Rechenfehler im Endbetrag (1.478,50 statt 1.487,50)
const fuchsPos = positionen([
  { text: "Wände Treppenhaus EG bis 2. OG: abwaschen, Risse spachteln, grundieren, zweimal streichen mit Dispersionsfarbe weiß (RAL 9010)", menge: 185, einheit: "m²", einzel: 4.2 },
  { text: "Decken Treppenhaus und Podeste: grundieren und zweimal streichen", menge: 48, einheit: "m²", einzel: 4.5 },
  { text: "Holzhandlauf schleifen, grundieren und zweimal lackieren (seidenmatt)", menge: 22, einheit: "m", einzel: 8.5 },
  { text: "Abdeckarbeiten, Abkleben, Baustellenreinigung und Material, pauschal", menge: 1, einheit: "psch", einzel: 70 },
]);
const fuchs = summen(fuchsPos);
pruefeSumme("Fuchs netto", fuchs.netto, 1250);
pruefeSumme("Fuchs brutto (richtig)", fuchs.brutto, 1487.5);
const FUCHS_GEDRUCKT = 1478.5; // Zahlendreher, absichtlich

// 9) Angebot Dachsanierung Severinstraße 88
const angebotPos = positionen([
  { text: "Baustelleneinrichtung, Fassadengerüst 4 Seiten inkl. Dachfanggerüst und Schutznetz, Standzeit bis 8 Wochen, Auf- und Abbau", menge: 640, einheit: "m²", einzel: 9.5 },
  { text: "Alte Dacheindeckung abdecken, Lattung und Konterlattung entfernen, Schutt in Container laden, Entsorgung inkl. Nachweis", menge: 420, einheit: "m²", einzel: 18 },
  { text: "Diffusionsoffene Unterspannbahn (sd ≤ 0,1 m) verlegen, Konterlattung 40/60 und Traglattung 30/50 nach Ziegelmaß", menge: 420, einheit: "m²", einzel: 24 },
  { text: "Neueindeckung Tondachziegel Doppelmuldenfalz naturrot inkl. First-, Ortgang- und Lüfterziegel, Firstentlüftung, Sturmklammern", menge: 420, einheit: "m²", einzel: 42 },
  { text: "Dachrinnen halbrund 333 und Fallrohre DN 100 in Titanzink erneuern, inkl. Rinnenhalter und Einhangstutzen", menge: 48, einheit: "m", einzel: 55 },
  { text: "Schornsteinköpfe neu einfassen, Kaminverwahrung aus Titanzink, Abdeckhaube", menge: 2, einheit: "Stk", einzel: 480 },
  { text: "Dachflächenfenster 78 × 118 cm austauschen, Holz-Schwingfenster mit Eindeckrahmen, inkl. Innenfutter", menge: 3, einheit: "Stk", einzel: 1000 },
  { text: "Bauleitung, Fotodokumentation, Aufmaß und Abnahmeprotokoll, pauschal", menge: 1, einheit: "psch", einzel: 940 },
]);
const angebot = summen(angebotPos);
pruefeSumme("Angebot netto", angebot.netto, 48900);

// 10) Baumarktbon (Foto), Kleinbetrag, bereits bezahlt
const bonPos = [
  { text: "TUERSCHLIESSER TS1000 SILB", brutto: 49.99 },
  { text: "SPAX 4X40 200 ST", brutto: 12.95 },
  { text: "SILIKON SANITAER WEISS", brutto: 8.99 },
  { text: "PROFILZYLINDER 30/30", brutto: 15.47 },
];
const bon = { brutto: summe(bonPos.map((p) => p.brutto)) };
bon.netto = runde(bon.brutto / 1.19);
bon.ust = summe([bon.brutto, -bon.netto]);
pruefeSumme("Bon brutto", bon.brutto, 87.4);

// ---------- HTML-Bausteine ----------

const CSS_BASIS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { width: 210mm; min-height: 297mm; color: #1d1d1d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.r { text-align: right; white-space: nowrap; }
.klein { font-size: 8pt; }
`;

/** Layout A: klassischer Handwerker mit Tabelle, Absenderzeile im Fenster, Firmenfuß mit Bankdaten. */
function layoutHandwerker(d) {
  const { l, stil } = d;
  const zeilen = d.positionen
    .map(
      (p) => `<tr><td class="r">${p.pos}</td><td>${esc(p.text)}</td><td class="r">${eur(p.menge).replace(",00", "")}</td><td>${esc(p.einheit)}</td><td class="r">${eur(p.einzel)}</td><td class="r">${eur(p.gesamt)}</td></tr>`,
    )
    .join("");
  // Seitenränder über @page, damit auch ein zweiseitiges Dokument (Angebot) auf jeder Seite Rand hat;
  // der Firmenfuß sitzt absolut am Ende der letzten Seite (stil.seiten).
  const seiten = stil.seiten ?? 1;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(d.titel)}</title><style>${CSS_BASIS}
@page { size: A4; margin: 16mm 20mm 14mm 22mm; }
body { font-family: ${stil.font}; font-size: 10.5pt; width: auto; min-height: calc(267mm * ${seiten}); padding: 0 0 28mm; position: relative; }
.kopf { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${stil.farbe}; padding-bottom: 6px; }
.logo { font-size: 21pt; font-weight: 700; color: ${stil.farbe}; letter-spacing: 0.5px; line-height: 1; }
.claim { font-size: 9pt; color: #555; margin-top: 4px; }
.kontakt { text-align: right; font-size: 8.5pt; line-height: 1.45; color: #444; }
.fenster { margin-top: 12mm; height: 38mm; }
.absenderzeile { font-size: 7pt; text-decoration: underline; color: #555; margin-bottom: 8px; }
.empf { line-height: 1.45; }
.info { position: absolute; right: 0; top: 44mm; width: 70mm; font-size: 9pt; }
.info table { width: 100%; border-collapse: collapse; }
.info td { padding: 1.5px 0; vertical-align: top; }
.info td:first-child { color: #555; width: 46%; }
h1 { font-size: 15pt; margin: 4mm 0 2mm; color: ${stil.farbe}; }
.betreff { margin: 0 0 4mm; line-height: 1.4; }
table.pos { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
table.pos th { text-align: left; border-bottom: 1.5px solid #333; padding: 4px 5px; font-weight: 700; background: ${stil.tabellenkopf}; }
table.pos th.r { text-align: right; }
table.pos td { border-bottom: 1px solid #cfcfcf; padding: 5px; vertical-align: top; }
.summen { width: 78mm; margin-left: auto; margin-top: 3mm; border-collapse: collapse; }
.summen td { padding: 3px 5px; }
.summen tr.brutto td { border-top: 2px solid #333; font-weight: 700; font-size: 11pt; padding-top: 5px; }
.text { margin-top: 5mm; line-height: 1.45; }
.text p { margin: 0 0 2.5mm; }
.fuss { position: absolute; left: 0; right: 0; bottom: 0; border-top: 1px solid #999; padding-top: 4px; font-size: 7.5pt; color: #444; display: flex; justify-content: space-between; gap: 6mm; line-height: 1.45; }
.fuss div { flex: 1; }
.fuss div:last-child { white-space: nowrap; }
</style></head><body>
<div class="kopf">
  <div><div class="logo">${esc(stil.logo)}</div><div class="claim">${esc(stil.claim)}</div></div>
  <div class="kontakt">${esc(l.name)}<br>${esc(l.strasse)} · ${esc(l.plzOrt)}<br>Tel. ${esc(l.telefon)}<br>${esc(l.email)}</div>
</div>
<div class="fenster">
  <div class="absenderzeile">${esc(l.name)} · ${esc(l.strasse)} · ${esc(l.plzOrt)}</div>
  <div class="empf">${d.empfaenger.map(esc).join("<br>")}</div>
</div>
<div class="info"><table>${d.info.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table></div>
<h1>${esc(d.ueberschrift)}</h1>
<p class="betreff">${d.betreff}</p>
<table class="pos"><thead><tr><th class="r">Pos.</th><th>Leistung</th><th class="r">Menge</th><th>Einh.</th><th class="r">Einzelpreis €</th><th class="r">Gesamt €</th></tr></thead><tbody>${zeilen}</tbody></table>
<table class="summen">${d.summen.map(([k, v, cls]) => `<tr class="${cls ?? ""}"><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join("")}</table>
<div class="text">${d.text}</div>
<div class="fuss">
  <div>${esc(l.name)}<br>${esc(l.strasse)}<br>${esc(l.plzOrt)}<br>${esc(l.leitung)}</div>
  <div>Tel. ${esc(l.telefon)}<br>${esc(l.email)}<br>${esc(l.web)}</div>
  <div>${esc(l.register)}<br>Steuernummer ${esc(l.steuernummer)}<br>USt-IdNr. ${esc(l.ustId)}</div>
  <div>${esc(l.bank)}<br>IBAN ${ibanGruppen(l.iban)}<br>BIC ${esc(l.bic)}</div>
</div>
</body></html>`;
}

/** Layout B: Versorger/Versicherer mit Kundenservice-Kasten, hervorgehobenem Zahlbetrag und Abschlagsplan. */
function layoutVersorger(d) {
  const { l, stil } = d;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(d.titel)}</title><style>${CSS_BASIS}
body { font-family: ${stil.font}; font-size: ${stil.groesse ?? "10pt"}; padding: 0 0 22mm; position: relative; }
.band { background: ${stil.farbe}; color: #fff; padding: 9mm 20mm 6mm; display: flex; justify-content: space-between; align-items: flex-end; }
.marke { font-size: 20pt; font-weight: 700; letter-spacing: 0.3px; }
.marke small { display: block; font-size: 8.5pt; font-weight: 400; opacity: 0.9; margin-top: 3px; }
.service { font-size: 8pt; text-align: right; line-height: 1.5; }
.inhalt { padding: 10mm 20mm 0 22mm; position: relative; }
.absenderzeile { font-size: 7pt; color: #666; margin-bottom: 8px; }
.empf { line-height: 1.45; height: ${stil.fensterHoehe ?? "34mm"}; }
.info { position: absolute; right: 20mm; top: 10mm; width: 78mm; background: ${stil.hell}; padding: 4mm 5mm; font-size: 8.5pt; border-left: 3px solid ${stil.farbe}; }
.info table { width: 100%; border-collapse: collapse; }
.info td { padding: 1.5px 0; vertical-align: top; }
.info td:first-child { color: #555; width: 44%; }
h1 { font-size: 16pt; color: ${stil.farbe}; margin: 2mm 0 2mm; max-width: 88mm; }
.einleitung { line-height: 1.45; margin: 0 0 5mm; }
h2 { font-size: 11pt; margin: 6mm 0 2mm; color: ${stil.farbe}; }
table.pos { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
table.pos th { text-align: left; padding: 5px; background: ${stil.hell}; font-weight: 700; }
table.pos th.r { text-align: right; }
table.pos td { padding: 5px; border-bottom: 1px solid #ddd; vertical-align: top; }
.zahlbetrag { margin: 6mm 0; border: 2px solid ${stil.farbe}; padding: 4mm 5mm; display: flex; justify-content: space-between; align-items: center; }
.zahlbetrag .betrag { font-size: 16pt; font-weight: 700; color: ${stil.farbe}; }
.zahlbetrag .hinweis { font-size: 9pt; line-height: 1.45; max-width: 115mm; }
table.plan { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.zweispaltig { display: flex; gap: 8mm; }
.zweispaltig table.plan { flex: 1; }
table.plan th, table.plan td { padding: 2px 4px; border-bottom: 1px solid #e3e3e3; text-align: left; white-space: nowrap; }
table.plan th.r, table.plan td.r { text-align: right; }
.fuss { position: fixed; left: 22mm; right: 20mm; bottom: 8mm; font-size: 7.5pt; color: #555; border-top: 1px solid #bbb; padding-top: 4px; line-height: 1.45; display: flex; gap: 8mm; }
.fuss div { flex: 1; }
</style></head><body>
<div class="band">
  <div class="marke">${esc(stil.logo)}<small>${esc(stil.claim)}</small></div>
  <div class="service"><strong>Kundenservice</strong><br>Tel. ${esc(l.telefon)}<br>${esc(l.email)}<br>Mo bis Fr 8 bis 18 Uhr</div>
</div>
<div class="inhalt">
  <div class="absenderzeile">${esc(l.name)} · ${esc(l.strasse)} · ${esc(l.plzOrt)}</div>
  <div class="empf">${d.empfaenger.map(esc).join("<br>")}</div>
  <div class="info"><table>${d.info.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table></div>
  <h1>${esc(d.ueberschrift)}</h1>
  <p class="einleitung">${d.einleitung}</p>
  ${d.inhalt}
</div>
<div class="fuss">
  <div>${esc(l.name)} · ${esc(l.strasse)} · ${esc(l.plzOrt)}<br>${esc(l.register)} · ${esc(l.leitung)}</div>
  <div>Steuernummer ${esc(l.steuernummer)} · USt-IdNr. ${esc(l.ustId)}${l.versStNr ? ` · Versicherungsteuer-Nr. ${esc(l.versStNr)}` : ""}<br>${esc(l.bank)} · IBAN ${ibanGruppen(l.iban)} · BIC ${esc(l.bic)}</div>
</div>
</body></html>`;
}

/** Layout C: moderne Agentur-Optik, viel Weißraum, Akzentfarbe, keine Tabellenlinien. */
function layoutAgentur(d) {
  const { l, stil } = d;
  const zeilen = d.positionen
    .map((p) => `<div class="zeile"><div class="nr">${String(p.pos).padStart(2, "0")}</div><div class="txt">${esc(p.text)}<span class="detail">${eur(p.menge).replace(",00", "")} ${esc(p.einheit)} × ${eur(p.einzel)} €</span></div><div class="r betrag">${eur(p.gesamt)} €</div></div>`)
    .join("");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(d.titel)}</title><style>${CSS_BASIS}
body { font-family: ${stil.font}; font-size: 10pt; padding: 18mm 18mm 26mm 24mm; position: relative; color: #262626; }
.akzent { position: absolute; left: 0; top: 0; bottom: 0; width: 6mm; background: ${stil.farbe}; }
.kopf { display: flex; justify-content: space-between; align-items: flex-start; }
.wortmarke { font-size: 24pt; font-weight: ${stil.markeGewicht}; letter-spacing: ${stil.markeSpationierung}; color: ${stil.farbe}; line-height: 1; }
.wortmarke small { display: block; font-size: 8.5pt; letter-spacing: 0; color: #666; margin-top: 5px; font-weight: 400; }
.meta { text-align: right; font-size: 9pt; line-height: 1.55; color: #444; }
.meta strong { color: #262626; }
.empf { margin-top: 22mm; line-height: 1.5; }
.empf .an { font-size: 8pt; color: #888; margin-bottom: 2px; }
h1 { font-size: 30pt; font-weight: 300; margin: 16mm 0 2mm; letter-spacing: -0.5px; }
.sub { color: #555; margin: 0 0 8mm; line-height: 1.5; }
.zeile { display: flex; gap: 6mm; padding: 4mm 0; border-top: 1px solid #e6e6e6; }
.zeile.kopfzeile { padding: 2mm 0; border-top: 0; font-size: 8.5pt; color: #777; }
.zeile .nr { width: 8mm; color: ${stil.farbe}; font-weight: 700; }
.zeile .txt { flex: 1; line-height: 1.45; }
.zeile .detail { display: block; font-size: 8.5pt; color: #777; margin-top: 2px; }
.zeile .betrag { width: 28mm; }
.summen { margin-top: 2mm; border-top: 1px solid #e6e6e6; padding-top: 3mm; margin-left: auto; width: 86mm; }
.summen div { display: flex; justify-content: space-between; padding: 1.5mm 0; color: #555; }
.summen .brutto { font-size: 14pt; font-weight: 700; color: ${stil.farbe}; border-top: 2px solid ${stil.farbe}; margin-top: 2mm; padding-top: 3mm; }
.text { margin-top: 10mm; line-height: 1.55; max-width: 150mm; }
.text p { margin: 0 0 3mm; }
.fuss { position: fixed; left: 24mm; right: 18mm; bottom: 9mm; font-size: 7.5pt; color: #666; line-height: 1.5; display: flex; gap: 8mm; }
.fuss div { flex: 1; }
</style></head><body>
<div class="akzent"></div>
<div class="kopf">
  <div class="wortmarke">${esc(stil.logo)}<small>${esc(stil.claim)}</small></div>
  <div class="meta">${d.info.map(([k, v]) => `${esc(k)} <strong>${esc(v)}</strong>`).join("<br>")}</div>
</div>
<div class="empf"><div class="an">Rechnung an</div>${d.empfaenger.map(esc).join("<br>")}</div>
<h1>${esc(d.ueberschrift)}</h1>
<p class="sub">${d.betreff}</p>
<div class="zeile kopfzeile"><div class="nr" style="color:#777;font-weight:400">Pos.</div><div class="txt">Leistung</div><div class="r betrag">Netto</div></div>
${zeilen}
<div class="summen">${d.summen.map(([k, v, cls]) => `<div class="${cls ?? ""}"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}</div>
<div class="text">${d.text}</div>
<div class="fuss">
  <div>${esc(l.name)}<br>${esc(l.strasse)}, ${esc(l.plzOrt)}<br>${esc(l.leitung)}</div>
  <div>${esc(l.register)}<br>USt-IdNr. ${esc(l.ustId)}<br>Steuernummer ${esc(l.steuernummer)}</div>
  <div>${esc(l.bank)}<br>IBAN ${ibanGruppen(l.iban)}<br>BIC ${esc(l.bic)}${l.glaeubigerId ? `<br>Gläubiger-ID ${esc(l.glaeubigerId)}` : ""}</div>
</div>
</body></html>`;
}

/** Layout D: schlichte Word-Vorlage, eine Schrift, Tabellengitter, keine Farben. */
function layoutWord(d) {
  const { l, stil } = d;
  const zeilen = d.positionen
    .map((p) => `<tr><td class="r">${p.pos}</td><td>${esc(p.text)}</td><td class="r">${eur(p.menge).replace(",00", "")} ${esc(p.einheit)}</td><td class="r">${eur(p.einzel)}</td><td class="r">${eur(p.gesamt)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(d.titel)}</title><style>${CSS_BASIS}
body { font-family: ${stil.font}; font-size: ${stil.groesse}; padding: 25mm 20mm 20mm 25mm; line-height: 1.35; }
.absender { text-align: ${stil.absenderAusrichtung}; margin-bottom: 14mm; }
.absender strong { font-size: 1.15em; }
.empf { height: 32mm; }
.datum { text-align: right; margin-bottom: 8mm; }
h1 { font-size: 1.25em; margin: 0 0 4mm; text-decoration: ${stil.unterstrichen ? "underline" : "none"}; }
.betreff { margin: 0 0 4mm; }
table.pos { width: 100%; border-collapse: collapse; }
table.pos th, table.pos td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
table.pos th { text-align: left; font-weight: 700; }
table.pos th.r { text-align: right; }
table.summen { margin-left: auto; margin-top: 4mm; border-collapse: collapse; }
table.summen td { padding: 2px 6px; }
table.summen tr.brutto td { font-weight: 700; border-top: 1px solid #000; }
.text p { margin: 0 0 3mm; }
.fuss { margin-top: 12mm; border-top: 1px solid #000; padding-top: 3px; font-size: 0.85em; }
</style></head><body>
<div class="absender"><strong>${esc(l.name)}</strong><br>${esc(l.strasse)} · ${esc(l.plzOrt)}<br>Tel. ${esc(l.telefon)} · ${esc(l.email)}</div>
<div class="empf">${d.empfaenger.map(esc).join("<br>")}</div>
<div class="datum">${esc(l.plzOrt.split(" ").slice(1).join(" "))}, den ${esc(d.datumText)}</div>
<h1>${esc(d.ueberschrift)}</h1>
<p class="betreff">${d.betreff}</p>
<table class="pos"><thead><tr><th class="r">Pos.</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Betrag</th></tr></thead><tbody>${zeilen}</tbody></table>
<table class="summen">${d.summen.map(([k, v, cls]) => `<tr class="${cls ?? ""}"><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join("")}</table>
<div class="text">${d.text}</div>
<div class="fuss">${d.fuss}</div>
</body></html>`;
}

// ---------- Die Dokumente ----------

function htmlKaminski() {
  const l = LIEFERANTEN.kaminski;
  return layoutHandwerker({
    l,
    stil: { font: "Arial, Helvetica, sans-serif", farbe: "#1f3a5f", tabellenkopf: "#e9eef5", logo: "ELEKTRO KAMINSKI", claim: "Elektroinstallation · Kundendienst · 24-h-Notdienst" },
    titel: "Rechnung 2026-1187",
    empfaenger: [HV.name, HV.strasse, HV.plzOrt],
    info: [["Rechnungs-Nr.", "2026-1187"], ["Rechnungsdatum", "07.07.2026"], ["Kundennummer", "10442"], ["Leistungsdatum", "02.07.2026"], ["Auftrag", "Telefonisch, Frau Berg"], ["Ansprechpartner", "Piotr Kaminski"]],
    ueberschrift: "Rechnung Nr. 2026-1187",
    betreff: `<strong>Objekt: Bahnhofstraße 7, 50667 Köln</strong> · Treppenhausbeleuchtung 2. bis 3. OG<br>Wir bedanken uns für den Auftrag und berechnen wie folgt:`,
    positionen: kaminskiPos,
    summen: [["Nettobetrag", eurZ(kaminski.netto)], ["zzgl. 19 % Umsatzsteuer", eurZ(kaminski.ust)], ["Rechnungsbetrag", eurZ(kaminski.brutto), "brutto"]],
    text: `<p>Zahlbar innerhalb von 14 Tagen nach Rechnungsdatum ohne Abzug auf das unten genannte Konto. Bitte geben Sie die Rechnungsnummer als Verwendungszweck an.</p>
<p>Im Rechnungsbetrag enthaltene Arbeitskosten (Lohnanteil nach § 35a EStG): ${eurZ(310)} netto.</p>
<p>Wir weisen darauf hin, dass Sie als Leistungsempfänger diese Rechnung zwei Jahre aufzubewahren haben (§ 14b Abs. 1 Satz 5 UStG).</p>`,
  });
}

function htmlSauberFein(kopie) {
  const l = LIEFERANTEN.sauberFein;
  return layoutAgentur({
    l,
    stil: { font: '"Helvetica Neue", Helvetica, Arial, sans-serif', farbe: "#0f7c74", logo: "sauber & fein", claim: "Gebäudereinigung · Glasreinigung · Hausmeisterservice", markeGewicht: 300, markeSpationierung: "-0.5px" },
    titel: kopie ? "Rechnung 2026-0711 (erneut gesendet)" : "Rechnung 2026-0711",
    empfaenger: [HV.name, HV.strasse, HV.plzOrt],
    info: [["Rechnung", "2026-0711"], ["Datum", "01.07.2026"], ["Kundennummer", "K-2201"], ["Leistungszeitraum", "01.07. bis 31.07.2026"]],
    ueberschrift: "Rechnung",
    betreff: `Treppenhausreinigung Juli 2026 · <strong>Objekt Bahnhofstraße 7, 50667 Köln</strong> · gemäß Reinigungsvertrag vom 12.03.2023`,
    positionen: sauberFeinPos,
    summen: [["Summe netto (1 Position)", `${eur(sauberFein.netto)} €`], [`zzgl. 19 % Umsatzsteuer auf ${eur(sauberFein.netto)} €`, `${eur(sauberFein.ust)} €`], ["Gesamtbetrag", `${eur(sauberFein.brutto)} €`, "brutto"]],
    text: `<p>Den Gesamtbetrag von ${eurZ(sauberFein.brutto)} ziehen wir am 08.07.2026 per SEPA-Basislastschrift von Ihrem Konto DE41 5001 0517 0123 4567 89 ein. Gläubiger-Identifikationsnummer ${esc(l.glaeubigerId)}, Mandatsreferenz M-2201-01. Bitte nicht überweisen.</p>
<p>Fragen zur Rechnung? Ihre Objektleiterin Frau Yildiz erreichen Sie unter 0221 98 76 54-22.</p>`,
  });
}

function htmlLifttec() {
  const l = LIEFERANTEN.lifttec;
  return layoutAgentur({
    l,
    stil: { font: '"Avenir Next", Avenir, "Gill Sans", sans-serif', farbe: "#d9541e", logo: "LIFTTEC", claim: "Aufzugsservice GmbH · Wartung · Prüfung · Modernisierung", markeGewicht: 700, markeSpationierung: "2px" },
    titel: "Rechnung LT-2026-03421",
    empfaenger: ["Wohnungseigentümergemeinschaft Am Stadtpark 3", `c/o ${HV.name}`, HV.strasse, HV.plzOrt],
    info: [["Rechnung", "LT-2026-03421"], ["Datum", "12.08.2026"], ["Kundennummer", "77-0913"], ["Wartungsvertrag", "WV-2019-118"], ["Leistungszeitraum", "01.07. bis 30.09.2026"]],
    ueberschrift: "Wartung Q3/2026",
    betreff: `<strong>Objekt: WEG Am Stadtpark 3, 50674 Köln</strong> · zwei Personenaufzüge · Wartungsvertrag WV-2019-118`,
    positionen: lifttecPos,
    summen: [["Summe netto (2 Positionen)", `${eur(lifttec.netto)} €`], [`zzgl. 19 % Umsatzsteuer auf ${eur(lifttec.netto)} €`, `${eur(lifttec.ust)} €`], ["Gesamtbetrag", `${eur(lifttec.brutto)} €`, "brutto"]],
    text: `<p>Zahlbar innerhalb von 30 Tagen ohne Abzug, also bis zum 11.09.2026, unter Angabe der Rechnungsnummer LT-2026-03421.</p>
<p>Die nächste Hauptprüfung durch die zugelassene Überwachungsstelle ist für Anlage 1 im November 2026 fällig; wir melden uns rechtzeitig zur Terminabstimmung.</p>`,
  });
}

function htmlWasserwerke() {
  const l = LIEFERANTEN.wasserwerke;
  const monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const planZeile = (m, i) => `<tr><td>${m} 2026</td><td>15.${String(i + 1).padStart(2, "0")}.2026</td><td class="r">${eur(wasser.brutto)}</td><td>${i < 6 ? "bezahlt" : i === 6 ? "aktuell" : "offen"}</td></tr>`;
  const planTabelle = (von) => `<table class="plan"><thead><tr><th>Monat</th><th>fällig am</th><th class="r">Abschlag €</th><th>Status</th></tr></thead><tbody>${monate.slice(von, von + 6).map((m, i) => planZeile(m, von + i)).join("")}</tbody></table>`;
  return layoutVersorger({
    l,
    stil: { font: "Verdana, Geneva, sans-serif", groesse: "9.5pt", fensterHoehe: "30mm", farbe: "#005ea8", hell: "#e8f1fa", logo: "Rheinland Wasserwerke", claim: "Trinkwasser und Entwässerung für Köln und den Rhein-Erft-Kreis" },
    titel: "Abschlagsrechnung AB-2026-07-4471",
    empfaenger: [HV.name, "Objekt Bahnhofstraße 7", HV.strasse, HV.plzOrt],
    info: [["Kundennummer", "4471"], ["Vertragskonto", "300 018 4471"], ["Rechnungsnummer", "AB-2026-07-4471"], ["Rechnungsdatum", "01.07.2026"], ["Lieferstelle", "Bahnhofstraße 7, 50667 Köln"], ["Zählernummer", "W-8812093"]],
    ueberschrift: "Abschlag Juli 2026",
    einleitung: `Sehr geehrte Damen und Herren,<br>für die Lieferstelle <strong>Bahnhofstraße 7, 50667 Köln</strong> stellen wir Ihnen den Abschlag für den Zeitraum 01.07.2026 bis 31.07.2026 in Rechnung. Die Jahresverbrauchsabrechnung erhalten Sie im Januar 2027.`,
    inhalt: `
<h2>Ihr Abschlag im Überblick</h2>
<table class="pos"><thead><tr><th>Leistung</th><th class="r">Betrag netto €</th><th class="r">USt-Satz</th><th class="r">USt €</th><th class="r">Betrag brutto €</th></tr></thead><tbody>
${wasserPos.map((p) => `<tr><td>${esc(p.text)}</td><td class="r">${eur(p.gesamt)}</td><td class="r">${p.ust ? `${p.ust} %` : "nicht steuerbar"}</td><td class="r">${eur(runde(p.gesamt * p.ust / 100))}</td><td class="r">${eur(runde(p.gesamt * (1 + p.ust / 100)))}</td></tr>`).join("")}
<tr><td><strong>Summe</strong></td><td class="r"><strong>${eur(wasser.netto)}</strong></td><td></td><td class="r"><strong>${eur(wasser.ust)}</strong></td><td class="r"><strong>${eur(wasser.brutto)}</strong></td></tr>
</tbody></table>
<p class="klein" style="margin:2mm 0 0;color:#555">Trinkwasser unterliegt dem ermäßigten Steuersatz von 7 % (§ 12 Abs. 2 Nr. 1 UStG, Anlage 2 Nr. 34). Die Entwässerungsgebühr erheben wir als hoheitliche Gebühr im Auftrag der Stadtentwässerungsbetriebe Köln; sie unterliegt nicht der Umsatzsteuer.</p>
<div class="zahlbetrag"><div class="hinweis"><strong>Zu zahlen bis 15.07.2026</strong><br>Bitte überweisen Sie den Betrag auf das unten genannte Konto. Verwendungszweck: <strong>Abschlag 07/2026 Kd 4471</strong>. Sie möchten es bequemer? Erteilen Sie uns ein SEPA-Lastschriftmandat unter ${esc(l.web)}/lastschrift.</div><div class="betrag">${eurZ(wasser.brutto)}</div></div>
<h2>Abschlagsplan 2026</h2>
<div class="zweispaltig">${planTabelle(0)}${planTabelle(6)}</div>`,
  });
}

function htmlGartenGruen() {
  const l = LIEFERANTEN.gartenGruen;
  return layoutWord({
    l,
    stil: { font: '"Times New Roman", Times, serif', groesse: "12pt", absenderAusrichtung: "left", unterstrichen: false },
    titel: "Rechnung 2026-31",
    empfaenger: [HV.name, "Objekt Gartenweg 21", HV.strasse, HV.plzOrt],
    datumText: "03.08.2026",
    ueberschrift: "Rechnung Nr. 2026-31",
    betreff: `Gartenpflege Juni und Juli 2026, <strong>Objekt Gartenweg 21, 50939 Köln</strong><br>Leistungszeitraum: 01.06.2026 bis 31.07.2026`,
    positionen: gartenPos,
    summen: [["Rechnungsbetrag", eurZ(garten.brutto), "brutto"]],
    text: `<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>
<p>Bitte überweisen Sie den Betrag bis zum 04.09.2026 auf das unten genannte Konto. Vielen Dank für Ihren Auftrag.</p>
<p>Mit freundlichen Grüßen<br>Ulrike Grün</p>`,
    fuss: `${esc(l.name)} · ${esc(l.leitung)} · ${esc(l.strasse)}, ${esc(l.plzOrt)}<br>${esc(l.bank)} · IBAN ${ibanGruppen(l.iban)} · BIC ${esc(l.bic)}`,
  });
}

const MEIER_STIL = { font: "Georgia, 'Times New Roman', serif", farbe: "#8c2f1b", tabellenkopf: "#f5ebe7", logo: "Meier & Sohn", claim: "Dachdeckerei · Bedachungen · Meisterbetrieb seit 1952", seiten: 1 };

function htmlMeierRechnung() {
  const l = LIEFERANTEN.meier;
  return layoutHandwerker({
    l,
    stil: MEIER_STIL,
    titel: "Rechnung 26-0842",
    empfaenger: ["Wohnungseigentümergemeinschaft Rosenhof 5-7", `c/o ${HV.name}`, HV.strasse, HV.plzOrt],
    info: [["Rechnungs-Nr.", "26-0842"], ["Rechnungsdatum", "14.08.2026"], ["Kundennummer", "3107"], ["Leistungsdatum", "09.08. und 10.08.2026"], ["Auftrag", "Notruf 09.08.2026, Herr Mustermann"], ["Ihr Zeichen", "Rosenhof 5-7 / Sturmschaden"]],
    ueberschrift: "Rechnung Nr. 26-0842",
    betreff: `<strong>Objekt: WEG Rosenhof 5-7, 50823 Köln</strong> · Haus 7, Dach Ostseite<br>Notreparatur Sturmschaden nach dem Unwetter vom 09.08.2026. Fotos der Schadstelle vor und nach der Reparatur liegen bei uns vor und können für Ihre Gebäudeversicherung angefordert werden.`,
    positionen: meierPos,
    summen: [["Nettobetrag", eurZ(meier.netto)], ["zzgl. 19 % Umsatzsteuer", eurZ(meier.ust)], ["Rechnungsbetrag", eurZ(meier.brutto), "brutto"]],
    text: `<p>Zahlbar innerhalb von 14 Tagen nach Rechnungseingang ohne Abzug, also bis zum 28.08.2026.</p>
<p>Lohnanteil nach § 35a EStG: ${eurZ(960)} netto. Für die dauerhafte Instandsetzung der Dachfläche (ca. 40 m² Neueindeckung) unterbreiten wir Ihnen auf Wunsch ein gesondertes Angebot.</p>`,
  });
}

function htmlMeierAngebot() {
  const l = LIEFERANTEN.meier;
  const plan = [
    ["30 % bei Auftragserteilung", 0.3],
    ["40 % nach Abschluss der Positionen 1 bis 3 (Gerüst, Abriss, Unterkonstruktion)", 0.4],
    ["30 % nach Abnahme und Übergabe der Dokumentation", 0.3],
  ];
  return layoutHandwerker({
    l,
    stil: { ...MEIER_STIL, seiten: 2 },
    titel: "Angebot A-26-117 Dachsanierung Severinstraße 88",
    empfaenger: ["Wohnungseigentümergemeinschaft Severinstraße 88", `c/o ${HV.name}`, HV.strasse, HV.plzOrt],
    info: [["Angebots-Nr.", "A-26-117"], ["Datum", "20.08.2026"], ["Kundennummer", "3115"], ["Gültig bis", "20.11.2026 (3 Monate)"], ["Ausführung", "Frühjahr 2027, ab KW 12"], ["Ortstermin", "17.08.2026, Herr Meier"]],
    ueberschrift: "Angebot Nr. A-26-117: Dachsanierung",
    betreff: `<strong>Objekt: Severinstraße 88, 50678 Köln</strong> · Hauptdach (Satteldach, ca. 420 m² Dachfläche, Baujahr 1955)<br>Auf Grundlage unseres Ortstermins vom 17.08.2026 bieten wir Ihnen die vollständige Sanierung des Hauptdachs wie folgt an:`,
    positionen: angebotPos,
    summen: [["Angebotssumme netto", eurZ(angebot.netto)], ["zzgl. 19 % Umsatzsteuer", eurZ(angebot.ust)], ["Angebotssumme brutto", eurZ(angebot.brutto), "brutto"]],
    text: `<p><strong>Ausführung:</strong> Frühjahr 2027, voraussichtlich ab Kalenderwoche 12, Bauzeit etwa sechs Wochen, vorbehaltlich Witterung. Gerüststandzeit über acht Wochen hinaus: ${eurZ(680)} netto je weitere Woche.</p>
<p><strong>Zahlungsplan:</strong></p>
<table class="summen" style="margin-left:0;width:120mm">${plan.map(([t, a]) => `<tr><td>${esc(t)}</td><td class="r">${eurZ(runde(angebot.netto * a))} netto</td></tr>`).join("")}</table>
<p style="margin-top:3mm"><strong>Bedingungen:</strong> Dieses Angebot ist drei Monate gültig, bis zum 20.11.2026. Vertragsgrundlage ist die VOB/B in der aktuellen Fassung; Gewährleistung fünf Jahre auf Dacharbeiten. Im Preis nicht enthalten: statische Ertüchtigung der Sparren, falls beim Abdecken Schäden am Holz sichtbar werden (Abrechnung nach Aufmaß, Stundensatz ${eurZ(68)}), Aufmaßänderungen über 5 %, Entsorgung asbesthaltiger Materialien. Die Kosten der Baustromversorgung trägt der Auftraggeber.</p>
<p>Wir freuen uns auf Ihren Auftrag und stehen für die Vorstellung des Angebots in der Eigentümerversammlung gern zur Verfügung.</p>
<p>Mit freundlichen Grüßen<br>Klaus Meier, Dachdeckermeister</p>`,
  });
}

function htmlVersicherung() {
  const l = LIEFERANTEN.versicherung;
  const sparten = ["Feuer, Blitzschlag, Explosion", "Leitungswasser", "Sturm und Hagel", "Elementarschäden (Überschwemmung, Rückstau)", "Haus- und Grundbesitzerhaftpflicht bis 5 Mio. €", "Glasbruch Gemeinschaftsflächen"];
  return layoutVersorger({
    l,
    stil: { font: "Optima, 'Gill Sans', Candara, sans-serif", farbe: "#23395b", hell: "#eef0f5", logo: "Rheinische Gebäudeversicherung", claim: "Aktiengesellschaft · Versicherer für Haus- und Grundbesitz seit 1898" },
    titel: "Beitragsrechnung GB 88-4471-19 Versicherungsjahr 2026/27",
    empfaenger: ["Wohnungseigentümergemeinschaft Severinstraße 88", `c/o ${HV.name}`, HV.strasse, HV.plzOrt],
    info: [["Vers.-Schein-Nr.", "GB 88-4471-19"], ["Rechnungsnummer", "BR-2026-0711458"], ["Rechnungsdatum", "15.06.2026"], ["Versicherungsnehmer", "WEG Severinstraße 88"], ["Risikoort", "Severinstraße 88, 50678 Köln"], ["Versicherungsjahr", "01.07.2026 bis 30.06.2027"]],
    ueberschrift: "Beitragsrechnung 2026/27",
    einleitung: `Sehr geehrte Damen und Herren,<br>für die Gebäudeversicherung des Wohn- und Geschäftshauses <strong>Severinstraße 88, 50678 Köln</strong> (13 Einheiten, Baujahr 1955, gleitender Neuwert) berechnen wir für das Versicherungsjahr vom 01.07.2026 bis zum 30.06.2027 den folgenden Jahresbeitrag.`,
    inhalt: `
<h2>Ihr Beitrag</h2>
<table class="pos"><thead><tr><th>Vertrag</th><th class="r">Betrag €</th></tr></thead><tbody>
<tr><td>Jahresbeitrag Gebäudeversicherung GB 88-4471-19, Zahlweise jährlich</td><td class="r">${eur(versicherung.beitrag)}</td></tr>
<tr><td>Versicherungsteuer 19 % (§ 6 Abs. 1 VersStG) auf ${eur(versicherung.beitrag)} €</td><td class="r">${eur(versicherung.steuer)}</td></tr>
<tr><td><strong>Gesamtbeitrag</strong></td><td class="r"><strong>${eur(versicherung.gesamt)}</strong></td></tr>
</tbody></table>
<p class="klein" style="margin:2mm 0 0;color:#555">Versicherungsleistungen sind nach § 4 Nr. 10 UStG von der Umsatzsteuer befreit. Der Gesamtbeitrag enthält die Versicherungsteuer, die wir an das Bundeszentralamt für Steuern abführen (Versicherungsteuer-Nr. ${esc(l.versStNr)}). Ein Vorsteuerabzug ist nicht möglich.</p>
<div class="zahlbetrag"><div class="hinweis"><strong>Fällig am 01.07.2026</strong><br>Bitte überweisen Sie den Gesamtbeitrag bis zum Fälligkeitstag auf das unten genannte Konto. Verwendungszweck: <strong>Beitrag 2026/27 VS-Nr. GB 88-4471-19</strong>. Bei Zahlungsverzug ruht der Versicherungsschutz nach § 38 VVG.</div><div class="betrag">${eurZ(versicherung.gesamt)}</div></div>
<h2>Versicherte Gefahren und Leistungen</h2>
<table class="plan"><tbody>${sparten.map((s) => `<tr><td>${esc(s)}</td><td>mitversichert</td></tr>`).join("")}</tbody></table>
<p class="klein" style="margin-top:3mm;color:#555">Versicherungssumme: gleitender Neuwert, Wert 1914: 68.400 Mark, Anpassungsfaktor 2026: 23,1. Selbstbeteiligung je Schadenfall 500,00 €, bei Elementarschäden 10 % des Schadens, mindestens 1.000,00 €. Es gelten die Allgemeinen Wohngebäude-Versicherungsbedingungen (RGV-AWB 2023) und die Besonderen Bedingungen für Wohn- und Geschäftshäuser.</p>`,
  });
}

function htmlFuchs() {
  const l = LIEFERANTEN.fuchs;
  return layoutWord({
    l,
    stil: { font: "Calibri, Carlito, 'Trebuchet MS', sans-serif", groesse: "11pt", absenderAusrichtung: "right", unterstrichen: true },
    titel: "Rechnung 2026/118",
    empfaenger: [HV.name, "Objekt Gartenweg 21", HV.strasse, HV.plzOrt],
    datumText: "18.08.2026",
    ueberschrift: "Rechnung Nr. 2026/118",
    betreff: `Treppenhausanstrich <strong>Gartenweg 21, 50939 Köln</strong>, Auftrag vom 20.07.2026<br>Leistungszeitraum: 03.08.2026 bis 07.08.2026`,
    positionen: fuchsPos,
    summen: [["Nettosumme", eurZ(fuchs.netto)], ["Umsatzsteuer 19 %", eurZ(fuchs.ust)], ["Rechnungsbetrag", eurZ(FUCHS_GEDRUCKT), "brutto"]],
    text: `<p>Zahlbar innerhalb von 14 Tagen ohne Abzug, bis zum 01.09.2026. Bei Zahlung bis zum 25.08.2026 gewähren wir 2 % Skonto.</p>
<p>Darin enthaltener Lohnanteil nach § 35a EStG: ${eurZ(980)} netto.</p>
<p>Vielen Dank für Ihren Auftrag.<br>Rainer Fuchs</p>`,
    fuss: `${esc(l.name)} · ${esc(l.leitung)} · ${esc(l.strasse)}, ${esc(l.plzOrt)} · Steuernummer ${esc(l.steuernummer)}<br>${esc(l.bank)} · IBAN ${ibanGruppen(l.iban)} · BIC ${esc(l.bic)}`,
  });
}

/** Das Handyfoto: Thermobon auf Holztisch, leicht gedreht, Schatten, handschriftlicher Vermerk. */
function htmlBon() {
  const zeilen = bonPos.map((p) => `<div class="z"><span>${esc(p.text)}</span><span>${eur(p.brutto)} A</span></div>`).join("");
  const noise = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.35 0"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>')}`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Bon</title><style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 1400px; height: 1050px; overflow: hidden; }
body { position: relative; background:
  repeating-linear-gradient(88deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 7px, rgba(255,255,255,0.03) 7px 9px, transparent 9px 14px),
  repeating-linear-gradient(90deg, #7a4a24 0 140px, #6b3f1e 140px 270px, #86552c 270px 430px, #74441f 430px 520px);
  filter: blur(0.35px) saturate(1.08) contrast(1.03); }
.fuge { position: absolute; top: 0; bottom: 0; width: 6px; background: linear-gradient(90deg, #3a2210, #1f1108 60%, #4a2c15); }
.noise { position: absolute; inset: 0; background: url("${noise}"); opacity: 0.55; mix-blend-mode: multiply; }
.licht { position: absolute; inset: 0; background: radial-gradient(ellipse at 38% 30%, rgba(255,230,190,0.32), rgba(0,0,0,0) 55%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.5) 100%); }
.bon { position: absolute; left: 470px; top: 60px; width: 420px; padding: 34px 30px 40px; background: linear-gradient(180deg, #f6f3ea 0%, #f1ede1 60%, #ebe6d8 100%); color: #2b2b2b; font-family: "Courier New", Courier, monospace; font-size: 17px; line-height: 1.32;
  transform: rotate(-3.6deg) perspective(1400px) rotateX(2deg); transform-origin: 50% 50%;
  box-shadow: 10px 18px 26px rgba(0,0,0,0.42), 2px 4px 6px rgba(0,0,0,0.25); }
.bon::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(180deg, rgba(0,0,0,0.018) 0 2px, transparent 2px 5px); pointer-events: none; }
.bon::after { content: ""; position: absolute; left: 0; right: 0; bottom: -10px; height: 12px; background: linear-gradient(135deg, transparent 8px, #ebe6d8 0) 0 0/16px 16px, linear-gradient(45deg, transparent 8px, #ebe6d8 0) 0 0/16px 16px; background-position: 0 0; }
.mitte { text-align: center; }
.gross { font-size: 26px; font-weight: 700; letter-spacing: 3px; }
.z { display: flex; justify-content: space-between; gap: 12px; }
.z span:last-child { white-space: nowrap; }
.strich { border-top: 1px dashed #777; margin: 10px 0; }
.summe { font-weight: 700; font-size: 20px; }
.blass { color: #666; }
.hand { position: absolute; left: 30px; right: 20px; bottom: 74px; font-family: "Bradley Hand", "Marker Felt", "Chalkboard", cursive; font-size: 30px; color: #1c3f9e; transform: rotate(-2deg); line-height: 1.15; text-shadow: 0 0 0.4px rgba(28,63,158,0.6); }
</style></head><body>
<div class="fuge" style="left:300px"></div><div class="fuge" style="left:1080px"></div>
<div class="noise"></div>
<div class="bon">
  <div class="mitte gross">BAUFIX</div>
  <div class="mitte">Baumarkt Köln-Ehrenfeld<br>Vogelsanger Str. 200 · 50825 Köln<br>Tel. 0221 55 66 77 0<br>www.baufix-baumarkt.de</div>
  <div class="strich"></div>
  <div class="z"><span>05.08.2026 14:32</span><span>Kasse 3</span></div>
  <div class="z"><span>Bon-Nr. 0087/003</span><span>Bed. 214</span></div>
  <div class="strich"></div>
  ${zeilen}
  <div class="strich"></div>
  <div class="z summe"><span>SUMME EUR</span><span>${eur(bon.brutto)}</span></div>
  <div class="z"><span>girocard</span><span>${eur(bon.brutto)}</span></div>
  <div class="z blass"><span>Kartenzahlung, kontaktlos</span><span>Genehmigt</span></div>
  <div class="strich"></div>
  <div class="z blass"><span>MwSt A 19,00 %</span><span>Netto ${eur(bon.netto)}</span></div>
  <div class="z blass"><span></span><span>MwSt ${eur(bon.ust)}</span></div>
  <div class="z blass"><span></span><span>Brutto ${eur(bon.brutto)}</span></div>
  <div class="strich"></div>
  <div class="mitte blass">Vielen Dank für Ihren Einkauf!<br>Umtausch innerhalb 14 Tagen<br>nur mit diesem Bon</div>
  <div style="height:120px"></div>
  <div class="hand">Bahnhofstr. 7 – Kellertür<br>Hausmeister K.</div>
</div>
<div class="licht"></div>
</body></html>`;
}

// ---------- Anfragen ----------

function emlLindenstrasse() {
  const text = `Sehr geehrte Damen und Herren,

als Vorsitzende des Verwaltungsbeirats der Wohnungseigentümergemeinschaft Lindenstraße 14, 50674 Köln, wende ich mich mit der Bitte um ein Angebot für die Verwaltung unserer Gemeinschaft an Sie. Herr Klein vom Beirat der WEG Am Stadtpark 3 hat Sie uns empfohlen.

Zum Objekt:
- 18 Wohnungen (Wohnfläche insgesamt rund 1.350 m²) und 2 Ladenlokale im Erdgeschoss
- Tiefgarage mit 14 Stellplätzen
- Baujahr 1968, Ölzentralheizung (Kessel von 2009), ein Personenaufzug
- Erhaltungsrücklage derzeit rund 96.000 €

Unser bisheriger Verwalter, die Firma Hausverwaltung Rheinblick, hat den Verwaltervertrag zum 31.12.2026 gekündigt. Wir suchen daher eine neue Verwaltung mit Beginn zum 01.01.2027. Die Bestellung soll in einer außerordentlichen Eigentümerversammlung im Oktober beschlossen werden; wir möchten den Eigentümern zwei bis drei Angebote vorlegen.

Wichtig ist uns außerdem: In den kommenden zwei Jahren steht die Sanierung des Flachdachs an (die Gemeinschaft hat im Frühjahr beschlossen, Angebote einzuholen). Wir wünschen uns eine Verwaltung, die diese Maßnahme kaufmännisch und organisatorisch begleiten kann.

Bitte senden Sie uns ein Angebot mit folgenden Angaben:
1. Leistungsumfang der Grundleistungen (kaufmännisch, technisch, rechtlich)
2. Vergütung je Einheit und Monat, getrennt für Wohnungen, Ladenlokale und Stellplätze
3. Sonderleistungen mit Preisen (zusätzliche Versammlungen, Baubegleitung, Mahnwesen)
4. Vertragslaufzeit und Kündigungsfristen
5. Referenzen vergleichbarer Objekte in Köln

Für einen Ortstermin stehe ich gern zur Verfügung, am besten dienstags oder donnerstags ab 16 Uhr.

Mit freundlichen Grüßen

Dr. Sabine Krüger
Vorsitzende des Verwaltungsbeirats
WEG Lindenstraße 14, 50674 Köln
Telefon 0221 92 84 71 6 · Mobil 0171 55 20 44 8`;
  const html = `<html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000">${text
    .split("\n\n")
    .map((abs) => `<p>${esc(abs).replace(/\n/g, "<br>")}</p>`)
    .join("\n")}</body></html>`;
  const grenze = "=_Teil_20260820091427_Kr";
  const kopf = [
    "Return-Path: <sabine.krueger@example.de>",
    "Delivered-To: post@hv-mustermann.de",
    "Received: from mail.example.de (mail.example.de [203.0.113.24]) by mx.hv-mustermann.de with ESMTPS id 4F2k9x; Thu, 20 Aug 2026 09:14:31 +0200",
    "Message-ID: <7c1e0c6d-4a2f-4b8e-9a0d-20260820091427@example.de>",
    "Date: Thu, 20 Aug 2026 09:14:27 +0200",
    `From: ${encodedWord("Dr. Sabine Krüger")} <sabine.krueger@example.de>`,
    "To: Hausverwaltung Mustermann GmbH <post@hv-mustermann.de>",
    // Betreff als zwei encoded words, gefaltet (RFC 2047: höchstens 75 Zeichen je Wort)
    `Subject: ${encodedWord("Anfrage Verwaltung WEG Lindenstraße 14,")}\r\n ${encodedWord("Köln (Beginn 01.01.2027)")}`,
    "User-Agent: Mozilla Thunderbird",
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${grenze}"`,
    "Content-Language: de-DE",
  ].join("\r\n");
  return [
    kopf,
    "",
    "This is a multi-part message in MIME format.",
    `--${grenze}`,
    "Content-Type: text/plain; charset=UTF-8; format=flowed",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    quotedPrintable(text),
    `--${grenze}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    quotedPrintable(html),
    `--${grenze}--`,
    "",
  ].join("\r\n");
}

function txtWhatsapp() {
  return [
    "[22.08.26, 19:42:11] Thomas Vogel: Hallo Herr Mustermann, ich hab Ihre Nummer von Herrn Klein (Stadtpark 3) bekommen 👋",
    "[22.08.26, 19:43:02] Thomas Vogel: Wir haben ein Haus in der Venloer Straße 210 mit 6 Wohnungen, das mein Vater bisher selbst verwaltet hat. Das wird ihm jetzt zu viel.",
    "[22.08.26, 19:43:40] Thomas Vogel: Was würde sowas bei Ihnen kosten? Also komplett, Mieten, Nebenkostenabrechnung, Handwerker usw.",
    "[22.08.26, 19:44:15] Thomas Vogel: Gerne kurz hier oder Sie rufen mich an: 0176 44 55 66 77. Danke!",
    "",
  ].join("\n");
}

// ---------- Kontoauszüge ----------

/** Sparkasse CSV-CAMT (17 Spalten, alle Felder in Anführungszeichen, ISO-8859-1, Datum TT.MM.JJ). */
function csvSparkasse() {
  const konto = "DE41500105170123456789";
  const kopf = ["Auftragskonto", "Buchungstag", "Valutadatum", "Buchungstext", "Verwendungszweck", "Glaeubiger ID", "Mandatsreferenz", "Kundenreferenz (End-to-End)", "Sammlerreferenz", "Lastschrift Ursprungsbetrag", "Auslagenersatz Ruecklastschrift", "Beguenstigter/Zahlungspflichtiger", "Kontonummer/IBAN", "BIC (SWIFT-Code)", "Betrag", "Waehrung", "Info"];
  const zeile = (buchung, valuta, text, zweck, gegen, betrag, extra = {}) => [
    konto, deKurz(buchung), deKurz(valuta), text, zweck, extra.glaeubigerId ?? "", extra.mandat ?? "", extra.eref ?? "", "", "", "", gegen.name, gegen.iban, gegen.bic, eur(betrag), "EUR", "Umsatz gebucht",
  ];
  const gutschrift = "GUTSCHRIFT UEBERWEISUNG";
  // Reihenfolge wie im Export: neueste Buchung zuerst
  const zeilen = [
    zeile("2026-07-31", "2026-07-31", "ENTGELTABSCHLUSS", "Entgeltabschluss siehe Anlage", { name: "", iban: "", bic: "" }, -12.9),
    zeile("2026-07-31", "2026-07-31", "ONLINE-UEBERWEISUNG", "Verwaltungshonorar Juli 2026 R-2026-0127", { name: HV.name, iban: HV.iban, bic: HV.bic }, -304.64, { eref: "NOTPROVIDED" }),
    zeile("2026-07-20", "2026-07-20", "ONLINE-UEBERWEISUNG", "Auszahlung Überschuss Q2", VOGEL_PRIVAT, -3000, { eref: "NOTPROVIDED" }),
    zeile("2026-07-15", "2026-07-15", "ONLINE-UEBERWEISUNG", "Abschlag 07/2026 Kd 4471", { name: LIEFERANTEN.wasserwerke.name, iban: LIEFERANTEN.wasserwerke.iban, bic: LIEFERANTEN.wasserwerke.bic }, -484.7, { eref: "NOTPROVIDED" }),
    zeile("2026-07-09", "2026-07-09", "ONLINE-UEBERWEISUNG", "Rg 2026-1187", { name: LIEFERANTEN.kaminski.name, iban: LIEFERANTEN.kaminski.iban, bic: LIEFERANTEN.kaminski.bic }, -578.34, { eref: "NOTPROVIDED" }),
    zeile("2026-07-08", "2026-07-08", "FOLGELASTSCHRIFT", "RE 2026-0711 Treppenhausreinigung Juli", { name: "Sauber und Fein Gebaeudereinigung GmbH", iban: LIEFERANTEN.sauberFein.iban, bic: LIEFERANTEN.sauberFein.bic }, -226.1, { glaeubigerId: LIEFERANTEN.sauberFein.glaeubigerId, mandat: "M-2201-01", eref: "2026-0711" }),
    zeile("2026-07-06", "2026-07-06", gutschrift, "Miete Juli WG", MIETER.ott, 545),
    zeile("2026-07-03", "2026-07-03", gutschrift, "Hoffmann Whg 5 Miete Juli", MIETER.neumann, 1170),
    zeile("2026-07-03", "2026-07-03", gutschrift, "Miete Juli Fischer", MIETER.fischer, 770),
    zeile("2026-07-02", "2026-07-02", gutschrift, "Miete Juli", MIETER.weber, 800),
    zeile("2026-07-01", "2026-07-01", gutschrift, "Miete Juli Schmidt Whg 1", MIETER.schmidt, 900),
    zeile("2026-07-01", "2026-07-01", gutschrift, "MIETE 07/2026", MIETER.yilmaz, 1010),
    zeile("2026-07-01", "2026-07-01", gutschrift, "Miete Juli WG", MIETER.becker, 545),
    zeile("2026-07-01", "2026-07-01", "DAUERAUFTRAG", "", MIETER.demir, 875),
    zeile("2026-07-01", "2026-07-01", gutschrift, "Miete Juli Fischer", MIETER.fischer, 770),
  ];
  const text = [kopf, ...zeilen].map((z) => z.map((f) => `"${f}"`).join(";")).join("\n") + "\n";
  return alsLatin1(text);
}

/** ING CSV (Vorspann, Kopfzeile "Buchung;Wertstellungsdatum;…", 7 Spalten, UTF-8, keine IBAN der Gegenseite). */
function csvIng() {
  const zeilen = [
    ["03.07.2026", "03.07.2026", "Ingrid Sauer", "Gutschrift", "Hausgeld Juli", "280,00", "EUR"],
    ["01.07.2026", "01.07.2026", LIEFERANTEN.versicherung.name, "Überweisung", "Beitrag 2026/27 VS-Nr. GB 88-4471-19", "-1.940,00", "EUR"],
    ["01.07.2026", "01.07.2026", "Dr. Stefan Berger", "Gutschrift", "Hausgeld 07/2026 WE 3 Severinstr. 88", "310,00", "EUR"],
  ];
  const text = [
    "Umsatzanzeige;Datei erstellt am: 03.08.2026 08:12",
    "",
    "IBAN;DE27100777770209299700",
    "Kontoname;Girokonto",
    "Bank;ING",
    "Kunde;WEG Severinstraße 88",
    "Zeitraum;01.07.2026 - 31.07.2026",
    "Saldo;12.456,80;EUR",
    "",
    "Sortierung;Datum absteigend",
    "",
    "In der CSV-Datei finden Sie alle bereits gebuchten Umsätze. Die vorgemerkten Umsätze werden nicht aufgenommen, auch wenn sie in Ihrem Internetbanking angezeigt werden.",
    "",
    "Buchung;Wertstellungsdatum;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Betrag;Währung",
    ...zeilen.map((z) => z.join(";")),
    "",
  ].join("\n");
  return Buffer.from(text, "utf8");
}

/** MT940 (SWIFT, DK-Variante) mit drei Umsätzen des Verwaltungskontos; Feld 86 mit ?20–?29 in 27-Zeichen-Stücken. */
function mt940Verwaltung() {
  const stuecke = (s) => s.match(/.{1,27}/g) ?? [];
  const feld86 = (gvc, buchungstext, prima, tags, bic, iban, name) => {
    // Jeder SEPA-Bezeichner beginnt am Anfang eines Subfelds; die Fortsetzung läuft in ?2x weiter.
    const sub = [];
    for (const t of tags) sub.push(...stuecke(t));
    if (sub.length > 10) throw new Error("Verwendungszweck zu lang für ?20–?29");
    const teile = [`${gvc}?00${buchungstext}?10${prima}`, ...sub.map((s, i) => `?2${i}${s}`), `?30${bic}`, `?31${iban}`, `?32${name.slice(0, 27)}`];
    if (name.length > 27) teile.push(`?33${name.slice(27, 54)}`);
    return `:86:${teile.join("")}`;
  };
  const anfang = 18450.12;
  const umsaetze = [
    { valuta: "260703", buchung: "0703", ch: "C", betrag: 1725.5, code: "NTRF", ref: "9012345", gvc: "166", text: "SEPA-GUTSCHRIFT", tags: ["EREF+NOTPROVIDED", "SVWZ+Verwaltungshonorar Juli 2026 R-2026-0124"], bic: "SOLADEST600", iban: "DE75512108001245126199", name: "WEG Rosenhof 5-7" },
    { valuta: "260715", buchung: "0715", ch: "D", betrag: 47.6, code: "NDDT", ref: "9012346", gvc: "105", text: "SEPA-BASISLASTSCHRIFT", tags: ["EREF+RG20260712345", "MREF+TK-0099887", "CRED+DE93ZZZ00000101234", "SVWZ+Telekom Rechnung 07/2026 Kd 4487 2201"], bic: "PBNKDEFFXXX", iban: "DE26370100500123456789", name: "Telekom Deutschland GmbH" },
    { valuta: "260731", buchung: "0731", ch: "C", betrag: 304.64, code: "NTRF", ref: "9012347", gvc: "166", text: "SEPA-GUTSCHRIFT", tags: ["EREF+NOTPROVIDED", "SVWZ+Verwaltungshonorar Juli 2026 R-2026-0127"], bic: "INGDDEFFXXX", iban: "DE41500105170123456789", name: "Erika Vogel Mietkonto Bahnhofstr. 7" },
  ];
  const ende = umsaetze.reduce((s, u) => s + (u.ch === "C" ? cent(u.betrag) : -cent(u.betrag)), cent(anfang)) / 100;
  const betragMt = (n) => n.toFixed(2).replace(".", ",");
  const zeilen = [":20:STARTUMS", ":25:12030000/0000202051", ":28C:00007/001", `:60F:C260630EUR${betragMt(anfang)}`];
  for (const u of umsaetze) {
    zeilen.push(`:61:${u.valuta}${u.buchung}${u.ch}R${betragMt(u.betrag)}${u.code}NONREF//${u.ref}`);
    zeilen.push(feld86(u.gvc, u.text, "9315", u.tags, u.bic, u.iban, u.name));
  }
  zeilen.push(`:62F:C260731EUR${betragMt(ende)}`, "-");
  return alsLatin1(zeilen.join("\r\n") + "\r\n");
}

// ---------- Erzeugen ----------

async function main() {
  mkdirSync(ZIEL, { recursive: true });
  if (vorschauOrdner) mkdirSync(vorschauOrdner, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePfad(), headless: true });
  const context = await browser.newContext({ locale: "de-DE", deviceScaleFactor: 1 });
  const geschrieben = [];

  async function pdf(dateiname, html, titel) {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    const ziel = path.join(ZIEL, dateiname);
    await page.pdf({ path: ziel, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    if (vorschauOrdner) {
      await page.emulateMedia({ media: "screen" });
      await page.setViewportSize({ width: 794, height: 1123 });
      await page.screenshot({ path: path.join(vorschauOrdner, dateiname.replace(/\.pdf$/, ".png")), fullPage: true });
    }
    await page.close();
    geschrieben.push([dateiname, titel]);
  }

  async function foto(dateiname, html, titel) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 1050 });
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(ZIEL, dateiname), type: "jpeg", quality: 80, fullPage: false });
    await page.close();
    geschrieben.push([dateiname, titel]);
  }

  function datei(dateiname, inhalt, titel) {
    writeFileSync(path.join(ZIEL, dateiname), inhalt);
    geschrieben.push([dateiname, titel]);
  }

  // Belege in Erzählreihenfolge (siehe docs/BEISPIELE.md)
  await pdf("rechnung-elektro-kaminski-2026-1187.pdf", htmlKaminski(), "Elektro Kaminski, Reparatur Treppenhausbeleuchtung (sauber)");
  await pdf("rechnung-sauber-fein-2026-0711.pdf", htmlSauberFein(false), "Sauber & Fein, Treppenhausreinigung Juli, Lastschrift (sauber)");
  await pdf("rechnung-lifttec-wartung-q3-2026.pdf", htmlLifttec(), "LiftTec, Aufzugswartung Q3 (sauber, umlagefähig)");
  await foto("foto-baumarkt-bon-bahnhofstrasse-7.jpg", htmlBon(), "Baumarktbon als Handyfoto, Kleinbetrag, bereits bezahlt");
  await pdf("sauber-fein-2026-0711-erneut-gesendet.pdf", htmlSauberFein(true), "Dieselbe Rechnung 2026-0711 noch einmal (Duplikat)");
  await pdf("abschlag-rheinland-wasserwerke-07-2026.pdf", htmlWasserwerke(), "Wasserwerke, Abschlag mit 7 % und steuerfreiem Abwasser");
  await pdf("rechnung-garten-gruen-2026-31.pdf", htmlGartenGruen(), "Garten Grün, Kleinunternehmer ohne Steuernummer");
  await pdf("rechnung-dachdeckerei-meier-26-0842-notreparatur.pdf", htmlMeierRechnung(), "Meier & Sohn, Notreparatur Sturmschaden (Freigabe, WEG, Versicherungsfall)");
  await pdf("beitragsrechnung-rheinische-gebaeudeversicherung-2026-27.pdf", htmlVersicherung(), "Gebäudeversicherung, Versicherungsteuer statt USt");
  await pdf("rechnung-malerbetrieb-fuchs-2026-118.pdf", htmlFuchs(), "Malerbetrieb Fuchs, Rechenfehler im Endbetrag");
  datei("anfrage-weg-lindenstrasse.eml", emlLindenstrasse(), "Förmliche Anfrage per E-Mail (WEG Lindenstraße 14)");
  datei("anfrage-whatsapp-vogel.txt", txtWhatsapp(), "Informelle Anfrage per WhatsApp (Venloer Straße 210)");
  await pdf("angebot-dachdeckerei-meier-dachsanierung-severinstrasse-88.pdf", htmlMeierAngebot(), "Handwerkerangebot Dachsanierung Severinstraße 88");
  datei("kontoauszug-bahnhofstr7-2026-07.csv", csvSparkasse(), "Kontoauszug Mietkonto Bahnhofstraße 7, Sparkasse-CSV (ISO-8859-1)");
  datei("kontoauszug-severinstr88-2026-07.csv", csvIng(), "Kontoauszug WEG Severinstraße 88, ING-CSV (UTF-8)");
  datei("kontoauszug-verwaltung-2026-07.sta", mt940Verwaltung(), "Kontoauszug Verwaltungskonto, MT940");

  await browser.close();
  for (const [name, titel] of geschrieben) {
    const kb = Math.round(statSync(path.join(ZIEL, name)).size / 1024);
    console.log(`${name.padEnd(64)} ${String(kb).padStart(5)} KB  ${titel}`);
  }
  console.log(`\n${geschrieben.length} Dateien in ${path.relative(WURZEL, ZIEL)}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
