import siteConfig from '@/site-config'
import { PAGE_KEY } from '@/types'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })

    const enPages = await getPosts({ lang: 'en', collection: PAGE_KEY })
    const itPages = await getPosts({ lang: 'it', collection: PAGE_KEY })

    const siteUrl = String(context.site ?? '').replace(/\/$/, '')

    const enPostLinks = enPosts.map(post => {
        const slug = post.slug
        return `- [${post.data.title}](${siteUrl}/posts/${slug}/index.html.md)${post.data.description ? `: ${post.data.description}` : ''}`
    }).join('\n')

    const itPostLinks = itPosts.map(post => {
        const slug = removeLangFromSlug(post.slug)
        return `- [${post.data.title}](${siteUrl}/it/posts/${slug}/index.html.md)${post.data.description ? `: ${post.data.description}` : ''}`
    }).join('\n')

    const enPageLinks = enPages.map(page => {
        const slug = page.slug
        return `- [${page.data.title}](${siteUrl}/${slug}/index.html.md)${page.data.description ? `: ${page.data.description}` : ''}`
    }).join('\n')

    const itPageLinks = itPages.map(page => {
        const slug = removeLangFromSlug(page.slug)
        return `- [${page.data.title}](${siteUrl}/it/${slug}/index.html.md)${page.data.description ? `: ${page.data.description}` : ''}`
    }).join('\n')

    const body = `# ${siteConfig.title}

> ${siteConfig.description}

Author: ${siteConfig.author}
Site: ${siteUrl}

## Blog Posts (English)

${enPostLinks}

## Blog Posts (Italiano)

${itPostLinks}

## Pages (English)

${enPageLinks}

## Pages (Italiano)

${itPageLinks}

## Optional

- [Full content (all posts and pages)](${siteUrl}/llms-full.txt): Complete markdown content of every post and page
- [RSS Feed](${siteUrl}/rss.xml): RSS feed with full post content
`

    return new Response(body.trim(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
