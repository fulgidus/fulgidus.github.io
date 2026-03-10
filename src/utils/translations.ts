import { getCollection } from 'astro:content'
import { defaultLang } from '@/i18n/ui'
import { getLangFromSlug } from '@/i18n/utils'
import { removeLangFromSlug } from '@/utils/posts'
import { POST_KEY } from '@/types'

export interface TranslationMapEntry {
  [lang: string]: string  // lang → URL path
}

/**
 * Build a translation map for all blog posts.
 * Maps each base slug to the available language URLs.
 *
 * Example:
 * {
 *   "Auto-Dino": { "en": "/posts/Auto-Dino/", "it": "/it/posts/Auto-Dino/" },
 *   "i18n": { "en": "/posts/i18n/", "it": "/it/posts/i18n/" },
 * }
 */
let cachedPostTranslations: Record<string, TranslationMapEntry> | null = null

export async function getPostTranslationMap(): Promise<Record<string, TranslationMapEntry>> {
  if (cachedPostTranslations) return cachedPostTranslations

  const allPosts = await getCollection(POST_KEY)
  const map: Record<string, TranslationMapEntry> = {}

  for (const post of allPosts) {
    if (import.meta.env.PROD && post.data.draft) continue
    if (post.data.unlisted) continue

    const lang = post.data.lang ?? getLangFromSlug(post.slug)
    const baseSlug = post.data.translationOf ?? removeLangFromSlug(post.slug)
    const url = lang === defaultLang
      ? `/posts/${removeLangFromSlug(post.slug)}/`
      : `/${lang}/posts/${removeLangFromSlug(post.slug)}/`

    if (!map[baseSlug]) map[baseSlug] = {}
    map[baseSlug][lang] = url
  }

  cachedPostTranslations = map
  return map
}

/**
 * For a given page URL, find the available translations.
 * Returns a map of lang → URL for all available translations.
 *
 * Handles:
 * - Blog post pages (via postSlug lookup in translation map)
 * - Static pages (all parameterized pages exist in all active languages)
 * - Pages that only exist in one language (homepage, CV)
 */
export async function getPageTranslations(
  currentUrl: URL | string,
  postSlug?: string,
): Promise<TranslationMapEntry> {
  const url = typeof currentUrl === 'string' ? new URL(currentUrl) : currentUrl
  const pathname = url.pathname.replace(/\/$/, '') || '/'

  if (postSlug) {
    // Blog post — look up in translation map
    const map = await getPostTranslationMap()
    const baseSlug = removeLangFromSlug(postSlug)
    return map[baseSlug] ?? {}
  }

  // Static/parameterized page — construct translations based on URL pattern
  // All parameterized pages exist for all active languages
  const translations: TranslationMapEntry = {}

  // Determine the EN path equivalent
  const pathParts = pathname.split('/')
  const isLocalized = pathParts[1] && pathParts[1].length === 2 && pathParts[1] !== defaultLang
  const enPath = isLocalized
    ? pathname.replace(new RegExp(`^/${pathParts[1]}`), '') || '/'
    : pathname

  // EN version always exists
  translations[defaultLang] = enPath === '/' ? '/' : `${enPath}/`

  // IT version — construct it
  const itPath = enPath === '/' ? '/it/' : `/it${enPath}/`
  translations['it'] = itPath

  return translations
}
