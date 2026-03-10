import { getCollection } from 'astro:content'
import { defaultLang, ui, type Languages } from '@/i18n/ui'
import { getLangFromSlug } from '@/i18n/utils'
import { removeLangFromSlug } from '@/utils/posts'
import { POST_KEY } from '@/types'

export interface HreflangLink {
  lang: string   // e.g. "en", "it", or "x-default"
  href: string   // absolute URL
}

// Cache the blog slugs so we don't re-fetch the collection on every page
let slugCacheByLang: Map<string, Set<string>> | null = null

async function getSlugsByLang(): Promise<Map<string, Set<string>>> {
  if (slugCacheByLang) return slugCacheByLang

  const allPosts = await getCollection(POST_KEY)
  slugCacheByLang = new Map()

  for (const post of allPosts) {
    // Skip drafts in production
    if (import.meta.env.PROD && post.data.draft) continue

    const lang = getLangFromSlug(post.slug)
    const baseSlug = removeLangFromSlug(post.slug)

    if (!slugCacheByLang.has(lang)) {
      slugCacheByLang.set(lang, new Set())
    }
    slugCacheByLang.get(lang)!.add(baseSlug)
  }

  return slugCacheByLang
}

/** Ensure a path ends with a trailing slash */
function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}

/**
 * Known static page pairs between EN and IT.
 * Key: EN path (without trailing slash), Value: IT path (without trailing slash)
 */
const STATIC_PAGE_PAIRS: Record<string, string> = {
  '': '/it',                  // home
  '/blog': '/it/blog',
  '/blog/notes': '/it/blog/notes',
  '/projects': '/it/projects',
  '/tags': '/it/tags',
  '/cv': '/it/cv',
  '/search': '/it/search',
}

/**
 * Generate hreflang links for a given page.
 *
 * @param currentUrl - The current page URL (Astro.request.url or Astro.url)
 * @param siteUrl   - The site base URL (Astro.site)
 * @param postSlug  - For blog post pages, the full collection slug (e.g. "my-post" or "it/my-post")
 */
export async function getHreflangLinks(
  currentUrl: URL | string,
  siteUrl: URL | string,
  postSlug?: string,
): Promise<HreflangLink[]> {
  const site = typeof siteUrl === 'string' ? siteUrl.replace(/\/$/, '') : siteUrl.toString().replace(/\/$/, '')
  const links: HreflangLink[] = []

  const activeLanguages = (Object.keys(ui) as Languages[]).filter(
    l => !ui[l]['disabled' as keyof typeof ui[typeof l]]
  )

  if (postSlug) {
    // --- Blog post page ---
    const slugsByLang = await getSlugsByLang()
    const baseSlug = removeLangFromSlug(postSlug)

    for (const lang of activeLanguages) {
      const langSlugs = slugsByLang.get(lang)
      if (langSlugs?.has(baseSlug)) {
        const postPath = lang === defaultLang
          ? `/posts/${baseSlug}/`
          : `/${lang}/posts/${baseSlug}/`
        links.push({ lang, href: `${site}${postPath}` })
      }
    }
  } else {
    // --- Static page ---
    const url = typeof currentUrl === 'string' ? new URL(currentUrl) : currentUrl
    let pathname = url.pathname.replace(/\/$/, '') // strip trailing slash

    // Determine current language from path
    const pathParts = pathname.split('/')
    const isLocalized = activeLanguages.includes(pathParts[1] as Languages) && pathParts[1] !== defaultLang

    // Get the EN version of the current path
    const enPath = isLocalized
      ? pathname.replace(new RegExp(`^/${pathParts[1]}`), '')
      : pathname

    // Check if this EN path has a known IT counterpart
    if (enPath in STATIC_PAGE_PAIRS) {
      // EN version
      links.push({ lang: defaultLang, href: withTrailingSlash(`${site}${enPath || '/'}`) })

      // Other language versions
      for (const lang of activeLanguages) {
        if (lang === defaultLang) continue
        const localizedPath = STATIC_PAGE_PAIRS[enPath]
        if (localizedPath) {
          links.push({ lang, href: withTrailingSlash(`${site}${localizedPath}`) })
        }
      }
    }
    // For tag pages like /tags/foo, /it/tags/foo — emit pairs
    else if (enPath.startsWith('/tags/')) {
      const tagSubpath = enPath.slice('/tags'.length) // e.g. "/foo" or "/foo/1"
      links.push({ lang: defaultLang, href: withTrailingSlash(`${site}/tags${tagSubpath}`) })
      for (const lang of activeLanguages) {
        if (lang === defaultLang) continue
        links.push({ lang, href: withTrailingSlash(`${site}/${lang}/tags${tagSubpath}`) })
      }
    }
    // For blog subpaths like /blog/2, /it/blog/2
    else if (/^\/blog(\/\d+)?$/.test(enPath) || /^\/blog\/notes(\/\d+)?$/.test(enPath)) {
      links.push({ lang: defaultLang, href: withTrailingSlash(`${site}${enPath}`) })
      for (const lang of activeLanguages) {
        if (lang === defaultLang) continue
        links.push({ lang, href: withTrailingSlash(`${site}/${lang}${enPath}`) })
      }
    }
    // Unknown page — no hreflang (e.g. /posts-props, /md-style, etc.)
  }

  // Add x-default pointing to EN version if we have any links
  if (links.length > 0) {
    const enLink = links.find(l => l.lang === defaultLang)
    if (enLink) {
      links.push({ lang: 'x-default', href: enLink.href })
    }
  }

  return links
}
