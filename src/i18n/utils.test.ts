import { describe, expect, it } from 'vitest';
import {
    getLangFromUrl,
    useTranslations,
    useSpecificTranslation,
    useTranslatedPath,
    useSpecificPath,
    useStripLangFromPath
} from './utils';
import { ui } from './ui';


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
        const t = useTranslations('it');
        expect(t('nav.home')).toBe(ui.it['nav.home']); //Replace 'nav.home' with an actual key from your ui object
        expect(t('nonexistentKey' as keyof typeof ui.en)).toBe(ui.en['nonexistentKey'] ?? '#nonexistentKey#'); //Should handle missing keys gracefully.  Modify based on your desired behavior.
    });

    it('should return a specific translation', () => {
        expect(useSpecificTranslation('it', 'language')).toBe(ui.it['language']); //Replace 'nav.home' with an actual key from your ui object
        expect(useSpecificTranslation('fr' as keyof typeof ui, 'nav.home')).toBe(ui.en['nav.home'] ?? '#nav.home#'); //Should handle missing languages gracefully. Modify based on your desired behavior.
    });

    describe('useTranslatedPath', () => {
        it('should correctly translate paths', () => {
            const translatePath = useTranslatedPath('en');
            expect(translatePath('/about')).toBe('/about');
            expect(translatePath('/about', 'it')).toBe('/it/about');
            expect(translatePath('/it/about')).toBe('/about'); //Strips language prefix if targetLang is defaultLang
            expect(translatePath('/it/about', 'pirate' as keyof typeof ui)).toBe('/pirate/about'); //Doesn't care is it's not in ui... Theoretically it shouldn't be possible anyway due to TS
        });

        it('should handle complex paths correctly', () => {
            const translatePath = useTranslatedPath('en');
            expect(translatePath('/posts/my-post')).toBe('/posts/my-post');
            expect(translatePath('/posts/my-post', 'it')).toBe('/it/posts/it/my-post'); //This depends on your route mappings. Adjust as needed.
        });

        it('should handle already localized paths', () => {
            const translatePath = useTranslatedPath('it');
            expect(translatePath('/it/about', 'it')).toBe('/it/about');
            expect(translatePath('/it/about', 'en')).toBe('/about');
            expect(translatePath('/it/about', 'nl')).toBe('/nl/about');
        });

        it('should handle root path correctly', () => {
            const translatePath = useTranslatedPath('en');
            expect(translatePath('/')).toBe('/');
            expect(translatePath('/', 'it')).toBe('/it');
        });
    });

    it('should generate specific path', () => {
        expect(useSpecificPath('it', '/about')).toBe('/it/about');
        expect(useSpecificPath('en', '/about')).toBe('/about');
    });

    it('should strip language from path', () => {
        const stripLang = useStripLangFromPath('it');
        expect(stripLang('/it/about')).toBe('/about');
        expect(stripLang('/en/about')).toBe('/about');
        expect(stripLang('/about')).toBe('/about'); //Should handle paths without language prefix
        expect(stripLang('/it/posts/it/my-post')).toBe('/posts/my-post'); // Test with more complex path
    });
});

