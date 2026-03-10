import { availableLanguages } from './src/i18n/ui'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { remarkReadingTime } from './src/plugins/remark-reading-time'
import nodePath from 'node:path'


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
    vite: {
        plugins: [
            // Custom plugin: ?with-path imports resolve both the hashed URL
            // and the original filesystem path. Used by MarpSlides.astro to
            // find PPTX source files for LibreOffice conversion at build time.
            // Usage: import deck from './deck.pptx?with-path'
            //        → { url: '/_astro/deck.Bx1234.pptx', fsPath: '/abs/path/deck.pptx' }
            {
                name: 'asset-with-path',
                enforce: 'pre' as const,
                resolveId(source: string, importer: string | undefined) {
                    if (source.endsWith('?with-path')) {
                        const clean = source.replace('?with-path', '')
                        if (importer) {
                            const importerClean = importer.replace(/[?#].*$/, '')
                            const resolved = nodePath.resolve(nodePath.dirname(importerClean), clean)
                            return `\0asset-with-path:${resolved}`
                        }
                    }
                    return null
                },
                load(id: string) {
                    if (id.startsWith('\0asset-with-path:')) {
                        const absPath = id.slice('\0asset-with-path:'.length)
                        return [
                            `import url from ${JSON.stringify(absPath + '?url')};`,
                            `export default { url, fsPath: ${JSON.stringify(absPath)} };`,
                        ].join('\n')
                    }
                    return null
                },
            },
        ],
    },
})
