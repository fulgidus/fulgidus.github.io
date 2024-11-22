import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    {
      'bg-main': 'bg-hex-eef5fc dark:bg-hex-0d1117',
      'text-main': 'text-hex-555555 dark:text-hex-bbbbbb',
      'text-link': 'text-dark dark:text-white ',
      'border-main': 'border-truegray-300 dark:border-truegray-600',
    },
    {
      'text-title': 'text-link text-4xl font-800',
      'nav-link': 'text-link opacity-100 hover:opacity-50 transition-opacity duration-200 cursor-pointer',
        'prose-link': 'color-hex-380541 dark:color-hex-785581 text-nowrap cursor-pointer border-b-2 border-hex-380541 dark:border-hex-785581 !border-opacity-70 hover:!border-opacity-100 transition-border-color duration-200 decoration-none hover:bg-hex-88559190 before:content-[" "] after:content-[" "] hover:font-800',
      'container-link': 'p-2 opacity-100 hover:opacity-50 cursor-pointer hover:bg-truegray-500 !bg-opacity-10 transition-colors transition-opacity duration-200',
    },
    {
      'hr-line': 'w-14 mx-auto my-8 border-solid border-1px !border-truegray-200 !dark:border-truegray-800',
    },
  ],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      prefix: 'i-',
      extraProperties: {
        display: 'inline-block',
      },
    }),
    presetTypography(),
    presetWebFonts({
        provider: 'google',
        fonts: {
            title: 'Inter:400,600,800',
            sans: 'Roboto',
            mono: ['Fira Code', 'Fira Mono:400,700'],
        },
    }),
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
  ],
})
