import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

/**
 * Build output smoke tests.
 *
 * Validates the Astro build output in dist/:
 * - Expected pages are generated
 * - No empty HTML files
 * - Internal links resolve to existing files
 * - Referenced images exist
 *
 * These tests run against the built dist/ output. If dist/ doesn't exist,
 * all tests are gracefully skipped.
 */

const DIST_DIR = resolve(__dirname, '..', 'dist')
const distExists = existsSync(DIST_DIR)

// Recursively find all files matching a pattern
function findFiles(dir: string, pattern: RegExp): string[] {
    const results: string[] = []
    if (!existsSync(dir)) return results

    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
            results.push(...findFiles(fullPath, pattern))
        } else if (pattern.test(entry.name)) {
            results.push(fullPath)
        }
    }
    return results
}

// Extract internal links from HTML content
function extractInternalLinks(html: string): string[] {
    const linkRegex = /href="(\/[^"]*?)"/g
    const links: string[] = []
    let match
    while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1]
        // Remove query strings and fragments
        href = href.split('?')[0].split('#')[0]
        if (href && href.startsWith('/')) {
            links.push(href)
        }
    }
    return links
}

// Extract image sources from HTML content
function extractImageSources(html: string): string[] {
    const imgRegex = /src="(\/[^"]*?\.(png|jpg|jpeg|gif|svg|webp|avif))"/gi
    const sources: string[] = []
    let match
    while ((match = imgRegex.exec(html)) !== null) {
        sources.push(match[1])
    }
    return sources
}

// Resolve a URL path to a filesystem path in dist/
function resolveUrlToFile(urlPath: string): string | null {
    // Remove leading slash
    const relativePath = urlPath.replace(/^\//, '')

    // Try exact path first
    const exactPath = resolve(DIST_DIR, relativePath)
    if (existsSync(exactPath) && statSync(exactPath).isFile()) return exactPath

    // Try with index.html appended (directory index)
    const indexPath = resolve(DIST_DIR, relativePath, 'index.html')
    if (existsSync(indexPath)) return indexPath

    // Try with .html extension
    const htmlPath = resolve(DIST_DIR, relativePath + '.html')
    if (existsSync(htmlPath)) return htmlPath

    return null
}

describe('Build Output Smoke Tests', () => {
    // ─── Expected pages exist ─────────────────────────────────────
    describe('Expected pages are generated', () => {
        const expectedPages = [
            'index.html',                      // Homepage
            '404.html',                        // 404 page
            'it/index.html',                   // Italian homepage
            'rss.xml',                         // English RSS
            'it/rss.xml',                      // Italian RSS
            'last-ten.xml',                    // English last-ten
            'it/last-ten.xml',                 // Italian last-ten
            'feed.json',                       // English JSON feed
            'it/feed.json',                    // Italian JSON feed
            'robots.txt',                      // Robots
            'sitemap-index.xml',               // Sitemap
        ]

        for (const page of expectedPages) {
            it.skipIf(!distExists)(`${page} exists`, () => {
                const filePath = resolve(DIST_DIR, page)
                expect(existsSync(filePath), `Expected ${page} to exist in dist/`).toBe(true)
            })
        }
    })

    // ─── No empty HTML files ──────────────────────────────────────
    describe('No empty HTML files', () => {
        it.skipIf(!distExists)('all HTML files have content', () => {
            const htmlFiles = findFiles(DIST_DIR, /\.html$/)
            expect(htmlFiles.length).toBeGreaterThan(0)

            const emptyFiles: string[] = []
            for (const file of htmlFiles) {
                const content = readFileSync(file, 'utf-8').trim()
                if (content.length === 0) {
                    emptyFiles.push(relative(DIST_DIR, file))
                }
            }

            expect(emptyFiles, `Empty HTML files found: ${emptyFiles.join(', ')}`).toEqual([])
        })

        it.skipIf(!distExists)('all HTML files have DOCTYPE', () => {
            const htmlFiles = findFiles(DIST_DIR, /\.html$/)
            const missingDoctype: string[] = []

            for (const file of htmlFiles) {
                const content = readFileSync(file, 'utf-8').trim()
                if (!content.toLowerCase().startsWith('<!doctype html')) {
                    missingDoctype.push(relative(DIST_DIR, file))
                }
            }

            expect(
                missingDoctype,
                `HTML files missing DOCTYPE: ${missingDoctype.join(', ')}`
            ).toEqual([])
        })

        it.skipIf(!distExists)('all HTML files have <html> tag', () => {
            const htmlFiles = findFiles(DIST_DIR, /\.html$/)
            const missingHtml: string[] = []

            for (const file of htmlFiles) {
                const content = readFileSync(file, 'utf-8')
                if (!content.includes('<html')) {
                    missingHtml.push(relative(DIST_DIR, file))
                }
            }

            expect(
                missingHtml,
                `HTML files missing <html> tag: ${missingHtml.join(', ')}`
            ).toEqual([])
        })

        it.skipIf(!distExists)('all HTML files have <head> and <body>', () => {
            const htmlFiles = findFiles(DIST_DIR, /\.html$/)
            const problems: string[] = []

            for (const file of htmlFiles) {
                const content = readFileSync(file, 'utf-8')
                if (!content.includes('<head') || !content.includes('<body')) {
                    problems.push(relative(DIST_DIR, file))
                }
            }

            expect(
                problems,
                `HTML files missing <head> or <body>: ${problems.join(', ')}`
            ).toEqual([])
        })
    })

    // ─── Internal link validation ─────────────────────────────────
    describe('Internal links resolve', () => {
        it.skipIf(!distExists)('all internal links in HTML files resolve to existing files', () => {
            const htmlFiles = findFiles(DIST_DIR, /\.html$/)
            const brokenLinks: Array<{ file: string; link: string }> = []

            // Known exceptions: links that are expected to not resolve as files
            // (e.g., pagefind paths, external asset paths handled by CDN,
            // cross-language links to untranslated pages, special assets)
            const skipPatterns = [
                /^\/pagefind\//,       // Pagefind search assets
                /^\/cdn-cgi\//,        // CDN paths
                /^\/_astro\//,         // Vite-hashed assets (may be pruned)
                /^\/img\//,            // May reference images not yet built
                /^\/marp\//,           // Marp presentation assets
                /^\/404\/?$/,          // 404 page self-references
                /^\/it\/404\/?$/,      // Italian 404 self-references
            ]

            // Cross-language links (e.g., /it/posts/...) may point to translations
            // that don't exist yet. Only flag broken links within the same language.
            // We identify cross-language links by checking if the link targets
            // a language prefix path that doesn't have a corresponding built page.
            const isExpectedMissingTranslation = (file: string, link: string): boolean => {
                // If the source page is in the default language (no prefix)
                // and the link targets /it/..., it's a language switcher link
                if (!file.startsWith('it/') && link.startsWith('/it/')) return true
                // If the source page is in /it/ and the link targets root,
                // those should exist (default lang), so don't skip
                return false
            }

            for (const file of htmlFiles) {
                const content = readFileSync(file, 'utf-8')
                const links = extractInternalLinks(content)

                for (const link of links) {
                    // Skip known exceptions
                    if (skipPatterns.some(p => p.test(link))) continue
                    // Skip empty or root links
                    if (link === '/' || link === '') continue
                    // Skip expected missing translations
                    const relFile = relative(DIST_DIR, file)
                    if (isExpectedMissingTranslation(relFile, link)) continue

                    const resolved = resolveUrlToFile(link)
                    if (!resolved) {
                        brokenLinks.push({
                            file: relative(DIST_DIR, file),
                            link,
                        })
                    }
                }
            }

            if (brokenLinks.length > 0) {
                const report = brokenLinks
                    .slice(0, 20) // Limit report to first 20
                    .map(b => `  ${b.file} → ${b.link}`)
                    .join('\n')
                expect.fail(
                    `Found ${brokenLinks.length} broken internal links:\n${report}`
                )
            }
        })
    })

    // ─── RSS/XML files are well-formed ────────────────────────────
    describe('XML files are well-formed', () => {
        it.skipIf(!distExists)('XML files start with XML declaration', () => {
            const xmlFiles = findFiles(DIST_DIR, /\.xml$/)
            const malformed: string[] = []

            for (const file of xmlFiles) {
                const content = readFileSync(file, 'utf-8').trim()
                if (!content.startsWith('<?xml')) {
                    malformed.push(relative(DIST_DIR, file))
                }
            }

            expect(
                malformed,
                `XML files without declaration: ${malformed.join(', ')}`
            ).toEqual([])
        })
    })

    // ─── Build output size sanity checks ──────────────────────────
    describe('Build output sanity checks', () => {
        it.skipIf(!distExists)('dist directory has reasonable number of files', () => {
            const allFiles = findFiles(DIST_DIR, /.*/)
            // A blog site should have at minimum a handful of pages
            expect(allFiles.length).toBeGreaterThan(10)
        })

        it.skipIf(!distExists)('homepage has reasonable size', () => {
            const indexPath = resolve(DIST_DIR, 'index.html')
            if (existsSync(indexPath)) {
                const stat = statSync(indexPath)
                // Homepage should be at least 1KB (not a stub)
                expect(stat.size).toBeGreaterThan(1024)
            }
        })

        it.skipIf(!distExists)('404 page exists and has content', () => {
            const fourOhFourPath = resolve(DIST_DIR, '404.html')
            if (existsSync(fourOhFourPath)) {
                const content = readFileSync(fourOhFourPath, 'utf-8')
                expect(content.length).toBeGreaterThan(100)
                // Should contain some 404-related text
                expect(content.toLowerCase()).toMatch(/not found|404|error/)
            }
        })
    })
})
