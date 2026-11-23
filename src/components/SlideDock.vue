<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  src: string
  byHeading: number[]
  labels: { label: string; open: string; minimize: string; expand: string; close: string }
}>()

const STORAGE_KEY = 'slide-dock-state'
type DockState = 'open' | 'min' | 'closed'

const slide = ref(1)
const total = ref(props.byHeading.length ? Math.max(1, ...props.byHeading) : 1)
const visible = ref(false)
const state = ref<DockState>('open')
const frame = ref<HTMLIFrameElement | null>(null)

const base = computed(() => props.src.replace(/#.*$/, ''))
const fullUrl = computed(() => `${base.value}#${slide.value}`)

let headings: HTMLElement[] = []
let embed: HTMLIFrameElement | null = null
let raf = 0

function readState(): DockState {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'min' || v === 'closed' ? v : 'open'
  } catch {
    return 'open'
  }
}

function setState(next: DockState) {
  state.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {}
}

function goTo(n: number) {
  if (n === slide.value) return
  slide.value = n
  const win = frame.value?.contentWindow
  try {
    if (win) {
      win.location.hash = String(n)
      return
    }
  } catch {}
  if (frame.value) frame.value.src = fullUrl.value
}

function currentSlide(): number {
  // Last h2 whose top has passed the upper third of the viewport.
  const line = window.innerHeight / 3
  let idx = -1
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].getBoundingClientRect().top <= line) idx = i
    else break
  }
  return idx < 0 ? 1 : props.byHeading[Math.min(idx, props.byHeading.length - 1)] ?? 1
}

function update() {
  raf = 0
  // Show the dock only once the full embedded deck has scrolled out of view above.
  visible.value = embed ? embed.getBoundingClientRect().bottom < 0 : true
  goTo(currentSlide())
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(update)
}

onMounted(() => {
  state.value = readState()
  const article = document.querySelector('article')
  if (!article) return
  headings = Array.from(article.querySelectorAll<HTMLElement>('h2'))
  embed = article.querySelector<HTMLIFrameElement>(`iframe[src^="${base.value}"]`)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  update()
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
})
</script>

<template>
  <!-- Mobile/tablet: pinned to the top while reading. xl+: floating mini deck bottom-left. -->
  <aside
    v-show="visible && state !== 'closed'"
    class="slide-dock fixed z-40 top-0 inset-x-0 xl:inset-x-auto xl:top-auto xl:left-4 xl:bottom-4"
    :aria-label="labels.label"
  >
    <div
      v-show="state === 'open'"
      class="w-full max-w-md mx-auto xl:w-64 overflow-hidden shadow-xl border-b xl:border xl:rounded-lg border-main bg-main"
    >
      <div class="flex items-center gap-3 px-3 py-1.5 text-xs text-main">
        <span class="font-semibold">{{ labels.label }} {{ slide }}/{{ total }}</span>
        <a class="ml-auto opacity-70 hover:opacity-100" :href="fullUrl" target="_blank" rel="noopener" :title="labels.open" :aria-label="labels.open">
          <span class="i-ri-fullscreen-line block text-base xl:text-xs" />
        </a>
        <button class="opacity-70 hover:opacity-100" type="button" :title="labels.minimize" :aria-label="labels.minimize" @click="setState('min')">
          <span class="i-ri-subtract-line block text-base xl:text-xs" />
        </button>
        <button class="opacity-70 hover:opacity-100" type="button" :title="labels.close" :aria-label="labels.close" @click="setState('closed')">
          <span class="i-ri-close-line block text-base xl:text-xs" />
        </button>
      </div>
      <!-- Always landscape, so the deck stays in single-slide mode even on portrait phones. -->
      <iframe
        ref="frame"
        :src="`${base}#1`"
        :title="labels.label"
        tabindex="-1"
        class="block w-full aspect-video border-0"
      />
    </div>
    <button
      v-show="state === 'min'"
      type="button"
      class="flex items-center gap-2 px-3 py-2 w-full xl:w-auto justify-center xl:rounded-full shadow-xl border-b xl:border border-main bg-main text-main text-sm"
      :title="labels.expand"
      :aria-label="labels.expand"
      @click="setState('open')"
    >
      <span class="i-ri-slideshow-line block" />
      {{ labels.label }} {{ slide }}/{{ total }}
      <span class="i-ri-arrow-down-s-line block xl:hidden" />
    </button>
  </aside>
</template>
