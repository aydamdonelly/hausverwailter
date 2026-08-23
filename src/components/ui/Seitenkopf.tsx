import type { ReactNode } from "react";

/** Titel plus ein erklärender Satz, rechts die Aktionen. Bewusst kein Kicker darüber. */
export function Seitenkopf({ titel, text, aktionen }: { titel: string; text?: ReactNode; aktionen?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem]">{titel}</h1>
        {text ? <p className="mt-1 max-w-2xl text-tinte-2">{text}</p> : null}
      </div>
      {aktionen ? <div className="flex flex-wrap items-center gap-2">{aktionen}</div> : null}
    </div>
  );
}
