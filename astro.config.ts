import { availableLanguages } from './src/i18n/ui'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import type { SitemapItem } from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig, fontProviders } from 'astro/config'
import UnoCSS from 'unocss/astro'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { remarkReadingTime } from './src/plugins/remark-reading-time'
import { rehypeTocHeadings } from './src/plugins/rehype-toc-headings'
import { unified } from '@astrojs/markdown-remark'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'


const require = createRequire(import.meta.url)

/** A font family served from an @fontsource package: latin and latin-ext subsets, normal style. */
function fontsource(name: string, pkg: string, cssVariable: `--${string}`, weights: number[], fallbacks: string[]) {
    const dir = dirname(require.resolve(`@fontsource/${pkg}/package.json`))
    const ranges: Record<string, string> = JSON.parse(readFileSync(`${dir}/unicode.json`, 'utf8'))
    const variants = weights.flatMap((weight) => ['latin', 'latin-ext'].map((subset) => ({
        src: [`${dir}/files/${pkg}-${subset}-${weight}-normal.woff2`] as [string],
        weight,
        style: 'normal' as const,
        unicodeRange: ranges[subset].split(',') as [string, ...string[]],
        display: 'swap' as const,
    })))
    return {
        provider: fontProviders.local(),
        name,
        cssVariable,
        fallbacks,
        options: { variants: variants as [typeof variants[number], ...typeof variants] },
    }
}

const languages: Record<string, string> = Object.fromEntries(
    availableLanguages.map((lang) => [lang, lang])
);

/**
 * Assign sitemap priority based on page type/path.
 * Homepage = 1.0, blog posts = 0.8, blog/project listings = 0.6, archive pages = 0.5
 */
function getSitemapPriority(url: string): number {
    const pathname = new URL(url).pathname

    // Homepage (EN or localized)
    if (pathname === '/' || /^\/[a-z]{2}\/?$/.test(pathname)) {
        return 1.0
    }

    // Individual blog posts
    if (/\/(posts)\//.test(pathname)) {
        return 0.8
    }

    // Projects page
    if (/\/projects\/?$/.test(pathname)) {
        return 0.7
    }

    // Blog listing, search
    if (/\/blog\/?$/.test(pathname) || /\/search\/?$/.test(pathname)) {
        return 0.6
    }

    // Tag pages, blog sub-listings, paginated pages
    if (/\/tags\//.test(pathname) || /\/blog\//.test(pathname)) {
        return 0.5
    }

    // CV and other pages
    return 0.5
}
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
    // Fonts are self-hosted from @fontsource (no network at build time) and served by the
    // site itself, with preload and metric-matched fallbacks: text no longer jumps
    // when the web font arrives (CLS).
    fonts: [
        fontsource('Roboto', 'roboto', '--font-roboto', [400], ['ui-sans-serif', 'system-ui', 'sans-serif']),
        fontsource('Inter', 'inter', '--font-inter', [400, 600, 800], ['sans-serif']),
        fontsource('Fira Code', 'fira-code', '--font-fira-code', [400], ['monospace']),
        fontsource('Fira Mono', 'fira-mono', '--font-fira-mono', [400, 700], ['monospace']),
    ],
    integrations: [
        mdx(), 
        vue(), 
        sitemap({
            i18n: {
                defaultLocale: 'en',
                locales: languages
            },
            filter: (page) => !page.includes('/well/'),
            lastmod: new Date(),
            serialize(item: SitemapItem) {
                // Add priority based on page type
                item.priority = getSitemapPriority(item.url)

                // Set lastmod to current build date (Astro generates at build time)
                if (!item.lastmod) {
                    item.lastmod = new Date().toISOString()
                }

                return item
            },
        }),
        UnoCSS({
            injectReset: true, 
            envMode: import.meta.env.PROD ? 'build' : 'dev'
        })
    ],
    markdown: {
        // Astro 7 defaults to the Sätteri processor; keep unified so our remark/rehype plugins run
        processor: unified({
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
            rehypeTocHeadings,
        ],
        }),
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
