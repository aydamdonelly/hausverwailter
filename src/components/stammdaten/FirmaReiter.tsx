"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { Einstellungen, Rechnung, type Adresse, type Firma } from "@/lib/domain/schema";
import { ibanGueltig, ustIdNrPlausibel } from "@/lib/iban";
import { datum, heuteIso, iban as ibanFmt, ibanNormalisiert, jetztIso, plusTage } from "@/lib/format";
import { summen } from "@/lib/geld";
import { formatiereNummer } from "@/lib/store/nummern";
import { pdfVorschau } from "@/lib/client/pdf";
import { ApiFehler } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Hinweis } from "@/components/ui/Hinweis";
import { AuswahlFeld, GeldFeld, Gruppe, SchalterFeld, TextFeld, ZahlFeld } from "./Felder";
import { ReiterKopf, useGespeichert } from "./Reiter";
import { einstellungenAendern } from "./speicher";
import { BRANCHEN } from "./logik";

const LOGO_MAX_BYTES = 500 * 1024;

/** Eine Beispielrechnung mit den echten Firmendaten, damit der Briefkopf geprüft werden kann. */
function beispielRechnung(e: Einstellungen): Rechnung {
  const heute = heuteIso();
  const faellig = plusTage(heute, e.firma.zahlungszielTage);
  const position = {
    pos: 1,
    leistungCode: "",
    bezeichnung: "Verwaltung Musterstraße 1, 12 Einheiten",
    beschreibung: "Grundhonorar für den laufenden Monat (Beispiel)",
    menge: 12,
    einheit: "Einheit/Monat",
    einzelpreisNetto: 27.5,
    gesamtNetto: 330,
    ustSatz: e.firma.kleinunternehmer ? 0 : e.firma.ustSatz,
  };
  const s = summen([position]);
  return Rechnung.parse({
    id: "beispiel",
    nummer: formatiereNummer(e.nummernkreise.rechnung, e.nummernkreise.rechnung.zaehler + 1),
    art: "honorar",
    datum: heute,
    leistungVon: `${heute.slice(0, 7)}-01`,
    leistungBis: heute,
    faelligAm: faellig,
    empfaenger: {
      name: "Wohnungseigentümergemeinschaft Musterstraße 1",
      zusatz: "vertreten durch die Verwaltung",
      adresse: { strasse: "Musterstraße 1", plz: "50667", ort: "Köln", land: "DE" },
    },
    betreff: "Verwalterhonorar (Beispiel für den Briefkopf)",
    positionen: [position],
    steuersaetze: s.steuersaetze,
    netto: s.netto,
    ust: s.ust,
    brutto: s.brutto,
    zahlungsbedingung: `Zahlbar ohne Abzug bis ${datum(faellig)}.`,
    hinweise: e.firma.kleinunternehmer ? ["Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."] : [],
    status: "entwurf",
    erstelltAm: jetztIso(),
  });
}

export function FirmaReiter() {
  const einstellungen = useLiveQuery(async () => Einstellungen.parse((await db.einstellungen.get("einstellungen")) ?? {}), []);
  const { gespeichert, markiere } = useGespeichert();
  const [logoMeldung, setLogoMeldung] = useState("");
  const [vorschau, setVorschau] = useState<{ url: string } | { hinweis: string } | null>(null);
  const [vorschauLaeuft, setVorschauLaeuft] = useState(false);
  const [farbeEntwurf, setFarbeEntwurf] = useState<string | null>(null);
  const farbeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoEingabe = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (vorschau && "url" in vorschau) URL.revokeObjectURL(vorschau.url);
    };
  }, [vorschau]);

  if (!einstellungen) return null;
  const firma = einstellungen.firma;

  async function setze<K extends keyof Firma>(feld: K, wert: Firma[K]) {
    await einstellungenAendern("Firma geändert", (e) => {
      e.firma[feld] = wert;
    });
    markiere();
  }

  async function setzeAdresse(feld: keyof Adresse, wert: string) {
    await einstellungenAendern("Firma geändert", (e) => {
      e.firma.adresse[feld] = wert;
    });
    markiere();
  }

  function farbeAendern(hex: string) {
    setFarbeEntwurf(hex);
    if (farbeTimer.current) clearTimeout(farbeTimer.current);
    farbeTimer.current = setTimeout(async () => {
      await setze("farbe", hex);
      setFarbeEntwurf(null);
    }, 400);
  }

  function logoWaehlen(datei: File | undefined) {
    setLogoMeldung("");
    if (!datei) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(datei.type)) {
      setLogoMeldung("Bitte ein PNG, JPG, SVG oder WebP wählen.");
      return;
    }
    if (datei.size > LOGO_MAX_BYTES) {
      setLogoMeldung(`Die Datei ist ${Math.round(datei.size / 1024)} KB groß. Für den Briefkopf reicht ein Logo unter 500 KB; bitte verkleinern.`);
      return;
    }
    const leser = new FileReader();
    leser.onload = async () => {
      await setze("logoDataUrl", String(leser.result));
    };
    leser.onerror = () => setLogoMeldung("Die Datei konnte nicht gelesen werden.");
    leser.readAsDataURL(datei);
  }

  async function briefkopfVorschau() {
    if (!einstellungen) return;
    setVorschauLaeuft(true);
    if (vorschau && "url" in vorschau) URL.revokeObjectURL(vorschau.url);
    setVorschau(null);
    try {
      const url = await pdfVorschau({ art: "rechnung", dokument: beispielRechnung(einstellungen), firma: einstellungen.firma });
      setVorschau({ url });
    } catch (e) {
      if (e instanceof ApiFehler && e.status === 501) {
        setVorschau({ hinweis: "Die PDF-Erzeugung ist in dieser Installation noch nicht eingebaut. Sobald sie da ist, erscheint hier eine Beispielrechnung mit Ihrem Briefkopf, Logo und Fußzeile." });
      } else {
        setVorschau({ hinweis: `Die Vorschau konnte nicht erzeugt werden: ${e instanceof Error ? e.message : "unbekannter Fehler"}` });
      }
    } finally {
      setVorschauLaeuft(false);
    }
  }

  const ibanFehler = firma.iban && !ibanGueltig(firma.iban) ? "Diese IBAN besteht die Prüfziffernkontrolle nicht." : undefined;
  const ustIdFehler = firma.ustIdNr && !ustIdNrPlausibel(firma.ustIdNr) ? "Eine deutsche USt-IdNr. hat die Form DE plus neun Ziffern." : undefined;
  const farbe = farbeEntwurf ?? firma.farbe;
  const farbeGueltig = /^#[0-9a-fA-F]{6}$/.test(farbe);
  const branche = BRANCHEN.find((b) => b.wert === firma.branche) ?? BRANCHEN[0];

  return (
    <>
      <ReiterKopf
        titel="Firma und Briefkopf"
        text="Alles, was auf Angeboten, Rechnungen und Mahnungen steht: Anschrift, Register, Bankverbindung, Fußzeile. Felder speichern beim Verlassen."
        gespeichert={gespeichert}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Gruppe titel="Name und Anschrift">
          <TextFeld label="Firma" wert={firma.name} onSpeichern={(w) => setze("name", w)} className="sm:col-span-2" />
          <TextFeld label="Zusatz" wert={firma.zusatz} onSpeichern={(w) => setze("zusatz", w)} hinweis="Zweite Zeile im Briefkopf, z. B. „Haus- und Wohnungsverwaltung“." className="sm:col-span-2" />
          <TextFeld label="Straße und Hausnummer" wert={firma.adresse.strasse} onSpeichern={(w) => setzeAdresse("strasse", w)} className="sm:col-span-2" />
          <TextFeld label="PLZ" wert={firma.adresse.plz} onSpeichern={(w) => setzeAdresse("plz", w)} inputMode="numeric" />
          <TextFeld label="Ort" wert={firma.adresse.ort} onSpeichern={(w) => setzeAdresse("ort", w)} />
          <TextFeld label="Land" wert={firma.adresse.land} onSpeichern={(w) => setzeAdresse("land", w.toUpperCase())} hinweis="Ländercode, DE für Deutschland." />
        </Gruppe>

        <Gruppe titel="Kontakt">
          <TextFeld label="Telefon" wert={firma.telefon} onSpeichern={(w) => setze("telefon", w)} type="tel" />
          <TextFeld label="E-Mail" wert={firma.email} onSpeichern={(w) => setze("email", w)} type="email" />
          <TextFeld label="Website" wert={firma.web} onSpeichern={(w) => setze("web", w)} />
          <TextFeld label="Geschäftsführung / Inhaber" wert={firma.geschaeftsfuehrung} onSpeichern={(w) => setze("geschaeftsfuehrung", w)} hinweis="Pflicht in der Fußzeile bei GmbH und UG (§ 35a GmbHG)." />
        </Gruppe>

        <Gruppe titel="Register und Steuer" text="Pflichtangaben auf Geschäftsbriefen (§ 37a HGB) und Rechnungen (§ 14 UStG).">
          <TextFeld label="Registergericht" wert={firma.registergericht} onSpeichern={(w) => setze("registergericht", w)} placeholder="Amtsgericht Köln" />
          <TextFeld label="Handelsregister" wert={firma.handelsregister} onSpeichern={(w) => setze("handelsregister", w)} placeholder="HRB 12345" />
          <TextFeld label="Steuernummer" wert={firma.steuernummer} onSpeichern={(w) => setze("steuernummer", w)} />
          <TextFeld label="USt-IdNr." wert={firma.ustIdNr} onSpeichern={(w) => setze("ustIdNr", w.replace(/\s+/g, "").toUpperCase())} fehler={ustIdFehler} />
          <ZahlFeld label="Umsatzsteuersatz" wert={firma.ustSatz} onSpeichern={(n) => setze("ustSatz", n ?? 19)} ganzzahl={false} einheit="%" hinweis="Regelsatz 19 %. Gilt für Ihre eigenen Rechnungen." />
          <SchalterFeld
            text="Kleinunternehmer nach § 19 UStG"
            wert={firma.kleinunternehmer}
            onSpeichern={(w) => setze("kleinunternehmer", w)}
            hinweis="Rechnungen ohne Umsatzsteuer, mit dem Pflichthinweis. Vorsteuer aus Belegen entfällt."
            className="sm:pt-6"
          />
        </Gruppe>

        <Gruppe titel="Bank und Gläubiger-ID" text="Bankverbindung für die Fußzeile; die Gläubiger-ID nur, wenn Sie per SEPA-Lastschrift einziehen.">
          <TextFeld label="Bank" wert={firma.bankname} onSpeichern={(w) => setze("bankname", w)} className="sm:col-span-2" />
          <TextFeld label="IBAN" wert={ibanFmt(firma.iban)} onSpeichern={(w) => setze("iban", ibanNormalisiert(w))} fehler={ibanFehler} feldClassName="zahl !text-left" />
          <TextFeld label="BIC" wert={firma.bic} onSpeichern={(w) => setze("bic", w.replace(/\s+/g, "").toUpperCase())} />
          <TextFeld label="Gläubiger-Identifikationsnummer" wert={firma.glaeubigerId} onSpeichern={(w) => setze("glaeubigerId", w.replace(/\s+/g, "").toUpperCase())} placeholder="DE98ZZZ09999999999" className="sm:col-span-2" />
        </Gruppe>

        <Gruppe titel="Rechnungen und Freigabe">
          <ZahlFeld label="Zahlungsziel" wert={firma.zahlungszielTage} onSpeichern={(n) => setze("zahlungszielTage", n ?? 14)} einheit="Tage" hinweis="Fälligkeit Ihrer Rechnungen ab Rechnungsdatum." />
          <GeldFeld label="Freigabegrenze" wert={firma.freigabegrenze} onSpeichern={(n) => setze("freigabegrenze", n)} hinweis="Eingangsbelege ab diesem Bruttobetrag werden nicht automatisch gebucht, sondern warten auf Ihre Freigabe." />
        </Gruppe>

        <Gruppe titel="Branche" text="Entscheidet, welcher Leistungskatalog vorgeschlagen wird und wie die App mit Ihnen spricht." spalten={1}>
          <AuswahlFeld label="Was Sie sind" wert={firma.branche} optionen={BRANCHEN.map((b) => ({ wert: b.wert, text: b.text }))} onSpeichern={(w) => setze("branche", w)} />
          <p className="text-sm text-tinte-2">{branche.erklaerung}</p>
        </Gruppe>

        <Gruppe titel="Briefkopf" text="Akzentfarbe und Logo erscheinen auf allen PDF-Dokumenten. Ohne Logo steht der Firmenname als Wortmarke im Kopf." className="lg:col-span-2" spalten={3}>
          <div>
            <span className="mb-1 block text-sm text-tinte-2">Akzentfarbe</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={farbeGueltig ? farbe : "#15201b"}
                onChange={(e) => farbeAendern(e.target.value)}
                aria-label="Akzentfarbe wählen"
                className="h-9 w-12 cursor-pointer rounded-[2px] border border-linie-2 bg-blatt p-0.5"
              />
              <TextFeld wert={farbe} onSpeichern={(w) => (/^#[0-9a-fA-F]{6}$/.test(w) ? setze("farbe", w.toLowerCase()) : undefined)} ariaLabel="Akzentfarbe als Hex" feldClassName="zahl !text-left max-w-[9rem]" />
            </div>
            <span className="mt-1 block text-xs text-tinte-3">Standard ist die Tinte der App (#15201b). Sparsam eingesetzt: Linien und Titel.</span>
          </div>
          <div>
            <span className="mb-1 block text-sm text-tinte-2">Logo</span>
            <div className="flex items-center gap-4">
              {firma.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL aus den Einstellungen, next/image kann das nicht optimieren
                <img src={firma.logoDataUrl} alt="Logo" className="max-h-14 max-w-[12rem] bg-blatt-2 p-1" />
              ) : (
                <span className="text-sm text-tinte-3">Kein Logo hinterlegt.</span>
              )}
              <div className="flex flex-col items-start gap-1">
                <Button variante="sekundaer" klein onClick={() => logoEingabe.current?.click()}>
                  {firma.logoDataUrl ? "Anderes Logo" : "Logo wählen"}
                </Button>
                {firma.logoDataUrl ? (
                  <Button variante="text" klein onClick={() => setze("logoDataUrl", null)}>
                    Entfernen
                  </Button>
                ) : null}
              </div>
              <input
                ref={logoEingabe}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  logoWaehlen(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            {logoMeldung ? (
              <Hinweis ton="fehler" className="mt-2 !text-sm">
                {logoMeldung}
              </Hinweis>
            ) : (
              <span className="mt-1 block text-xs text-tinte-3">PNG, JPG, SVG oder WebP bis 500 KB. Wird lokal gespeichert.</span>
            )}
          </div>
          <div>
            <span className="mb-1 block text-sm text-tinte-2">Prüfen</span>
            <Button variante="sekundaer" klein onClick={briefkopfVorschau} disabled={vorschauLaeuft}>
              {vorschauLaeuft ? "Wird erzeugt…" : "Briefkopf-Vorschau (PDF)"}
            </Button>
            <span className="mt-1 block text-xs text-tinte-3">Erzeugt eine Beispielrechnung mit Ihren Daten, ohne etwas zu speichern.</span>
          </div>
          {vorschau && "hinweis" in vorschau ? (
            <div className="sm:col-span-3">
              <Hinweis ton="warnung">{vorschau.hinweis}</Hinweis>
            </div>
          ) : null}
          {vorschau && "url" in vorschau ? (
            <div className="sm:col-span-3">
              <iframe src={`${vorschau.url}#toolbar=0&view=FitH`} title="Briefkopf-Vorschau" className="blatt h-[75vh] w-full" />
            </div>
          ) : null}
        </Gruppe>
      </div>
    </>
  );
}
