import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Feld({ label, hinweis, children, className = "" }: { label: string; hinweis?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm text-tinte-2">{label}</span>
      {children}
      {hinweis ? <span className="mt-1 block text-xs text-tinte-3">{hinweis}</span> : null}
    </label>
  );
}

export function Eingabe({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`feld ${className}`} {...rest} />;
}

export function Auswahl({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`feld ${className}`} {...rest} />;
}

export function Textbereich({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`feld ${className}`} {...rest} />;
}
