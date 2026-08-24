/**
 * Der Briefbogen nach DIN 5008 Form B: Briefkopf mit Wortmarke oder Logo und Absenderblock,
 * Rücksendeangabe über dem Anschriftfeld, Anschrift an der Fensterposition, Informationsblock
 * rechts, Falz- und Lochmarke am linken Rand, dreispaltige Fußzeile mit den Geschäftsangaben
 * (§ 37a HGB, § 35a GmbHG) und Seitenzahlen "Seite x von y". Folgeseiten tragen einen Kurzkopf.
 *
 * Alle Kopf- und Fußelemente sind `fixed` und absolut zum Blatt positioniert; der Text fließt
 * zwischen 45 mm (Folgeseiten) bzw. 98 mm (erste Seite) und 268 mm.
 */
import type { ReactNode } from "react";
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { Empfaenger, Firma } from "../domain/schema";
import { iban as ibanFmt } from "../format";
import { SCHRIFT_DISPLAY, SCHRIFT_TEXT } from "./fonts";
import { DIN, FARBEN, SCHRIFTGRAD, ZEILENHOEHE, akzentFarbe, mm } from "./stil";
import { anschriftZeilen, ruecksendeangabe, type InfoZeile } from "./texte";
import { ZAHL } from "./Bausteine";

export interface BriefbogenProps {
  firma: Firma;
  empfaenger: Empfaenger;
  /** Kurzbezeichnung für Folgeseiten und die PDF-Metadaten, z. B. "Rechnung R-2026-0132 vom 23.08.2026". */
  kurztitel: string;
  infoblock: InfoZeile[];
  children: ReactNode;
}

/** Lange Firmennamen bekommen eine kleinere Wortmarke, damit sie einzeilig bleiben. */
function wortmarkeGroesse(name: string): number {
  if (name.length <= 22) return SCHRIFTGRAD.wortmarke;
  if (name.length <= 32) return SCHRIFTGRAD.wortmarke - 3;
  return SCHRIFTGRAD.wortmarke - 5;
}

/** react-pdf zeigt PNG und JPG; SVG-Logos fallen auf die Wortmarke zurück. */
function logoVerwendbar(dataUrl: string | null): dataUrl is string {
  return Boolean(dataUrl && /^data:image\/(png|jpe?g);base64,/i.test(dataUrl));
}

function Kopf({ firma, akzent }: { firma: Firma; akzent: string }) {
  const logo = logoVerwendbar(firma.logoDataUrl);
  const ort = `${firma.adresse.plz} ${firma.adresse.ort}`.trim();
  const absender = [
    logo ? firma.name : "",
    firma.adresse.strasse,
    ort,
    firma.telefon ? `Telefon ${firma.telefon}` : "",
    firma.email,
    firma.web,
  ].filter(Boolean);
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: mm(DIN.blattBreite),
        height: mm(DIN.kopfHoehe),
        paddingTop: mm(13),
        paddingLeft: mm(DIN.randLinks),
        paddingRight: mm(DIN.randRechts),
        flexDirection: "row",
      }}
    >
      <View style={{ flex: 1, paddingRight: mm(8) }}>
        {logo ? (
          // react-pdf-Bilder kennen kein alt-Attribut; das Logo ist reine Dekoration neben dem Absenderblock.
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={firma.logoDataUrl as string} style={{ width: mm(60), height: mm(14), objectFit: "contain", objectPosition: "0% 50%" }} />
        ) : (
          <Text style={{ fontFamily: SCHRIFT_DISPLAY, fontWeight: 600, fontSize: wortmarkeGroesse(firma.name), lineHeight: 1.15, color: akzent }}>{firma.name}</Text>
        )}
        {firma.zusatz ? <Text style={{ fontSize: SCHRIFTGRAD.klein, lineHeight: 1.3, color: FARBEN.tinte2, marginTop: 2 }}>{firma.zusatz}</Text> : null}
      </View>
      <View style={{ width: mm(DIN.infoblockBreite) }}>
        {absender.map((zeile, i) => (
          <Text key={i} style={{ fontSize: SCHRIFTGRAD.winzig + 0.5, lineHeight: 1.35, color: FARBEN.tinte2, fontWeight: i === 0 && logo ? 600 : 400, ...ZAHL }}>
            {zeile}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Falzmarken bei 105 und 210 mm, Lochmarke bei 148,5 mm: feine Striche am linken Blattrand. */
function Marken() {
  const marke = (oben: number, laenge: number) => (
    <View fixed style={{ position: "absolute", left: mm(2), top: mm(oben), width: mm(laenge), height: 0.4, backgroundColor: FARBEN.linie2 }} />
  );
  return (
    <>
      {marke(DIN.falzmarke1, 4)}
      {marke(DIN.lochmarke, 7)}
      {marke(DIN.falzmarke2, 4)}
    </>
  );
}

function FussSpalte({ zeilen, fett }: { zeilen: string[]; fett?: number }) {
  return (
    <View style={{ flex: 1, paddingRight: mm(3) }}>
      {zeilen.map((z, i) => (
        <Text key={i} style={{ fontSize: SCHRIFTGRAD.winzig, lineHeight: 1.4, color: FARBEN.tinte2, fontWeight: i === fett ? 600 : 400, ...ZAHL }}>
          {z}
        </Text>
      ))}
    </View>
  );
}

function Fuss({ firma, akzent }: { firma: Firma; akzent: string }) {
  const register = [firma.registergericht, firma.handelsregister].filter(Boolean).join(", ");
  const spalte1 = [firma.name, firma.geschaeftsfuehrung ? `Geschäftsführung: ${firma.geschaeftsfuehrung}` : "", register].filter(Boolean);
  const spalte2 = [
    firma.steuernummer ? `Steuernummer ${firma.steuernummer}` : "",
    firma.ustIdNr ? `USt-IdNr. ${firma.ustIdNr}` : "",
    firma.glaeubigerId ? `Gläubiger-ID ${firma.glaeubigerId}` : "",
  ].filter(Boolean);
  const spalte3 = [firma.bankname, firma.iban ? `IBAN ${ibanFmt(firma.iban)}` : "", firma.bic ? `BIC ${firma.bic}` : ""].filter(Boolean);
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: mm(DIN.fussOben),
        left: 0,
        width: mm(DIN.blattBreite),
        paddingLeft: mm(DIN.randLinks),
        paddingRight: mm(DIN.randRechts),
      }}
    >
      <View style={{ borderTopWidth: 0.6, borderTopColor: akzent, paddingTop: mm(1.8), flexDirection: "row" }}>
        <FussSpalte zeilen={spalte1} fett={0} />
        <FussSpalte zeilen={spalte2} />
        <FussSpalte zeilen={spalte3} />
        <Text
          render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
          style={{ width: mm(20), fontSize: SCHRIFTGRAD.winzig, lineHeight: 1.4, color: FARBEN.tinte2, textAlign: "right", ...ZAHL }}
        />
      </View>
    </View>
  );
}

/** Kurzkopf ab Seite 2: worum es geht, damit lose Blätter zuzuordnen bleiben. */
function Kurzkopf({ kurztitel }: { kurztitel: string }) {
  return (
    <View
      fixed
      render={({ pageNumber }) =>
        pageNumber > 1 ? (
          <Text style={{ fontSize: SCHRIFTGRAD.klein, lineHeight: 1.3, color: FARBEN.tinte2, ...ZAHL }}>{`${kurztitel}, Fortsetzung`}</Text>
        ) : null
      }
      style={{ position: "absolute", top: mm(DIN.kopfHoehe - 8), left: mm(DIN.randLinks), right: mm(DIN.randRechts) }}
    />
  );
}

/** Anschriftfeld und Informationsblock: nur auf der ersten Seite, im Fluss, exakt 53 mm hoch (45 bis 98 mm). */
function ErsteSeite({ firma, empfaenger, infoblock }: { firma: Firma; empfaenger: Empfaenger; infoblock: InfoZeile[] }) {
  return (
    <View style={{ height: mm(DIN.textBeginn - DIN.kopfHoehe), position: "relative" }}>
      <View style={{ position: "absolute", top: 0, left: 0, width: mm(DIN.anschriftBreite - (DIN.randLinks - 20)), height: mm(DIN.anschriftHoehe) }}>
        <Text style={{ position: "absolute", top: mm(2), left: 0, fontSize: SCHRIFTGRAD.ruecksende, lineHeight: 1.2, color: FARBEN.tinte2 }}>
          {ruecksendeangabe(firma)}
        </Text>
        <View style={{ position: "absolute", top: mm(DIN.vermerkzoneHoehe), left: 0, right: 0 }}>
          {anschriftZeilen(empfaenger).map((zeile, i) => (
            <Text key={i} style={{ fontSize: SCHRIFTGRAD.anschrift, lineHeight: mm(4.55) / SCHRIFTGRAD.anschrift }}>
              {zeile}
            </Text>
          ))}
        </View>
      </View>
      <View style={{ position: "absolute", top: mm(DIN.infoblockOben - DIN.kopfHoehe), left: mm(DIN.infoblockLinks - DIN.randLinks), width: mm(DIN.infoblockBreite) }}>
        {infoblock.map(([label, wert], i) => (
          <View key={i} style={{ flexDirection: "row", marginBottom: 1.2 }}>
            <Text style={{ width: mm(28), fontSize: SCHRIFTGRAD.klein - 0.5, lineHeight: 1.35, color: FARBEN.tinte2 }}>{label}</Text>
            <Text style={{ flex: 1, fontSize: SCHRIFTGRAD.klein + 0.5, lineHeight: 1.25, ...ZAHL }}>{wert}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Briefbogen({ firma, empfaenger, kurztitel, infoblock, children }: BriefbogenProps) {
  const akzent = akzentFarbe(firma.farbe);
  return (
    <Document title={kurztitel} author={firma.name} subject={kurztitel} creator="hausverwailter" producer="hausverwailter" language="de">
      <Page
        size="A4"
        style={{
          fontFamily: SCHRIFT_TEXT,
          fontSize: SCHRIFTGRAD.text,
          lineHeight: ZEILENHOEHE,
          color: FARBEN.tinte,
          paddingTop: mm(DIN.kopfHoehe),
          paddingLeft: mm(DIN.randLinks),
          paddingRight: mm(DIN.randRechts),
          paddingBottom: mm(DIN.blattHoehe - DIN.fussOben + 4),
        }}
      >
        <Kopf firma={firma} akzent={akzent} />
        <Marken />
        <Fuss firma={firma} akzent={akzent} />
        <Kurzkopf kurztitel={kurztitel} />
        <ErsteSeite firma={firma} empfaenger={empfaenger} infoblock={infoblock} />
        {children}
      </Page>
    </Document>
  );
}
