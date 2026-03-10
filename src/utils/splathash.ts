/**
 * SplatHash utilities for generating blur placeholders at build time.
 *
 * Uses splathash-ts to encode images into 16-byte hashes. The hash is stored
 * in a `data-splat` attribute and decoded client-side to a 32x32 blur.
 * A CSS background-color (average color) provides a no-JS fallback.
 */
import sharp from 'sharp';
import { encode } from 'splathash-ts';

/** In-memory cache to avoid re-encoding the same image during a single build */
const cache = new Map<string, { hash: string; avgColor: string }>();

/**
 * Extract the average sRGB color from the first 16 bits of a SplatHash.
 * The hash packs OkLab mean as: L(6bit) A(5bit) B(5bit) in the first 2 bytes.
 * We decode OkLab → linear RGB → sRGB to get a CSS hex color.
 */
function extractAvgColor(hash: Uint8Array): string {
  // First 16 bits = packed mean (L:6, A:5, B:5)
  const p = (hash[0] << 8) | hash[1];
  const li = (p >> 10) & 63;
  const ai = (p >> 5) & 31;
  const bi = p & 31;
  const L = li / 63;
  const a = (ai / 31) * 0.4 - 0.2;
  const b = (bi / 31) * 0.4 - 0.2;

  // OkLab → linear RGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // Linear → sRGB
  const toSrgb = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  const r = Math.round(toSrgb(rLin) * 255);
  const g = Math.round(toSrgb(gLin) * 255);
  const bVal = Math.round(toSrgb(bLin) * 255);

  return `#${((1 << 24) | (r << 16) | (g << 8) | bVal).toString(16).slice(1)}`;
}

/**
 * Generate a SplatHash placeholder for an image.
 * @param fsPath Absolute file system path to the image
 * @returns { hash: base64-encoded 16-byte hash, avgColor: CSS hex color }
 */
export async function generatePlaceholder(
  fsPath: string,
): Promise<{ hash: string; avgColor: string }> {
  const cached = cache.get(fsPath);
  if (cached) return cached;

  const { data, info } = await sharp(fsPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hashBytes = encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
  );

  // Base64-encode the 16-byte hash (produces ~24 chars)
  const hash = Buffer.from(hashBytes).toString('base64');
  const avgColor = extractAvgColor(hashBytes);

  const result = { hash, avgColor };
  cache.set(fsPath, result);
  return result;
}
