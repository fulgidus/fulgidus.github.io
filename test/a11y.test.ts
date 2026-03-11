import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import axe from 'axe-core'

/**
 * Automated accessibility testing using axe-core.
 *
 * Runs axe-core analysis against key built HTML pages to detect
 * accessibility violations. Tests run against dist/ output.
 *
 * Covers at least 5 key page types:
 * 1. Homepage (index.html)
 * 2. Italian homepage (it/index.html)
 * 3. 404 page (404.html)
 * 4. Blog listing (blog/index.html)
 * 5. Search page (search/index.html)
 * 6. Projects page (projects/index.html)
 *
 * Additional pages are tested if they exist.
 */

const DIST_DIR = resolve(__dirname, '..', 'dist')
const distExists = existsSync(DIST_DIR)

// axe-core rules to skip in static HTML testing
// Some rules require a running browser context or dynamic behavior
const DISABLED_RULES = [
    'color-contrast',       // Can't reliably compute in jsdom (no CSS rendering)
    'scrollable-region-focusable', // jsdom doesn't support scroll behavior
    'nested-interactive',    // Can produce false positives in jsdom
    'target-size',          // Requires computed styles
]

interface AxeViolation {
    id: string
    impact: string | null
    description: string
    nodes: Array<{ html: string; failureSummary: string }>
}

async function runAxeOnFile(filePath: string): Promise<{
    violations: AxeViolation[]
    passes: number
    incomplete: number
}> {
    const html = readFileSync(filePath, 'utf-8')
    const dom = new JSDOM(html, {
        url: 'https://fulgidus.github.io/',
        pretendToBeVisual: true,
    })

    // axe-core needs a document to analyze
    const document = dom.window.document

    // Configure axe-core
    const source = axe.source
    dom.window.eval(source)
    const windowAxe = (dom.window as any).axe

    const results = await windowAxe.run(document, {
        rules: Object.fromEntries(
            DISABLED_RULES.map(rule => [rule, { enabled: false }])
        ),
        resultTypes: ['violations', 'passes', 'incomplete'],
    })

    dom.window.close()

    return {
        violations: results.violations as AxeViolation[],
        passes: results.passes?.length ?? 0,
        incomplete: results.incomplete?.length ?? 0,
    }
}

function formatViolations(violations: AxeViolation[]): string {
    if (violations.length === 0) return 'No violations'

    return violations
        .map(v => {
            const nodes = v.nodes
                .slice(0, 3)
                .map(n => `    - ${n.html.substring(0, 100)}`)
                .join('\n')
            return `  [${v.impact}] ${v.id}: ${v.description}\n${nodes}`
        })
        .join('\n\n')
}

// Pages to test - at least 5 key page types
const PAGES_TO_TEST: Array<{ name: string; path: string; critical: boolean }> = [
    { name: 'Homepage', path: 'index.html', critical: true },
    { name: 'Italian Homepage', path: 'it/index.html', critical: true },
    { name: '404 Page', path: '404.html', critical: true },
    { name: 'Search Page', path: 'search/index.html', critical: false },
    { name: 'Projects Page', path: 'projects/index.html', critical: false },
    { name: 'Tags Page', path: 'tags/index.html', critical: false },
]

describe('Automated Accessibility Testing (axe-core)', () => {
    for (const page of PAGES_TO_TEST) {
        describe(`${page.name} (${page.path})`, () => {
            const filePath = resolve(DIST_DIR, page.path)
            const pageExists = distExists && existsSync(filePath)

            it.skipIf(!pageExists)('has no critical accessibility violations', async () => {
                const results = await runAxeOnFile(filePath)

                const critical = results.violations.filter(
                    v => v.impact === 'critical'
                )

                if (critical.length > 0) {
                    expect.fail(
                        `Found ${critical.length} critical a11y violations on ${page.path}:\n${formatViolations(critical)}`
                    )
                }
            })

            it.skipIf(!pageExists)('has no serious accessibility violations', async () => {
                const results = await runAxeOnFile(filePath)

                const serious = results.violations.filter(
                    v => v.impact === 'serious'
                )

                if (serious.length > 0) {
                    expect.fail(
                        `Found ${serious.length} serious a11y violations on ${page.path}:\n${formatViolations(serious)}`
                    )
                }
            })

            it.skipIf(!pageExists)('reports violation count (informational)', async () => {
                const results = await runAxeOnFile(filePath)

                // This test always passes - it's for visibility into the a11y state
                const moderate = results.violations.filter(
                    v => v.impact === 'moderate' || v.impact === 'minor'
                )

                if (moderate.length > 0) {
                    console.warn(
                        `[a11y] ${page.name}: ${moderate.length} moderate/minor violations found`
                    )
                }

                // Log pass count for confidence
                expect(results.passes).toBeGreaterThan(0)
            })
        })
    }

    // ─── Cross-page a11y checks ───────────────────────────────────
    describe('Cross-page accessibility patterns', () => {
        it.skipIf(!distExists)('all tested pages have lang attribute on <html>', () => {
            const problems: string[] = []

            for (const page of PAGES_TO_TEST) {
                const filePath = resolve(DIST_DIR, page.path)
                if (!existsSync(filePath)) continue

                const html = readFileSync(filePath, 'utf-8')
                if (!html.match(/<html[^>]*\slang="/)) {
                    problems.push(page.path)
                }
            }

            expect(
                problems,
                `Pages missing lang attribute: ${problems.join(', ')}`
            ).toEqual([])
        })

        it.skipIf(!distExists)('all tested pages have a <title> element', () => {
            const problems: string[] = []

            for (const page of PAGES_TO_TEST) {
                const filePath = resolve(DIST_DIR, page.path)
                if (!existsSync(filePath)) continue

                const html = readFileSync(filePath, 'utf-8')
                if (!html.includes('<title>') && !html.includes('<title ')) {
                    problems.push(page.path)
                }
            }

            expect(
                problems,
                `Pages missing <title>: ${problems.join(', ')}`
            ).toEqual([])
        })

        it.skipIf(!distExists)('all tested pages have meta viewport', () => {
            const problems: string[] = []

            for (const page of PAGES_TO_TEST) {
                const filePath = resolve(DIST_DIR, page.path)
                if (!existsSync(filePath)) continue

                const html = readFileSync(filePath, 'utf-8')
                if (!html.includes('viewport')) {
                    problems.push(page.path)
                }
            }

            expect(
                problems,
                `Pages missing viewport meta: ${problems.join(', ')}`
            ).toEqual([])
        })

        it.skipIf(!distExists)('all tested pages have charset declaration', () => {
            const problems: string[] = []

            for (const page of PAGES_TO_TEST) {
                const filePath = resolve(DIST_DIR, page.path)
                if (!existsSync(filePath)) continue

                const html = readFileSync(filePath, 'utf-8').toLowerCase()
                if (!html.includes('charset=') && !html.includes('charset =')) {
                    problems.push(page.path)
                }
            }

            expect(
                problems,
                `Pages missing charset: ${problems.join(', ')}`
            ).toEqual([])
        })

        it.skipIf(!distExists)('Italian pages have lang="it"', () => {
            const itPages = PAGES_TO_TEST.filter(p => p.path.startsWith('it/'))
            const problems: string[] = []

            for (const page of itPages) {
                const filePath = resolve(DIST_DIR, page.path)
                if (!existsSync(filePath)) continue

                const html = readFileSync(filePath, 'utf-8')
                if (!html.match(/<html[^>]*\slang="it"/)) {
                    problems.push(page.path)
                }
            }

            expect(
                problems,
                `Italian pages with wrong lang attribute: ${problems.join(', ')}`
            ).toEqual([])
        })
    })
})
