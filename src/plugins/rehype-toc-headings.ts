import { visit } from 'unist-util-visit'
import { toString } from 'hast-util-to-string'

export interface TocHeading {
  depth: number
  text: string
  id: string
  children: TocHeading[]
}

/**
 * Rehype plugin that extracts heading hierarchy (h2-h4) from rendered HTML
 * and injects it into Astro's frontmatter as `headings`.
 *
 * Runs after rehype-slug so heading IDs are already present.
 * Produces a flat array of { depth, text, id } objects.
 * The nesting into a tree structure is done client-side by the ToC component.
 */
export function rehypeTocHeadings() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (tree: any, file: any) {
    const headings: { depth: number; text: string; id: string }[] = []

    visit(tree, 'element', (node) => {
      const match = /^h([2-4])$/.exec(node.tagName)
      if (!match) return

      const depth = Number(match[1])
      const id = node.properties?.id as string | undefined
      if (!id) return

      // Extract text content, excluding the anchor-link spans added by rehype-autolink-headings
      const text = extractHeadingText(node)
      if (!text.trim()) return

      headings.push({ depth, text: text.trim(), id })
    })

    // Inject into Astro frontmatter
    if (!file.data.astro) file.data.astro = {}
    if (!file.data.astro.frontmatter) file.data.astro.frontmatter = {}
    file.data.astro.frontmatter.headings = headings
  }
}

/**
 * Extracts text from a heading node, excluding anchor-link elements
 * added by rehype-autolink-headings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractHeadingText(node: any): string {
  let text = ''
  for (const child of node.children ?? []) {
    // Skip anchor-link elements
    if (
      child.type === 'element' &&
      child.tagName === 'a' &&
      Array.isArray(child.properties?.className) &&
      child.properties.className.includes('anchor-link')
    ) {
      continue
    }
    text += toString(child)
  }
  return text
}
