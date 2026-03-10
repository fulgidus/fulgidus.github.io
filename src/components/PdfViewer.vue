<script setup lang="ts">
/**
 * PdfViewer — Vue component for viewing PDF presentations.
 *
 * Uses pdf.js (pdfjs-dist) for client-side PDF rendering with the same
 * UX as MarpViewer: page navigation, keyboard shortcuts, fullscreen toggle.
 *
 * Features:
 * - Canvas-based PDF rendering via pdf.js
 * - Page navigation (prev/next, Home/End)
 * - Keyboard shortcuts (Left/Right, Space, F for fullscreen)
 * - Fullscreen toggle
 * - Responsive scaling
 * - Lazy-loaded (use client:visible)
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getLangFromUrl, useTranslate } from '@/i18n/utils'

interface Props {
    /** URL to the PDF file */
    src: string
}

const props = defineProps<Props>()

const currentLang = ref<Languages>(defaultLang)
const t = computed(() => useTranslate(currentLang.value))

// State
const currentPage = ref(1)
const totalPages = ref(0)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const isFullscreen = ref(false)
const scale = ref(1)

// DOM refs
const viewerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// pdf.js state
let pdfDoc: any = null

/**
 * Load pdf.js and the PDF document.
 */
async function loadPdf() {
    isLoading.value = true
    loadError.value = null

    try {
        // Dynamic import of pdf.js
        const pdfjsLib = await import('pdfjs-dist')

        // Set up worker — use CDN for the worker file
        const version = pdfjsLib.version
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument(props.src)
        pdfDoc = await loadingTask.promise
        totalPages.value = pdfDoc.numPages
        currentPage.value = 1

        isLoading.value = false
        await nextTick()
        await renderPage(1)
    } catch (e: unknown) {
        loadError.value = e instanceof Error ? e.message : String(e)
        isLoading.value = false
    }
}

/**
 * Render a specific page to the canvas.
 */
async function renderPage(pageNum: number) {
    if (!pdfDoc || !canvasRef.value) return

    const page = await pdfDoc.getPage(pageNum)

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate scale to fit container width
    const containerWidth = canvas.parentElement?.clientWidth || 800
    const viewport = page.getViewport({ scale: 1 })
    const fitScale = containerWidth / viewport.width
    const scaledViewport = page.getViewport({ scale: fitScale * (window.devicePixelRatio || 1) })

    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${(containerWidth * viewport.height) / viewport.width}px`

    scale.value = fitScale

    await page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
    }).promise
}

// ── Navigation ──────────────────────────────────────────────

function goToPage(n: number) {
    if (n >= 1 && n <= totalPages.value) {
        currentPage.value = n
        renderPage(n)
    }
}

function nextPage() {
    if (currentPage.value < totalPages.value) {
        goToPage(currentPage.value + 1)
    }
}

function prevPage() {
    if (currentPage.value > 1) {
        goToPage(currentPage.value - 1)
    }
}

// ── Keyboard ────────────────────────────────────────────────

function handleKeydown(e: KeyboardEvent) {
    if (!isFullscreen.value && !viewerRef.value?.contains(document.activeElement)) {
        return
    }

    switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
            e.preventDefault()
            nextPage()
            break
        case 'ArrowLeft':
        case 'ArrowUp':
            e.preventDefault()
            prevPage()
            break
        case 'Home':
            e.preventDefault()
            goToPage(1)
            break
        case 'End':
            e.preventDefault()
            goToPage(totalPages.value)
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
    // Re-render at new size after fullscreen change
    if (pdfDoc) {
        nextTick(() => renderPage(currentPage.value))
    }
}

// ── Resize handling ─────────────────────────────────────────

let resizeObserver: ResizeObserver | null = null

function handleResize() {
    if (pdfDoc && !isLoading.value) {
        renderPage(currentPage.value)
    }
}

// ── Computed ────────────────────────────────────────────────

const pageCounterText = computed(() => {
    const template = t.value('marp.slideOf')
    return template
        .replace('{current}', String(currentPage.value))
        .replace('{total}', String(totalPages.value))
})

// ── Watchers ────────────────────────────────────────────────

watch(() => props.src, () => {
    loadPdf()
})

// ── Lifecycle ───────────────────────────────────────────────

function updateLangFromUrl() {
    currentLang.value = getLangFromUrl(window.location.pathname) as Languages
}

onMounted(() => {
    updateLangFromUrl()
    document.addEventListener('astro:page-load', updateLangFromUrl)
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Watch for container resize
    if (viewerRef.value) {
        resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(viewerRef.value)
    }

    loadPdf()
})

onUnmounted(() => {
    document.removeEventListener('astro:page-load', updateLangFromUrl)
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    resizeObserver?.disconnect()
    pdfDoc?.destroy()
})
</script>

<template>
    <div
        ref="viewerRef"
        class="pdf-viewer"
        :class="{ 'pdf-viewer--fullscreen': isFullscreen }"
        tabindex="0"
        role="region"
        aria-label="PDF presentation"
    >
        <!-- Loading state -->
        <div v-if="isLoading" class="pdf-viewer__loading">
            <div class="pdf-viewer__spinner" />
            <span>Loading PDF...</span>
        </div>

        <!-- Error state -->
        <div v-else-if="loadError" class="pdf-viewer__error">
            <span>{{ loadError }}</span>
        </div>

        <!-- PDF display -->
        <template v-else>
            <div class="pdf-viewer__canvas-wrapper">
                <canvas ref="canvasRef" class="pdf-viewer__canvas" />
            </div>

            <!-- Controls bar -->
            <div class="pdf-viewer__controls">
                <div class="pdf-viewer__nav">
                    <button
                        class="pdf-viewer__btn"
                        :disabled="currentPage === 1"
                        :aria-label="t('marp.previous')"
                        :title="t('marp.previous')"
                        @click="prevPage"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <span class="pdf-viewer__counter">
                        {{ pageCounterText }}
                    </span>

                    <button
                        class="pdf-viewer__btn"
                        :disabled="currentPage === totalPages"
                        :aria-label="t('marp.next')"
                        :title="t('marp.next')"
                        @click="nextPage"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div class="pdf-viewer__actions">
                    <button
                        class="pdf-viewer__btn"
                        :aria-label="isFullscreen ? t('marp.exitFullscreen') : t('marp.fullscreen')"
                        :title="isFullscreen ? t('marp.exitFullscreen') : t('marp.fullscreen')"
                        @click="toggleFullscreen"
                    >
                        <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
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
.pdf-viewer {
    position: relative;
    width: 100%;
    border: 1px solid var(--c-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: var(--c-bg, #fff);
    outline: none;
}

.pdf-viewer:focus-visible {
    box-shadow: 0 0 0 2px var(--c-brand, #3b82f6);
}

.pdf-viewer--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    border-radius: 0;
    border: none;
    display: flex;
    flex-direction: column;
    background: #000;
}

.pdf-viewer--fullscreen .pdf-viewer__canvas-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pdf-viewer__loading,
.pdf-viewer__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: var(--c-text-muted, #6b7280);
}

.pdf-viewer__error {
    color: var(--c-danger, #ef4444);
}

.pdf-viewer__spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid var(--c-border, #e5e7eb);
    border-top-color: var(--c-brand, #3b82f6);
    border-radius: 50%;
    animation: pdf-spin 0.8s linear infinite;
}

@keyframes pdf-spin {
    to { transform: rotate(360deg); }
}

.pdf-viewer__canvas-wrapper {
    width: 100%;
    background: #525659;
    display: flex;
    justify-content: center;
}

.pdf-viewer__canvas {
    display: block;
    max-width: 100%;
}

.pdf-viewer__controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--c-bg-mute, #f3f4f6);
    border-top: 1px solid var(--c-border, #e5e7eb);
}

.pdf-viewer__nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.pdf-viewer__counter {
    font-size: 0.875rem;
    color: var(--c-text-muted, #6b7280);
    min-width: 8rem;
    text-align: center;
    user-select: none;
}

.pdf-viewer__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pdf-viewer__btn {
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

.pdf-viewer__btn:hover:not(:disabled) {
    background: var(--c-bg-hover, #e5e7eb);
}

.pdf-viewer__btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* Dark mode support */
:root.dark .pdf-viewer {
    border-color: var(--c-border, #374151);
    background: var(--c-bg, #1f2937);
}

:root.dark .pdf-viewer__controls {
    background: var(--c-bg-mute, #111827);
    border-top-color: var(--c-border, #374151);
}

:root.dark .pdf-viewer__btn {
    color: var(--c-text, #f3f4f6);
}

:root.dark .pdf-viewer__btn:hover:not(:disabled) {
    background: var(--c-bg-hover, #374151);
}
</style>
