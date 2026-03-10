import rss from '@astrojs/rss'
import siteConfig from '@/site-config'
import { getPosts, removeLangFromSlug } from '@/utils/posts'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getActiveLanguages } from '@/i18n/utils'

interface Context {
    site: string
    params: { lang?: string }
}

const langConfig: Record<string, { language: string; stylesheet: string }> = {
    en: { language: 'en-us', stylesheet: '/pretty-feed-v3.xsl' },
    it: { language: 'it-IT', stylesheet: '/pretty-feed-v3-it.xsl' },
}

export function getStaticPaths() {
    const languages = getActiveLanguages()
    return languages.map((lang) => ({
        params: { lang: lang === defaultLang ? undefined : lang },
        props: { lang },
    }))
}

export async function GET(context: Context) {
    const lang = (context.params.lang || defaultLang) as Languages
    const config = langConfig[lang] || langConfig[defaultLang]
    const posts = await getPosts({ lang, withDrafts: false, withUnlisted: false })

    const prefix = lang === defaultLang ? '' : `${lang}/`

    return rss({
        xmlns: {
            atom: 'http://www.w3.org/2005/Atom',
        },
        title: siteConfig.title,
        description: siteConfig.description,
        site: context.site,
        items: posts.map((item) => {
            const slug = lang === defaultLang ? item.slug : removeLangFromSlug(item.slug)
            return {
                ...item.data,
                link: `${context.site}${prefix}posts/${slug}`,
                pubDate: new Date(item.data.pubDate),
                description: item.data.description,
                content: item.body,
                author: `${siteConfig.email} (${siteConfig.author})`,
                categories: item.data.tags,
            }
        }),
        customData: [
            `<language>${config.language}</language>`,
            `<atom:link href="${new URL(`${prefix}rss.xml`, context.site)}" rel="self" type="application/rss+xml" />`
        ].join(''),
        stylesheet: config.stylesheet,
    })
}
