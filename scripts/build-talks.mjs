#!/usr/bin/env node
// Builds every deck in talks/<slug>/ into public/talks/<slug>/ BEFORE astro build,
// so Astro copies the finished decks into dist/ like any other static file.
// See scripts/talks.mjs for how a deck's engine is picked.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, OUT_DIR, TALKS_DIR, findDecks, slidevUsesHashRouter } from './talks.mjs'

const MARP_THEME = path.join(ROOT, 'src', 'styles', 'marp-theme.css')
const bin = (name) => path.join(ROOT, 'node_modules', '.bin', name)

/** Copy a deck folder's other files (images, fonts...) next to the built deck. */
function copyAssets(dir, out, skip) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.includes(entry.name)) continue
        fs.cpSync(path.join(dir, entry.name), path.join(out, entry.name), { recursive: true })
    }
}

function buildMarp({ dir }, out) {
    execFileSync(bin('marp'), [
        '--no-stdin',
        '--html',
        '--theme-set', MARP_THEME,
        '--output', path.join(out, 'index.html'),
        path.join(dir, 'slides.md'),
    ], { stdio: ['ignore', 'inherit', 'inherit'] })
    copyAssets(dir, out, ['slides.md'])
}

function buildSlidev({ slug, dir }, out) {
    // GitHub Pages has no SPA fallback, so /talks/<slug>/3 would 404: decks must use the hash router.
    if (!slidevUsesHashRouter(dir)) {
        throw new Error(`talks/${slug}/slides.md: add \`routerMode: hash\` to the front matter (GitHub Pages can't serve Slidev's history routes)`)
    }
    execFileSync(path.join(TALKS_DIR, 'node_modules', '.bin', 'slidev'), [
        'build', 'slides.md',
        '--base', `/talks/${slug}/`,
        '--out', out,
    ], { cwd: dir, stdio: ['ignore', 'inherit', 'inherit'] })
}

function buildHtml({ dir }, out) {
    copyAssets(dir, out, [])
}

const builders = { marp: buildMarp, slidev: buildSlidev, html: buildHtml }

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const decks = findDecks()
for (const deck of decks) {
    const out = path.join(OUT_DIR, deck.slug)
    fs.mkdirSync(out, { recursive: true })
    console.log(`[talks] ${deck.slug} (${deck.engine})`)
    builders[deck.engine](deck, out)
    if (!fs.existsSync(path.join(out, 'index.html'))) {
        throw new Error(`[talks] ${deck.slug}: no index.html was produced`)
    }
}
console.log(`[talks] ${decks.length} deck(s) built into public/talks/`)
