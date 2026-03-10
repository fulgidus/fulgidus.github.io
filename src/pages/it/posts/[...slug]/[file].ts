import type { CollectionPost } from '@/types'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import type { APIContext, GetStaticPaths } from 'astro'

export const getStaticPaths: GetStaticPaths = async () => {
    const posts = await getPosts({ lang: 'it', withDrafts: false, withUnlisted: false })
    return posts.map((post: CollectionPost) => ({
        params: { slug: removeLangFromSlug(post.slug), file: 'index.html.md' },
        props: { post },
    }))
}

export async function GET(_context: APIContext) {
    const { post } = _context.props as { post: CollectionPost }
    const { remarkPluginFrontmatter } = await post.render()
    const duration = post.data.duration || remarkPluginFrontmatter?.duration

    const esc = (s: string) => s.replace(/"/g, '\\"')
    const frontmatter = [
        `---`,
        `title: "${esc(post.data.title)}"`,
        post.data.description ? `description: "${esc(post.data.description)}"` : null,
        post.data.pubDate ? `date: "${post.data.pubDate instanceof Date ? post.data.pubDate.toISOString() : post.data.pubDate}"` : null,
        duration ? `duration: "${esc(duration)}"` : null,
        post.data.tags?.length ? `tags: [${post.data.tags.map(t => `"${esc(t)}"`).join(', ')}]` : null,
        `---`,
    ].filter(Boolean).join('\n')

    const body = `${frontmatter}

${post.body?.trim() ?? ''}
`

    return new Response(body, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
}
