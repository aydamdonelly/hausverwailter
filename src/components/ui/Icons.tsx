/**
 * Wenige eigene Zeichen, alle auf demselben 16er-Raster mit 1.5px Strich und eckigen Kappen,
 * damit sie wie aus einem Formular-Baukasten wirken und nicht wie ein Icon-Paket.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { groesse?: number };

function Basis({ groesse = 16, children, ...rest }: P) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconAblage = (p: P) => (
  <Basis {...p}>
    <path d="M2 9v5h12V9" />
    <path d="M2 9l2-6h8l2 6" />
    <path d="M2 9h3l1 2h4l1-2h3" />
  </Basis>
);
export const IconPfeilHoch = (p: P) => (
  <Basis {...p}>
    <path d="M8 13V3" />
    <path d="M4 7l4-4 4 4" />
  </Basis>
);
export const IconPfeilRechts = (p: P) => (
  <Basis {...p}>
    <path d="M3 8h10" />
    <path d="M9 4l4 4-4 4" />
  </Basis>
);
export const IconSchliessen = (p: P) => (
  <Basis {...p}>
    <path d="M3 3l10 10M13 3L3 13" />
  </Basis>
);
export const IconHaken = (p: P) => (
  <Basis {...p}>
    <path d="M2.5 8.5l3.5 3.5 7.5-8" />
  </Basis>
);
export const IconBlatt = (p: P) => (
  <Basis {...p}>
    <path d="M3.5 1.5h6l3 3v10h-9z" />
    <path d="M9.5 1.5v3h3" />
    <path d="M5.5 8h5M5.5 10.5h5" />
  </Basis>
);
export const IconHerunterladen = (p: P) => (
  <Basis {...p}>
    <path d="M8 2v9" />
    <path d="M4 7l4 4 4-4" />
    <path d="M2 13.5h12" />
  </Basis>
);
export const IconLupe = (p: P) => (
  <Basis {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </Basis>
);
