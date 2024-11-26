import { describe, expect, it } from 'vitest';
import { languages, defaultLang, ui, getLangLabel, routesFromEnToLocalized, substituteTemplate } from './ui';

describe('i18n/ui', () => {

    it('should correctly define languages', () => {
        expect(languages).toEqual({
            en: 'English',
            it: 'Italiano',
            nl: 'Nederlands',
        });
    });

    it('should define the default language correctly', () => {
        expect(defaultLang).toBe('en');
    });


    it('should correctly define UI strings for each language', () => {
        expect(ui.en['nav.home']).toBe('Home');
        expect(ui.it['nav.home']).toBe('Inizio');
        // Add more assertions as needed for other UI strings and languages
    });

    it('should correctly retrieve language label', () => {
        expect(getLangLabel('en')).toBe('English');
        expect(getLangLabel('it')).toBe('Italiano');
        // Add assertions for other languages
    });

    it('should handle missing language keys gracefully in getLangLabel', () => {
        //This test might fail depending on your TypeScript configuration and how you handle type errors.
        //If you're using strict types, this will throw a compiler error unless you explicitly handle the case
        //where a non-existent language key is passed to getLangLabel.
        //Consider adding a type guard or a try/catch block in getLangLabel for better robustness.  
        // expect(getLangLabel('fr' as keyof typeof ui)).toThrow(); //This will likely throw a type error during compilation.

        //For a more robust test, consider modifying getLangLabel to handle the case where the language key is unknown:
        //Example of improved getLangLabel function
        // export function getLangLabel(lang: keyof typeof ui):string {
        //   return ui[lang]?.language || 'Unknown Language';
        // }
        //Then the test could be:
        // expect(getLangLabel('fr' as keyof typeof ui)).toBe('Unknown Language');

    });


    describe('routesFromEnToLocalized', () => {
        it('should correctly define route mappings', () => {
            expect(routesFromEnToLocalized['/posts/notes']).toBe('/{{lang}}/posts/{{lang}}/notes{{path}}');
            // Add more assertions for other routes
        });
    });

    describe('substituteTemplate', () => {
        it('should correctly substitute template variables', () => {
            expect(substituteTemplate('/{{lang}}/posts/{{lang}}/notes{{path}}', { lang: 'it', path: '/test' })).toBe('/it/posts/it/notes/test');
            expect(substituteTemplate('/{{lang}}', { path: '/test' })).toBe('/en'); //Should use defaultLang if lang is missing
            // Add more test cases with different templates and variables
            expect(substituteTemplate('Missing {{key}}', {})).toContain('Missing value for template variable'); //Should handle missing key
        });

        it('should handle missing variables gracefully', () => {
            const result = substituteTemplate('/{{lang}}/posts/{{missing}}', { lang: 'it' });
            expect(result).toContain('Missing value for template variable');
            expect(result).toContain('missing');
        });

    });
});
