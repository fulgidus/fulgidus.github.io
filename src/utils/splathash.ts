/**
 * SplatHash utilities for generating blur placeholders at build time.
 *
 * Uses splathash-ts to encode images into 16-byte hashes and decode them
 * to 32x32 blurry preview data URIs. The encode step runs at build time
 * via sharp; the decode step also runs at build time to produce inline
 * CSS background data URIs (no client-side JS needed for the placeholder).
 */
import sharp from 'sharp';
import { encode, decode } from 'splathash-ts';

/** In-memory cache to avoid re-encoding the same image during a single build */
const hashCache = new Map<string, Uint8Array>();

/**
 * Encode an image file to a 16-byte SplatHash.
 * @param fsPath Absolute file system path to the image
 * @returns 16-byte Uint8Array hash
 */
export async function encodeSplatHash(fsPath: string): Promise<Uint8Array> {
  const cached = hashCache.get(fsPath);
  if (cached) return cached;

  const { data, info } = await sharp(fsPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hash = encode(new Uint8ClampedArray(data), info.width, info.height);
  hashCache.set(fsPath, hash);
  return hash;
}

/**
 * Decode a 16-byte SplatHash to a base64 PNG data URI (32x32).
 * The PNG is generated server-side via sharp so no client-side decode is needed.
 * @param hash 16-byte SplatHash
 * @returns data:image/png;base64,... string
 */
export async function hashToDataUri(hash: Uint8Array): Promise<string> {
  const { rgba, width, height } = decode(hash);
  const pngBuffer = await sharp(Buffer.from(rgba.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

/**
 * Generate a blur placeholder data URI from an image file path.
 * Combines encode + decode in one call for convenience.
 * @param fsPath Absolute file system path to the image
 * @returns data:image/png;base64,... string for a 32x32 blurry preview
 */
export async function generatePlaceholder(fsPath: string): Promise<string> {
  const hash = await encodeSplatHash(fsPath);
  return hashToDataUri(hash);
}
