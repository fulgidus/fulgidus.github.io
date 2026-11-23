import type { APIContext } from 'astro'
import siteConfig from '@/site-config'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getActiveLanguages } from '@/i18n/utils'

const langConfig: Record<string, { language: string }> = {
    en: { language: 'en-US' },
    it: { language: 'it-IT' },
}

export function getStaticPaths() {
    const languages = getActiveLanguages()
    return languages.map((lang) => ({
        params: { lang: lang === defaultLang ? undefined : lang },
        props: { lang },
    }))
}

export async function GET(context: APIContext) {
    const lang = (context.params.lang || defaultLang) as Languages
    const config = langConfig[lang] || langConfig[defaultLang]
    const posts = await getPosts({ lang, withDrafts: false, withUnlisted: false })

    const siteUrl = context.site?.toString().replace(/\/$/, '') ?? 'https://fulgidus.github.io'
    const prefix = lang === defaultLang ? '' : `${lang}/`

    const feed = {
        version: 'https://jsonfeed.org/version/1.1',
        title: siteConfig.title,
        home_page_url: `${siteUrl}/${prefix}`,
        feed_url: `${siteUrl}/${prefix}feed.json`,
        description: siteConfig.description,
        language: config.language,
        authors: [
            {
                name: siteConfig.author,
                url: siteUrl,
            },
        ],
        items: posts.map((item) => {
            const slug = lang === defaultLang ? item.slug : removeLangFromSlug(item.slug)
            const postUrl = `${siteUrl}/${prefix}posts/${slug}`

            const feedItem: Record<string, unknown> = {
                id: postUrl,
                url: postUrl,
                title: item.data.title,
                content_html: item.body ?? '',
                date_published: new Date(item.data.pubDate).toISOString(),
            }

            if (item.data.description) {
                feedItem.summary = item.data.description
            }

            if (item.data.tags && item.data.tags.length > 0) {
                feedItem.tags = item.data.tags
            }

            return feedItem
        }),
    }

    return new Response(JSON.stringify(feed, null, 2), {
        status: 200,
        headers: {
            'Content-Type': 'application/feed+json; charset=utf-8',
        },
    })
}
