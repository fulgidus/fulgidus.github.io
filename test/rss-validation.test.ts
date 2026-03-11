import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * RSS/Atom feed validation tests.
 *
 * These tests validate the XML output of the RSS and last-ten feeds
 * against the RSS 2.0 spec requirements. They run against the built
 * dist/ output, so `bun run build` must succeed before these pass.
 *
 * If dist/ doesn't exist, tests are skipped gracefully.
 */

const DIST_DIR = resolve(__dirname, '..', 'dist')

function readFeed(relativePath: string): string | null {
    const fullPath = resolve(DIST_DIR, relativePath)
    if (!existsSync(fullPath)) return null
    return readFileSync(fullPath, 'utf-8')
}

// Simple XML tag content extractor (no full parser needed for validation)
function getXmlTagContent(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
    const matches: string[] = []
    let match
    while ((match = regex.exec(xml)) !== null) {
        matches.push(match[1])
    }
    return matches
}

function hasXmlTag(xml: string, tag: string): boolean {
    return new RegExp(`<${tag}[\\s>]`).test(xml)
}

function getXmlAttribute(xml: string, tag: string, attr: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*?${attr}="([^"]*)"`, 'g')
    const matches: string[] = []
    let match
    while ((match = regex.exec(xml)) !== null) {
        matches.push(match[1])
    }
    return matches
}

describe('RSS Feed Validation', () => {
    let rssXml: string | null = null
    let distExists = false

    beforeAll(() => {
        distExists = existsSync(DIST_DIR)
        if (distExists) {
            rssXml = readFeed('rss.xml')
        }
    })

    describe('English RSS feed (rss.xml)', () => {
        it.skipIf(!existsSync(DIST_DIR))('feed file exists', () => {
            expect(rssXml).not.toBeNull()
        })

        it.skipIf(!existsSync(DIST_DIR))('has valid XML declaration', () => {
            expect(rssXml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has rss root element with version 2.0', () => {
            expect(rssXml).toMatch(/<rss[^>]*version="2\.0"/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has channel element', () => {
            expect(hasXmlTag(rssXml!, 'channel')).toBe(true)
        })

        it.skipIf(!existsSync(DIST_DIR))('has required channel title', () => {
            const titles = getXmlTagContent(rssXml!, 'title')
            expect(titles.length).toBeGreaterThan(0)
            expect(titles[0].length).toBeGreaterThan(0)
        })

        it.skipIf(!existsSync(DIST_DIR))('has required channel link', () => {
            const links = getXmlTagContent(rssXml!, 'link')
            expect(links.length).toBeGreaterThan(0)
        })

        it.skipIf(!existsSync(DIST_DIR))('has required channel description', () => {
            const descriptions = getXmlTagContent(rssXml!, 'description')
            expect(descriptions.length).toBeGreaterThan(0)
        })

        it.skipIf(!existsSync(DIST_DIR))('has atom:link self-reference', () => {
            expect(rssXml).toMatch(/<atom:link[^>]*rel="self"/)
            expect(rssXml).toMatch(/<atom:link[^>]*type="application\/rss\+xml"/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has atom namespace declaration', () => {
            expect(rssXml).toMatch(/xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom"/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has language element', () => {
            expect(hasXmlTag(rssXml!, 'language')).toBe(true)
            const lang = getXmlTagContent(rssXml!, 'language')
            expect(lang[0]).toMatch(/^en/)
        })

        it.skipIf(!existsSync(DIST_DIR))('items have required title elements', () => {
            const items = getXmlTagContent(rssXml!, 'item')
            if (items.length > 0) {
                for (const item of items) {
                    expect(hasXmlTag(item, 'title')).toBe(true)
                }
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('items have required link elements', () => {
            const items = getXmlTagContent(rssXml!, 'item')
            if (items.length > 0) {
                for (const item of items) {
                    expect(hasXmlTag(item, 'link')).toBe(true)
                }
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('items have publication dates', () => {
            const items = getXmlTagContent(rssXml!, 'item')
            if (items.length > 0) {
                for (const item of items) {
                    expect(hasXmlTag(item, 'pubDate')).toBe(true)
                }
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('item links are valid URLs', () => {
            const items = getXmlTagContent(rssXml!, 'item')
            for (const item of items) {
                const links = getXmlTagContent(item, 'link')
                for (const link of links) {
                    expect(() => new URL(link.trim())).not.toThrow()
                }
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('has stylesheet processing instruction', () => {
            expect(rssXml).toMatch(/<\?xml-stylesheet/)
        })
    })

    describe('Italian RSS feed (it/rss.xml)', () => {
        let itRssXml: string | null = null

        beforeAll(() => {
            if (existsSync(DIST_DIR)) {
                itRssXml = readFeed('it/rss.xml')
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('feed file exists', () => {
            expect(itRssXml).not.toBeNull()
        })

        it.skipIf(!existsSync(DIST_DIR))('has Italian language element', () => {
            if (itRssXml) {
                const lang = getXmlTagContent(itRssXml, 'language')
                expect(lang[0]).toMatch(/^it/)
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('has atom:link self-reference pointing to Italian feed', () => {
            if (itRssXml) {
                const selfHrefs = getXmlAttribute(itRssXml, 'atom:link', 'href')
                expect(selfHrefs.some(h => h.includes('it/rss.xml'))).toBe(true)
            }
        })
    })

    describe('Last-ten feed (last-ten.xml)', () => {
        let lastTenXml: string | null = null

        beforeAll(() => {
            if (existsSync(DIST_DIR)) {
                lastTenXml = readFeed('last-ten.xml')
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('feed file exists', () => {
            expect(lastTenXml).not.toBeNull()
        })

        it.skipIf(!existsSync(DIST_DIR))('has valid XML declaration', () => {
            expect(lastTenXml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has rss root element', () => {
            expect(lastTenXml).toMatch(/<rss[^>]*version="2\.0"/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has channel element with required fields', () => {
            expect(hasXmlTag(lastTenXml!, 'channel')).toBe(true)
            expect(hasXmlTag(lastTenXml!, 'title')).toBe(true)
            expect(hasXmlTag(lastTenXml!, 'description')).toBe(true)
        })

        it.skipIf(!existsSync(DIST_DIR))('has atom:link self-reference', () => {
            expect(lastTenXml).toMatch(/<atom:link[^>]*rel="self"/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has at most 10 items', () => {
            const items = getXmlTagContent(lastTenXml!, 'item')
            expect(items.length).toBeLessThanOrEqual(10)
        })

        it.skipIf(!existsSync(DIST_DIR))('items have required elements', () => {
            const items = getXmlTagContent(lastTenXml!, 'item')
            for (const item of items) {
                expect(hasXmlTag(item, 'title')).toBe(true)
                expect(hasXmlTag(item, 'link')).toBe(true)
                expect(hasXmlTag(item, 'pubDate')).toBe(true)
            }
        })
    })

    describe('JSON Feed (feed.json)', () => {
        let feedJson: Record<string, any> | null = null

        beforeAll(() => {
            if (existsSync(DIST_DIR)) {
                const raw = readFeed('feed.json')
                if (raw) {
                    try { feedJson = JSON.parse(raw) } catch { feedJson = null }
                }
            }
        })

        it.skipIf(!existsSync(DIST_DIR))('feed file exists and is valid JSON', () => {
            expect(feedJson).not.toBeNull()
        })

        it.skipIf(!existsSync(DIST_DIR))('has JSON Feed version', () => {
            expect(feedJson?.version).toMatch(/jsonfeed\.org/)
        })

        it.skipIf(!existsSync(DIST_DIR))('has title', () => {
            expect(feedJson?.title).toBeTruthy()
        })

        it.skipIf(!existsSync(DIST_DIR))('has home_page_url', () => {
            expect(feedJson?.home_page_url).toBeTruthy()
        })

        it.skipIf(!existsSync(DIST_DIR))('has feed_url', () => {
            expect(feedJson?.feed_url).toMatch(/feed\.json/)
        })

        it.skipIf(!existsSync(DIST_DIR))('items have required fields', () => {
            if (feedJson?.items) {
                for (const item of feedJson.items) {
                    expect(item.id).toBeTruthy()
                    expect(item.url).toBeTruthy()
                    expect(item.title).toBeTruthy()
                }
            }
        })
    })
})
