import { describe, expect, it } from 'vitest';
import {
    getLangFromUrl,
    useTranslate,
    translateFrom,
    translatePath,
    useSpecificPath,
    stripLangFromPath,
    getLangFromSlug
} from './utils';
import { Languages, TranslationKeys, ui } from './ui';

describe('i18n/utils', () => {

    it('should correctly extract language from URL', () => {
        expect(getLangFromUrl('/it/about')).toBe('it');
        expect(getLangFromUrl('/en/blog')).toBe('en');
        expect(getLangFromUrl('/about')).toBe('en'); // Defaults to English if no language is specified
        expect(getLangFromUrl(new URL('https://example.com/it/contact'))).toBe('it');
        expect(getLangFromUrl(new URL('https://example.com/contact'))).toBe('en');

        //Test for invalid language code
        expect(getLangFromUrl('/fr/contact')).toBe('en'); // Assumes 'en' if 'fr' is not in languages object.

    });

    it('should create a translation function', () => {
        const t = useTranslate('it');
        expect(t('nav.home')).toBe(ui.it['nav.home']); //Replace 'nav.home' with an actual key from your ui object
        expect(t('nonexistentKey' as TranslationKeys)).toBe(ui.en['nonexistentKey'] ?? '#nonexistentKey#'); //Should handle missing keys gracefully.  Modify based on your desired behavior.
    });

    it('should return a specific translation', () => {
        expect(translateFrom('it', 'language')).toBe(ui.it['language']); //Replace 'nav.home' with an actual key from your ui object
        expect(translateFrom('fr' as Languages, 'nav.home')).toBe(ui.en['nav.home'] ?? '#nav.home#'); //Should handle missing languages gracefully. Modify based on your desired behavior.
    });

    it('should correctly extract language from URL', () => {
        expect(getLangFromUrl('/it/about')).toBe('it');
        expect(getLangFromUrl('/en/blog')).toBe('en');
        expect(getLangFromUrl('/about')).toBe('en'); // Defaults to English if no language is specified
        expect(getLangFromUrl(new URL('https://example.com/it/contact'))).toBe('it');
        expect(getLangFromUrl(new URL('https://example.com/contact'))).toBe('en');

        // Test for invalid language code
        expect(getLangFromUrl('/fr/contact')).toBe('en'); // Assumes 'en' if 'fr' is not in languages object.
    });

    it('should create a translation function', () => {
        const t = useTranslate('it');
        expect(t('nav.home')).toBe(ui.it['nav.home']); // Replace 'nav.home' with an actual key from your ui object
        expect(t('nonexistentKey' as TranslationKeys)).toBe(ui.en['nonexistentKey'] ?? '#nonexistentKey#'); // Should handle missing keys gracefully. Modify based on your desired behavior.
    });

    it('should return a specific translation', () => {
        expect(translateFrom('it', 'language')).toBe(ui.it['language']); // Replace 'nav.home' with an actual key from your ui object
        expect(translateFrom('fr' as Languages, 'nav.home')).toBe(ui.en['nav.home'] ?? '#nav.home#'); // Should handle missing languages gracefully. Modify based on your desired behavior.
    });

    it('should correctly extract language from slug', () => {
        expect(getLangFromSlug('it/about')).toBe('it');
        expect(getLangFromSlug('en/blog')).toBe('en');
        expect(getLangFromSlug('about')).toBe('en'); // Defaults to English if no language is specified
        expect(getLangFromSlug('it/contact')).toBe('it');
        expect(getLangFromSlug('contact')).toBe('en');
        expect(getLangFromSlug('fr/contact')).toBe('en'); // Unknown language defaults to 'en'
        expect(getLangFromSlug('')).toBe('en'); // Empty slug defaults to 'en'
        expect(getLangFromSlug('/')).toBe('en'); // Empty slug defaults to 'en'
    });

    describe('useTranslatedPath', () => {
        it('should correctly translate paths', () => {
            expect(translatePath('/it', 'en')).toBe('/');
            expect(translatePath('/about', 'en')).toBe('/about');
            expect(translatePath('/about', 'it')).toBe('/it/about');
            expect(translatePath('/posts-props', 'it')).toBe('/it/posts-props');
            expect(translatePath('/posts/i18n', 'it')).toBe('/it/posts/i18n');
            expect(translatePath('/it/about', 'en')).toBe('/about'); // Strips language prefix if targetLang is defaultLang
            expect(translatePath('/it/about', 'pirate' as Languages)).toBe('/pirate/about'); // Doesn't care if it's not in ui... Theoretically it shouldn't be possible anyway due to TS
        });

        it('should handle complex paths correctly', () => {
            expect(translatePath('/posts/my-post')).toBe('/posts/my-post');
            expect(translatePath('/posts/my-post', 'it')).toBe('/it/posts/my-post'); // This depends on your route mappings. Adjust as needed.
            expect(translatePath('/posts/notes/stuff-1', 'it')).toBe('/it/posts/notes/stuff-1');
            expect(translatePath('/posts/notes/devfest-2024-css', 'it')).toBe('/it/posts/notes/devfest-2024-css');
            expect(translatePath('/it/blog/notes', 'en')).toBe('/blog/notes');
        });

        it('should handle already localized paths', () => {
            expect(translatePath('/it/about', 'it')).toBe('/it/about');
            expect(translatePath('/it/about', 'en')).toBe('/about');
            expect(translatePath('/it/about', 'nl')).toBe('/nl/about');
        });

        it('should handle root path correctly', () => {
            expect(translatePath('/')).toBe('/');
            expect(translatePath('/', 'it')).toBe('/it');
        });
    });

    it('should generate specific path', () => {
        expect(useSpecificPath('it', '/about')).toBe('/it/about');
        expect(useSpecificPath('en', '/about')).toBe('/about');
    });

    it('should strip language from path', () => {
        expect(stripLangFromPath('/it/about')).toBe('/about');
        expect(stripLangFromPath('/about')).toBe('/about');
        expect(stripLangFromPath('/about')).toBe('/about'); // Should handle paths without language prefix
        expect(stripLangFromPath('/it/posts/my-post')).toBe('/posts/my-post'); // Test with more complex path
    });

    it('should handle edge cases for getLangFromUrl', () => {
        expect(getLangFromUrl('')).toBe('en'); // Empty string should default to 'en'
        expect(getLangFromUrl('/')).toBe('en'); // Root path should default to 'en'
        expect(getLangFromUrl('/unknown/path')).toBe('en'); // Unknown language should default to 'en'
    });

    it('should handle edge cases for translatePath', () => {
        expect(translatePath('')).toBe(''); // Empty path should remain empty
        expect(translatePath('/', 'unknown' as Languages)).toBe('/unknown'); // Unknown language should be added to path
    });

    it('should handle already localized paths', () => {
        expect(translatePath('/it/about', 'it')).toBe('/it/about');
        expect(translatePath('/it/about', 'en')).toBe('/about');
        expect(translatePath('/it/about', 'nl')).toBe('/nl/about');
    });

    it('should handle root path correctly', () => {
        expect(translatePath('/')).toBe('/');
        expect(translatePath('/', 'it')).toBe('/it');
    });

    it('should generate specific path', () => {
        expect(useSpecificPath('it', '/about')).toBe('/it/about');
        expect(useSpecificPath('en', '/about')).toBe('/about');
    });

    it('should strip language from path', () => {
        expect(stripLangFromPath('/it/about')).toBe('/about');
        expect(stripLangFromPath('/en/about')).toBe('/about');
        expect(stripLangFromPath('/about')).toBe('/about'); //Should handle paths without language prefix
        expect(stripLangFromPath('/it/posts/my-post')).toBe('/posts/my-post'); // Test with more complex path
    });

});