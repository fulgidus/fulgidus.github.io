import siteConfig from '@/site-config'
import { PAGE_KEY } from '@/types'
import { computeETag, getLlmsHeaders, getPageUrl, getPostUrl } from '@/utils/llms'
import { getPosts } from '@/utils/posts'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })

    const enPages = await getPosts({ lang: 'en', collection: PAGE_KEY })
    const itPages = await getPosts({ lang: 'it', collection: PAGE_KEY })

    const siteUrl = String(context.site ?? '').replace(/\/$/, '')

    const enPostLinks = enPosts.map(post =>
        `- [${post.data.title}](${getPostUrl(siteUrl, post, 'en')})${post.data.description ? `: ${post.data.description}` : ''}`
    ).join('\n')

    const itPostLinks = itPosts.map(post =>
        `- [${post.data.title}](${getPostUrl(siteUrl, post, 'it')})${post.data.description ? `: ${post.data.description}` : ''}`
    ).join('\n')

    const enPageLinks = enPages.map(page =>
        `- [${page.data.title}](${getPageUrl(siteUrl, page, 'en')})${page.data.description ? `: ${page.data.description}` : ''}`
    ).join('\n')

    const itPageLinks = itPages.map(page =>
        `- [${page.data.title}](${getPageUrl(siteUrl, page, 'it')})${page.data.description ? `: ${page.data.description}` : ''}`
    ).join('\n')

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

    const content = body.trim()
    const etag = computeETag(content)

    return new Response(content, {
        headers: getLlmsHeaders(etag),
    })
}
