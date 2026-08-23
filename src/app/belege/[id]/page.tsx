import { BelegAnsicht } from "@/components/BelegAnsicht";

export default async function Seite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BelegAnsicht dokumentId={id} />;
}
