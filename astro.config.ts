import { availableLanguages, ui } from './src/i18n/ui'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { remarkReadingTime } from './src/plugins/remark-reading-time'

const languages: Record<string, string> = Object.fromEntries(
    availableLanguages.map((lang) => [lang, ui[lang].language])
);
export default defineConfig({
    site: 'https://fulgidus.github.io', // This is your full site URL
    base: '', //'/fulgidus', // This ensures it works from the root and not a subpath
    server: {
        port: 1987,
    },
    // i18n: { // This breaks the site for some reason, it's not needed anyway
    //     defaultLocale: 'en',
    //     locales: availableLanguages,
    //     routing: 'manual',
    //     fallback: availableLanguages['en'],
    // },
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
                    children: [{ type: 'text', value: '#' }],
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
