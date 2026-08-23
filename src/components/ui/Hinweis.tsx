import type { ReactNode } from "react";

type Ton = "fehler" | "warnung" | "hinweis" | "ok";
const farbe: Record<Ton, string> = { fehler: "bg-stempel", warnung: "bg-ocker", hinweis: "bg-tinte-3", ok: "bg-gruen" };

/** Ein Satz mit einer kleinen farbigen Marke davor. Kein Kasten, kein Icon, keine Leiste. */
export function Hinweis({ ton = "hinweis", children, className = "" }: { ton?: Ton; children: ReactNode; className?: string }) {
  return (
    <div className={`hinweis ${className}`} role={ton === "fehler" ? "alert" : undefined}>
      <span className={`hinweis-marke ${farbe[ton]}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
