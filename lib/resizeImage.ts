/**
 * Center-crops an image file to a square and re-encodes it small enough to keep
 * Supabase storage and egress negligible (~20–40 KB at 256px).
 * Falls back to JPEG on browsers that cannot encode WebP (older Safari).
 */
export async function resizeImageToSquare(
  file: File,
  size: number,
  quality = 0.8
): Promise<Blob> {
  const bitmap = await loadImage(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot process images.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  if ("close" in bitmap) bitmap.close();

  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("Could not encode the image.");
  return jpeg;
}

/**
 * Scales an image down (never up) so its longest side is at most `maxSide`,
 * keeping the whole picture. Used for ID card photos, where nothing may be cropped.
 */
export async function resizeImageToFit(
  file: File,
  maxSide: number,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot process images.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  // JPEG keeps card text legible at a predictable size on every browser.
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("Could not encode the image.");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // Honors EXIF rotation so phone photos aren't sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img> decoding.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("That file is not an image this browser can read.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
