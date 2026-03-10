<script setup lang="ts">
/**
 * MarpViewer — Vue slide viewer for pre-compiled Marp presentations.
 *
 * Renders the compiled Marp HTML inside an <iframe> for complete CSS
 * isolation (Marp's universal CSS reset and theme styles must not leak
 * into the host page). Navigation is controlled via postMessage.
 *
 * Features:
 * - iframe-isolated rendering (no CSS leaks)
 * - Keyboard navigation (Left/Right, Home/End, Space, F for fullscreen)
 * - Touch swipe navigation (via transparent overlay)
 * - Click navigation (left 25% = prev, right 75% = next)
 * - Fullscreen toggle
 * - Dark mode sync (site theme → Marp .invert class)
 * - Slide counter
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const isFullscreen = ref(false)
const isDark = ref(false)
const iframeReady = ref(false)

// DOM refs
const viewerRef = ref<HTMLElement | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)

// The complete HTML to load in the iframe
const iframeSrcdoc = ref('')

// Touch handling
const touchStartX = ref(0)
const touchStartY = ref(0)
const SWIPE_THRESHOLD = 50

// Dark mode observer
let darkModeObserver: MutationObserver | null = null

// Aspect ratio computed
const paddingBottom = computed(() => {
    return props.aspectRatio === '4:3' ? '75%' : '56.25%'
})

/**
 * Detect the site's current dark mode state from the root element class.
 */
function detectDarkMode() {
    isDark.value = document.documentElement.classList.contains('dark')
}

/**
 * Load the compiled Marp HTML file, inject slide navigation
 * CSS/JS, and set it as the iframe's srcdoc.
 */
async function loadPresentation() {
    isLoading.value = true
    loadError.value = null
    iframeReady.value = false

    try {
        const response = await fetch(`/marp/${props.name}.html`)
        if (!response.ok) {
            throw new Error(`Failed to load presentation: ${response.status}`)
        }

        let html = await response.text()

        // Count slides from the source HTML
        const svgMatches = html.match(/<svg[^>]*data-marpit-svg/g)
        totalSlides.value = svgMatches ? svgMatches.length : 0

        // Inject slide navigation CSS — hide all slides except the active one
        const navCss = [
            '<style id="marp-nav">',
            'body { margin: 0; overflow: hidden; }',
            'div.marpit > svg[data-marpit-svg] { display: none !important; }',
            'div.marpit > svg[data-marpit-svg].marp-active {',
            '  display: block !important;',
            '  width: 100vw !important;',
            '  height: 100vh !important;',
            '}',
            '</style>',
        ].join('\n')

        // Inject navigation script — listens for postMessage commands
        // Note: closing script tag is split to avoid breaking the Vue SFC parser
        const closeScriptTag = '<' + '/script>'
        const navScript = [
            '<script>',
            '(function() {',
            '  function showSlide(n) {',
            '    document.querySelectorAll("svg[data-marpit-svg]").forEach(function(s, i) {',
            '      if (i === n) s.classList.add("marp-active");',
            '      else s.classList.remove("marp-active");',
            '    });',
            '  }',
            '  function setDarkMode(dark) {',
            '    document.querySelectorAll("section").forEach(function(s) {',
            '      if (dark) s.classList.add("invert");',
            '      else s.classList.remove("invert");',
            '    });',
            '  }',
            '  window.addEventListener("message", function(e) {',
            '    if (!e.data) return;',
            '    if (e.data.type === "marp-goto") showSlide(e.data.slide);',
            '    if (e.data.type === "marp-theme") setDarkMode(e.data.dark);',
            '  });',
            '  showSlide(0);',
            '})();',
            closeScriptTag,
        ].join('\n')

        // Inject into the HTML document
        html = html.replace('</head>', navCss + '\n</head>')
        html = html.replace('</body>', navScript + '\n</body>')

        iframeSrcdoc.value = html
        currentSlide.value = 0
        isLoading.value = false
    } catch (e: unknown) {
        loadError.value = e instanceof Error ? e.message : String(e)
        isLoading.value = false
    }
}

/**
 * Send a message to the iframe's content window.
 */
function postToIframe(message: Record<string, unknown>) {
    iframeRef.value?.contentWindow?.postMessage(message, '*')
}

/**
 * Sync current slide index and dark mode state to the iframe.
 */
function syncState() {
    postToIframe({ type: 'marp-goto', slide: currentSlide.value })
    postToIframe({ type: 'marp-theme', dark: isDark.value })
}

/**
 * Called when the iframe finishes loading its srcdoc content.
 */
function onIframeLoad() {
    iframeReady.value = true
    // Give the iframe a moment to initialize its script
    setTimeout(syncState, 50)
}

// ── Navigation ──────────────────────────────────────────────

function goToSlide(n: number) {
    if (n >= 0 && n < totalSlides.value) {
        currentSlide.value = n
        postToIframe({ type: 'marp-goto', slide: n })
    }
}

function nextSlide() {
    if (currentSlide.value < totalSlides.value - 1) {
        goToSlide(currentSlide.value + 1)
    }
}

function prevSlide() {
    if (currentSlide.value > 0) {
        goToSlide(currentSlide.value - 1)
    }
}

// ── Keyboard ────────────────────────────────────────────────

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

// ── Touch / Click ───────────────────────────────────────────

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

/**
 * Click on the slide overlay: left 25% = previous, right 75% = next.
 */
function handleOverlayClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.25) {
        prevSlide()
    } else {
        nextSlide()
    }
}

// ── Fullscreen ──────────────────────────────────────────────

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

// ── Computed ────────────────────────────────────────────────

const slideCounterText = computed(() => {
    const template = t.value('marp.slideOf')
    return template
        .replace('{current}', String(currentSlide.value + 1))
        .replace('{total}', String(totalSlides.value))
})

// ── Watchers ────────────────────────────────────────────────

// Sync dark mode changes to iframe
watch(isDark, (dark) => {
    postToIframe({ type: 'marp-theme', dark })
})

// Reload when presentation name changes
watch(() => props.name, () => {
    loadPresentation()
})

// ── Lifecycle ───────────────────────────────────────────────

function updateLangFromUrl() {
    currentLang.value = getLangFromUrl(window.location.pathname) as Languages
}

onMounted(() => {
    updateLangFromUrl()
    detectDarkMode()

    // Watch for dark mode changes on <html> class
    darkModeObserver = new MutationObserver(() => detectDarkMode())
    darkModeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
    })

    document.addEventListener('astro:page-load', updateLangFromUrl)
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    loadPresentation()
})

onUnmounted(() => {
    darkModeObserver?.disconnect()
    document.removeEventListener('astro:page-load', updateLangFromUrl)
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
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
                class="marp-viewer__slide-wrapper"
                :style="{ paddingBottom: isFullscreen ? '0' : paddingBottom }"
            >
                <!-- Isolated iframe for Marp content -->
                <iframe
                    ref="iframeRef"
                    class="marp-viewer__iframe"
                    :srcdoc="iframeSrcdoc"
                    sandbox="allow-scripts"
                    frameborder="0"
                    title="Slide presentation"
                    @load="onIframeLoad"
                />
                <!-- Transparent overlay captures touch/click for navigation -->
                <div
                    class="marp-viewer__overlay"
                    @touchstart.passive="handleTouchStart"
                    @touchend.passive="handleTouchEnd"
                    @click="handleOverlayClick"
                />
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
    background: #000;
}

.marp-viewer--fullscreen .marp-viewer__slide-wrapper {
    flex: 1;
    padding-bottom: 0 !important;
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

.marp-viewer__iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
}

.marp-viewer__overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    cursor: pointer;
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
