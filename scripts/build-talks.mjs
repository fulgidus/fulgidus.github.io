#!/usr/bin/env node
// Builds every deck in talks/<slug>/ into public/talks/<slug>/ BEFORE astro build,
// so Astro copies the finished decks into dist/ like any other static file.
// See scripts/talks.mjs for how a deck's engine is picked.
//
// Besides the deck itself (index.html) it exports the downloads listed in
// public/talks/<slug>/downloads.json, which the post page shows under the deck:
//   Marp    HTML, PDF, PPTX in light and dark, plus the .md source
//   Slidev  PDF, PPTX in light and dark, plus the .md source
//   HTML    the deck as a single .html file
// PDF/PPTX need a Chrome/Chromium: CHROME_PATH, else the usual install paths.
// `--no-export` (used by `pnpm dev`) builds only the decks, without PDF/PPTX.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, OUT_DIR, TALKS_DIR, findDecks, slidevUsesHashRouter } from './talks.mjs'

const MARP_THEME = path.join(ROOT, 'src', 'styles', 'marp-theme.css')
const EXPORT = !process.argv.includes('--no-export')
const bin = (name) => path.join(ROOT, 'node_modules', '.bin', name)
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts })

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/opt/pw-browsers/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ]
    for (const c of candidates) {
        if (!c || !fs.existsSync(c)) continue
        // a directory (e.g. a Playwright browser folder): look for the binary inside
        if (fs.statSync(c).isDirectory()) {
            for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome']) {
                if (fs.existsSync(path.join(c, sub))) return path.join(c, sub)
            }
            continue
        }
        return c
    }
    throw new Error('[talks] no Chrome/Chromium found for the PDF/PPTX exports: set CHROME_PATH, or run with --no-export')
}

/** Copy a deck folder's other files (images, fonts...) next to the built deck. */
function copyAssets(dir, out, skip) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.includes(entry.name) || entry.name.startsWith('.')) continue
        fs.cpSync(path.join(dir, entry.name), path.join(out, entry.name), { recursive: true })
    }
}

/** The same markdown with `class: invert` added to its front matter: Marp's dark variant. */
function marpDark(md) {
    const fm = md.match(/^---\r?\n[\s\S]*?\r?\n---/)
    if (fm && /^class:/m.test(fm[0])) {
        return md.replace(fm[0], fm[0].replace(/^class:\s*(.*)$/m, (_, c) => `class: ${c} invert`))
    }
    return md.replace(/^---\r?\n/, '---\nclass: invert\n')
}

// Injected in the Marp deck page: follows the site theme (same localStorage key as the site's
// useDark, else prefers-color-scheme), before the first paint and live when the theme changes.
const MARP_THEME_SYNC = `<style>html.site-dark,html.site-dark body{background:#0d1117!important}</style>
<script>(function(){
var d=document.documentElement;
function dark(){var s=null;try{s=localStorage.getItem('vueuse-color-scheme')}catch(e){}
return s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)}
function apply(){var on=dark();d.classList.toggle('site-dark',on);
var ss=document.querySelectorAll('section');for(var i=0;i<ss.length;i++)ss[i].classList.toggle('invert',on)}
apply();addEventListener('storage',apply);matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply)})()</script>`

/** Make the deck page follow the site theme: dark = Marp's invert class on every slide. */
function syncMarpTheme(file) {
    const html = fs.readFileSync(file, 'utf-8')
    if (!html.includes('</body>')) throw new Error(`[talks] ${file}: no </body> to inject the theme sync into`)
    fs.writeFileSync(file, html.replace('</body>', `${MARP_THEME_SYNC}</body>`))
}

function marp(input, output, extra = []) {
    run(bin('marp'), ['--no-stdin', '--html', '--allow-local-files', '--theme-set', MARP_THEME, ...extra, '--output', output, input])
}

function buildMarp({ slug, dir }, out, downloads) {
    const src = path.join(dir, 'slides.md')
    // the dark copy sits next to the source so relative image paths still resolve; removed right after
    const dark = path.join(dir, '.slides.dark.md')
    fs.writeFileSync(dark, marpDark(fs.readFileSync(src, 'utf-8')))
    try {
        marp(src, path.join(out, 'index.html'))
        // the light .html download is the plain deck; the page embedded in the post follows the site theme
        fs.copyFileSync(path.join(out, 'index.html'), path.join(out, `${slug}.html`))
        syncMarpTheme(path.join(out, 'index.html'))
        marp(dark, path.join(out, `${slug}-dark.html`))
        downloads.push({ type: 'html', variant: 'light', file: `${slug}.html` }, { type: 'html', variant: 'dark', file: `${slug}-dark.html` })
        if (EXPORT) {
            const browser = ['--browser-path', findChrome()]
            for (const type of ['pdf', 'pptx']) {
                marp(src, path.join(out, `${slug}.${type}`), [`--${type}`, ...browser])
                marp(dark, path.join(out, `${slug}-dark.${type}`), [`--${type}`, ...browser])
                downloads.push({ type, variant: 'light', file: `${slug}.${type}` }, { type, variant: 'dark', file: `${slug}-dark.${type}` })
            }
        }
    } finally {
        fs.rmSync(dark, { force: true })
    }
    fs.copyFileSync(src, path.join(out, `${slug}.md`))
    downloads.push({ type: 'md', file: `${slug}.md` })
    copyAssets(dir, out, ['slides.md'])
}

function buildSlidev({ slug, dir }, out, downloads) {
    // GitHub Pages has no SPA fallback, so /talks/<slug>/3 would 404: decks must use the hash router.
    if (!slidevUsesHashRouter(dir)) {
        throw new Error(`talks/${slug}/slides.md: add \`routerMode: hash\` to the front matter (GitHub Pages can't serve Slidev's history routes)`)
    }
    const slidev = path.join(TALKS_DIR, 'node_modules', '.bin', 'slidev')
    run(slidev, ['build', 'slides.md', '--base', `/talks/${slug}/`, '--out', out], { cwd: dir })
    if (EXPORT) {
        const browser = ['--executable-path', findChrome()]
        for (const format of ['pdf', 'pptx']) {
            run(slidev, ['export', 'slides.md', '--format', format, '--output', path.join(out, `${slug}.${format}`), ...browser], { cwd: dir })
            run(slidev, ['export', 'slides.md', '--format', format, '--dark', '--output', path.join(out, `${slug}-dark.${format}`), ...browser], { cwd: dir })
            downloads.push({ type: format, variant: 'light', file: `${slug}.${format}` }, { type: format, variant: 'dark', file: `${slug}-dark.${format}` })
        }
    }
    fs.copyFileSync(path.join(dir, 'slides.md'), path.join(out, `${slug}.md`))
    downloads.push({ type: 'md', file: `${slug}.md` })
}

function buildHtml({ slug, dir }, out, downloads) {
    copyAssets(dir, out, [])
    downloads.push({ type: 'html', file: 'index.html', name: `${slug}.html` })
}

const builders = { marp: buildMarp, slidev: buildSlidev, html: buildHtml }

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const decks = findDecks()
for (const deck of decks) {
    const out = path.join(OUT_DIR, deck.slug)
    fs.mkdirSync(out, { recursive: true })
    console.log(`[talks] ${deck.slug} (${deck.engine})`)
    const downloads = []
    builders[deck.engine](deck, out, downloads)
    for (const d of downloads) {
        const file = path.join(out, d.file)
        if (!fs.existsSync(file)) throw new Error(`[talks] ${deck.slug}: ${d.file} was not produced`)
        d.size = fs.statSync(file).size
    }
    if (!fs.existsSync(path.join(out, 'index.html'))) {
        throw new Error(`[talks] ${deck.slug}: no index.html was produced`)
    }
    fs.writeFileSync(path.join(out, 'downloads.json'), JSON.stringify(downloads, null, 2))
}
console.log(`[talks] ${decks.length} deck(s) built into public/talks/${EXPORT ? '' : ' (no PDF/PPTX: --no-export)'}`)
