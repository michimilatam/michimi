"use client";

/**
 * Prepara una foto para subir: acepta HEIC/HEIF de iPhone (que los navegadores no
 * muestran), la convierte a JPEG y la achica a máx. 1600 px por lado (~200–400 KB).
 * Así toda foto publicada se ve en cualquier navegador y carga rápido.
 */
const MAX_SIDE = 1600;
const QUALITY = 0.82;

export function isImageFile(f: File): boolean {
  return f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name);
}

function isHeic(f: File): boolean {
  return /image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
}

async function heicToJpegBlob(f: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: f, toType: "image/jpeg", quality: QUALITY });
  return Array.isArray(out) ? out[0]! : out;
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch { /* fallback */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Devuelve un JPEG listo para subir. Lanza error si el archivo no es una imagen legible. */
export async function prepareImage(f: File): Promise<File> {
  const source: Blob = isHeic(f) ? await heicToJpegBlob(f) : f;
  const bmp = await loadBitmap(source);
  const w = "naturalWidth" in bmp ? bmp.naturalWidth : bmp.width;
  const h = "naturalHeight" in bmp ? bmp.naturalHeight : bmp.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  const name = f.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
