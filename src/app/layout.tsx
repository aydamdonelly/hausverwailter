import type { Metadata } from "next";
import "./globals.css";
import { sourceSans, vollkorn } from "./fonts";
import { Navigation } from "@/components/Navigation";
import { Zugang } from "@/components/Zugang";
import { StempelFilter } from "@/components/ui/Stempel";

export const metadata: Metadata = {
  title: "Hausverwailter",
  description: "Belege, Bank, Angebote und Rechnungen einer Hausverwaltung: gelesen, geprüft, gebucht.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${vollkorn.variable} ${sourceSans.variable}`}>
      <body>
        <StempelFilter />
        <Navigation />
        <Zugang>
          <main className="mx-auto max-w-[1280px] px-6 py-8">{children}</main>
        </Zugang>
      </body>
    </html>
  );
}
