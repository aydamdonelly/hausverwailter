"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { parseEml } from "@/lib/dokumente/eml";

/** Zeigt die Originaldatei: PDF im Rahmen, Bilder als Bild, Mails und Text als Text. */
export function DokumentViewer({ dokumentId, className = "" }: { dokumentId: string; className?: string }) {
  const datei = useLiveQuery(() => db.dateien.get(dokumentId), [dokumentId]);
  const dokument = useLiveQuery(() => db.dokumente.get(dokumentId), [dokumentId]);
  const [text, setText] = useState<string | null>(null);
  const name = dokument?.dateiname.toLowerCase() ?? "";
  const istText = Boolean(datei && (datei.mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".eml") || name.endsWith(".csv") || datei.mime === "message/rfc822"));
  const url = useMemo(() => (datei && !istText ? URL.createObjectURL(datei.blob) : null), [datei, istText]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(() => {
    if (!datei || !dokument || !istText) return;
    let aktiv = true;
    datei.blob.arrayBuffer().then((buf) => {
        if (!aktiv) return;
        const bytes = new Uint8Array(buf);
        if (name.endsWith(".eml") || datei.mime === "message/rfc822") {
          const eml = parseEml(bytes);
          setText(`Von: ${eml.von}\nBetreff: ${eml.betreff}\nDatum: ${eml.datum}\n${eml.anhaenge.length ? `Anhänge: ${eml.anhaenge.map((a) => a.dateiname).join(", ")}\n` : ""}\n${eml.text}`);
        } else {
          setText(new TextDecoder("utf-8").decode(bytes));
        }
      });
    return () => {
      aktiv = false;
    };
  }, [datei, dokument, istText, name]);

  if (!datei || !dokument) return <div className={`blatt ${className}`} />;
  const istBild = datei.mime.startsWith("image/");
  const istPdf = datei.mime === "application/pdf" || dokument.dateiname.toLowerCase().endsWith(".pdf");

  return (
    <div className={`blatt overflow-hidden ${className}`}>
      {text !== null ? (
        <pre className="h-full overflow-auto whitespace-pre-wrap p-5 font-sans text-[0.9375rem] leading-relaxed">{text}</pre>
      ) : istBild && url ? (
        <div className="h-full overflow-auto bg-blatt-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- Objekt-URL aus IndexedDB, next/image kann das nicht optimieren */}
          <img src={url} alt={dokument.dateiname} className="mx-auto max-w-full" />
        </div>
      ) : istPdf && url ? (
        <iframe src={`${url}#toolbar=0&view=FitH`} title={dokument.dateiname} className="h-full w-full" />
      ) : (
        <p className="p-5 text-tinte-2">Vorschau für diesen Dateityp nicht möglich.</p>
      )}
    </div>
  );
}
