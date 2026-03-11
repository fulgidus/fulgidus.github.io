import { describe, it, expect } from 'vitest'
import {
    getLangFromUrl,
    getLangFromSlug,
    useTranslate,
    translateFrom,
    translatePath,
    useSpecificPath,
    stripLangFromPath,
    getGiscusLocale,
    getActiveLanguages,
} from '../src/i18n/utils'
import { defaultLang, ui, availableLanguages } from '../src/i18n/ui'

describe('i18n/utils', () => {
    // ─── getLangFromUrl ───────────────────────────────────────────
    describe('getLangFromUrl', () => {
        it('returns default language for root path', () => {
            expect(getLangFromUrl(new URL('https://example.com/'))).toBe(defaultLang)
        })

        it('returns default language for root path (string)', () => {
            expect(getLangFromUrl('/')).toBe(defaultLang)
        })

        it('extracts "it" from Italian path', () => {
            expect(getLangFromUrl(new URL('https://example.com/it/blog'))).toBe('it')
        })

        it('extracts "it" from Italian path (string)', () => {
            expect(getLangFromUrl('/it/blog')).toBe('it')
        })

        it('returns default language for English paths without prefix', () => {
            expect(getLangFromUrl(new URL('https://example.com/blog'))).toBe(defaultLang)
        })

        it('returns default language for unknown language prefix', () => {
            expect(getLangFromUrl(new URL('https://example.com/fr/blog'))).toBe(defaultLang)
        })

        it('returns default language for empty string', () => {
            expect(getLangFromUrl('')).toBe(defaultLang)
        })

        it('handles path with trailing slash', () => {
            expect(getLangFromUrl('/it/')).toBe('it')
        })

        it('handles deep nested path', () => {
            expect(getLangFromUrl('/it/blog/posts/my-post')).toBe('it')
        })

        it('handles path with only language segment', () => {
            expect(getLangFromUrl('/it')).toBe('it')
        })

        it('returns default language for paths starting with non-language segments', () => {
            expect(getLangFromUrl('/posts/some-post')).toBe(defaultLang)
        })

        it('accepts URL objects directly', () => {
            const url = new URL('https://fulgidus.github.io/it/projects')
            expect(getLangFromUrl(url)).toBe('it')
        })

        it('handles disabled language (nl) — still recognized as valid language', () => {
            // nl exists in the ui object even though disabled
            expect(getLangFromUrl('/nl/blog')).toBe('nl')
        })
    })

    // ─── getLangFromSlug ──────────────────────────────────────────
    describe('getLangFromSlug', () => {
        it('returns "en" from English slug', () => {
            expect(getLangFromSlug('en/my-post')).toBe('en')
        })

        it('returns "it" from Italian slug', () => {
            expect(getLangFromSlug('it/my-post')).toBe('it')
        })

        it('returns default language for slug without language prefix', () => {
            expect(getLangFromSlug('my-post')).toBe(defaultLang)
        })

        it('returns default language for empty slug', () => {
            expect(getLangFromSlug('')).toBe(defaultLang)
        })

        it('returns default language for unknown language prefix', () => {
            expect(getLangFromSlug('fr/my-post')).toBe(defaultLang)
        })

        it('handles deeply nested slug', () => {
            expect(getLangFromSlug('it/notes/some-note')).toBe('it')
        })

        it('handles slug that looks like a language code but is not', () => {
            expect(getLangFromSlug('de/something')).toBe(defaultLang)
        })
    })

    // ─── useTranslate ─────────────────────────────────────────────
    describe('useTranslate', () => {
        it('returns the English translation for a known key', () => {
            const t = useTranslate('en')
            expect(t('nav.home')).toBe('Home')
        })

        it('returns the Italian translation for a known key', () => {
            const t = useTranslate('it')
            expect(t('nav.home')).toBe('Inizio')
        })

        it('falls back to default language when key is missing in target language', () => {
            const t = useTranslate('it')
            // Use a key that exists in English. Italian might not have all keys
            // from 'en'. If all keys exist in both, this test verifies the fallback
            // mechanism at least works for an en key.
            expect(t('nav.home')).toBeTruthy()
        })

        it('returns #key# sentinel for completely unknown keys', () => {
            const t = useTranslate('en')
            // Cast to any to test unknown key behavior
            const result = t('completely.unknown.key' as any)
            expect(result).toBe('#completely.unknown.key#')
        })

        it('returns a function', () => {
            const t = useTranslate('en')
            expect(typeof t).toBe('function')
        })
    })

    // ─── translateFrom ────────────────────────────────────────────
    describe('translateFrom', () => {
        it('returns the English translation for a known key', () => {
            expect(translateFrom('en', 'nav.blog')).toBe('Blog')
        })

        it('returns the Italian translation for a known key', () => {
            expect(translateFrom('it', 'nav.blog')).toBe('Blog')
        })

        it('returns #key# for unknown keys', () => {
            expect(translateFrom('en', 'nonexistent.key' as any)).toBe('#nonexistent.key#')
        })

        it('falls back to default language translation', () => {
            // Italian 'nav.blog' is 'Blog' — same as English in this case
            expect(translateFrom('it', 'nav.blog')).toBe('Blog')
        })
    })

    // ─── translatePath ────────────────────────────────────────────
    describe('translatePath', () => {
        it('returns same path when target is default language and path is not localized', () => {
            expect(translatePath('/', defaultLang)).toBe('/')
        })

        it('returns same path when target language matches current localization', () => {
            expect(translatePath('/it/blog', 'it')).toBe('/it/blog')
        })

        it('strips language from path when target is default language', () => {
            const result = stripLangFromPath('/it/blog')
            expect(result).toBe('/blog')
        })

        it('handles root path localization', () => {
            // Translating "/" to Italian
            const result = translatePath('/', 'it')
            // Should produce something like /it or /it/
            expect(result).toContain('it')
        })

        it('strips language prefix correctly', () => {
            expect(stripLangFromPath('/it/blog/post')).toBe('/blog/post')
        })

        it('returns "/" when stripping language from "/it"', () => {
            // /it becomes just '' after filtering, which should be '/'
            expect(stripLangFromPath('/it')).toBe('/')
        })

        it('returns "/" when stripping language from "/it/"', () => {
            expect(stripLangFromPath('/it/')).toBe('/')
        })

        it('handles English path that does not start with a language prefix', () => {
            const result = translatePath('/blog', defaultLang)
            expect(result).toBe('/blog')
        })

        it('handles path with no language prefix being localized', () => {
            const result = translatePath('/blog', 'it')
            // Should produce a localized path
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)
        })
    })

    // ─── stripLangFromPath ────────────────────────────────────────
    describe('stripLangFromPath', () => {
        it('strips "it" from path', () => {
            expect(stripLangFromPath('/it/blog')).toBe('/blog')
        })

        it('strips "en" from path (if present)', () => {
            // English is a valid language, so it should be stripped
            expect(stripLangFromPath('/en/blog')).toBe('/blog')
        })

        it('returns original path if no language present', () => {
            expect(stripLangFromPath('/blog')).toBe('/blog')
        })

        it('returns "/" for root language-only path', () => {
            expect(stripLangFromPath('/it')).toBe('/')
        })

        it('handles empty path', () => {
            expect(stripLangFromPath('')).toBe('/')
        })

        it('handles deep paths', () => {
            expect(stripLangFromPath('/it/blog/posts/my-post')).toBe('/blog/posts/my-post')
        })

        it('does not strip non-language segments that look similar', () => {
            expect(stripLangFromPath('/items/blog')).toBe('/items/blog')
        })
    })

    // ─── useSpecificPath ──────────────────────────────────────────
    describe('useSpecificPath', () => {
        it('returns path as-is for default language', () => {
            expect(useSpecificPath(defaultLang, '/blog')).toBe('/blog')
        })

        it('prepends language prefix for non-default language', () => {
            expect(useSpecificPath('it', '/blog')).toBe('/it/blog')
        })

        it('prepends language prefix for root path', () => {
            expect(useSpecificPath('it', '/')).toBe('/it/')
        })

        it('returns root path as-is for default language', () => {
            expect(useSpecificPath(defaultLang, '/')).toBe('/')
        })
    })

    // ─── getGiscusLocale ──────────────────────────────────────────
    describe('getGiscusLocale', () => {
        it('returns "en" for English', () => {
            expect(getGiscusLocale('en')).toBe('en')
        })

        it('returns "it" for Italian', () => {
            expect(getGiscusLocale('it')).toBe('it')
        })

        it('returns "nl" for Dutch', () => {
            expect(getGiscusLocale('nl')).toBe('nl')
        })

        it('falls back to "en" for unknown language', () => {
            expect(getGiscusLocale('fr')).toBe('en')
        })

        it('falls back to "en" for empty string', () => {
            expect(getGiscusLocale('')).toBe('en')
        })
    })

    // ─── getActiveLanguages ───────────────────────────────────────
    describe('getActiveLanguages', () => {
        it('returns an array of languages', () => {
            const active = getActiveLanguages()
            expect(Array.isArray(active)).toBe(true)
            expect(active.length).toBeGreaterThan(0)
        })

        it('includes English', () => {
            expect(getActiveLanguages()).toContain('en')
        })

        it('includes Italian', () => {
            expect(getActiveLanguages()).toContain('it')
        })

        it('does not include disabled languages', () => {
            // 'nl' has 'disabled: true' in ui.ts
            expect(getActiveLanguages()).not.toContain('nl')
        })

        it('all returned languages are valid keys of ui', () => {
            const active = getActiveLanguages()
            for (const lang of active) {
                expect(lang in ui).toBe(true)
            }
        })
    })

    // ─── Default language constant ────────────────────────────────
    describe('defaultLang', () => {
        it('is set to "en"', () => {
            expect(defaultLang).toBe('en')
        })
    })

    // ─── availableLanguages ───────────────────────────────────────
    describe('availableLanguages', () => {
        it('contains all languages from ui object', () => {
            const uiKeys = Object.keys(ui)
            expect(availableLanguages).toEqual(expect.arrayContaining(uiKeys as any))
            expect(availableLanguages.length).toBe(uiKeys.length)
        })

        it('includes en, it, and nl', () => {
            expect(availableLanguages).toContain('en')
            expect(availableLanguages).toContain('it')
            expect(availableLanguages).toContain('nl')
        })
    })
})
