import { createHash } from 'node:crypto'
import siteConfig from '@/site-config'
import { PAGE_KEY } from '@/types'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import type { APIContext } from 'astro'

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

    const body = `# ${siteConfig.title} — Full Content

> ${siteConfig.description}

Author: ${siteConfig.author}
Site: ${siteUrl}
Generated: ${new Date().toISOString()}

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

    const content = body.trim()
    const etag = `"${createHash('md5').update(content).digest('hex')}"`;

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'ETag': etag,
        },
    })
}
