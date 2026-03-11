import { createHash } from 'node:crypto'
import { removeLangFromSlug } from '@/utils/posts'

/** Minimal shape needed by URL builders — accepts both CollectionPost and CollectionPages. */
type SlugEntry = { slug: string }

/**
 * Calculate word count and estimated token count for a content string.
 * Token estimate uses a 1.3x multiplier as a rough approximation of
 * tokenization by most LLMs (accounts for subword tokenization).
 */
export function getContentMetrics(content: string): { wordCount: number; tokenEstimate: number } {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
    const tokenEstimate = Math.ceil(wordCount * 1.3)
    return { wordCount, tokenEstimate }
}

/**
 * Compute an MD5-based ETag for content caching.
 * Returns the ETag as a quoted string per HTTP spec (e.g., `"abc123"`).
 */
export function computeETag(content: string): string {
    return `"${createHash('md5').update(content).digest('hex')}"`
}

/**
 * Build the URL for a post's markdown content endpoint.
 */
export function getPostUrl(siteUrl: string, post: SlugEntry, lang: 'en' | 'it'): string {
    const slug = lang === 'en' ? post.slug : removeLangFromSlug(post.slug)
    const prefix = lang === 'en' ? '' : '/it'
    return `${siteUrl}${prefix}/posts/${slug}/index.html.md`
}

/**
 * Build the URL for a page's markdown content endpoint.
 */
export function getPageUrl(siteUrl: string, page: SlugEntry, lang: 'en' | 'it'): string {
    const slug = lang === 'en' ? page.slug : removeLangFromSlug(page.slug)
    const prefix = lang === 'en' ? '' : '/it'
    return `${siteUrl}${prefix}/${slug}/index.html.md`
}

/**
 * Standard response headers for llms.txt endpoints.
 *
 * Note: GitHub Pages does not support custom response headers.
 * These headers only take effect during local development or on
 * platforms that support custom headers (Netlify, Cloudflare Pages, Vercel).
 */
export function getLlmsHeaders(etag: string): Record<string, string> {
    return {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'ETag': etag,
    }
}
