<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { onMounted, ref, watch } from 'vue'

const isDark = useDark()
const container = ref<HTMLElement | null>(null)

function getTheme() {
  return isDark.value ? 'dark_dimmed' : 'light'
}

function loadGiscus() {
  if (!container.value) return
  // Clear any existing iframe
  container.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'fulgidus/fulgidus.github.io')
  script.setAttribute('data-repo-id', 'R_kgDONTPDUQ') // Fill after enabling Discussions
  script.setAttribute('data-category', 'Blog Comments')
  script.setAttribute('data-category-id', 'DIC_kwDONTPDUc4C4CuR') // Fill after enabling Discussions
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'top')
  script.setAttribute('data-theme', getTheme())
  script.setAttribute('data-lang', 'en')
  script.setAttribute('data-loading', 'lazy')
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  container.value.appendChild(script)
}

function updateTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
  if (iframe) {
    iframe.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: getTheme() } } },
      'https://giscus.app'
    )
  }
}

onMounted(() => {
  loadGiscus()
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
