import type { ButtonHTMLAttributes } from "react";

type Variante = "primaer" | "sekundaer" | "text" | "gefaehrlich";

const klassen: Record<Variante, string> = {
  primaer: "bg-tinte text-blatt hover:bg-[#26342d] disabled:bg-tinte-3",
  sekundaer: "bg-blatt-2 text-tinte hover:bg-linie disabled:text-tinte-3",
  text: "bg-transparent text-tinte-2 hover:text-tinte px-1 disabled:text-tinte-3",
  gefaehrlich: "bg-transparent text-stempel-2 hover:text-stempel px-1 disabled:text-tinte-3",
};

export function Button({
  variante = "primaer",
  klein = false,
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; klein?: boolean }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-2 rounded-[2px] font-medium transition-colors duration-100 disabled:cursor-not-allowed ${
        klein ? "px-2.5 py-1 text-sm" : "px-3.5 py-2 text-[0.9375rem]"
      } ${klassen[variante]} ${className}`}
      {...rest}
    />
  );
}
