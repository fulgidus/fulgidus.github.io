<script setup lang="ts">
/**
 * MarpDownloads — Download buttons for Marp presentation exports.
 *
 * Fetches the metadata JSON to determine available formats and file sizes,
 * then renders download buttons for each available format.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { defaultLang, type Languages } from '@/i18n/ui'
import { getLangFromUrl, useTranslate } from '@/i18n/utils'

interface Props {
    /** Name of the marp file (without extension) */
    name: string
}

const props = defineProps<Props>()

const currentLang = ref<Languages>(defaultLang)
const t = computed(() => useTranslate(currentLang.value))

interface MarpMeta {
    hasPdf: boolean
    hasPptx: boolean
    hasMd: boolean
    pdfSize?: number
    pptxSize?: number
    mdSize?: number
}

const meta = ref<MarpMeta | null>(null)
const isLoading = ref(true)

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function loadMeta() {
    try {
        const res = await fetch(`/marp/${props.name}.json`)
        if (res.ok) {
            meta.value = await res.json()
        }
    } catch {
        // Metadata not available
    }
    isLoading.value = false
}

interface DownloadItem {
    label: string
    href: string
    size: string | null
    icon: string
}

const downloads = computed<DownloadItem[]>(() => {
    const items: DownloadItem[] = []
    if (!meta.value) return items

    if (meta.value.hasMd) {
        items.push({
            label: t.value('marp.downloadMd'),
            href: `/marp/${props.name}.md`,
            size: meta.value.mdSize ? formatBytes(meta.value.mdSize) : null,
            icon: 'md',
        })
    }

    if (meta.value.hasPdf) {
        items.push({
            label: t.value('marp.downloadPdf'),
            href: `/marp/${props.name}.pdf`,
            size: meta.value.pdfSize ? formatBytes(meta.value.pdfSize) : null,
            icon: 'pdf',
        })
    }

    if (meta.value.hasPptx) {
        items.push({
            label: t.value('marp.downloadPptx'),
            href: `/marp/${props.name}.pptx`,
            size: meta.value.pptxSize ? formatBytes(meta.value.pptxSize) : null,
            icon: 'pptx',
        })
    }

    return items
})

function updateLangFromUrl() {
    currentLang.value = getLangFromUrl(window.location.pathname) as Languages
}

onMounted(() => {
    updateLangFromUrl()
    document.addEventListener('astro:page-load', updateLangFromUrl)
    loadMeta()
})

onUnmounted(() => {
    document.removeEventListener('astro:page-load', updateLangFromUrl)
})
</script>

<template>
    <div v-if="!isLoading && downloads.length > 0" class="marp-downloads">
        <span class="marp-downloads__label">{{ t('marp.downloads') }}:</span>
        <div class="marp-downloads__buttons">
            <a
                v-for="dl in downloads"
                :key="dl.icon"
                :href="dl.href"
                :download="true"
                class="marp-downloads__btn"
                :title="dl.label"
            >
                <!-- File type badge -->
                <span class="marp-downloads__badge" :data-type="dl.icon">
                    {{ dl.icon.toUpperCase() }}
                </span>
                <span class="marp-downloads__info">
                    <span class="marp-downloads__text">{{ dl.label }}</span>
                    <span v-if="dl.size" class="marp-downloads__size">{{ dl.size }}</span>
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

.marp-downloads__info {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.marp-downloads__size {
    font-size: 0.6875rem;
    color: var(--c-text-muted, #9ca3af);
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
