export const defaultLang = 'en';
export const ui = {
    en: {
        'flag': '🇬🇧',
        'language': 'English',
        'nav.home': 'Home',
        'nav.blog': 'Blog',
        'nav.notes': 'Note',
        'nav.projects': 'Projects',
        'nav.about': 'About',
        'nav.twitter': 'Twitter',
        'nav.github': 'GitHub',
        'nav.linkedin': 'LinkedIn',
        'nav.instagram': 'Instagram',
        'nav.youtube': 'YouTube',
        'nav.x': 'X',
        'slug.unlisted': 'Not indexed (No PostsList, No RSS, No robots.txt)',
        'slug.draft': 'This article is a draft and is not yet published',
        'rss.titleAll': 'All posts in English',
        'rss.titleLastTen': 'Last 10 posts in English',
        '404.title': 'Not found',
        '404.description': 'Sorry, we couldn\'t find what you were looking for!',
        '404.backButtonLabel': 'Go back to Home',
        'langSelector.empty': 'Select language',
        'footer.postProps':'Posts Props',
        'footer.style':'MD Files Styles',
        'footer.tags':'All Tags',
        'downloadButton.title':'Download',
        'downloadButton.cv':'my CV',
        'sharePost.button':'Share this post',
        'sharePost.copy':'Copy post link',
    },
    it: {
        'flag': '🇮🇹',
        'language': 'Italiano',
        'diagnostic': 'Diagnostic',
        'nav.home': 'Inizio',
        'nav.blog': 'Blog',
        'nav.notes': 'Note',
        'nav.projects': 'Progetti',
        'nav.about': 'Informazioni',
        'nav.twitter': 'Twitter',
        'nav.github': 'GitHub',
        'nav.linkedin': 'LinkedIn',
        'nav.instagram': 'Instagram',
        'nav.youtube': 'YouTube',
        'nav.x': 'X',
        'slug.unlisted': 'Non indicizzato (No PostsList, No RSS, No robots.txt)',
        'slug.draft': 'Questo articolo è una bozza e non è ancora pubblicato',
        'rss.titleAll': 'Tutti i post in Italiano',
        'rss.titleLastTen': 'Ultimi 10 post in Italiano',
        '404.title': 'Non trovato',
        '404.description': 'Spiacenti, non siamo riusciti a trovare quel che cercavi!',
        '404.backButtonLabel': 'Torna all\'Inizio',
        'langSelector.empty': 'Seleziona lingua',
        'footer.postProps': 'Prop dei Post',
        'footer.style': 'Stili dei File MD',
        'footer.tags': 'Tutti i Tag',
        'downloadButton.title':'Scarica',
        'downloadButton.cv':'il mio CV',
        'sharePost.button':'Condividi questo post',
        'sharePost.copy':'Copia il link',
    },
    nl: {
        'disabled': 'true',
        'flag': '🇳🇱',
        'language': 'Nederlands',
        'nav.home': 'Huis',
        'nav.blog': 'Blog',
        'nav.notes': 'Opmerkingen',
        'nav.projects': 'Projecten',
        'nav.about': 'Over',
        'nav.twitter': 'Twitter',
        'nav.github': 'GitHub',
        'nav.linkedin': 'LinkedIn',
        'nav.instagram': 'Instagram',
        'nav.youtube': 'YouTube',
        'nav.x': 'X',
        'slug.unlisted': 'Niet geindexeerd (Geen PostsList, Geen RSS, Geen robots.txt)',
        'slug.draft': 'Dit artikel is een concept en is nog niet gepubliceerd',
        'rss.titleAll': 'Alle posts in Nederlands',
        'rss.titleLastTen': 'Laatste 10 posts in Nederlands',
        '404.title': 'Niet gevonden',
        '404.description': 'Sorry, we konden niet vinden waar je naar op zoek was!',
        '404.backButtonLabel': 'Ga naar Huis',
        'langSelector.empty': 'Selecteer taal',
        'downloadButton.title':'Download',
        'downloadButton.cv':'mijn CV',
        'sharePost.button':'Deel dit bericht',
        'sharePost.copy':'Kopieer link',
    },
    

} as const;

export const languages = {
    en: 'English',
    it: 'Italiano',
    nl: 'Nederlands',
};

export const availableLanguages = Object.keys(ui) as Languages[];

export function getLangLabel(lang: Languages) {
    return ui[lang].language;
}

// You can have only one template variable in the route description and it must always be {{4-chars-of-length}} no less, no more
export const routesFromEnToLocalized = {
    '/files': '/files/{{lang}}{{path}}',
    '/': '/{{lang}}{{path}}',
    '': '/{{lang}}{{path}}',
    //Add more paths as needed
};


export function substituteTemplate(
    template: string,
    variables: Record<string, string>
): string {
    if (variables['lang'] === undefined) {
        variables['lang'] = defaultLang;
    }
    return template.replace(/{{(\w+)}}/g, (_, key) => {
        if (variables[key] === undefined) {
            console.warn(`Missing value for template variable: ${key}`);
            return `Missing value for template variable: ${key}`;
        }
        return variables[key];
    });
}

export type UI = typeof ui;
export type Languages = keyof UI;
export type TranslationKeys = keyof UI[typeof defaultLang];
