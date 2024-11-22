import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { imageService } from '@unpic/astro/service'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'

export default defineConfig({
    site: 'https://fulgidus.github.io/fulgidus', // This is your full site URL
    base: '', //'/fulgidus', // This ensures it works from the root and not a subpath
    server: {
        port: 1987,
    },
    image: {
        service: imageService({
            placeholder: 'blurhash',
        }),
    },
    integrations: [
        mdx(),
        vue(),
        sitemap(),
        UnoCSS({
            injectReset: true,
        }),
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
})
