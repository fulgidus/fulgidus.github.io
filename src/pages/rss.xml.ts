import rss from '@astrojs/rss'
import siteConfig from '@/site-config'
import { getPosts } from '@/utils/posts'

interface Context {
    site: string
}

export async function GET(context: Context) {
    const posts = (await getPosts({withDrafts: false, withUnlisted: false}))

    return rss({
        xmlns: {
            // <rss xmlns:atom="http://www.w3.org/2005/Atom">
            atom: 'http://www.w3.org/2005/Atom',
        },
        title: siteConfig.title,
        description: siteConfig.description,
        site: context.site,
        items: posts.map((item) => {
            return {
                ...item.data,
                link: `${context.site}posts/${item.slug}`,
                pubDate: new Date(item.data.pubDate),
                description: item.data.description,
                content: item.body,
                author: `${siteConfig.email} (${siteConfig.author})`,
                categories: item.data.tags,
            }
        }),
        customData: [
            '<language>en-us</language>',
            `<atom:link href="${new URL('rss.xml', context.site)}" rel="self" type="application/rss+xml" />`
        ].join(''),
        stylesheet: '/pretty-feed-v3.xsl',
    })
}
