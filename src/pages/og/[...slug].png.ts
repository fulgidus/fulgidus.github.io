import type { APIRoute, GetStaticPaths } from 'astro'
import { getPosts } from '@/utils/posts'
import siteConfig from '@/site-config'
import satori from 'satori'
import sharp from 'sharp'
import { html } from 'satori-html'
import type { CollectionPost } from '@/types'

// Fetch font at module level (cached across calls during build)
let fontData: ArrayBuffer | null = null

async function getFont(): Promise<ArrayBuffer> {
    if (fontData) return fontData
    // Use a user-agent that triggers TTF response (satori doesn't support woff2)
    const response = await fetch(
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap',
        {
            headers: {
                // Safari 12 user-agent triggers TTF format from Google Fonts
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Safari/605.1.15',
            },
        }
    )
    const css = await response.text()
    // Extract font URL (should be .ttf with this user-agent)
    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)
    if (!urlMatch) {
        throw new Error('Could not find font URL in Google Fonts CSS. CSS content: ' + css.slice(0, 200))
    }
    const fontResponse = await fetch(urlMatch[1])
    fontData = await fontResponse.arrayBuffer()
    return fontData
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

    const font = await getFont()

    const markup = html`
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #1a0525 0%, #2d1b4e 50%, #1a0525 100%); padding: 60px; font-family: Inter, sans-serif;">
            <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; margin-bottom: 32px;">
                        <span style="color: #a78bfa; font-size: 24px; font-weight: 700;">${siteConfig.title}</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 52px; font-weight: 800; line-height: 1.15; margin: 0; max-width: 90%;">${title}</h1>
                    ${description ? `<p style="color: #c4b5fd; font-size: 22px; margin-top: 20px; line-height: 1.4; max-width: 85%; opacity: 0.85;">${description.slice(0, 140)}${description.length > 140 ? '...' : ''}</p>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="color: #9ca3af; font-size: 18px;">${siteConfig.author}</span>
                        ${pubDate ? `<span style="color: #6b7280; font-size: 18px;">·</span><span style="color: #9ca3af; font-size: 18px;">${pubDate}</span>` : ''}
                    </div>
                    <span style="color: #6b7280; font-size: 16px;">fulgidus.github.io</span>
                </div>
            </div>
        </div>
    `

    const svg = await satori(markup as any, {
        width: 1200,
        height: 630,
        fonts: [
            {
                name: 'Inter',
                data: font,
                weight: 400,
                style: 'normal',
            },
        ],
    })

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
