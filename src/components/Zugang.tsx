"use client";

import { useEffect, useState, type ReactNode } from "react";
import { serverStatus, zugangscodeLesen, zugangscodeSpeichern, type ServerStatus } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Eingabe, Feld } from "@/components/ui/Feld";
import { Hinweis } from "@/components/ui/Hinweis";

/**
 * Fragt beim Start den Serverstatus ab. Braucht der Server einen Zugangscode und ist keiner
 * gespeichert (oder der falsche), erscheint statt der App ein kleines Formular.
 */
export function Zugang({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [fehler, setFehler] = useState("");
  const [code, setCode] = useState("");

  async function laden() {
    try {
      setStatus(await serverStatus());
      setFehler("");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Server nicht erreichbar");
    }
  }

  useEffect(() => {
    let aktiv = true;
    serverStatus()
      .then((s) => {
        if (!aktiv) return;
        setStatus(s);
        setFehler("");
      })
      .catch((e: unknown) => {
        if (aktiv) setFehler(e instanceof Error ? e.message : "Server nicht erreichbar");
      });
    return () => {
      aktiv = false;
    };
  }, []);

  if (status && status.zugangNoetig && !status.zugangOk) {
    return (
      <div className="mx-auto mt-24 max-w-sm">
        <div className="blatt p-6">
          <h1 className="text-2xl">Zugangscode</h1>
          <p className="mt-1 text-tinte-2">Diese Installation ist geschützt. Den Code hat, wer sie eingerichtet hat.</p>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              zugangscodeSpeichern(code.trim());
              await laden();
              const s = await serverStatus().catch(() => null);
              if (s && !s.zugangOk) setFehler("Der Code ist falsch.");
            }}
          >
            <Feld label="Code">
              <Eingabe type="password" value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="current-password" />
            </Feld>
            {fehler ? <Hinweis ton="fehler">{fehler}</Hinweis> : null}
            <Button type="submit">Öffnen</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {status && !status.kiVerfuegbar ? (
        <div className="mx-auto mb-4 max-w-[1280px] px-6">
          <Hinweis ton="warnung">
            Kein API-Key hinterlegt. Die App zeigt Daten, kann aber nichts lesen. Trage <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code> ein und starte neu (siehe README).
          </Hinweis>
        </div>
      ) : null}
      {fehler && !status ? (
        <div className="mx-auto mb-4 max-w-[1280px] px-6">
          <Hinweis ton="fehler">Server nicht erreichbar: {fehler}</Hinweis>
        </div>
      ) : null}
      {status && zugangscodeLesen() && !status.zugangNoetig ? null : null}
      {children}
    </>
  );
}
