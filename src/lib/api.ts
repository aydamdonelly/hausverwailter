/** Aufrufe an die eigene Server-API aus dem Browser, inkl. Zugangscode-Header, falls gesetzt. */

const SCHLUESSEL = "hv.zugangscode";

export function zugangscodeLesen(): string {
  try {
    return localStorage.getItem(SCHLUESSEL) ?? "";
  } catch {
    return "";
  }
}

export function zugangscodeSpeichern(code: string): void {
  try {
    if (code) localStorage.setItem(SCHLUESSEL, code);
    else localStorage.removeItem(SCHLUESSEL);
  } catch {
    /* privates Fenster o. ä. */
  }
}

export class ApiFehler extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiFehler";
  }
}

export async function api<T>(pfad: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const code = zugangscodeLesen();
  if (code) headers.set("x-zugangscode", code);
  if (init.body && typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(pfad, { ...init, headers });
  if (!res.ok) {
    let text = res.statusText;
    try {
      const j = (await res.json()) as { fehler?: string };
      if (j.fehler) text = j.fehler;
    } catch {
      /* kein JSON */
    }
    throw new ApiFehler(text, res.status);
  }
  return (await res.json()) as T;
}

export async function apiDatei(pfad: string, init: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(init.headers);
  const code = zugangscodeLesen();
  if (code) headers.set("x-zugangscode", code);
  if (init.body && typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(pfad, { ...init, headers });
  if (!res.ok) {
    let text = res.statusText;
    try {
      const j = (await res.json()) as { fehler?: string };
      if (j.fehler) text = j.fehler;
    } catch {
      /* kein JSON */
    }
    throw new ApiFehler(text, res.status);
  }
  return res.blob();
}

export interface ServerStatus {
  kiVerfuegbar: boolean;
  modell: string;
  zugangNoetig: boolean;
  zugangOk: boolean;
  version: string;
}

export function serverStatus(): Promise<ServerStatus> {
  return api<ServerStatus>("/api/status");
}

/** Blob im Browser als Datei speichern. */
export function herunterladen(blob: Blob, dateiname: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
