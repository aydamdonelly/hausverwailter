/**
 * Wiederkehrende Bausteine der Briefe: Titel, Absatz, Abschnitt, Liste, Label/Wert-Raster,
 * Positionstabelle mit sauberen Umbrüchen und der Summenblock. Alle Maße in Punkt.
 */
import type { ReactNode } from "react";
import { Text, View } from "@react-pdf/renderer";
import { eur } from "../format";
import { SCHRIFT_DISPLAY } from "./fonts";
import { FARBEN, SCHRIFTGRAD, ZEILENHOEHE, mm } from "./stil";
import type { InfoZeile, SummenZeile } from "./texte";

/** Tabellenziffern für alles, was in Spalten steht. Source Sans 3 ist von Haus aus tabular, Vollkorn nicht. */
export const ZAHL = { fontFeatureSettings: ["tnum", "lnum"] as ("tnum" | "lnum")[] };

/** Dokumenttitel in Vollkorn ("Rechnung R-2026-0132"). */
export function Titel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: SCHRIFT_DISPLAY, fontWeight: 600, fontSize: SCHRIFTGRAD.titel, lineHeight: 1.2, color: FARBEN.tinte, marginBottom: 2 }}>
      {children}
    </Text>
  );
}

/** Betreffzeile unter dem Titel: fett, ohne das Wort "Betreff" (DIN 5008). */
export function Betreff({ children }: { children: string }) {
  return <Text style={{ fontWeight: 600, fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE }}>{children}</Text>;
}

export function Absatz({ children, klein = false, abstand = 5, fett = false }: { children: ReactNode; klein?: boolean; abstand?: number; fett?: boolean }) {
  return (
    <Text
      style={{
        fontSize: klein ? SCHRIFTGRAD.klein : SCHRIFTGRAD.text,
        lineHeight: ZEILENHOEHE,
        color: klein ? FARBEN.tinte2 : FARBEN.tinte,
        fontWeight: fett ? 600 : 400,
        marginBottom: abstand,
      }}
    >
      {children}
    </Text>
  );
}

/** Leerraum in Millimetern. */
export function Abstand({ hoehe }: { hoehe: number }) {
  return <View style={{ height: mm(hoehe) }} />;
}

/** Abschnittsüberschrift, die nie allein am Seitenende stehen bleibt. */
export function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: mm(3.5) }}>
      <Text minPresenceAhead={mm(24)} style={{ fontWeight: 600, fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE, marginBottom: 3 }}>
        {titel}
      </Text>
      {children}
    </View>
  );
}

/** Aufzählung mit hängendem Gedankenstrich. */
export function Liste({ punkte }: { punkte: string[] }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {punkte.map((p, i) => (
        <View key={i} wrap={false} style={{ flexDirection: "row", marginBottom: 1.5 }}>
          <Text style={{ width: mm(5), fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE }}>–</Text>
          <Text style={{ flex: 1, fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE }}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

/** Label links, Wert rechts; für Objektdaten und Bankverbindung. */
export function LabelWert({ zeilen, labelBreite = 34, klein = false }: { zeilen: InfoZeile[]; labelBreite?: number; klein?: boolean }) {
  const groesse = klein ? SCHRIFTGRAD.klein : SCHRIFTGRAD.text;
  return (
    <View style={{ marginBottom: 4 }}>
      {zeilen.map(([label, wert], i) => (
        <View key={i} wrap={false} style={{ flexDirection: "row", marginBottom: 1 }}>
          <Text style={{ width: mm(labelBreite), fontSize: groesse, lineHeight: ZEILENHOEHE, color: FARBEN.tinte2 }}>{label}</Text>
          <Text style={{ flex: 1, fontSize: groesse, lineHeight: ZEILENHOEHE, ...ZAHL }}>{wert}</Text>
        </View>
      ))}
    </View>
  );
}

export interface Spalte {
  titel: string;
  /** Feste Breite in Millimetern; ohne Angabe füllt die Spalte den Rest. */
  breite?: number;
  rechts?: boolean;
}

export interface Zelle {
  text: string;
  /** Kleiner Text unter dem Haupttext, z. B. die Leistungsbeschreibung. */
  nebentext?: string;
}

function zellenStil(spalte: Spalte, letzte: boolean) {
  return {
    ...(spalte.breite ? { width: mm(spalte.breite) } : { flexGrow: 1, flexShrink: 1, flexBasis: 0 }),
    paddingRight: letzte ? 0 : mm(2.5),
  };
}

/**
 * Positionstabelle. Kopfzeile mit kräftiger Linie, Zeilen mit feiner Linie, jede Zeile bleibt
 * beim Seitenumbruch zusammen, die Kopfzeile nie allein am Seitenende.
 */
export function Tabelle({ spalten, zeilen }: { spalten: Spalte[]; zeilen: (string | Zelle)[][] }) {
  const kopf = (
    <View style={{ flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: FARBEN.tinte, paddingBottom: 2.5, marginBottom: 1 }}>
      {spalten.map((s, i) => (
        <Text
          key={i}
          style={{
            ...zellenStil(s, i === spalten.length - 1),
            fontSize: SCHRIFTGRAD.klein,
            fontWeight: 600,
            lineHeight: 1.25,
            textAlign: s.rechts ? "right" : "left",
          }}
        >
          {s.titel}
        </Text>
      ))}
    </View>
  );
  const zeile = (inhalt: (string | Zelle)[], key: number) => (
    <View key={key} wrap={false} style={{ flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: FARBEN.linie, paddingVertical: 3 }}>
      {inhalt.map((zelle, si) => {
        const s = spalten[si];
        const z = typeof zelle === "string" ? { text: zelle } : zelle;
        return (
          <View key={si} style={zellenStil(s, si === spalten.length - 1)}>
            <Text style={{ fontSize: SCHRIFTGRAD.text, lineHeight: 1.3, textAlign: s.rechts ? "right" : "left", ...ZAHL }}>{z.text}</Text>
            {z.nebentext ? <Text style={{ fontSize: SCHRIFTGRAD.klein, lineHeight: 1.3, color: FARBEN.tinte2, marginTop: 1 }}>{z.nebentext}</Text> : null}
          </View>
        );
      })}
    </View>
  );
  // Kopfzeile und erste Zeile bleiben zusammen, damit der Kopf nie allein am Seitenende steht.
  return (
    <View style={{ marginBottom: 4 }}>
      <View wrap={false}>
        {kopf}
        {zeilen.length ? zeile(zeilen[0], 0) : null}
      </View>
      {zeilen.slice(1).map((inhalt, i) => zeile(inhalt, i + 1))}
    </View>
  );
}

/** Summen rechtsbündig unter der Tabelle; die letzte Zeile ist die Hauptsumme mit Linie darüber. */
export function SummenBlock({ zeilen }: { zeilen: SummenZeile[] }) {
  return (
    <View wrap={false} style={{ alignItems: "flex-end", marginTop: 2, marginBottom: 4 }}>
      <View style={{ width: mm(82) }}>
        {zeilen.map((z, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              paddingVertical: 2,
              ...(z.fett ? { borderTopWidth: 0.75, borderTopColor: FARBEN.tinte, marginTop: 2, paddingTop: 3.5 } : {}),
            }}
          >
            <Text style={{ flex: 1, fontSize: SCHRIFTGRAD.text, lineHeight: 1.3, fontWeight: z.fett ? 600 : 400 }}>{z.text}</Text>
            <Text style={{ width: mm(32), fontSize: SCHRIFTGRAD.text, lineHeight: 1.3, textAlign: "right", fontWeight: z.fett ? 600 : 400, ...ZAHL }}>
              {eur(z.wert).replace(/^-/, "−")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Grußformel mit Firmenname, Platz für die Unterschrift und dem Namen darunter (DIN 5008).
 * Die Schlussabsätze davor bleiben mit dem Gruß auf einer Seite, damit nie "Mit freundlichen
 * Grüßen" allein auf einem Folgeblatt steht.
 */
export function Gruss({ firmenname, name, schluss = [] }: { firmenname: string; name: string; schluss?: string[] }) {
  // Nur der letzte Schlussabsatz hängt fest am Gruß; davor darf die Seite umbrechen.
  const vorher = schluss.slice(0, -1);
  const letzter = schluss.at(-1);
  return (
    <>
      {vorher.map((absatz, i) => (
        <Absatz key={i}>{absatz}</Absatz>
      ))}
      <View wrap={false}>
        {letzter ? <Absatz>{letzter}</Absatz> : null}
        <View style={{ marginTop: mm(2.5) }}>
          <Text style={{ fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE }}>Mit freundlichen Grüßen</Text>
          <Text style={{ fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE }}>{firmenname}</Text>
          <View style={{ height: mm(8) }} />
          {name ? <Text style={{ fontSize: SCHRIFTGRAD.text, lineHeight: ZEILENHOEHE }}>{name}</Text> : null}
        </View>
      </View>
    </>
  );
}
