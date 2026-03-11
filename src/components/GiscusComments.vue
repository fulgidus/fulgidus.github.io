<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getLangFromUrl, getGiscusLocale, stripLangFromPath } from '@/i18n/utils'

const props = defineProps<{
  lang?: string
}>()

const isDark = useDark()
const container = ref<HTMLElement | null>(null)
const currentLang = ref<string>(props.lang ?? defaultLang)

function getTheme() {
  return isDark.value ? 'dark_dimmed' : 'light'
}

/**
 * Detects the page language from the URL path.
 * Uses the prop value if provided, otherwise extracts from the pathname.
 */
function detectLang(): string {
  if (props.lang) return props.lang
  return getLangFromUrl(window.location.pathname)
}

/**
 * Returns a canonical (language-stripped) path for comment isolation.
 *
 * COMMENT ISOLATION STRATEGY: Shared across languages.
 *
 * Comments are shared between language versions of the same post by using
 * the canonical (English/default) slug as the discussion term. This means:
 * - /posts/my-article and /it/posts/my-article share the same discussion thread
 * - The Giscus UI language matches the reader's current page language
 * - Cross-language community interaction is encouraged
 * - Discussion is not fragmented across language versions
 *
 * We use data-mapping="specific" with data-term set to the canonical path
 * so that all language variants map to the same GitHub Discussion.
 */
function getCanonicalPath(): string {
  const pathname = window.location.pathname
  return stripLangFromPath(pathname)
}

function loadGiscus() {
  if (!container.value) return
  // Clear any existing iframe
  container.value.innerHTML = ''

  const lang = detectLang()
  currentLang.value = lang
  const giscusLocale = getGiscusLocale(lang)
  const canonicalPath = getCanonicalPath()

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'fulgidus/fulgidus.github.io')
  script.setAttribute('data-repo-id', 'R_kgDONTPDUQ')
  script.setAttribute('data-category', 'Blog Comments')
  script.setAttribute('data-category-id', 'DIC_kwDONTPDUc4C4CuR')
  // Use "specific" mapping with a canonical (lang-stripped) path as the term.
  // This ensures all language versions of a post share the same discussion thread.
  script.setAttribute('data-mapping', 'specific')
  script.setAttribute('data-term', canonicalPath)
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'top')
  script.setAttribute('data-theme', getTheme())
  script.setAttribute('data-lang', giscusLocale)
  script.setAttribute('data-loading', 'lazy')
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  container.value.appendChild(script)
}

/**
 * Updates Giscus theme via postMessage (lightweight, no reload needed).
 */
function updateTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
  if (iframe) {
    iframe.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: getTheme() } } },
      'https://giscus.app'
    )
  }
}

/**
 * Handles View Transition navigation (astro:page-load).
 * Detects if the language changed and reloads Giscus to update both the
 * UI locale and the canonical discussion term.
 */
function onPageLoad() {
  const newLang = detectLang()
  if (newLang !== currentLang.value) {
    // Language changed — full reload needed since Giscus doesn't support
    // changing language via postMessage setConfig
    loadGiscus()
  }
}

onMounted(() => {
  loadGiscus()
  document.addEventListener('astro:page-load', onPageLoad)
})

onUnmounted(() => {
  document.removeEventListener('astro:page-load', onPageLoad)
})

watch(isDark, () => {
  updateTheme()
})
</script>

<template>
  <div ref="container" class="giscus-container mt-8" />
</template>

<style scoped>
.giscus-container {
  min-height: 150px;
}
</style>
