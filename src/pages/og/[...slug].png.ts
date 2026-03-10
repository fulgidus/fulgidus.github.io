import type { APIRoute, GetStaticPaths } from 'astro'
import { getPosts } from '@/utils/posts'
import { getOgImageData } from '@/utils/og'
import type { CollectionPost } from '@/types'

export const getStaticPaths: GetStaticPaths = async () => {
    const enPosts = await getPosts({ lang: 'en', withDrafts: false })
    const itPosts = await getPosts({ lang: 'it', withDrafts: false })
    const allPosts = [...enPosts, ...itPosts]

    const paths: Array<{ params: { slug: string }; props: { post: CollectionPost } }> = []
    for (const post of allPosts) {
        const { hash } = await getOgImageData(post.slug, {
            title: post.data.title,
            description: post.data.description,
            pubDate: post.data.pubDate,
        })
        paths.push({
            params: { slug: `${post.slug}-${hash}` },
            props: { post },
        })
    }

    return paths
}

export const GET: APIRoute = async ({ props }) => {
    const post = props.post as CollectionPost
    const { png } = await getOgImageData(post.slug, {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
    })

    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
