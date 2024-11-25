import { ui } from './src/i18n/ui'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'

const availableLanguages = Object.keys(ui) as (keyof typeof ui)[];
const languages: Record<string, string> = Object.fromEntries(
    availableLanguages.map((lang) => [lang, ui[lang].language])
);
export default defineConfig({
    site: 'https://fulgidus.github.io', // This is your full site URL
    base: '', //'/fulgidus', // This ensures it works from the root and not a subpath
    server: {
        port: 1987,
    },
    integrations: [
        mdx(), 
        vue(), 
        sitemap({
            i18n: {
                defaultLocale: 'en',
                locales: languages
            }
        }),
        UnoCSS({
            injectReset: true, 
            envMode: import.meta.env.PROD ? 'build' : 'dev'
        })
    ],
    markdown: {
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
