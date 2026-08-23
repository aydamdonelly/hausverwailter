import type { DokumentStatus } from "@/lib/domain/schema";

type Ton = "rot" | "gruen" | "tinte" | "ocker";

export function Stempel({
  text,
  ton = "tinte",
  groesse = "normal",
  neu = false,
  className = "",
  title,
}: {
  text: string;
  ton?: Ton;
  groesse?: "klein" | "normal" | "gross";
  neu?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`stempel stempel-${ton} ${groesse === "klein" ? "stempel-klein" : groesse === "gross" ? "stempel-gross" : ""} ${neu ? "stempel-neu" : ""} ${className}`}
      title={title}
    >
      {text}
    </span>
  );
}

/** Ein Dokumentstatus als Stempel: Text und Farbe sind fest verdrahtet, damit es überall gleich aussieht. */
export function StatusStempel({ status, neu = false, groesse = "klein" }: { status: DokumentStatus; neu?: boolean; groesse?: "klein" | "normal" | "gross" }) {
  const map: Record<DokumentStatus, { text: string; ton: Ton }> = {
    neu: { text: "Eingegangen", ton: "tinte" },
    wird_gelesen: { text: "Wird gelesen", ton: "tinte" },
    erkannt: { text: "Erkannt", ton: "tinte" },
    freigabe: { text: "Freigabe nötig", ton: "rot" },
    freigegeben: { text: "Freigegeben", ton: "gruen" },
    gebucht: { text: "Gebucht", ton: "gruen" },
    abgelehnt: { text: "Abgelehnt", ton: "rot" },
    fehler: { text: "Fehler", ton: "rot" },
  };
  const { text, ton } = map[status];
  return <Stempel text={text} ton={ton} groesse={groesse} neu={neu} />;
}

/** Der SVG-Filter, der Stempeln ihre leicht unregelmäßige Tinte gibt. Einmal im Layout einbinden. */
export function StempelFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="stempel-tinte" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="rauschen" />
        <feDisplacementMap in="SourceGraphic" in2="rauschen" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
