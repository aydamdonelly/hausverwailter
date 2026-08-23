"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { serverStatus } from "@/lib/api";

const EINTRAEGE = [
  { pfad: "/", text: "Posteingang" },
  { pfad: "/bank", text: "Bank" },
  { pfad: "/angebote", text: "Angebote" },
  { pfad: "/rechnungen", text: "Rechnungen" },
  { pfad: "/buchungen", text: "Buchungen" },
  { pfad: "/stammdaten", text: "Stammdaten" },
  { pfad: "/protokoll", text: "Protokoll" },
];

export function Navigation() {
  const pfad = usePathname();
  const [modell, setModell] = useState<string | null>(null);
  const [ki, setKi] = useState<boolean | null>(null);

  useEffect(() => {
    serverStatus()
      .then((s) => {
        setModell(s.modell);
        setKi(s.kiVerfuegbar);
      })
      .catch(() => setKi(false));
  }, []);

  const modellName = modell?.replace("claude-", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

  return (
    <nav className="border-b border-linie bg-blatt">
      <div className="mx-auto flex max-w-[1280px] items-baseline gap-8 px-6">
        <Link href="/" className="py-4 font-display text-[1.375rem] font-bold tracking-tight text-tinte">
          Hausverw<span className="italic text-stempel">ai</span>lter
        </Link>
        <ul className="flex flex-wrap items-baseline gap-5">
          {EINTRAEGE.map((e) => {
            const aktiv = e.pfad === "/" ? pfad === "/" || pfad.startsWith("/belege") : pfad.startsWith(e.pfad);
            return (
              <li key={e.pfad}>
                <Link
                  href={e.pfad}
                  aria-current={aktiv ? "page" : undefined}
                  className={`block py-4 text-[0.9375rem] transition-colors ${aktiv ? "font-semibold text-tinte" : "text-tinte-2 hover:text-tinte"}`}
                >
                  {e.text}
                </Link>
              </li>
            );
          })}
        </ul>
        <span className="ml-auto py-4 text-sm text-tinte-3">
          {ki === null ? "" : ki ? `${modellName} bereit` : "Kein API-Key"}
        </span>
      </div>
    </nav>
  );
}
