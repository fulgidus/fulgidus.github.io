import { ui, defaultLang, routesFromEnToLocalized, substituteTemplate } from './ui';

export function getLangFromUrl(url: URL | string): keyof typeof ui {
    const [, lang] = (typeof url === 'string' ? url : url.pathname).split('/');
    if (lang in ui) {
        return lang as keyof typeof ui
    }
    return defaultLang;
}

export function useTranslate(lang: keyof typeof ui) {
    return function translate(key: keyof typeof ui[typeof defaultLang]): string {
        return ui[lang][key] ?? ui[defaultLang][key] ?? `#${key}#`;
    }
}

export function translateFrom(lang: keyof typeof ui, key: keyof typeof ui[typeof defaultLang]) {
    return ui?.[lang]?.[key] ?? ui[defaultLang][key] ?? `#${key}#`;
}

// export function old_useTranslatedPath(lang: keyof typeof ui) {
//     return function translatePath(path: string, l: string = lang) {
//         return l === defaultLang ? path : `/${l}${path}`
//     }
// }

export function translatePath(path: string, targetLang: keyof typeof ui = defaultLang): string {
    const availableLanguages = Object.keys(ui) as (keyof typeof ui)[]
    const pathParts = path.split('/');
    if (availableLanguages.includes(pathParts[1] as keyof typeof ui)) {
        // path is localized
        if (pathParts[1] as keyof typeof ui === targetLang) {
            // No change in route necessary
            return path;
        } else if (targetLang === defaultLang) {
            // Path stripping necessary
            return stripLangFromPath(path);
        } else {
            // Path is of different locale either substitute or strip and repopulate
            const strippedPath = stripLangFromPath(path)
            const localizedPath = populateFromRoute(strippedPath, targetLang)
            return localizedPath
        }
    } else {
        // Path is English
        if (targetLang === defaultLang) {
            return path
        }
        const localizedPath = populateFromRoute(path, targetLang)
        // Localizing path...
        return localizedPath
    }

}

function populateFromRoute(path: string, targetLang: keyof typeof ui) {
    let foundRoute: keyof typeof routesFromEnToLocalized = '/' as keyof typeof routesFromEnToLocalized
    for (const route in routesFromEnToLocalized) {
        if (path.startsWith(route)) {
            // Found the most specific route!
            foundRoute = route as keyof typeof routesFromEnToLocalized;
            break
        }
    }
    const localizedPath = substituteTemplate(routesFromEnToLocalized[foundRoute], {
        lang: targetLang,
        path: foundRoute.length > 1 ? path.slice(foundRoute.length) : path !== '/' ? path : '',
    })
    return localizedPath
}

export function useSpecificPath(lang: keyof typeof ui, path: string) {
    return lang === defaultLang ? path : `/${lang}${path}`
}


export function stripLangFromPath(path: string): string {
    const [, possibleLang, collectionParticle, , ...remainingPath] = (path).split('/'); // search for a prepended language
    const newPath = [collectionParticle, ...remainingPath]
    if (possibleLang in ui) {
        // Found prepended language
        return `/${newPath.join('/')}`
    }
    // Not foun any language in path
    return path

}