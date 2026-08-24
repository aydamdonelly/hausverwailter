"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

/**
 * Ein Bearbeiten-Dialog als Blatt über dem Schreibtisch: Radix sorgt für Fokus, Escape und
 * Screenreader, das Aussehen folgt DESIGN.md (Blatt mit 1px-Kante, kein Schatten, Ecken 2px).
 * Der Fuß trägt das Aktionspaar: primär gefüllt, sekundär als reiner Text.
 */
export function Dialog({
  offen,
  onOffen,
  titel,
  text,
  breit = false,
  children,
  fuss,
}: {
  offen: boolean;
  onOffen: (offen: boolean) => void;
  titel: string;
  text?: ReactNode;
  breit?: boolean;
  children: ReactNode;
  fuss?: ReactNode;
}) {
  return (
    <RadixDialog.Root open={offen} onOpenChange={onOffen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-tinte/35" />
        <RadixDialog.Content
          className="blatt fixed left-1/2 top-1/2 z-50 max-h-[92vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 focus:outline-none"
          style={{ width: `min(94vw, ${breit ? 960 : 760}px)` }}
        >
          <RadixDialog.Title className="font-display text-xl font-semibold">{titel}</RadixDialog.Title>
          <RadixDialog.Description className={text ? "mt-1 text-tinte-2" : "sr-only"}>{text ?? titel}</RadixDialog.Description>
          <div className="mt-5">{children}</div>
          {fuss ? <div className="mt-6 flex flex-wrap items-center justify-end gap-4">{fuss}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
