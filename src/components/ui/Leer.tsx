import type { ReactNode } from "react";

/** Leerer Zustand: sagt in einem Satz, was hier hingehört und was als Nächstes zu tun ist. */
export function Leer({ titel, children, aktion }: { titel: string; children?: ReactNode; aktion?: ReactNode }) {
  return (
    <div className="blatt px-6 py-10 text-center">
      <p className="font-display text-xl">{titel}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-tinte-2">{children}</div> : null}
      {aktion ? <div className="mt-5">{aktion}</div> : null}
    </div>
  );
}
