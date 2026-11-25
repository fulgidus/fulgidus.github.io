import {
    defineConfig,
    presetAttributify,
    presetIcons,
    presetTypography,
    presetWind3,
    transformerDirectives,
    transformerVariantGroup,
} from 'unocss'

export default defineConfig({
    // Font files and @font-face come from Astro's Fonts API (astro.config.ts, <Font> in BaseHead)
    theme: {
        fontFamily: {
            title: 'var(--font-inter)',
            sans: 'var(--font-roboto)',
            mono: 'var(--font-fira-code), var(--font-fira-mono)',
        },
    },
    shortcuts: [
        {
            'bg-main': 'bg-hex-eef1f8 dark:bg-hex-1a1b26',
            'text-main': 'text-hex-4a5072 dark:text-hex-a9b1d6',
            'text-link': 'text-hex-1f2335 dark:text-hex-c0caf5',
            'border-main': 'border-hex-c8cfe0 dark:border-hex-2f344d',
        },
        {
            'text-title': 'text-link text-4xl font-800',
            'nav-link': 'text-link opacity-100 hover:bg-hex-00000010 dark:hover:bg-hex-ffffff10 transition-all duration-200 cursor-pointer',
            'prose-link': 'color-hex-2a56b0 dark:color-hex-7aa2f7 text-nowrap cursor-pointer border-b-2 border-hex-2a56b0 dark:border-hex-7aa2f7 !border-opacity-70 hover:!border-opacity-100 transition-border-color duration-200 decoration-none hover:bg-hex-7aa2f733 hover:font-800',
            'container-link': 'p-2 opacity-100 hover:opacity-50 cursor-pointer hover:bg-truegray-500 !bg-opacity-10 transition-colors transition-opacity duration-200',
        },
        {
            'hr-line': 'w-14 mx-auto my-8 border-solid border-1px !border-hex-d5dbe8 !dark:border-hex-2a2e42',
        },
    ],
    presets: [
        presetWind3(),
        presetAttributify(),
        presetIcons({
            scale: 1.2,
            prefix: 'i-',
            extraProperties: {
                display: 'inline-block',
            },
        }),
        presetTypography(),
    ],
    transformers: [transformerDirectives(), transformerVariantGroup()],
    safelist: [
        'i-ri-bard-line',
        'i-ri-draft-line',
        'i-carbon-campsite',
        'i-ri-arrow-go-back-line',
        'i-ri-arrow-go-forward-line',
        'i-ri-arrow-left-line',
        'i-ri-arrow-right-line',
        'i-ri-arrow-up-line',
        'i-ri-arrow-down-line',
        'i-ri-at-line',
        'i-simple-icons-github',
        'i-ri-github-line',
        'i-simple-icons-linkedin',
        'i-ri-linkedin-line',
        'i-simple-icons-instagram',
        'i-ri-instagram-line',
        'i-simple-icons-youtube',
        'i-ri-youtube-line',
        'i-simple-icons-x',
        'i-ri-twitter-x-line',
        'i-ri-map-pin-user-line',
        'i-carbon-strategy-play',
        'i-ri-bit-coin-line',
        'i-carbon-machine-learning-model',
        'i-ri-rocket-line',
        'i-ri-lightbulb-flash-line',
        'i-ri-file-copy-line',
        'i-ri-check-line',
        'i-ri-error-warning-line',
        // CV page icons (Font Awesome replacements)
        'i-fa6-solid-location-dot',
        'i-fa6-solid-phone',
        'i-fa6-solid-envelope',
        'i-fa6-brands-github',
    ],
})
