/**
 * Fotos vor dem Upload zurechtmachen: HEIC (iPhone) nach JPEG wandeln, große Bilder auf
 * 2000 px verkleinern. Spart Tokens, umgeht das Body-Limit von Vercel (4,5 MB) und die
 * KI liest ein 2000-px-Foto genauso gut wie ein 12-MP-Original.
 */
export async function bildVorbereiten(datei: File): Promise<File> {
  let quelle: Blob = datei;
  let name = datei.name;
  const istHeic = /\.(heic|heif)$/i.test(datei.name) || datei.type === "image/heic" || datei.type === "image/heif";
  if (istHeic) {
    const heic2any = (await import("heic2any")).default;
    const ergebnis = await heic2any({ blob: datei, toType: "image/jpeg", quality: 0.9 });
    quelle = Array.isArray(ergebnis) ? ergebnis[0] : ergebnis;
    name = name.replace(/\.(heic|heif)$/i, ".jpg");
  }
  if (!quelle.type.startsWith("image/")) return datei;
  const bitmap = await createImageBitmap(quelle);
  const max = 2000;
  const faktor = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (faktor === 1 && quelle.size < 2_500_000 && quelle.type === "image/jpeg") {
    bitmap.close();
    return quelle instanceof File ? quelle : new File([quelle], name, { type: quelle.type });
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * faktor);
  canvas.height = Math.round(bitmap.height * faktor);
  const ctx = canvas.getContext("2d");
  if (!ctx) return datei;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht umgewandelt werden"))), "image/jpeg", 0.88),
  );
  return new File([blob], name.replace(/\.(png|webp|gif|bmp|tiff?)$/i, ".jpg"), { type: "image/jpeg" });
}

export function istBild(datei: File): boolean {
  return datei.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff?)$/i.test(datei.name);
}
