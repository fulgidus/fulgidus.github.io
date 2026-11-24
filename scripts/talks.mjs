// Slide decks: one folder per deck in talks/<slug>/, published at /talks/<slug>/.
//
//   talks/<slug>/index.html   ready-made deck, copied as is
//   talks/<slug>/slides.md    Marp if its front matter has `marp: true`, Slidev otherwise
//
// Shared by scripts/build-talks.mjs (which builds them) and the post page
// (which needs the engine to drive the deck from the SlideDock).
import fs from 'node:fs'
import path from 'node:path'

// Run from the repo root (pnpm scripts, astro build), so cwd is the root.
export const ROOT = process.cwd()
export const TALKS_DIR = path.join(ROOT, 'talks')
export const OUT_DIR = path.join(ROOT, 'public', 'talks')

/** Front matter block at the top of a markdown file, as raw text. */
function frontMatter(md) {
    const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    return m ? m[1] : ''
}

/** 'html' | 'marp' | 'slidev' | null for a deck folder. */
export function detectEngine(dir) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return 'html'
    const slides = path.join(dir, 'slides.md')
    if (!fs.existsSync(slides)) return null
    const fm = frontMatter(fs.readFileSync(slides, 'utf-8'))
    return /^marp:\s*true\s*$/m.test(fm) ? 'marp' : 'slidev'
}

/** Every deck in talks/, as { slug, dir, engine }. */
export function findDecks() {
    if (!fs.existsSync(TALKS_DIR)) return []
    return fs.readdirSync(TALKS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.'))
        .map((e) => {
            const dir = path.join(TALKS_DIR, e.name)
            return { slug: e.name, dir, engine: detectEngine(dir) }
        })
        .filter((d) => d.engine !== null)
}

/** Engine of the deck published at a /talks/<slug>/ URL, or null if it isn't one. */
export function engineForUrl(url) {
    const m = String(url).match(/^\/talks\/([^/#?]+)/)
    return m ? detectEngine(path.join(TALKS_DIR, m[1])) : null
}

/** True when a Slidev deck's front matter sets `routerMode: hash`. */
export function slidevUsesHashRouter(dir) {
    const fm = frontMatter(fs.readFileSync(path.join(dir, 'slides.md'), 'utf-8'))
    return /^routerMode:\s*['"]?hash['"]?\s*$/m.test(fm)
}
