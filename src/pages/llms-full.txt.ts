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

    const enPostSections = enPosts.map(post => {
        const slug = post.slug
        const frontmatter = [
            `title: ${post.data.title}`,
            post.data.description ? `description: ${post.data.description}` : null,
            post.data.pubDate ? `date: ${post.data.pubDate instanceof Date ? post.data.pubDate.toISOString() : post.data.pubDate}` : null,
            post.data.tags?.length ? `tags: ${post.data.tags.join(', ')}` : null,
        ].filter(Boolean).join('\n')

        return `<post>
<source>${siteUrl}/posts/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${post.body?.trim() ?? ''}
</content>
</post>`
    }).join('\n\n')

    const itPostSections = itPosts.map(post => {
        const slug = removeLangFromSlug(post.slug)
        const frontmatter = [
            `title: ${post.data.title}`,
            post.data.description ? `description: ${post.data.description}` : null,
            post.data.pubDate ? `date: ${post.data.pubDate instanceof Date ? post.data.pubDate.toISOString() : post.data.pubDate}` : null,
            post.data.tags?.length ? `tags: ${post.data.tags.join(', ')}` : null,
        ].filter(Boolean).join('\n')

        return `<post>
<source>${siteUrl}/it/posts/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${post.body?.trim() ?? ''}
</content>
</post>`
    }).join('\n\n')

    const enPageSections = enPages.map(page => {
        const slug = page.slug
        const frontmatter = [
            `title: ${page.data.title}`,
            page.data.description ? `description: ${page.data.description}` : null,
        ].filter(Boolean).join('\n')

        return `<page>
<source>${siteUrl}/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${page.body?.trim() ?? ''}
</content>
</page>`
    }).join('\n\n')

    const itPageSections = itPages.map(page => {
        const slug = removeLangFromSlug(page.slug)
        const frontmatter = [
            `title: ${page.data.title}`,
            page.data.description ? `description: ${page.data.description}` : null,
        ].filter(Boolean).join('\n')

        return `<page>
<source>${siteUrl}/it/${slug}/index.html.md</source>
<frontmatter>
${frontmatter}
</frontmatter>
<content>
${page.body?.trim() ?? ''}
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

    return new Response(body.trim(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
