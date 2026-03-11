/**
 * JSON-LD structured data generators for Schema.org types.
 * Used by BaseHead.astro to embed structured data in page <head>.
 */
import siteConfig from '@/site-config'

// ── Shared types ──

export interface JsonLdArticleParams {
  title: string
  description?: string
  url: string
  siteUrl: string
  imageUrl?: string
  pubDate?: string | Date
  tags?: string[]
  readingTime?: string
}

export interface JsonLdPersonParams {
  siteUrl: string
}

export interface JsonLdBreadcrumbParams {
  /** The current page URL (absolute) */
  url: string
  /** The site root URL */
  siteUrl: string
  /** The current language code */
  lang: string
  /** Page title (used for the last breadcrumb item) */
  pageTitle?: string
  /** i18n labels for common path segments */
  labels: Record<string, string>
}

// ── Helpers ──

function personSchema(siteUrl: string) {
  const socialLinks = siteConfig.socialLinks
    .filter(l => l.href && l.href.length > 0)
    .map(l => l.href)

  return {
    '@type': 'Person' as const,
    name: siteConfig.author,
    url: siteUrl,
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  }
}

// ── Article (BlogPosting) ──

export function buildArticleJsonLd(params: JsonLdArticleParams): Record<string, unknown> {
  const { title, description, url, siteUrl, imageUrl, pubDate, tags, readingTime } = params

  const author = personSchema(siteUrl)

  const blogPosting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: title,
    url,
    author,
    publisher: {
      '@type': 'Person',
      name: siteConfig.author,
      url: siteUrl,
    },
  }

  if (description) blogPosting.description = description
  if (imageUrl) blogPosting.image = imageUrl
  if (pubDate) {
    const isoDate = new Date(pubDate).toISOString()
    blogPosting.datePublished = isoDate
    blogPosting.dateModified = isoDate
  }
  if (tags && tags.length > 0) blogPosting.keywords = tags
  if (readingTime) {
    const minutes = parseInt(readingTime, 10)
    if (!isNaN(minutes)) {
      blogPosting.timeRequired = `PT${minutes}M`
    }
  }

  return blogPosting
}

// ── Person ──

export function buildPersonJsonLd(params: JsonLdPersonParams): Record<string, unknown> {
  const { siteUrl } = params

  const socialLinks = siteConfig.socialLinks
    .filter(l => l.href && l.href.length > 0)
    .map(l => l.href)

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.author,
    url: siteUrl,
    jobTitle: 'Senior Full-Stack Developer',
    knowsAbout: [
      'JavaScript', 'TypeScript', 'React.js', 'Node.js',
      'Full-Stack Development', 'Software Engineering',
      'Cybersecurity', 'Blockchain',
    ],
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  }
}

// ── WebSite ──

export function buildWebSiteJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.title,
    description: siteConfig.description,
    url: siteUrl,
    author: personSchema(siteUrl),
  }
}

// ── BreadcrumbList ──

/** Known path-segment labels per language */
const SEGMENT_LABELS: Record<string, Record<string, string>> = {
  en: {
    blog: 'Blog',
    posts: 'Blog',
    projects: 'Projects',
    tags: 'Tags',
    search: 'Search',
    notes: 'Notes',
    talks: 'Talks',
    cv: 'CV',
  },
  it: {
    blog: 'Blog',
    posts: 'Blog',
    projects: 'Progetti',
    tags: 'Tag',
    search: 'Cerca',
    notes: 'Note',
    talks: 'Presentazioni',
    cv: 'CV',
  },
}

export function buildBreadcrumbJsonLd(params: JsonLdBreadcrumbParams): Record<string, unknown> | null {
  const { url, siteUrl, lang, pageTitle } = params

  const parsedUrl = new URL(url)
  let pathname = parsedUrl.pathname.replace(/\/+$/, '') // strip trailing slash

  // Strip the language prefix if present (e.g. /it/blog -> /blog)
  const langPrefix = `/${lang}`
  if (lang !== 'en' && pathname.startsWith(langPrefix)) {
    pathname = pathname.slice(langPrefix.length) || '/'
  }

  // Don't generate breadcrumbs for the homepage
  if (pathname === '' || pathname === '/') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const labels = SEGMENT_LABELS[lang] ?? SEGMENT_LABELS['en']

  // Build breadcrumb items: Home > segment1 > segment2 > ...
  const homeLabel = lang === 'it' ? 'Inizio' : 'Home'
  const homePath = lang === 'en' ? '/' : `/${lang}/`

  const items: Array<{ '@type': string; position: number; name: string; item: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: homeLabel,
      item: `${siteUrl}${homePath}`,
    },
  ]

  let currentPath = lang === 'en' ? '' : `/${lang}`

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    const isLast = i === segments.length - 1

    // Use pageTitle for the last segment, otherwise look up labels or use the segment itself
    const name = isLast && pageTitle
      ? pageTitle
      : labels[segment] ?? decodeURIComponent(segment)

    items.push({
      '@type': 'ListItem',
      position: i + 2,
      name,
      item: `${siteUrl}${currentPath}/`,
    })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}
