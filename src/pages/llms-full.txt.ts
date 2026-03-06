import siteConfig from '@/site-config'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })

    const siteUrl = String(context.site ?? '').replace(/\/$/, '')

    const enSections = enPosts.map(post => {
        const slug = post.slug
        const frontmatter = [
            `title: ${post.data.title}`,
            post.data.description ? `description: ${post.data.description}` : null,
            post.data.pubDate ? `date: ${post.data.pubDate}` : null,
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

    const itSections = itPosts.map(post => {
        const slug = removeLangFromSlug(post.slug)
        const frontmatter = [
            `title: ${post.data.title}`,
            post.data.description ? `description: ${post.data.description}` : null,
            post.data.pubDate ? `date: ${post.data.pubDate}` : null,
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

    const body = `# ${siteConfig.title} — Full Content

> ${siteConfig.description}

Author: ${siteConfig.author}
Site: ${siteUrl}
Generated: ${new Date().toISOString()}

---

## Blog Posts (English)

${enSections}

---

## Blog Posts (Italiano)

${itSections}
`

    return new Response(body.trim(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
