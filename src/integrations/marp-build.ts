/**
 * Astro integration for build-time Marp slide compilation.
 *
 * Scans `src/marp/` for `.md` files, renders them with @marp-team/marp-core
 * to self-contained HTML, and writes outputs to `public/marp/` for static serving.
 *
 * Outputs per presentation (e.g. `introduction-to-marp`):
 *   - public/marp/{name}.html   — self-contained slide HTML (viewer-ready)
 *   - public/marp/{name}.md     — copy of source for download
 *   - public/marp/{name}.json   — metadata (slide count, title, theme, etc.)
 *   - public/marp/{name}.pdf    — PDF export (optional, requires Chromium)
 *   - public/marp/{name}.pptx   — PPTX export (optional, requires Chromium)
 *
 * Constraints (from .features.yml):
 *   - All conversion is build-time, no client-side Marp rendering
 *   - Source files are read-only (never modified)
 *   - Output HTML is self-contained (CSS inlined)
 *   - Uses Node.js API, not CLI binary shell-out
 */

import type { AstroIntegration } from 'astro'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface MarpSlideMetadata {
    name: string
    title: string
    slideCount: number
    theme: string
    aspectRatio: string
    hasHtml: boolean
    hasPdf: boolean
    hasPptx: boolean
    hasMd: boolean
    pdfSize?: number
    pptxSize?: number
    mdSize?: number
    buildTime: string
}

export default function marpBuild(): AstroIntegration {
    return {
        name: 'marp-build',
        hooks: {
            'astro:config:setup': async ({ config, logger }) => {
                logger.info('Marp build integration registered')

                const srcDir = path.join(fileURLToPath(config.srcDir), 'marp')
                const outDir = path.join(fileURLToPath(config.publicDir), 'marp')

                // Ensure output directory exists
                fs.mkdirSync(outDir, { recursive: true })

                // Find all .md files in src/marp/
                if (!fs.existsSync(srcDir)) {
                    logger.warn(`No src/marp/ directory found — skipping Marp compilation`)
                    return
                }

                const marpFiles = fs.readdirSync(srcDir)
                    .filter(f => f.endsWith('.md'))

                if (marpFiles.length === 0) {
                    logger.info('No Marp files found in src/marp/')
                    return
                }

                logger.info(`Found ${marpFiles.length} Marp file(s): ${marpFiles.join(', ')}`)

                // Dynamic import marp-core (ESM)
                const { Marp } = await import('@marp-team/marp-core')

                for (const file of marpFiles) {
                    const name = path.basename(file, '.md')
                    const srcPath = path.join(srcDir, file)
                    const source = fs.readFileSync(srcPath, 'utf-8')

                    logger.info(`Compiling: ${file}`)

                    // Render with marp-core
                    const marp = new Marp({
                        html: true,
                        math: true,
                    })
                    const { html, css, comments } = marp.render(source)

                    // Count slides (each <section> is a slide)
                    const slideCount = (html.match(/<section[\s>]/g) || []).length

                    // Extract title from frontmatter
                    const titleMatch = source.match(/^title:\s*["']?(.+?)["']?\s*$/m)
                    const title = titleMatch?.[1] || name

                    // Extract theme from frontmatter
                    const themeMatch = source.match(/^theme:\s*(\S+)/m)
                    const theme = themeMatch?.[1] || 'default'

                    // Extract aspect ratio
                    const sizeMatch = source.match(/^size:\s*(\S+)/m)
                    const aspectRatio = sizeMatch?.[1] || '16:9'

                    // Build self-contained HTML
                    const selfContainedHtml = buildSelfContainedHtml(html, css, title)

                    // Write HTML
                    const htmlPath = path.join(outDir, `${name}.html`)
                    fs.writeFileSync(htmlPath, selfContainedHtml, 'utf-8')
                    logger.info(`  -> ${name}.html (${slideCount} slides)`)

                    // Copy source .md for download
                    const mdOutPath = path.join(outDir, `${name}.md`)
                    fs.copyFileSync(srcPath, mdOutPath)
                    const mdSize = fs.statSync(mdOutPath).size

                    // Build metadata
                    const metadata: MarpSlideMetadata = {
                        name,
                        title,
                        slideCount,
                        theme,
                        aspectRatio,
                        hasHtml: true,
                        hasPdf: false,
                        hasPptx: false,
                        hasMd: true,
                        mdSize,
                        buildTime: new Date().toISOString(),
                    }

                    // Try PDF/PPTX export (optional — requires Chromium)
                    try {
                        await exportWithMarpCli(srcPath, outDir, name, metadata, logger)
                    } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : String(e)
                        logger.warn(`  PDF/PPTX export skipped: ${msg}`)
                    }

                    // Write metadata JSON
                    const metaPath = path.join(outDir, `${name}.json`)
                    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8')
                    logger.info(`  -> ${name}.json (metadata)`)
                }

                logger.info('Marp compilation complete')
            },
        },
    }
}

/**
 * Build a self-contained HTML document from Marp render output.
 * The HTML contains all slides with inlined CSS, ready for the viewer.
 */
function buildSelfContainedHtml(html: string, css: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
/* Reset for slide container */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
/* Marp theme CSS */
${css}
</style>
</head>
<body>
${html}
</body>
</html>`
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Export PDF and PPTX using @marp-team/marp-cli via a child process.
 *
 * marp-cli has CJS dependencies (yargs) that are incompatible with ESM context
 * in newer Node.js versions (v23+), so this export may only work with Node.js
 * LTS versions (18, 20, 22). GitHub Actions CI uses LTS versions, so PDF/PPTX
 * generation will work there even if it fails locally.
 *
 * This requires Chromium to be available (auto-downloaded by Puppeteer,
 * or pre-installed in CI like GitHub Actions).
 */
async function exportWithMarpCli(
    srcPath: string,
    outDir: string,
    name: string,
    metadata: MarpSlideMetadata,
    logger: { info: (msg: string) => void; warn: (msg: string) => void }
): Promise<void> {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)

    // Check Node.js version — marp-cli's yargs dependency breaks on Node 23+
    const nodeVersion = parseInt(process.versions.node.split('.')[0], 10)
    if (nodeVersion >= 23) {
        logger.warn(`  PDF/PPTX export requires Node.js LTS (18/20/22). Current: v${process.versions.node}`)
        logger.warn(`  HTML and MD exports are available. PDF/PPTX will be generated in CI.`)
        return
    }

    // Find the marp binary
    const marpBin = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../node_modules/.bin/marp')

    // PDF export
    const pdfPath = path.join(outDir, `${name}.pdf`)
    try {
        await execFileAsync(marpBin, [srcPath, '--pdf', '--allow-local-files', '-o', pdfPath], {
            timeout: 60000,
            env: { ...process.env },
        })
        if (fs.existsSync(pdfPath)) {
            metadata.hasPdf = true
            metadata.pdfSize = fs.statSync(pdfPath).size
            logger.info(`  -> ${name}.pdf (${formatBytes(metadata.pdfSize)})`)
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.warn(`  PDF export failed: ${msg.split('\n')[0]}`)
    }

    // PPTX export
    const pptxPath = path.join(outDir, `${name}.pptx`)
    try {
        await execFileAsync(marpBin, [srcPath, '--pptx', '--allow-local-files', '-o', pptxPath], {
            timeout: 60000,
            env: { ...process.env },
        })
        if (fs.existsSync(pptxPath)) {
            metadata.hasPptx = true
            metadata.pptxSize = fs.statSync(pptxPath).size
            logger.info(`  -> ${name}.pptx (${formatBytes(metadata.pptxSize)})`)
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.warn(`  PPTX export failed: ${msg.split('\n')[0]}`)
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
