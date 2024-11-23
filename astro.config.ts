import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'
import compressor from 'astro-compressor'

import min from 'astro-min';

export default defineConfig({
    site: 'https://fulgidus.github.io/fulgidus', // This is your full site URL
    base: '', //'/fulgidus', // This ensures it works from the root and not a subpath
    server: {
        port: 1987,
    },
    integrations: [
        mdx(), 
        vue(), 
        sitemap(), 
        compressor({
            brotli: true,
            fileExtensions: ['.css', '.js', '.html']
        }),
        UnoCSS({
            injectReset: true,
            envMode: import.meta.env.PROD ? 'build' : 'dev'
        }),
        min({
            minify_js: true,
            minify_css: true,
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