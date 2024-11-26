export const languages = {
    en: 'English',
    it: 'Italiano',
    nl: 'Nederlands',
    zh: '简体中文',
};

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
        'rss.titleAll': 'All posts in English',
        'rss.titleLastTen': 'Last 10 posts in English',
    },
    it: {
        'flag': '🇮🇹',
        'language': 'Italiano',
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
        'rss.titleAll': 'Tutti i post in Italiano',
        'rss.titleLastTen': 'Ultimi 10 post in Italiano',
    },
} as const;

export function getLangLabel(lang: keyof typeof ui) {
    return ui[lang].language;
}

export const routesFromEnToLocalized = {
    '/posts/notes': '/{{lang}}/posts/{{lang}}/notes{{path}}',
    '/posts/talks': '/{{lang}}/posts/{{lang}}/talks{{path}}',
    '/posts': '/{{lang}}/posts/{{lang}}{{path}}',
    '/blog/notes': '/{{lang}}/blog/notes',
    '/blog': '/{{lang}}/blog',
    '/projects': '/{{lang}}/projects',
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
            console.error(`Missing value for template variable: ${key}
Variables: ${JSON.stringify(variables)}`);
        }
        return variables[key];
    });
}