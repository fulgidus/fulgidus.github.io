import rss from '@astrojs/rss'
import siteConfig from '@/site-config'
import { getPosts } from '@/utils/posts'

interface Context {
    site: string
}

export async function GET(context: Context) {
    const posts = (await getPosts()).filter((p) => !p.data.unlisted && !p.data.draft)

    return rss({
        title: siteConfig.title,
        description: siteConfig.description,
        site: context.site,
        items: posts.map((item) => {
            return {
                ...item.data,
                link: `${context.site}/posts/${item.slug}/`,
                pubDate: new Date(item.data.pubDate),
                description: item.data.description,
                content: item.body,
                author: `${siteConfig.author} <${siteConfig.email}>`,
                categories: item.data.tags,
            }
        }),
    })
}
