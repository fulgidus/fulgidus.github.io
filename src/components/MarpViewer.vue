<script setup lang="ts">
/**
 * MarpViewer — Vue slide viewer for pre-compiled Marp presentations.
 *
 * Loads self-contained Marp HTML from /marp/{name}.html and displays
 * slides one-at-a-time with navigation controls.
 *
 * Features:
 * - Keyboard navigation (Left/Right arrows, Home/End)
 * - Touch swipe navigation
 * - Fullscreen toggle
 * - Slide counter
 * - Responsive sizing
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getLangFromUrl, useTranslate } from '@/i18n/utils'

interface Props {
    /** Name of the marp file (without extension), e.g. "introduction-to-marp" */
    name: string
    /** Aspect ratio for the slide container */
    aspectRatio?: '16:9' | '4:3'
    /** Whether to show in embedded (inline) mode vs standalone */
    embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    aspectRatio: '16:9',
    embedded: false,
})

const currentLang = ref<Languages>(defaultLang)
const t = computed(() => useTranslate(currentLang.value))

// Slide state
const currentSlide = ref(0)
const totalSlides = ref(0)
const slideHtmlParts = ref<string[]>([])
const slideCss = ref('')
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const isFullscreen = ref(false)

// DOM refs
const viewerRef = ref<HTMLElement | null>(null)
const slideContainerRef = ref<HTMLElement | null>(null)

// Touch handling
const touchStartX = ref(0)
const touchStartY = ref(0)
const SWIPE_THRESHOLD = 50

// Aspect ratio computed
const paddingBottom = computed(() => {
    return props.aspectRatio === '4:3' ? '75%' : '56.25%'
})

/**
 * Load and parse the compiled Marp HTML.
 * Splits it into individual slide sections.
 */
async function loadPresentation() {
    isLoading.value = true
    loadError.value = null

    try {
        const response = await fetch(`/marp/${props.name}.html`)
        if (!response.ok) {
            throw new Error(`Failed to load presentation: ${response.status}`)
        }

        const html = await response.text()

        // Extract CSS from <style> tags
        const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
        if (styleMatches) {
            slideCss.value = styleMatches
                .map(s => s.replace(/<\/?style[^>]*>/gi, ''))
                .join('\n')
        }

        // Extract individual slides from the Marp HTML
        // Marp renders slides as <svg data-marpit-svg viewBox="..."><foreignObject><section>...</section></foreignObject></svg>
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const svgSlides = doc.querySelectorAll('svg[data-marpit-svg]')

        if (svgSlides.length > 0) {
            slideHtmlParts.value = Array.from(svgSlides).map(svg => svg.outerHTML)
        } else {
            // Fallback: try to find <section> elements
            const sections = doc.querySelectorAll('section')
            slideHtmlParts.value = Array.from(sections).map(s => s.outerHTML)
        }

        totalSlides.value = slideHtmlParts.value.length
        currentSlide.value = 0
        isLoading.value = false
    } catch (e: unknown) {
        loadError.value = e instanceof Error ? e.message : String(e)
        isLoading.value = false
    }
}

// Navigation
function nextSlide() {
    if (currentSlide.value < totalSlides.value - 1) {
        currentSlide.value++
    }
}

function prevSlide() {
    if (currentSlide.value > 0) {
        currentSlide.value--
    }
}

function goToSlide(n: number) {
    if (n >= 0 && n < totalSlides.value) {
        currentSlide.value = n
    }
}

// Keyboard handling
function handleKeydown(e: KeyboardEvent) {
    // Only handle if viewer is focused or in fullscreen
    if (!isFullscreen.value && !viewerRef.value?.contains(document.activeElement)) {
        return
    }

    switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
            e.preventDefault()
            nextSlide()
            break
        case 'ArrowLeft':
        case 'ArrowUp':
            e.preventDefault()
            prevSlide()
            break
        case 'Home':
            e.preventDefault()
            goToSlide(0)
            break
        case 'End':
            e.preventDefault()
            goToSlide(totalSlides.value - 1)
            break
        case 'Escape':
            if (isFullscreen.value) {
                toggleFullscreen()
            }
            break
        case 'f':
        case 'F':
            e.preventDefault()
            toggleFullscreen()
            break
    }
}

// Touch handling
function handleTouchStart(e: TouchEvent) {
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
}

function handleTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.value
    const dy = e.changedTouches[0].clientY - touchStartY.value

    // Only handle horizontal swipes (ignore vertical scrolls)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) nextSlide()
        else prevSlide()
    }
}

// Fullscreen
async function toggleFullscreen() {
    if (!viewerRef.value) return

    if (!document.fullscreenElement) {
        try {
            await viewerRef.value.requestFullscreen()
            isFullscreen.value = true
        } catch {
            // Fullscreen not supported
        }
    } else {
        await document.exitFullscreen()
        isFullscreen.value = false
    }
}

function handleFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
}

// Current slide HTML
const currentSlideHtml = computed(() => {
    return slideHtmlParts.value[currentSlide.value] || ''
})

// Slide counter text
const slideCounterText = computed(() => {
    const template = t.value('marp.slideOf')
    return template
        .replace('{current}', String(currentSlide.value + 1))
        .replace('{total}', String(totalSlides.value))
})

// Lifecycle
function updateLangFromUrl() {
    currentLang.value = getLangFromUrl(window.location.pathname) as Languages
}

onMounted(() => {
    updateLangFromUrl()
    document.addEventListener('astro:page-load', updateLangFromUrl)
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    loadPresentation()
})

onUnmounted(() => {
    document.removeEventListener('astro:page-load', updateLangFromUrl)
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

// Reload when name changes
watch(() => props.name, () => {
    loadPresentation()
})
</script>

<template>
    <div
        ref="viewerRef"
        class="marp-viewer"
        :class="{ 'marp-viewer--fullscreen': isFullscreen, 'marp-viewer--embedded': embedded }"
        tabindex="0"
        role="region"
        aria-label="Slide presentation"
    >
        <!-- Loading state -->
        <div v-if="isLoading" class="marp-viewer__loading">
            <div class="marp-viewer__spinner" />
            <span>Loading presentation...</span>
        </div>

        <!-- Error state -->
        <div v-else-if="loadError" class="marp-viewer__error">
            <span>{{ loadError }}</span>
        </div>

        <!-- Slide display -->
        <template v-else>
            <!-- Slide container with aspect ratio -->
            <div
                ref="slideContainerRef"
                class="marp-viewer__slide-wrapper"
                :style="{ paddingBottom: isFullscreen ? '0' : paddingBottom }"
                @touchstart="handleTouchStart"
                @touchend="handleTouchEnd"
                @click.self="nextSlide"
            >
                <div class="marp-viewer__slide" v-html="currentSlideHtml" />
                <!-- Inject Marp CSS via a scoped style element -->
                <component :is="'style'" v-if="slideCss">{{ slideCss }}</component>
            </div>

            <!-- Controls bar -->
            <div class="marp-viewer__controls">
                <div class="marp-viewer__nav">
                    <button
                        class="marp-viewer__btn"
                        :disabled="currentSlide === 0"
                        :aria-label="t('marp.previous')"
                        :title="t('marp.previous')"
                        @click="prevSlide"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <span class="marp-viewer__counter">
                        {{ slideCounterText }}
                    </span>

                    <button
                        class="marp-viewer__btn"
                        :disabled="currentSlide === totalSlides - 1"
                        :aria-label="t('marp.next')"
                        :title="t('marp.next')"
                        @click="nextSlide"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div class="marp-viewer__actions">
                    <button
                        class="marp-viewer__btn"
                        :aria-label="isFullscreen ? t('marp.exitFullscreen') : t('marp.fullscreen')"
                        :title="isFullscreen ? t('marp.exitFullscreen') : t('marp.fullscreen')"
                        @click="toggleFullscreen"
                    >
                        <!-- Fullscreen icon -->
                        <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                        <!-- Exit fullscreen icon -->
                        <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.marp-viewer {
    position: relative;
    width: 100%;
    border: 1px solid var(--c-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: var(--c-bg, #fff);
    outline: none;
}

.marp-viewer:focus-visible {
    box-shadow: 0 0 0 2px var(--c-brand, #3b82f6);
}

.marp-viewer--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    border-radius: 0;
    border: none;
    display: flex;
    flex-direction: column;
}

.marp-viewer--fullscreen .marp-viewer__slide-wrapper {
    flex: 1;
    padding-bottom: 0 !important;
}

.marp-viewer--fullscreen .marp-viewer__slide {
    position: relative;
    width: 100%;
    height: 100%;
}

.marp-viewer__loading,
.marp-viewer__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: var(--c-text-muted, #6b7280);
}

.marp-viewer__error {
    color: var(--c-danger, #ef4444);
}

.marp-viewer__spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid var(--c-border, #e5e7eb);
    border-top-color: var(--c-brand, #3b82f6);
    border-radius: 50%;
    animation: marp-spin 0.8s linear infinite;
}

@keyframes marp-spin {
    to { transform: rotate(360deg); }
}

.marp-viewer__slide-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: #000;
}

.marp-viewer__slide {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Make Marp SVG slides fill the container */
.marp-viewer__slide :deep(svg[data-marpit-svg]) {
    width: 100%;
    height: 100%;
}

/* Make section elements in Marp fill their foreignObject */
.marp-viewer__slide :deep(section) {
    width: 100%;
    height: 100%;
}

.marp-viewer__controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--c-bg-mute, #f3f4f6);
    border-top: 1px solid var(--c-border, #e5e7eb);
}

.marp-viewer__nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.marp-viewer__counter {
    font-size: 0.875rem;
    color: var(--c-text-muted, #6b7280);
    min-width: 8rem;
    text-align: center;
    user-select: none;
}

.marp-viewer__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.marp-viewer__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--c-text, #1f2937);
    cursor: pointer;
    transition: background-color 0.15s, opacity 0.15s;
}

.marp-viewer__btn:hover:not(:disabled) {
    background: var(--c-bg-hover, #e5e7eb);
}

.marp-viewer__btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* Dark mode support */
:root.dark .marp-viewer {
    border-color: var(--c-border, #374151);
    background: var(--c-bg, #1f2937);
}

:root.dark .marp-viewer__controls {
    background: var(--c-bg-mute, #111827);
    border-top-color: var(--c-border, #374151);
}

:root.dark .marp-viewer__btn {
    color: var(--c-text, #f3f4f6);
}

:root.dark .marp-viewer__btn:hover:not(:disabled) {
    background: var(--c-bg-hover, #374151);
}
</style>
