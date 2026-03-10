import getReadingTime from 'reading-time'
import { toString } from 'mdast-util-to-string'

export function remarkReadingTime() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (tree: any, file: any) {
    // If the frontmatter already has a manual duration, use it as override
    if (file.data.astro?.frontmatter?.duration) {
      return
    }

    const textContent = toString(tree)
    const readingTime = getReadingTime(textContent)

    // Inject computed reading time into frontmatter
    if (!file.data.astro) file.data.astro = {}
    if (!file.data.astro.frontmatter) file.data.astro.frontmatter = {}
    file.data.astro.frontmatter.duration = `${Math.max(1, Math.round(readingTime.minutes))}m`
  }
}
