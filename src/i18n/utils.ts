import { ui, defaultLang } from './ui';


export function getLangFromUrl(url: URL | string): keyof typeof ui {
    const [, lang] = (typeof url === 'string' ? url : url.pathname).split('/');
    if (lang in ui) return lang as keyof typeof ui;
    return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof typeof ui[typeof defaultLang]): string {
        return ui[lang][key] ?? ui[defaultLang][key] ?? `#${key}#`;
    }
}

export function useSpecificTranslation(lang: keyof typeof ui, key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] ?? ui[defaultLang][key] ?? `#${key}#`;
}

export function useTranslatedPath(lang: keyof typeof ui) {
    return function translatePath(path: string, l: string = lang) {
        return l === defaultLang ? path : `/${l}${path}`
    }
}

export function useSpecificPath(lang: keyof typeof ui, path: string) {
    return lang === defaultLang ? path : `/${lang}${path}`
}


export function useStripLangFromPath(lang: keyof typeof ui) {
    return function strippedPath(path: string, l: string = lang): string {
        const [possibleLang, remainingPath] = (path).split('/'); // search for a prepended language
        console.log(`lang: ${l} || possibleLang:"${possibleLang}" remainingPath: "${remainingPath}" path: "${path}" | possible result /${l}/${remainingPath} | fallback: /${l}${path}`)
        if (possibleLang in ui) { // Found prepended language
            return l === defaultLang ? remainingPath : `/${l}/${remainingPath}`
        }
        return path
    }
}