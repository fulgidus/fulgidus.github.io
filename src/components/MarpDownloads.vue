<script setup lang="ts">
/**
 * MarpDownloads — Theme-aware download buttons for presentation files.
 *
 * Accepts download items as props (no JSON fetch). Each item specifies
 * a label, href, file type for badge coloring, and an optional theme
 * variant ('light' | 'dark') for theme-specific files (PDF, PPTX, HTML).
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
    /** Theme variant: 'light' or 'dark'. Omit for non-variant items (e.g. MD source). */
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
 * Filter items to show only the variant matching the current theme.
 * For each file type (pdf, pptx, html, …), if both light and dark variants
 * exist, only the one matching the current site theme is shown.
 * Items without a variant are always shown (e.g. MD source).
 */
const visibleItems = computed(() => {
    const currentVariant = isDark.value ? 'dark' : 'light'

    // For each type, check if both light and dark variants exist
    const typesWithBothVariants = new Set<string>()
    const types = new Set(props.items.map(i => i.type))
    for (const type of types) {
        const hasLight = props.items.some(i => i.type === type && i.variant === 'light')
        const hasDark = props.items.some(i => i.type === type && i.variant === 'dark')
        if (hasLight && hasDark) typesWithBothVariants.add(type)
    }

    return props.items.filter(item => {
        // No variant specified: always show
        if (!item.variant) return true

        // If this type has both variants, show only the matching one
        if (typesWithBothVariants.has(item.type)) {
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
                :download="dl.href.split('/').pop()"
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
