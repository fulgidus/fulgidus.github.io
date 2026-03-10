import { availableLanguages } from './src/i18n/ui'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { remarkReadingTime } from './src/plugins/remark-reading-time'

const languages: Record<string, string> = Object.fromEntries(
    availableLanguages.map((lang) => [lang, lang])
);
export default defineConfig({
    site: 'https://fulgidus.github.io', // This is your full site URL
    base: '', //'/fulgidus', // This ensures it works from the root and not a subpath
    server: {
        port: 1987,
    },
    i18n: {
        defaultLocale: 'en',
        locales: ['en', 'it'],
        routing: {
            prefixDefaultLocale: false,
        },
    },
    integrations: [
        mdx(), 
        vue(), 
        sitemap({
            i18n: {
                defaultLocale: 'en',
                locales: languages
            },
            filter: (page) => !page.includes('/well/'),
        }),
        UnoCSS({
            injectReset: true, 
            envMode: import.meta.env.PROD ? 'build' : 'dev'
        })
    ],
    markdown: {
        remarkPlugins: [remarkReadingTime],
        rehypePlugins: [
            rehypeSlug,
            [rehypeAutolinkHeadings, {
                behavior: 'append',
                properties: {
                    className: ['anchor-link'],
                    ariaHidden: true,
                    tabIndex: -1,
                },
                content: {
                    type: 'element',
                    tagName: 'span',
                    properties: { className: ['anchor-icon'] },
                    children: [{
                        type: 'element',
                        tagName: 'svg',
                        properties: {
                            width: '0.75em',
                            height: '0.75em',
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: '2',
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                        },
                        children: [
                            {
                                type: 'element',
                                tagName: 'path',
                                properties: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
                                children: [],
                            },
                            {
                                type: 'element',
                                tagName: 'path',
                                properties: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
                                children: [],
                            },
                        ],
                    }],
                },
            }],
        ],
        shikiConfig: {
            themes: {
                light: 'github-light-default',
                dark: 'github-dark-default',
            },
            wrap: true,
        },
    },
    compressHTML: import.meta.env.PROD,
})
