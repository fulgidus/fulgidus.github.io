<script setup lang="ts">
/**
 * MarpDownloads — Theme-aware download buttons for presentation files.
 *
 * Accepts download items as props (no JSON fetch). Each item specifies
 * a label, href, file type for badge coloring, and an optional theme
 * variant ('light' | 'dark') for PDF files.
 *
 * When both light and dark PDF variants are provided, only the one
 * matching the current site theme is shown. A MutationObserver watches
 * the root element's class list and swaps the PDF link in real time
 * when the user toggles dark mode.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getLangFromUrl, useTranslate } from '@/i18n/utils'

interface DownloadItem {
    /** Display label (e.g. "PDF", "PPTX", "MD") */
    label: string
    /** Download URL */
    href: string
    /** File type for badge styling (e.g. "pdf", "pptx", "md", "html") */
    type: string
    /** Theme variant for PDFs: 'light' or 'dark'. Omit for non-variant items. */
    variant?: 'light' | 'dark'
    /** Human-readable file size (e.g. "103 KB"). Computed at build time. */
    size?: string
}

interface Props {
    /** Download items to display */
    items: DownloadItem[]
}

const props = defineProps<Props>()

const currentLang = ref<Languages>(defaultLang)
const t = computed(() => useTranslate(currentLang.value))

// Track the site's current dark mode state
const isDark = ref(false)

// Dark mode observer
let darkModeObserver: MutationObserver | null = null

function detectDarkMode() {
    isDark.value = document.documentElement.classList.contains('dark')
}

/**
 * Filter items to show only the PDF variant matching the current theme.
 * Non-PDF items and PDFs without a variant are always shown.
 * When both light and dark PDF variants exist, only the matching one is shown.
 */
const visibleItems = computed(() => {
    const currentVariant = isDark.value ? 'dark' : 'light'

    // Check if we have variant-specific PDFs
    const hasLightPdf = props.items.some(i => i.type === 'pdf' && i.variant === 'light')
    const hasDarkPdf = props.items.some(i => i.type === 'pdf' && i.variant === 'dark')
    const hasBothVariants = hasLightPdf && hasDarkPdf

    return props.items.filter(item => {
        // Non-PDF items: always show
        if (item.type !== 'pdf') return true

        // PDF without variant: always show (e.g. pre-built PDFs from src prop)
        if (!item.variant) return true

        // If we have both variants, show only the matching one
        if (hasBothVariants) {
            return item.variant === currentVariant
        }

        // Only one variant available: show it regardless
        return true
    })
})

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
})

onUnmounted(() => {
    darkModeObserver?.disconnect()
    document.removeEventListener('astro:page-load', updateLangFromUrl)
})
</script>

<template>
    <div v-if="visibleItems.length > 0" class="marp-downloads">
        <span class="marp-downloads__label">{{ t('marp.downloads') }}:</span>
        <div class="marp-downloads__buttons">
            <a
                v-for="dl in visibleItems"
                :key="dl.type + (dl.variant || '') + dl.href"
                :href="dl.href"
                :download="true"
                class="marp-downloads__btn"
                :title="dl.label"
            >
                <!-- File type badge -->
                <span class="marp-downloads__badge" :data-type="dl.type">
                    {{ dl.label }}
                </span>
                <!-- File size -->
                <span v-if="dl.size" class="marp-downloads__size">
                    {{ dl.size }}
                </span>
                <!-- Download icon -->
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="marp-downloads__icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            </a>
        </div>
    </div>
</template>

<style scoped>
.marp-downloads {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
}

.marp-downloads__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text-muted, #6b7280);
}

.marp-downloads__buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.marp-downloads__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--c-border, #e5e7eb);
    border-radius: 6px;
    background: var(--c-bg, #fff);
    color: var(--c-text, #1f2937);
    text-decoration: none;
    font-size: 0.8125rem;
    transition: background-color 0.15s, border-color 0.15s;
    cursor: pointer;
}

.marp-downloads__btn:hover {
    background: var(--c-bg-mute, #f3f4f6);
    border-color: var(--c-brand, #3b82f6);
    text-decoration: none;
}

.marp-downloads__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #fff;
    background: #6b7280;
}

.marp-downloads__badge[data-type="pdf"] {
    background: #ef4444;
}

.marp-downloads__badge[data-type="pptx"] {
    background: #f97316;
}

.marp-downloads__badge[data-type="md"] {
    background: #3b82f6;
}

.marp-downloads__badge[data-type="html"] {
    background: #10b981;
}

.marp-downloads__icon {
    opacity: 0.5;
    flex-shrink: 0;
}

.marp-downloads__size {
    font-size: 0.6875rem;
    color: var(--c-text-muted, #6b7280);
    opacity: 0.8;
}

/* Dark mode */
:root.dark .marp-downloads__btn {
    border-color: var(--c-border, #374151);
    background: var(--c-bg, #1f2937);
    color: var(--c-text, #f3f4f6);
}

:root.dark .marp-downloads__btn:hover {
    background: var(--c-bg-mute, #111827);
}
</style>
