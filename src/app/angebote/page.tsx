import { Suspense } from "react";
import { AngeboteSeite } from "@/components/angebote/AngeboteSeite";

export default function Seite() {
  return (
    <Suspense fallback={null}>
      <AngeboteSeite />
    </Suspense>
  );
}
