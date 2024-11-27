import { ui, defaultLang, routesFromEnToLocalized, substituteTemplate, availableLanguages } from './ui';

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
    for (const route in routesFromEnToLocalized) {
        if (path.startsWith(route)) {
            // Found the most specific route!
            const substitutedRoute = substituteRoute(route)
            return substitutedRoute
        }
        // Now we check for templated routes
        if (route.includes('{{')) {
            const foundSubstitutedRoute = substituteTemplate(route, {
                lang: targetLang,
                path: path
            })
            if (path.startsWith(foundSubstitutedRoute)) {
                const substitutedRoute = substituteRoute(route, true);
                return substitutedRoute
            }
        }
    }
    return path

    function substituteRoute(route: string, offsetForTemplateVar: boolean = false) {
        const foundRoute = route as keyof typeof routesFromEnToLocalized;
        const substitutedRoute = substituteTemplate(routesFromEnToLocalized[foundRoute], {
            lang: targetLang,
            // The -6 is to offset lenght of {{path}} or {{lang}} this means that you can have only one ine the route description and it must always be {{4-chars-of-length}} no less, no more
            path: foundRoute.length > 1 ? path.slice(foundRoute.length - (offsetForTemplateVar ? 6 : 0)) : path !== '/' ? path : '',
        });
        return substitutedRoute;
    }
}

export function useSpecificPath(lang: keyof typeof ui, path: string) {
    return lang === defaultLang ? path : `/${lang}${path}`
}


export function stripLangFromPath(path: string): string {
    const newPath = path.split('/').filter(p => !availableLanguages.includes(p as keyof typeof ui)).join('/')
    // if (possibleLang in ui) {
    //     // Found prepended language
    //     return `/${newPath.join('/')}`
    // }
    // Not foun any language in path
    return newPath

}