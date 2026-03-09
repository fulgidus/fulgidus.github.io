<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)

function updateProgress() {
  const article = document.querySelector('article')
  if (!article) return

  const articleRect = article.getBoundingClientRect()
  const articleTop = articleRect.top + window.scrollY
  const articleHeight = articleRect.height
  const windowHeight = window.innerHeight
  const scrollY = window.scrollY

  const start = articleTop
  const end = articleTop + articleHeight - windowHeight

  if (scrollY <= start) {
    progress.value = 0
  } else if (scrollY >= end) {
    progress.value = 100
  } else {
    progress.value = ((scrollY - start) / (end - start)) * 100
  }
}

onMounted(() => {
  window.addEventListener('scroll', updateProgress, { passive: true })
  window.addEventListener('resize', updateProgress, { passive: true })
  updateProgress()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress)
  window.removeEventListener('resize', updateProgress)
})
</script>

<template>
  <div class="reading-progress-container" aria-hidden="true">
    <div class="reading-progress-bar" :style="{ width: progress + '%' }" />
  </div>
</template>

<style scoped>
.reading-progress-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 9999;
  background: transparent;
  pointer-events: none;
}
.reading-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  transition: width 0.1s linear;
  will-change: width;
}
</style>
