import siteConfig from '@/site-config'
import { PAGE_KEY } from '@/types'
import { computeETag, getContentMetrics, getLlmsHeaders, getPageUrl, getPostUrl } from '@/utils/llms'
import { getPosts } from '@/utils/posts'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })

    const enPages = await getPosts({ lang: 'en', collection: PAGE_KEY })
    const itPages = await getPosts({ lang: 'it', collection: PAGE_KEY })

    const siteUrl = String(context.site ?? '').replace(/\/$/, '')

    const formatPostSection = (post: typeof enPosts[number], lang: 'en' | 'it') => {
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
<source>${getPostUrl(siteUrl, post, lang)}</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${content}
</content>
</post>`
    }

    const formatPageSection = (page: typeof enPages[number], lang: 'en' | 'it') => {
        const content = page.body?.trim() ?? ''
        const { wordCount, tokenEstimate } = getContentMetrics(content)
        const frontmatter = [
            `title: ${page.data.title}`,
            page.data.description ? `description: ${page.data.description}` : null,
            `word_count: ${wordCount}`,
            `token_estimate: ${tokenEstimate}`,
        ].filter(Boolean).join('\n')

        return `<page>
<source>${getPageUrl(siteUrl, page, lang)}</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${content}
</content>
</page>`
    }

    const enPostSections = enPosts.map(p => formatPostSection(p, 'en')).join('\n\n')
    const itPostSections = itPosts.map(p => formatPostSection(p, 'it')).join('\n\n')
    const enPageSections = enPages.map(p => formatPageSection(p, 'en')).join('\n\n')
    const itPageSections = itPages.map(p => formatPageSection(p, 'it')).join('\n\n')

    // Compute aggregate metrics across all content for the header summary.
    // This helps LLM consumers quickly assess total content size vs. their context window.
    const allContents = [...enPosts, ...itPosts, ...enPages, ...itPages]
        .map(p => p.body?.trim() ?? '')
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
Total entries: ${allContents.length}
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
    const etag = computeETag(trimmedContent)

    // Insert the Generated timestamp after ETag computation for informational purposes.
    const finalContent = trimmedContent.replace(
        `Site: ${siteUrl}`,
        `Site: ${siteUrl}\nGenerated: ${new Date().toISOString()}`
    )

    return new Response(finalContent, {
        headers: getLlmsHeaders(etag),
    })
}
