#!/usr/bin/env node
/**
 * Generates PDFs for all CV pages (standard + safe, EN + IT).
 * Reads from dist/ after `pnpm build`, writes PDFs into dist/files/.
 * Uses file:// URLs — CV pages only reference CDN assets, no local deps.
 *
 * Standard: Playwright headless Chromium → print to A4 PDF
 * Safe:     Same, but from the /cv/safe and /it/cv/safe pages (no injection)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

const pages = [
  // Standard CVs (Option B — auto-generated from existing pages)
  {
    src: 'cv/index.html',
    out: 'files/CV-Alessio-Corsi-en-US.pdf',
  },
  {
    src: 'it/cv/index.html',
    out: 'files/it/CV-Alessio-Corsi-it-IT.pdf',
  },
  // Safe CVs (Option C — separate clean source, zero injection)
  {
    src: 'cv/safe/index.html',
    out: 'files/safe/CV-Alessio-Corsi-en-US.pdf',
  },
  {
    src: 'it/cv/safe/index.html',
    out: 'files/it/safe/CV-Alessio-Corsi-it-IT.pdf',
  },
];

const A4 = {
  format: /** @type {const} */ ('A4'),
  margin: { top: '0.75cm', right: '0.75cm', bottom: '0.75cm', left: '0.75cm' },
  printBackground: true,
};

console.log(`📄 Generating CVs from: ${distDir}\n`);

const browser = await chromium.launch();
const context = await browser.newContext();

for (const { src, out } of pages) {
  const srcPath = join(distDir, src);
  if (!existsSync(srcPath)) {
    console.error(`  ✗ Source not found: ${src} — did you run pnpm build first?`);
    process.exitCode = 1;
    continue;
  }

  const outPath = join(distDir, out);
  mkdirSync(dirname(outPath), { recursive: true });

  const page = await context.newPage();
  await page.goto(`file://${srcPath}`, { waitUntil: 'networkidle' });
  await page.pdf({ path: outPath, ...A4 });
  await page.close();

  console.log(`  ✓ ${out}`);
}

await browser.close();
console.log('\nDone.');
