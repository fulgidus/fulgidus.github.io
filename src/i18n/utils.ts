import { ui, defaultLang, routesFromEnToLocalized, substituteTemplate } from './ui';


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

export function old_useTranslatedPath(lang: keyof typeof ui) {
    return function translatePath(path: string, l: string = lang) {
        return l === defaultLang ? path : `/${l}${path}`
    }
}

export function useTranslatedPath(currentLang: keyof typeof ui) {
    return function translatePath(path: string, targetLang: keyof typeof ui = defaultLang): string {
        const availableLanguages = Object.keys(ui) as (keyof typeof ui)[]
        const pathParts = path.split('/');
        if (availableLanguages.includes(pathParts[1] as keyof typeof ui)) {
            // path is localized
            console.log(`useTranslatedPath
                // path is localized
                path: ${path}`)
            if (pathParts[1] as keyof typeof ui === targetLang) {
                // No change in route necessary
                console.log(`No change in route necessary
                    ${pathParts[1]} === ${targetLang}`)
                return path;
            } else if (targetLang === defaultLang) {
                // Path stripping necessary
                console.log(`Path stripping necessary
                    ${targetLang} === ${defaultLang}
                    stripped path: ${useStripLangFromPath(currentLang)(path)}`)
                return useStripLangFromPath(currentLang)(path);
            } else {
                // Path is of different locale either substitute or strip and repopulate
                return path // TODO: make path locale to locale converter
            }
        } else {
            // Path is English
            console.log(`Path is English
                path: ${path}`)
            if (targetLang === defaultLang) {
                return path
            }
            let foundRoute: keyof typeof routesFromEnToLocalized = '/' as keyof typeof routesFromEnToLocalized
            for (const route in routesFromEnToLocalized) {
                if (path.startsWith(route)) {
                    // Found the most specific route!
                    console.log(`Found the most specific route!
                        route: ${route}`)
                    foundRoute = route as keyof typeof routesFromEnToLocalized;
                    break
                }
            }
            const localizedPath = substituteTemplate(routesFromEnToLocalized[foundRoute], {
                lang: targetLang,
                path: path.slice(foundRoute.length),
            })
            // Localizing path...
            console.log(`Localizing path...
                localizedPath: ${localizedPath}`)
            return localizedPath
        }
    }
}



export function useSpecificPath(lang: keyof typeof ui, path: string) {
    return lang === defaultLang ? path : `/${lang}${path}`
}


export function useStripLangFromPath(lang: keyof typeof ui) {
    return function strippedPath(path: string, l: string = lang): string {
        const [, possibleLang, collectionParticle, , ...remainingPath] = (path).split('/'); // search for a prepended language
        const newPath = [collectionParticle, ...remainingPath]
        console.log(`
            strippedLangFromPath:
            lang: ${l} || path: ${path} | (path).split('/'): ${path.split('/')} | possibleLang:"${possibleLang}" | remainingPath: "/${newPath.join(' /')}" | path: "${path}"`)
        if (possibleLang in ui) {
            // Found prepended language
            console.log(`Found prepended language`)
            return `/${newPath.join('/')}`
        }
        // Not foun any language in path
        console.log(`Not found any language in path`)
        return path
    }
}