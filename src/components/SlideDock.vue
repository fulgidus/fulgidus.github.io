<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

// Makes the deck embedded in the post sticky: as soon as its top reaches the top
// of the viewport, the same iframe pins itself (top bar on small screens, bottom-left
// corner on xl+) and follows the section being read, with a 300ms fade between slides.
const props = defineProps<{
  src: string
  // how the deck takes a slide number in its URL: Marp and ready-made HTML use #N, Slidev (hash router) #/N
  engine: 'html' | 'marp' | 'slidev'
  byHeading: number[]
  labels: { label: string; open: string; minimize: string; expand: string; close: string }
}>()

const STORAGE_KEY = 'slide-dock-state'
const FADE_MS = 300
type DockState = 'open' | 'min' | 'closed'

const slide = ref(1)
const total = ref(props.byHeading.length ? Math.max(1, ...props.byHeading) : 1)
const docked = ref(false)
const state = ref<DockState>('open')
const head = ref<HTMLElement | null>(null)

const base = computed(() => props.src.replace(/#.*$/, ''))
const hashFor = (n: number) => (props.engine === 'slidev' ? `/${n}` : String(n))
const fullUrl = computed(() => `${base.value}#${hashFor(slide.value)}`)
// with no headings mapped the dock can't know which slide is showing, so it shows no counter
const counter = computed(() => (props.byHeading.length ? ` ${slide.value}/${total.value}` : ''))

let article: HTMLElement | null = null
let headings: HTMLElement[] = []
let frame: HTMLIFrameElement | null = null
let holder: HTMLElement | null = null
let stage: HTMLElement | null = null
let raf = 0
let portrait: MediaQueryList | null = null
let fadeTimer = 0
let shown = 1

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
  render()
}

function setHash(n: number) {
  shown = n
  if (!frame) return
  try {
    if (frame.contentWindow) {
      frame.contentWindow.location.hash = hashFor(n)
      return
    }
  } catch {}
  frame.src = `${base.value}#${hashFor(n)}`
}

function goTo(n: number) {
  if (n === slide.value) return
  slide.value = n
  if (!stage || state.value !== 'open') {
    setHash(n)
    return
  }
  // Fade out, switch slide at the midpoint, fade back in: 300ms in total.
  clearTimeout(fadeTimer)
  stage.classList.add('sd-fading')
  fadeTimer = window.setTimeout(() => {
    if (shown !== slide.value) setHash(slide.value)
    stage?.classList.remove('sd-fading')
  }, FADE_MS / 2)
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

function render() {
  if (!stage) return
  const on = docked.value && state.value !== 'closed'
  stage.classList.toggle('sd-docked', on)
  stage.classList.toggle('sd-min', on && state.value === 'min')
  // Mobile browsers (as they declare themselves, see BaseLayout) pin the deck full-size at the top;
  // everything else, including vertical monitors and "request desktop site", gets the corner player.
  // A mobile browser held in landscape (or a tablet) also gets the corner player.
  const topMode = document.documentElement.classList.contains('ua-mobile') && !!portrait?.matches
  holder?.classList.toggle('sd-sticky', topMode && state.value !== 'closed')
  stage.classList.toggle('sd-top', topMode)
  stage.classList.toggle('sd-corner', !topMode)
  holder?.classList.toggle('sd-min', topMode && on && state.value === 'min')
}

function update() {
  raf = 0
  if (!holder || !article) return
  // Below xl the holder is position: sticky, so its top stays at 0 while pinned.
  const top = holder.getBoundingClientRect().top
  const articleBottom = article.getBoundingClientRect().bottom
  docked.value = top <= 0.5 && articleBottom > window.innerHeight / 3
  render()
  if (docked.value && state.value !== 'closed') goTo(currentSlide())
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(update)
}

onMounted(() => {
  state.value = readState()
  article = document.querySelector('article')
  if (!article) return
  headings = Array.from(article.querySelectorAll<HTMLElement>('h2'))
  frame = article.querySelector<HTMLIFrameElement>(`iframe[src^="${base.value}"]`)
  if (!frame || !frame.parentNode) return

  // holder keeps the deck's place in the text; stage is what pins to the viewport.
  holder = document.createElement('div')
  holder.className = 'sd-holder'
  stage = document.createElement('div')
  stage.className = 'sd-stage'
  frame.parentNode.insertBefore(holder, frame)
  holder.appendChild(stage)
  if (head.value) stage.appendChild(head.value)
  stage.appendChild(frame)

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  portrait = window.matchMedia('(orientation: portrait)')
  portrait.addEventListener('change', schedule)
  update()
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  clearTimeout(fadeTimer)
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  portrait?.removeEventListener('change', schedule)
})
</script>

<template>
  <div ref="head" class="sd-head" :aria-label="labels.label">
    <button
      v-if="state === 'min'"
      type="button"
      class="sd-expand"
      :title="labels.expand"
      :aria-label="labels.expand"
      @click="setState('open')"
    >
      <span class="i-ri-slideshow-line inline-block align-middle" />
      {{ labels.label }}{{ counter }}
    </button>
    <template v-else>
      <span class="font-semibold">{{ labels.label }}{{ counter }}</span>
      <a class="sd-btn ml-auto" :href="fullUrl" target="_blank" rel="noopener" :title="labels.open" :aria-label="labels.open">
        <span class="i-ri-fullscreen-line block" />
      </a>
      <button class="sd-btn" type="button" :title="labels.minimize" :aria-label="labels.minimize" @click="setState('min')">
        <span class="i-ri-subtract-line block" />
      </button>
      <button class="sd-btn" type="button" :title="labels.close" :aria-label="labels.close" @click="setState('closed')">
        <span class="i-ri-close-line block" />
      </button>
    </template>
  </div>
</template>

<style>
.sd-holder {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: 1.25em 0;
}
.dark .sd-holder {
  /* dark backdrop while the deck loads or fades, instead of a white flash */
  background: #0d1117;
  border-radius: 0.5rem;
}
.sd-stage iframe {
  display: block;
  /* match the deck's own (light) scheme so the browser never paints an opaque white canvas behind it */
  color-scheme: light;
  background: transparent;
  width: 100% !important;
  margin: 0 !important;
  transition: opacity 150ms ease;
}
.sd-stage.sd-fading iframe {
  opacity: 0;
}
.sd-head {
  display: none;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  line-height: 1.2;
}
.sd-btn {
  opacity: 0.7;
}
.sd-btn:hover {
  opacity: 1;
}
.sd-expand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
}
.sd-stage.sd-docked {
  background: #eef5fc;
  color: #555;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.25);
  border-radius: 0.5rem;
  overflow: hidden;
}
.dark .sd-stage.sd-docked {
  background: #0d1117;
  color: #bbb;
}
.sd-stage.sd-docked .sd-head {
  display: flex;
}
.sd-stage.sd-docked.sd-min iframe {
  display: none;
}

/* Below xl: the embedded deck itself is sticky, same size, pinned to the top while the text scrolls under it. */
/* Top mode (portrait phones): the embedded deck itself is sticky, same size, pinned to the top. */
.sd-holder.sd-sticky {
  position: sticky;
  top: 0;
  z-index: 40;
}
.sd-holder.sd-min {
  aspect-ratio: auto;
}
/* Controls float over the slide so the deck keeps its exact size. */
.sd-stage.sd-top.sd-docked:not(.sd-min) .sd-head {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  z-index: 1;
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}
.sd-stage.sd-top.sd-docked:not(.sd-min) .sd-head > .font-semibold {
  display: none;
}
.sd-stage.sd-top.sd-docked:not(.sd-min) .sd-head .sd-btn {
  margin-left: 0;
}

/* Corner mode (everything else): the same element moves to the bottom-left corner. */
.sd-stage.sd-corner.sd-docked {
  position: fixed;
  z-index: 40;
  left: 1rem;
  bottom: 1rem;
  width: min(20vw, 60vh);
}
.sd-stage.sd-corner.sd-docked iframe {
  border-radius: 0 !important;
}
</style>
