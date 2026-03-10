/**
 * Client-side SplatHash decoder.
 *
 * Finds all <img data-splat="..."> elements, decodes the 16-byte base64 hash
 * into a 32x32 blurry RGBA image via canvas, and sets it as the background-image.
 * Runs on DOMContentLoaded and astro:page-load (View Transitions).
 *
 * This is a self-contained inline script — no imports.
 * ~3KB minified, ~1.5KB gzipped.
 */

// --- Minimal SplatHash decode (ported from splathash-ts) ---
const W = 32;
const SIGMA_TABLE = [0.025, 0.1, 0.2, 0.35];
const GAUSS_TABLE_MAX = 1923;

// Pre-compute LUTs
const gaussLUT: Float64Array[] = [];
const kernelHW: number[] = [0, 0, 0, 0];
const gaussKernel1D: Float64Array[] = [];
const linToSrgbLUT = new Float64Array(1024);

(function initLUTs() {
  const W2 = W * W;
  for (let si = 0; si < 4; si++) {
    const sigma = SIGMA_TABLE[si];
    const scale2 = 2 * sigma * sigma * W2;
    const lut = new Float64Array(GAUSS_TABLE_MAX);
    for (let dsq = 0; dsq < GAUSS_TABLE_MAX; dsq++) {
      let v = Math.exp(-dsq / scale2);
      if (v < 1e-7) v = 0;
      lut[dsq] = v;
    }
    gaussLUT.push(lut);
    let hw = 0;
    for (let d = 0; d < W; d++) {
      if (lut[d * d] < 1e-7) break;
      hw = d;
    }
    kernelHW[si] = hw;
    const kern = new Float64Array(hw + 1);
    for (let d = 0; d <= hw; d++) kern[d] = lut[d * d];
    gaussKernel1D.push(kern);
  }
  for (let i = 0; i < 1024; i++) {
    const c = i / 1023;
    linToSrgbLUT[i] =
      c <= 0.0031308
        ? 12.92 * c
        : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
})();

function linToSrgbFast(c: number): number {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return linToSrgbLUT[Math.round(c * 1023)];
}

function sigmaIndex(sigma: number): number {
  let si = 0;
  let minD = Math.abs(SIGMA_TABLE[0] - sigma);
  for (let i = 1; i < 4; i++) {
    const d = Math.abs(SIGMA_TABLE[i] - sigma);
    if (d < minD) {
      minD = d;
      si = i;
    }
  }
  return si;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// BitReader for unpacking the 16-byte hash
class BitReader {
  private pos = 0;
  private rem = 0;
  private curr = 0;
  constructor(private data: Uint8Array) {}
  read(bits: number): number {
    let val = 0;
    let left = bits;
    while (left > 0) {
      if (this.rem === 0) {
        if (this.pos >= this.data.length) return val << left;
        this.curr = this.data[this.pos++];
        this.rem = 8;
      }
      const take = Math.min(this.rem, left);
      const shift = this.rem - take;
      val = (val << take) | ((this.curr >> shift) & ((1 << take) - 1));
      this.rem -= take;
      left -= take;
    }
    return val;
  }
}

function unquant(v: number, min: number, max: number, bits: number): number {
  return (v / ((1 << bits) - 1)) * (max - min) + min;
}

interface Splat {
  x: number;
  y: number;
  sigma: number;
  l: number;
  a: number;
  b: number;
}

function decodeSplatHash(hash: Uint8Array): Uint8ClampedArray {
  const br = new BitReader(hash);
  // Unpack mean
  const p = br.read(16);
  const meanL = ((p >> 10) & 63) / 63;
  const meanA = ((p >> 5) & 31) / 31 * 0.4 - 0.2;
  const meanB = (p & 31) / 31 * 0.4 - 0.2;

  const splats: Splat[] = [];
  // 3 baryons (full color)
  for (let i = 0; i < 3; i++) {
    const xi = br.read(4);
    const yi = br.read(4);
    const sigI = br.read(2);
    const lQ = br.read(4);
    const aQ = br.read(4);
    const bQ = br.read(4);
    if (xi === 0 && yi === 0 && lQ === 0 && aQ === 0 && bQ === 0) continue;
    splats.push({
      x: xi / 15, y: yi / 15,
      sigma: SIGMA_TABLE[sigI],
      l: unquant(lQ, -0.8, 0.8, 4),
      a: unquant(aQ, -0.4, 0.4, 4),
      b: unquant(bQ, -0.4, 0.4, 4),
    });
  }
  // 3 leptons (luminance only)
  for (let i = 0; i < 3; i++) {
    const xi = br.read(4);
    const yi = br.read(4);
    const sigI = br.read(2);
    const lQ = br.read(5);
    if (xi === 0 && yi === 0 && lQ === 0) continue;
    splats.push({
      x: xi / 15, y: yi / 15,
      sigma: SIGMA_TABLE[sigI],
      l: unquant(lQ, -0.8, 0.8, 5),
      a: 0, b: 0,
    });
  }

  // Render to 32x32 OkLab grid
  const grid = new Float64Array(W * W * 3);
  for (let i = 0; i < grid.length; i += 3) {
    grid[i] = meanL;
    grid[i + 1] = meanA;
    grid[i + 2] = meanB;
  }
  for (const s of splats) {
    const si = sigmaIndex(s.sigma);
    const hw = kernelHW[si];
    const cx = Math.floor(s.x * W);
    const cy = Math.floor(s.y * W);
    const y0 = clamp(cy - hw, 0, W - 1);
    const y1 = clamp(cy + hw, 0, W - 1);
    const x0 = clamp(cx - hw, 0, W - 1);
    const x1 = clamp(cx + hw, 0, W - 1);
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dsq = dx * dx + dy * dy;
        if (dsq >= GAUSS_TABLE_MAX) continue;
        const wVal = gaussLUT[si][dsq];
        if (wVal === 0) continue;
        const idx = (y * W + x) * 3;
        grid[idx] += s.l * wVal;
        grid[idx + 1] += s.a * wVal;
        grid[idx + 2] += s.b * wVal;
      }
    }
  }

  // OkLab → sRGB RGBA
  const rgba = new Uint8ClampedArray(W * W * 4);
  for (let i = 0; i < W * W; i++) {
    const idx = i * 3;
    const L = grid[idx], A = grid[idx + 1], B = grid[idx + 2];
    const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
    const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
    const s_ = L - 0.0894841775 * A - 1.291485548 * B;
    const r = 4.0767416621 * l_ * l_ * l_ - 3.3077115913 * m_ * m_ * m_ + 0.2309699292 * s_ * s_ * s_;
    const g = -1.2684380046 * l_ * l_ * l_ + 2.6097574011 * m_ * m_ * m_ - 0.3413193965 * s_ * s_ * s_;
    const b = -0.0041960863 * l_ * l_ * l_ - 0.7034186147 * m_ * m_ * m_ + 1.707614701 * s_ * s_ * s_;
    const pi = i * 4;
    rgba[pi] = Math.round(linToSrgbFast(r) * 255 + 0.5);
    rgba[pi + 1] = Math.round(linToSrgbFast(g) * 255 + 0.5);
    rgba[pi + 2] = Math.round(linToSrgbFast(b) * 255 + 0.5);
    rgba[pi + 3] = 255;
  }
  return rgba;
}

// Shared offscreen canvas for rendering
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = W;
    ctx = canvas.getContext('2d');
  }
  if (!ctx) return null;
  return { canvas, ctx };
}

/**
 * Set a blob: URL as the background-image on an element.
 * Uses canvas.toBlob() to avoid base64 data URIs entirely.
 */
function setBlobBackground(img: HTMLImageElement, c: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }) {
  c.canvas.toBlob(function (blob) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    img.style.backgroundImage = 'url(' + url + ')';
    img.style.backgroundSize = 'cover';
    img.style.backgroundRepeat = 'no-repeat';

    // Revoke the blob URL and clean up after real image loads
    img.addEventListener(
      'load',
      function () {
        URL.revokeObjectURL(url);
        img.style.backgroundImage = '';
        img.style.backgroundColor = '';
        img.removeAttribute('data-splat');
      },
      { once: true },
    );
  });
}

function processImages() {
  const imgList = document.querySelectorAll<HTMLImageElement>('img[data-splat]');
  if (imgList.length === 0) return;

  const c = getCanvas();
  if (!c) return;

  const imgs = Array.from(imgList);
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const hashStr = img.getAttribute('data-splat');
    if (!hashStr) continue;

    // If image is already loaded, no need for placeholder
    if (img.complete && img.naturalWidth > 0) {
      img.removeAttribute('data-splat');
      img.style.backgroundImage = '';
      img.style.backgroundColor = '';
      continue;
    }

    try {
      // Decode base64 → Uint8Array
      const binary = atob(hashStr);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);

      // Decode hash → 32x32 RGBA
      const rgba = decodeSplatHash(bytes);

      // Render to canvas, then set as blob: URL background
      const imageData = new ImageData(rgba, W, W);
      c.ctx.putImageData(imageData, 0, 0);
      setBlobBackground(img, c);
    } catch {
      // Silently fail — avg color fallback remains
    }
  }
}

// Run on initial load and on View Transitions navigation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processImages);
} else {
  processImages();
}
document.addEventListener('astro:page-load', processImages);
