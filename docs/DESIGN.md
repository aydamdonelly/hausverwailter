# Gestaltung

Die App ist ein Schreibtisch in einer deutschen Verwaltung. Das ist die eine Idee, aus der alles
folgt: Recyclingpapier als Hintergrund (`papier`), helle Blätter als Arbeitsflächen (`blatt`),
grünschwarze Tinte (`tinte`), Stempelrot als einziger Akzent (`stempel`). Der Stempel ist die
Signatur: Zustände werden gestempelt (ERKANNT, GEPRÜFT, FREIGABE, GEBUCHT), und die erkannten
Daten eines Belegs stehen in einem Kontierungsstempel, so wie ihn jede Buchhaltung kennt.

## Regeln (verbindlich, auch für KI-Agenten, die hier weiterbauen)

- Farben nur aus `globals.css` (`@theme`). Kein Blau, kein Lila, keine Verläufe, keine Glows.
- Keine Schatten. Tiefe kommt aus Ton (Papier vs. Blatt) und der 1px-Kante von `.blatt`.
- Keine Pillen, keine Badges mit Füllung, keine Icons in farbigen Kacheln. Status = `<Stempel>`.
- Ecken 2px (`--radius-formular`). Buttons bewegen sich bei Hover nicht; nur die Farbe wechselt.
- Zwei Schriften: Vollkorn (Titel, Wortmarke, Stempel), Source Sans 3 (alles andere).
  Geldbeträge und Nummern immer mit `.zahl` (Tabellenziffern, rechtsbündig).
- Ein Aktionspaar ist nie "gefüllt + umrandet". Primär gefüllt, sekundär als reiner Text.
- Keine kleinen Versal-Labels über Überschriften (Kicker). Ein Seitenkopf ist Titel + ein Satz.
- Versal-Labels gibt es nur im Kontierungsstempel. Sonst Satzschrift.
- Inhalte sind immer sichtbar; nichts startet unsichtbar und wartet auf eine Animation.
- Motion nur dort, wo sie etwas bedeutet: Stempel-Aufschlag bei Statuswechsel, Lesebalken
  beim KI-Aufruf, Ablagekorb bei Drag-over. `prefers-reduced-motion` wird respektiert.
- Deutsche Formate überall: 1.234,56 €, 23.08.2026, IBAN in Vierergruppen (`lib/format.ts`).
- Leere Zustände erklären, was als Nächstes zu tun ist, in einem Satz. Kein großes Icon.
- Jede Steuerung, die aussieht wie ein Bedienelement, muss funktionieren. Keine Attrappen.

## Bausteine (`src/components/ui`)

`Seitenkopf`, `Button`, `Stempel`, `Kontierungsstempel` + `KontierungsZelle`, `Feld`,
`Hinweis`, `Leer`, `Ablagekorb`, `Icons`. Neue Bausteine bitte dort ergänzen, nicht in
Seiten improvisieren.
