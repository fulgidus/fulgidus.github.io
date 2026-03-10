<script setup lang="ts">
/**
 * MarpDownloads — Download buttons for presentation files.
 *
 * Accepts download items as props (no JSON fetch). Each item specifies
 * a label, href, and file type for badge coloring.
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
}

interface Props {
    /** Download items to display */
    items: DownloadItem[]
}

const props = defineProps<Props>()

const currentLang = ref<Languages>(defaultLang)
const t = computed(() => useTranslate(currentLang.value))

function updateLangFromUrl() {
    currentLang.value = getLangFromUrl(window.location.pathname) as Languages
}

onMounted(() => {
    updateLangFromUrl()
    document.addEventListener('astro:page-load', updateLangFromUrl)
})

onUnmounted(() => {
    document.removeEventListener('astro:page-load', updateLangFromUrl)
})
</script>

<template>
    <div v-if="props.items.length > 0" class="marp-downloads">
        <span class="marp-downloads__label">{{ t('marp.downloads') }}:</span>
        <div class="marp-downloads__buttons">
            <a
                v-for="dl in props.items"
                :key="dl.type + dl.href"
                :href="dl.href"
                :download="true"
                class="marp-downloads__btn"
                :title="dl.label"
            >
                <!-- File type badge -->
                <span class="marp-downloads__badge" :data-type="dl.type">
                    {{ dl.label }}
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
