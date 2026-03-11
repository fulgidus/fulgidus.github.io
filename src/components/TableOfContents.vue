<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

/**
 * TableOfContents.vue
 *
 * Renders a nested table of contents from heading data extracted by
 * rehype-toc-headings. Features IntersectionObserver-based scrollspy,
 * responsive collapse (mobile <768px), and View Transitions support.
 */

export interface TocEntry {
  depth: number
  text: string
  id: string
}

export interface TocTreeNode {
  depth: number
  text: string
  id: string
  children: TocTreeNode[]
}

const props = withDefaults(defineProps<{
  headings: TocEntry[]
  title?: string
  ariaLabel?: string
}>(), {
  title: 'Table of Contents',
  ariaLabel: 'Table of contents',
})

// ── Build nested tree from flat heading list ──────────────────────────
function buildTree(headings: TocEntry[]): TocTreeNode[] {
  const root: TocTreeNode[] = []
  const stack: TocTreeNode[] = []

  for (const h of headings) {
    const node: TocTreeNode = { depth: h.depth, text: h.text, id: h.id, children: [] }

    // Pop from stack until we find a parent with lower depth
    while (stack.length > 0 && stack[stack.length - 1].depth >= h.depth) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  return root
}

const tree = computed(() => buildTree(props.headings))

// ── Scrollspy state ───────────────────────────────────────────────────
const activeId = ref<string>('')
let observer: IntersectionObserver | null = null

// Tracks which headings are currently intersecting
const visibleHeadings = new Map<string, IntersectionObserverEntry>()

function updateActiveHeading() {
  if (visibleHeadings.size === 0) {
    // If no headings visible, find the one closest above viewport
    const allIds = props.headings.map(h => h.id)
    let bestId = ''
    let bestTop = -Infinity

    for (const id of allIds) {
      const el = document.getElementById(id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      // Heading is above or at the top of viewport
      if (rect.top <= 100 && rect.top > bestTop) {
        bestTop = rect.top
        bestId = id
      }
    }

    if (bestId) {
      activeId.value = bestId
    } else if (allIds.length > 0) {
      // Default to first heading if nothing is above viewport
      activeId.value = allIds[0]
    }
    return
  }

  // Among visible headings, pick the one closest to top of viewport
  let bestId = ''
  let bestTop = Infinity

  for (const [id, entry] of visibleHeadings) {
    const top = entry.boundingClientRect.top
    if (top >= -10 && top < bestTop) {
      bestTop = top
      bestId = id
    }
  }

  // If all visible headings are above viewport (negative top), pick the one with largest top
  if (!bestId) {
    let maxTop = -Infinity
    for (const [id, entry] of visibleHeadings) {
      if (entry.boundingClientRect.top > maxTop) {
        maxTop = entry.boundingClientRect.top
        bestId = id
      }
    }
  }

  if (bestId) {
    activeId.value = bestId
  }
}

function setupObserver() {
  cleanupObserver()
  visibleHeadings.clear()

  // Use rootMargin to trigger slightly before/after viewport
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.id
        if (entry.isIntersecting) {
          visibleHeadings.set(id, entry)
        } else {
          visibleHeadings.delete(id)
        }
      }
      updateActiveHeading()
    },
    {
      // Observe headings with a margin that extends above and below the viewport
      rootMargin: '-80px 0px -60% 0px',
      threshold: [0, 1],
    }
  )

  for (const heading of props.headings) {
    const el = document.getElementById(heading.id)
    if (el) {
      observer.observe(el)
    }
  }
}

function cleanupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

// ── Responsive collapse state ─────────────────────────────────────────
const isCollapsed = ref(true)
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  // On desktop, always show expanded
  if (!isMobile.value) {
    isCollapsed.value = false
  } else {
    isCollapsed.value = true
  }
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// ── Click handler: scroll to heading and collapse on mobile ───────────
function handleLinkClick(id: string, event: Event) {
  event.preventDefault()
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Update URL hash without causing a jump
    history.replaceState(null, '', `#${id}`)
    // Set active immediately for responsiveness
    activeId.value = id
  }
  // Collapse on mobile after click
  if (isMobile.value) {
    isCollapsed.value = true
  }
}

// ── View Transitions support ──────────────────────────────────────────
function onPageLoad() {
  // Re-setup observer after view transition navigation
  nextTick(() => {
    setupObserver()
    checkMobile()
  })
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => {
  checkMobile()
  setupObserver()
  window.addEventListener('resize', checkMobile, { passive: true })
  document.addEventListener('astro:page-load', onPageLoad)
})

onUnmounted(() => {
  cleanupObserver()
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('astro:page-load', onPageLoad)
})

// Re-observe when headings change (unlikely but defensive)
watch(() => props.headings, () => {
  nextTick(() => setupObserver())
}, { deep: true })
</script>

<template>
  <nav
    class="toc-nav"
    :aria-label="ariaLabel"
    data-pagefind-ignore
  >
    <!-- Toggle button (visible on mobile, acts as visual header on desktop) -->
    <button
      class="toc-toggle"
      :class="{ 'toc-toggle--mobile': isMobile }"
      :aria-expanded="!isCollapsed"
      aria-controls="toc-list"
      @click="toggleCollapse"
    >
      <span class="toc-toggle-icon" :class="{ 'toc-toggle-icon--open': !isCollapsed }">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="toc-title">{{ title }}</span>
    </button>

    <!-- ToC content -->
    <div
      id="toc-list"
      class="toc-content"
      :class="{ 'toc-content--collapsed': isCollapsed }"
    >
      <ul class="toc-list" role="list">
        <li
          v-for="node in tree"
          :key="node.id"
          class="toc-item toc-item--h2"
        >
          <a
            :href="`#${node.id}`"
            class="toc-link"
            :class="{ 'toc-link--active': activeId === node.id }"
            @click="handleLinkClick(node.id, $event)"
          >{{ node.text }}</a>
          <ul v-if="node.children.length > 0" class="toc-sublist" role="list">
            <li
              v-for="child in node.children"
              :key="child.id"
              class="toc-item toc-item--h3"
            >
              <a
                :href="`#${child.id}`"
                class="toc-link"
                :class="{ 'toc-link--active': activeId === child.id }"
                @click="handleLinkClick(child.id, $event)"
              >{{ child.text }}</a>
              <ul v-if="child.children.length > 0" class="toc-sublist" role="list">
                <li
                  v-for="grandchild in child.children"
                  :key="grandchild.id"
                  class="toc-item toc-item--h4"
                >
                  <a
                    :href="`#${grandchild.id}`"
                    class="toc-link"
                    :class="{ 'toc-link--active': activeId === grandchild.id }"
                    @click="handleLinkClick(grandchild.id, $event)"
                  >{{ grandchild.text }}</a>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.toc-nav {
  margin-bottom: 1.5rem;
  border: 1px solid rgba(125, 125, 125, 0.2);
  border-radius: 0.5rem;
  overflow: hidden;
  font-size: 0.875rem;
  line-height: 1.5;
  print-color-adjust: exact;
}

@media print {
  .toc-nav {
    display: none;
  }
}

/* Toggle button / header */
.toc-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: rgba(125, 125, 125, 0.06);
  color: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease;
  user-select: none;
}

.toc-toggle:hover {
  background: rgba(125, 125, 125, 0.12);
}

.toc-toggle-icon {
  display: inline-flex;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.toc-toggle-icon--open {
  transform: rotate(180deg);
}

.toc-title {
  flex: 1;
}

/* Content area with smooth collapse */
.toc-content {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0;
  transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
  opacity: 1;
}

.toc-content--collapsed {
  max-height: 0;
  opacity: 0;
  padding: 0;
  overflow: hidden;
}

/* Lists */
.toc-list,
.toc-sublist {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-sublist {
  padding-left: 0.75rem;
}

/* Items */
.toc-item {
  margin: 0;
  padding: 0;
}

/* Links */
.toc-link {
  display: block;
  padding: 0.25rem 1rem;
  color: inherit;
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  opacity: 0.7;
  word-break: break-word;
}

.toc-link:hover {
  opacity: 1;
  background: rgba(125, 125, 125, 0.08);
}

.toc-link--active {
  opacity: 1;
  border-left-color: var(--toc-active-color, #7c3aed);
  color: var(--toc-active-color, #7c3aed);
  font-weight: 500;
}

/* Depth-specific padding */
.toc-item--h2 > .toc-link {
  padding-left: 1rem;
}
.toc-item--h3 > .toc-link {
  padding-left: 1rem;
  font-size: 0.8125rem;
}
.toc-item--h4 > .toc-link {
  padding-left: 1rem;
  font-size: 0.75rem;
}

/* List bullet override — prevent prose styles from adding ::before bullets */
.toc-list > li::before,
.toc-sublist > li::before {
  content: none !important;
  display: none !important;
}
.toc-list > li,
.toc-sublist > li {
  padding-left: 0 !important;
}

/* Theme-aware active color */
:root {
  --toc-active-color: #7c3aed;
}

:global(html.dark) .toc-link--active {
  --toc-active-color: #a78bfa;
}

/* Scrollbar styling for long ToCs */
.toc-content::-webkit-scrollbar {
  width: 4px;
}
.toc-content::-webkit-scrollbar-track {
  background: transparent;
}
.toc-content::-webkit-scrollbar-thumb {
  background: rgba(125, 125, 125, 0.3);
  border-radius: 2px;
}
</style>
