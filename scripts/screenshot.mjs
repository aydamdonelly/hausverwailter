#!/usr/bin/env node
/**
 * Screenshot einer Seite der laufenden App (Dev-Server auf http://localhost:3000).
 *   node scripts/screenshot.mjs http://localhost:3000/bank aus.png [--beispiel] [--breite 1280] [--voll]
 * --beispiel lädt vorher den Beispielbetrieb (klickt auf der Startseite den Knopf), damit die
 * Seite nicht leer ist. Nutzt Google Chrome oder das Chromium aus dem Playwright-Cache.
 */
import { chromium } from "playwright-core";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const url = args[0];
const out = args[1] ?? "screenshot.png";
const breite = Number(args[args.indexOf("--breite") + 1] || 1280) || 1280;
const voll = args.includes("--voll");
const beispiel = args.includes("--beispiel");
if (!url) {
  console.error("Aufruf: node scripts/screenshot.mjs <url> <datei.png> [--beispiel] [--breite N] [--voll]");
  process.exit(1);
}

function chromePfad() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const kandidaten = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  for (const k of kandidaten) if (existsSync(k)) return k;
  const caches = [path.join(homedir(), "Library/Caches/ms-playwright"), path.join(homedir(), ".cache/ms-playwright")];
  for (const c of caches) {
    if (!existsSync(c)) continue;
    const dirs = readdirSync(c).filter((d) => d.startsWith("chromium-")).sort().reverse();
    for (const d of dirs) {
      for (const rel of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        const p = path.join(c, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("Kein Chrome/Chromium gefunden. CHROME_BIN setzen.");
}

const browser = await chromium.launch({ executablePath: chromePfad(), headless: true });
const context = await browser.newContext({ viewport: { width: breite, height: 900 }, locale: "de-DE" });
const page = await context.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
const basis = new URL(url).origin;
if (beispiel) {
  await page.goto(`${basis}/`, { waitUntil: "networkidle" });
  const knopf = page.getByRole("button", { name: /Beispielbetrieb laden/ });
  if (await knopf.count()) {
    await knopf.first().click();
    await page.waitForTimeout(2500);
  }
}
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: voll });
console.log(`Screenshot: ${out}`);
if (fehler.length) console.log("Konsolenfehler:\n" + fehler.map((f) => `  - ${f}`).join("\n"));
await browser.close();
