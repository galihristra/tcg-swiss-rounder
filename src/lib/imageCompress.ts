export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Resize + re-encode an image file as JPEG entirely client-side via <canvas>,
 * to keep uploads small against Supabase's free-tier storage/egress budget.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<Blob> {
  const { maxDimension = 1600, quality = 0.8 } = opts;
  const bitmap = await loadBitmap(file);
  const { width, height } = fitWithin(
    bitmap.width,
    bitmap.height,
    maxDimension,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Image compression failed')),
      'image/jpeg',
      quality,
    );
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  // Fallback for browsers without createImageBitmap (older Safari).
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = URL.createObjectURL(file);
  });
}

function fitWithin(
  w: number,
  h: number,
  max: number,
): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = w > h ? max / w : max / h;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
