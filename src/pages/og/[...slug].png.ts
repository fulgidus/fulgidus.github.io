import type { APIRoute, GetStaticPaths } from 'astro'
import { getPosts } from '@/utils/posts'
import siteConfig from '@/site-config'
import satori from 'satori'
import sharp from 'sharp'
import { html } from 'satori-html'
import type { CollectionPost } from '@/types'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Font weight definitions for Inter
const FONT_WEIGHTS = [
    { weight: 400, name: 'Regular', file: 'Inter-Regular.ttf' },
    { weight: 700, name: 'Bold', file: 'Inter-Bold.ttf' },
    { weight: 800, name: 'ExtraBold', file: 'Inter-ExtraBold.ttf' },
] as const

type FontEntry = { data: ArrayBuffer; weight: 400 | 700 | 800 }

// Cached fonts (module-level, shared across all calls during build)
let cachedFonts: FontEntry[] | null = null

const OG_FONT_LOG_PREFIX = '[OG Font]'

/**
 * Attempts to fetch Inter TTF fonts from Google Fonts.
 * Returns null if the fetch fails or returns unexpected format.
 */
async function fetchRemoteFonts(): Promise<FontEntry[] | null> {
    try {
        // Default curl-like UA (no browser UA) triggers full TTF with complete charset
        const response = await fetch(
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap'
        )

        if (!response.ok) {
            console.warn(`${OG_FONT_LOG_PREFIX} Google Fonts CSS request failed with status ${response.status}`)
            return null
        }

        const css = await response.text()

        // Validate that the response contains TTF (truetype) format, not woff/woff2
        if (!css.includes("format('truetype')")) {
            console.warn(
                `${OG_FONT_LOG_PREFIX} Google Fonts returned unexpected format (expected truetype/TTF). ` +
                `This likely means Google changed their API response. CSS preview: ${css.slice(0, 300)}`
            )
            return null
        }

        // Extract all TTF font URLs with their weights
        const fontEntries: FontEntry[] = []
        const fontBlockRegex = /font-weight:\s*(\d+);[^}]*?src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/g
        let match: RegExpExecArray | null

        while ((match = fontBlockRegex.exec(css)) !== null) {
            const weight = parseInt(match[1], 10) as 400 | 700 | 800
            const url = match[2]

            if (![400, 700, 800].includes(weight)) continue

            const fontResponse = await fetch(url)
            if (!fontResponse.ok) {
                console.warn(`${OG_FONT_LOG_PREFIX} Failed to fetch font weight ${weight} from ${url}`)
                continue
            }

            const data = await fontResponse.arrayBuffer()

            // Basic validation: TTF files start with 0x00010000 or 'true'
            const header = new Uint8Array(data.slice(0, 4))
            const isTTF = (header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00)
                || (header[0] === 0x74 && header[1] === 0x72 && header[2] === 0x75 && header[3] === 0x65) // 'true'

            if (!isTTF) {
                console.warn(
                    `${OG_FONT_LOG_PREFIX} Font weight ${weight} is not valid TTF ` +
                    `(header bytes: ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}). ` +
                    `Google may have changed their API to return a different format.`
                )
                continue
            }

            fontEntries.push({ data, weight })
        }

        if (fontEntries.length === 0) {
            console.warn(`${OG_FONT_LOG_PREFIX} No valid TTF fonts extracted from Google Fonts CSS`)
            return null
        }

        if (fontEntries.length < 3) {
            console.warn(
                `${OG_FONT_LOG_PREFIX} Only ${fontEntries.length}/3 font weights loaded from remote. ` +
                `Missing weights: ${[400, 700, 800].filter(w => !fontEntries.some(f => f.weight === w)).join(', ')}`
            )
        }

        console.log(`${OG_FONT_LOG_PREFIX} Successfully loaded ${fontEntries.length} font weights from Google Fonts`)
        return fontEntries
    } catch (error) {
        console.warn(`${OG_FONT_LOG_PREFIX} Failed to fetch fonts from Google Fonts: ${error}`)
        return null
    }
}

/**
 * Loads Inter TTF fonts from the local fallback files bundled in the repo.
 */
async function loadLocalFallbackFonts(): Promise<FontEntry[]> {
    const fontsDir = join(process.cwd(), 'src', 'assets', 'fonts')
    const fontEntries: FontEntry[] = []

    for (const { weight, name, file } of FONT_WEIGHTS) {
        try {
            const buffer = await readFile(join(fontsDir, file))
            fontEntries.push({ data: buffer.buffer as ArrayBuffer, weight })
        } catch (error) {
            console.error(`${OG_FONT_LOG_PREFIX} CRITICAL: Failed to load local fallback font ${file}: ${error}`)
        }
    }

    if (fontEntries.length === 0) {
        throw new Error(
            `${OG_FONT_LOG_PREFIX} CRITICAL: No fonts could be loaded (neither remote nor local fallback). ` +
            `Ensure Inter TTF files exist in src/assets/fonts/`
        )
    }

    console.warn(
        `${OG_FONT_LOG_PREFIX} Using local fallback fonts (${fontEntries.length} weights loaded). ` +
        `OG images will render correctly, but consider investigating why remote font fetch failed.`
    )
    return fontEntries
}

/**
 * Gets fonts for OG image rendering.
 * Strategy: try remote Google Fonts first, fall back to local bundled fonts.
 */
async function getFonts(): Promise<FontEntry[]> {
    if (cachedFonts) return cachedFonts

    // Try remote first
    const remoteFonts = await fetchRemoteFonts()
    if (remoteFonts && remoteFonts.length > 0) {
        cachedFonts = remoteFonts
        return cachedFonts
    }

    // Fall back to local
    console.warn(`${OG_FONT_LOG_PREFIX} Remote font fetch failed, falling back to local bundled fonts`)
    cachedFonts = await loadLocalFallbackFonts()
    return cachedFonts
}

export const getStaticPaths: GetStaticPaths = async () => {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false })
    const allPosts = [...enPosts, ...itPosts]

    return allPosts.map((post: CollectionPost) => ({
        params: { slug: post.slug },
        props: { post },
    }))
}

export const GET: APIRoute = async ({ props }) => {
    const post = props.post as CollectionPost
    const { title, description, pubDate } = post.data

    const fonts = await getFonts()

    const truncatedDescription = description
        ? description.slice(0, 140) + (description.length > 140 ? '...' : '')
        : ''

    // Build the full HTML string first, then pass it to satori-html once.
    // This avoids the issue where interpolated strings containing HTML tags
    // get escaped by the tagged template literal.
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
                    <span style="color: #6b7280; font-size: 16px;">fulgidus.github.io</span>
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

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
