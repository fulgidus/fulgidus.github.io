import siteConfig from '@/site-config'
import satori from 'satori'
import sharp from 'sharp'
import { html } from 'satori-html'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { translateFrom, getLangFromSlug } from '@/i18n/utils'
import type { Languages } from '@/i18n/ui'

// ─── Font loading ────────────────────────────────────────────────────────────

const FONT_WEIGHTS = [
    { weight: 400, name: 'Regular', file: 'Inter-Regular.ttf' },
    { weight: 700, name: 'Bold', file: 'Inter-Bold.ttf' },
    { weight: 800, name: 'ExtraBold', file: 'Inter-ExtraBold.ttf' },
] as const

type FontEntry = { data: ArrayBuffer; weight: 400 | 700 | 800 }

let cachedFonts: FontEntry[] | null = null

const LOG = '[OG]'

async function fetchRemoteFonts(): Promise<FontEntry[] | null> {
    try {
        const response = await fetch(
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap'
        )

        if (!response.ok) {
            console.warn(`${LOG} Google Fonts CSS request failed with status ${response.status}`)
            return null
        }

        const css = await response.text()

        if (!css.includes("format('truetype')")) {
            console.warn(
                `${LOG} Google Fonts returned unexpected format (expected truetype/TTF). ` +
                `CSS preview: ${css.slice(0, 300)}`
            )
            return null
        }

        const fontEntries: FontEntry[] = []
        const fontBlockRegex = /font-weight:\s*(\d+);[^}]*?src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/g
        let match: RegExpExecArray | null

        while ((match = fontBlockRegex.exec(css)) !== null) {
            const weight = parseInt(match[1], 10) as 400 | 700 | 800
            const url = match[2]

            if (![400, 700, 800].includes(weight)) continue

            const fontResponse = await fetch(url)
            if (!fontResponse.ok) {
                console.warn(`${LOG} Failed to fetch font weight ${weight} from ${url}`)
                continue
            }

            const data = await fontResponse.arrayBuffer()

            const header = new Uint8Array(data.slice(0, 4))
            const isTTF = (header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00)
                || (header[0] === 0x74 && header[1] === 0x72 && header[2] === 0x75 && header[3] === 0x65)

            if (!isTTF) {
                console.warn(
                    `${LOG} Font weight ${weight} is not valid TTF ` +
                    `(header: ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')})`
                )
                continue
            }

            fontEntries.push({ data, weight })
        }

        if (fontEntries.length === 0) {
            console.warn(`${LOG} No valid TTF fonts extracted from Google Fonts CSS`)
            return null
        }

        if (fontEntries.length < 3) {
            console.warn(
                `${LOG} Only ${fontEntries.length}/3 font weights loaded from remote. ` +
                `Missing: ${[400, 700, 800].filter(w => !fontEntries.some(f => f.weight === w)).join(', ')}`
            )
        }

        console.log(`${LOG} Loaded ${fontEntries.length} font weights from Google Fonts`)
        return fontEntries
    } catch (error) {
        console.warn(`${LOG} Failed to fetch fonts from Google Fonts: ${error}`)
        return null
    }
}

async function loadLocalFallbackFonts(): Promise<FontEntry[]> {
    const fontsDir = join(process.cwd(), 'src', 'assets', 'fonts')
    const fontEntries: FontEntry[] = []

    for (const { weight, file } of FONT_WEIGHTS) {
        try {
            const buffer = await readFile(join(fontsDir, file))
            fontEntries.push({ data: buffer.buffer as ArrayBuffer, weight })
        } catch (error) {
            console.error(`${LOG} CRITICAL: Failed to load local fallback font ${file}: ${error}`)
        }
    }

    if (fontEntries.length === 0) {
        throw new Error(
            `${LOG} CRITICAL: No fonts could be loaded. Ensure Inter TTF files exist in src/assets/fonts/`
        )
    }

    console.warn(
        `${LOG} Using local fallback fonts (${fontEntries.length} weights). ` +
        `Investigate why remote font fetch failed.`
    )
    return fontEntries
}

async function getFonts(): Promise<FontEntry[]> {
    if (cachedFonts) return cachedFonts

    const remoteFonts = await fetchRemoteFonts()
    if (remoteFonts && remoteFonts.length > 0) {
        cachedFonts = remoteFonts
        return cachedFonts
    }

    console.warn(`${LOG} Remote font fetch failed, falling back to local bundled fonts`)
    cachedFonts = await loadLocalFallbackFonts()
    return cachedFonts
}

// ─── OG image generation & caching ──────────────────────────────────────────

export type OGImageData = {
    png: Buffer
    hash: string  // short hex hash of the PNG content
}

// Build-time cache: slug -> generated OG image data
const ogCache = new Map<string, OGImageData>()

/**
 * Generates an OG image PNG for the given post data.
 */
async function renderOgPng(post: { title: string; description?: string; pubDate?: string }, lang: Languages): Promise<Buffer> {
    const { title, description, pubDate } = post
    const fonts = await getFonts()

    const ctaText = translateFrom(lang, 'og.cta')

    const truncatedDescription = description
        ? description.slice(0, 140) + (description.length > 140 ? '...' : '')
        : ''

    const templateHtml = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #1a0525 0%, #2d1b4e 50%, #1a0525 100%); padding: 60px; font-family: Inter, sans-serif;">
            <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; margin-bottom: 32px;">
                        <span style="color: #a78bfa; font-size: 24px; font-weight: 700;">${siteConfig.title}</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 52px; font-weight: 800; line-height: 1.15; margin: 0; max-width: 90%;">${title}</h1>
                    ${truncatedDescription ? `<p style="color: #c4b5fd; font-size: 22px; margin-top: 20px; line-height: 1.4; max-width: 85%; opacity: 0.85;">${truncatedDescription}</p>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="color: #9ca3af; font-size: 18px;">${siteConfig.author}</span>
                        ${pubDate ? `<span style="color: #6b7280; font-size: 18px;">\u00B7</span><span style="color: #9ca3af; font-size: 18px;">${pubDate}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; background: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.4); border-radius: 8px; padding: 8px 20px;">
                        <span style="color: #a78bfa; font-size: 18px; font-weight: 700;">${ctaText}</span>
                    </div>
                </div>
            </div>
        </div>
    `

    const markup = html(templateHtml)

    const svg = await satori(markup as any, {
        width: 1200,
        height: 630,
        fonts: fonts.map(({ data, weight }) => ({
            name: 'Inter',
            data,
            weight,
            style: 'normal' as const,
        })),
    })

    return sharp(Buffer.from(svg)).png().toBuffer()
}

function computeShortHash(data: Buffer): string {
    return createHash('sha256').update(new Uint8Array(data)).digest('hex').slice(0, 8)
}

/**
 * Gets or generates the OG image data for a slug.
 * Caches the result so both the endpoint and post templates can access it.
 */
export async function getOgImageData(
    slug: string,
    postData: { title: string; description?: string; pubDate?: string }
): Promise<OGImageData> {
    const cached = ogCache.get(slug)
    if (cached) return cached

    const lang = getLangFromSlug(slug)
    const png = await renderOgPng(postData, lang)
    const hash = computeShortHash(png)
    const entry: OGImageData = { png, hash }

    ogCache.set(slug, entry)
    console.log(`${LOG} Generated OG image for "${slug}" (hash: ${hash})`)
    return entry
}

/**
 * Returns the OG image URL path for a given slug.
 * Format: /og/{slug}-{hash}.png
 *
 * This must be called after getOgImageData() has been called for this slug,
 * otherwise it will generate the image on demand.
 */
export async function getOgImagePath(
    slug: string,
    postData: { title: string; description?: string; pubDate?: string }
): Promise<string> {
    const { hash } = await getOgImageData(slug, postData)
    return `/og/${slug}-${hash}.png`
}
