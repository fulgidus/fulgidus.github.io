import siteConfig from '@/site-config'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })

    const siteUrl = String(context.site ?? '').replace(/\/$/, '')

    const enLinks = enPosts.map(post => {
        const slug = post.slug
        return `- [${post.data.title}](${siteUrl}/posts/${slug}/index.html.md)${post.data.description ? `: ${post.data.description}` : ''}`
    }).join('\n')

    const itLinks = itPosts.map(post => {
        const slug = removeLangFromSlug(post.slug)
        return `- [${post.data.title}](${siteUrl}/it/posts/${slug}/index.html.md)${post.data.description ? `: ${post.data.description}` : ''}`
    }).join('\n')

    const body = `# ${siteConfig.title}

> ${siteConfig.description}

Author: ${siteConfig.author}
Site: ${siteUrl}

## Blog Posts (English)

${enLinks}

## Blog Posts (Italiano)

${itLinks}

## Optional

- [Full content (all posts)](${siteUrl}/llms-full.txt): Complete markdown content of every post
- [RSS Feed](${siteUrl}/rss.xml): RSS feed with full post content
`

    return new Response(body.trim(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
