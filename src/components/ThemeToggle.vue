<script lang="ts" setup>
import { useDark, useToggle } from '@vueuse/core'
import { onMounted, onUnmounted, watchEffect } from 'vue'

const isDark = useDark()

const toggleDark = useToggle(isDark)

watchEffect(() => {
  if (isDark.value) {
    setDarkMode(document)
  }
})

function setDarkMode(doc: Document) {
  if (isDark.value) {
    doc.documentElement.classList.add('dark')
  }
}

function handleBeforeSwap(event: any) {
  setDarkMode(event.newDocument)
}

onMounted(() => {
  document.addEventListener('astro:before-swap', handleBeforeSwap)
})

onUnmounted(() => {
  document.removeEventListener('astro:before-swap', handleBeforeSwap)
})

function toggleTheme(event: MouseEvent) {
  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )
  if (!document.startViewTransition) {
    toggleDark()
    return
  }

  const transition = document.startViewTransition(async () => {
    toggleDark()
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ]
    document.documentElement.animate(
      {
        clipPath: isDark.value ? [...clipPath].reverse() : clipPath,
      },
      {
        duration: 400,
        easing: 'ease-in',
        pseudoElement: isDark.value
          ? '::view-transition-old(root)'
          : '::view-transition-new(root)',
      },
    )
  })
}
</script>

<template>
  <button :aria-label="isDark ? 'Dark Theme' : 'Light Theme'" nav-link dark:i-ri-moon-line i-ri-sun-line @click="toggleTheme" />
</template>
