import { createHash } from 'node:crypto'
import siteConfig from '@/site-config'
import { PAGE_KEY } from '@/types'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import type { APIContext } from 'astro'

/**
 * Calculate word count and estimated token count for a content string.
 * Token estimate uses a 1.3x multiplier as a rough approximation of
 * tokenization by most LLMs (accounts for subword tokenization).
 */
function getContentMetrics(content: string): { wordCount: number; tokenEstimate: number } {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
    const tokenEstimate = Math.ceil(wordCount * 1.3)
    return { wordCount, tokenEstimate }
}

export async function GET(context: APIContext) {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })

    const enPages = await getPosts({ lang: 'en', collection: PAGE_KEY })
    const itPages = await getPosts({ lang: 'it', collection: PAGE_KEY })

    const siteUrl = String(context.site ?? '').replace(/\/$/, '')

    const enPostSections = enPosts.map(post => {
        const slug = post.slug
        const content = post.body?.trim() ?? ''
        const { wordCount, tokenEstimate } = getContentMetrics(content)
        const frontmatter = [
            `title: ${post.data.title}`,
            post.data.description ? `description: ${post.data.description}` : null,
            post.data.pubDate ? `date: ${post.data.pubDate instanceof Date ? post.data.pubDate.toISOString() : post.data.pubDate}` : null,
            post.data.tags?.length ? `tags: ${post.data.tags.join(', ')}` : null,
            `word_count: ${wordCount}`,
            `token_estimate: ${tokenEstimate}`,
        ].filter(Boolean).join('\n')

        return `<post>
<source>${siteUrl}/posts/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${content}
</content>
</post>`
    }).join('\n\n')

    const itPostSections = itPosts.map(post => {
        const slug = removeLangFromSlug(post.slug)
        const content = post.body?.trim() ?? ''
        const { wordCount, tokenEstimate } = getContentMetrics(content)
        const frontmatter = [
            `title: ${post.data.title}`,
            post.data.description ? `description: ${post.data.description}` : null,
            post.data.pubDate ? `date: ${post.data.pubDate instanceof Date ? post.data.pubDate.toISOString() : post.data.pubDate}` : null,
            post.data.tags?.length ? `tags: ${post.data.tags.join(', ')}` : null,
            `word_count: ${wordCount}`,
            `token_estimate: ${tokenEstimate}`,
        ].filter(Boolean).join('\n')

        return `<post>
<source>${siteUrl}/it/posts/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${content}
</content>
</post>`
    }).join('\n\n')

    const enPageSections = enPages.map(page => {
        const slug = page.slug
        const content = page.body?.trim() ?? ''
        const { wordCount, tokenEstimate } = getContentMetrics(content)
        const frontmatter = [
            `title: ${page.data.title}`,
            page.data.description ? `description: ${page.data.description}` : null,
            `word_count: ${wordCount}`,
            `token_estimate: ${tokenEstimate}`,
        ].filter(Boolean).join('\n')

        return `<page>
<source>${siteUrl}/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${content}
</content>
</page>`
    }).join('\n\n')

    const itPageSections = itPages.map(page => {
        const slug = removeLangFromSlug(page.slug)
        const content = page.body?.trim() ?? ''
        const { wordCount, tokenEstimate } = getContentMetrics(content)
        const frontmatter = [
            `title: ${page.data.title}`,
            page.data.description ? `description: ${page.data.description}` : null,
            `word_count: ${wordCount}`,
            `token_estimate: ${tokenEstimate}`,
        ].filter(Boolean).join('\n')

        return `<page>
<source>${siteUrl}/it/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${content}
</content>
</page>`
    }).join('\n\n')

    // Compute aggregate metrics across all content for the header summary.
    // This helps LLM consumers quickly assess total content size vs. their context window.
    const allContents = [...enPosts, ...itPosts].map(p => p.body?.trim() ?? '')
        .concat([...enPages, ...itPages].map(p => p.body?.trim() ?? ''))
    const totalMetrics = allContents.reduce(
        (acc, c) => {
            const m = getContentMetrics(c)
            return { wordCount: acc.wordCount + m.wordCount, tokenEstimate: acc.tokenEstimate + m.tokenEstimate }
        },
        { wordCount: 0, tokenEstimate: 0 }
    )

    // Build content sections first (without timestamp) for stable ETag computation.
    // The Generated timestamp is added after ETag calculation so that the ETag
    // only changes when actual content changes, not on every rebuild.
    const contentBody = `# ${siteConfig.title} — Full Content

> ${siteConfig.description}

Author: ${siteConfig.author}
Site: ${siteUrl}
Total entries: ${enPosts.length + itPosts.length + enPages.length + itPages.length}
Total word count: ${totalMetrics.wordCount}
Total token estimate: ${totalMetrics.tokenEstimate}

---

## Blog Posts (English)

${enPostSections}

---

## Blog Posts (Italiano)

${itPostSections}

---

## Pages (English)

${enPageSections}

---

## Pages (Italiano)

${itPageSections}
`

    const trimmedContent = contentBody.trim()

    // ETag is computed from content excluding the timestamp, so it only changes
    // when actual post/page content changes — not on every rebuild.
    const etag = `"${createHash('md5').update(trimmedContent).digest('hex')}"`;

    // Insert the Generated timestamp after ETag computation for informational purposes.
    const finalContent = trimmedContent.replace(
        `Site: ${siteUrl}`,
        `Site: ${siteUrl}\nGenerated: ${new Date().toISOString()}`
    )

    // Note: Cache-Control and ETag headers are set here for correctness, but
    // GitHub Pages (the current deployment target) does not support custom
    // response headers. These headers will only be effective during local
    // development or if the site is moved to a hosting platform that supports
    // custom headers (e.g., Netlify, Cloudflare Pages, Vercel).
    return new Response(finalContent, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'ETag': etag,
        },
    })
}
