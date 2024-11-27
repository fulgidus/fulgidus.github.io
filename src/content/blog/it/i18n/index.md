---
title: "Evolvere una soluzione i18n: Da Astro a Vue.js"
description: Questo articolo tratta dell'evoluzione di una soluzione i18n (internazionalizzazione), da una implementazione di base in Astro ad un più complicato approccio in Vue.js, evidenziando le differenze ed i benefici di entrambi
image: i18n.png
imageAlt: I loghi di Astro and VueJS circondati da bandiere nazionali a caso
imageSize: md
pubDate: 2024-11-27T09:02:49
duration: 15m
tags:
  - astro
  - vuejs
  - ssr
  - tutorial
  - web-development
  - testing
  - i18n
  - typescript
  - type-safety
  - internationalization
  - routing
  - frontend
  - development-patterns
  - best-practices 
draft: false
lang: it
redirect: ""
unlisted: false
video: false
---


## Introduzione

Nello sviluppo di applicazioni web multilingua, gli sviluppatori spesso iniziano con semplici file di traduzione e un sistema basilare di cambio lingua. Tuttavia, man mano che le applicazioni crescono in complessità, questo approccio rivela rapidamente i suoi limiti. Le traduzioni mancanti possono causare errori durante l'esecuzione, percorsi linguistici errati possono interrompere la navigazione e mantenere la coerenza dei tipi tra più lingue diventa sempre più impegnativo. Questi problemi diventano particolarmente evidenti quando si lavora con framework come Astro e Vue.js, dove il confine tra contenuto statico e dinamico richiede un'attenta considerazione.

Durante lo sviluppo di un sito di documentazione multilingua, ho incontrato queste sfide in prima persona. L'implementazione iniziale utilizzava un semplice sistema di traduzione chiave-valore, ma è diventato evidente che avevamo bisogno di una soluzione più robusta che potesse gestire modelli di routing complessi, fornire il controllo dei tipi in fase di compilazione per le traduzioni e integrarsi perfettamente sia con il rendering lato server che con quello lato client.

Questo articolo descrive l'evoluzione della nostra soluzione di internazionalizzazione (i18n), concentrandosi sul raggiungimento della sicurezza dei tipi attraverso il sistema di tipi avanzato di TypeScript. Esploreremo come la combinazione di asserzioni costanti, unioni discriminate e tipi letterali del template crea una base solida per la gestione dei contenuti multilingua. La soluzione che esamineremo gestisce diversi aspetti critici che spesso vengono trascurati nelle implementazioni più semplici.

Innanzitutto, abbiamo implementato chiavi di traduzione type-safe che impediscono l'uso accidentale di traduzioni inesistenti. In secondo luogo, abbiamo sviluppato una gestione intelligente dei percorsi che mantiene URL SEO-friendly attraverso i cambi di lingua. Inoltre, abbiamo creato meccanismi di fallback eleganti per le traduzioni mancanti e utility framework-agnostic che funzionano sia nel contesto statico di Astro che nei componenti dinamici di Vue. Infine, abbiamo implementato modelli di routing complessi che preservano la gerarchia dei contenuti tra le lingue.

Per esempio, consideriamo uno scenario tipico in cui un post del blog deve mantenere la sua struttura URL attraverso più lingue garantendo l'esistenza di tutte le traduzioni:

```typescript
// Without type safety:
translate('blog.post.title')  // Could fail at runtime if key doesn't exist

// With our type-safe approach:
translateFrom('it', 'blog.post.title' as TranslationKeys)  // Caught at compile-time if invalid
```

L'implementazione che esploreremo sfrutta il sistema di tipi di TypeScript per individuare questi problemi durante lo sviluppo, molto prima che possano influenzare gli utenti. Attraverso attente definizioni dei tipi e funzioni di utilità, abbiamo creato un sistema che fornisce un'eccellente esperienza di sviluppo senza sacrificare le prestazioni di runtime o la flessibilità.

## Il Centro di Traduzione: ui.ts

Al cuore di qualsiasi sistema di internazionalizzazione si trova la struttura di gestione delle traduzioni. Mentre molte implementazioni trattano le traduzioni come semplici coppie chiave-valore, il nostro approccio sfrutta il sistema di tipi di TypeScript per creare una base più sofisticata e affidabile. Il centro di traduzione non solo memorizza le nostre traduzioni ma stabilisce anche le relazioni tra i tipi che guideranno gli sviluppatori attraverso l'applicazione.

Comprendere la struttura di `ui.ts` è fondamentale perché stabilisce i vincoli di tipo che fluiscono attraverso l'intero sistema. Iniziamo definendo la nostra lingua predefinita come una costante utilizzando l'asserzione `as const` di TypeScript. Questo potrebbe sembrare un dettaglio minore, ma è essenziale per mantenere la sicurezza dei tipi in tutta la nostra applicazione.

Consideriamo le sfide della gestione delle traduzioni in un'applicazione in crescita: nuove lingue vengono aggiunte, le traduzioni vengono aggiornate e c'è la necessità di garantire la coerenza tra tutte le versioni linguistiche. La nostra struttura affronta queste sfide attraverso attente definizioni di tipo e asserzioni costanti. Esaminiamo l'implementazione:

```typescript
// src/i18n/ui.ts

// Define the default language as a constant
export const defaultLang = 'en' as const;

// Define available languages with their display names
export const languages = {
    en: 'English',
    it: 'Italiano',
    nl: 'Nederlands',
} as const;

// Create a type for available languages
export type AvailableLanguages = keyof typeof languages;

// Define the UI translations structure
export const ui = {
    en: {
        'flag': '🇬🇧',
        'language': 'English',
        'nav.home': 'Home',
        'nav.blog': 'Blog',
        // ... English translations
    },
    it: {
        'flag': '🇮🇹',
        'language': 'Italiano',
        'nav.home': 'Inizio',
        'nav.blog': 'Blog',
        // ... Italian translations
    },
    nl: {
        'disabled': 'true', // Special flag for incomplete translations
        'flag': '🇳🇱',
        'language': 'Nederlands',
        // ... Dutch translations
    }
} as const;

// Derive types from our UI structure
export type UI = typeof ui;
export type Languages = keyof UI;
export type TranslationKeys = keyof typeof ui[typeof defaultLang];
```

La struttura che abbiamo creato serve a diversi scopi cruciali che potrebbero non essere immediatamente evidenti. Innanzitutto, l'asserzione `as const` sui nostri oggetti non è solo un dettaglio di TypeScript: trasforma la nostra struttura di traduzione da una raccolta libera di stringhe in una definizione di tipo precisa che TypeScript può utilizzare per applicare la correttezza in tutta l'applicazione. In secondo luogo, derivando i nostri tipi dalla struttura dei dati effettiva utilizzando `typeof`, garantiamo che i nostri tipi rimangano sempre sincronizzati con le nostre traduzioni reali. Questo impedisce il problema comune della divergenza delle definizioni dei tipi dall'implementazione nel tempo. Infine, il flag speciale 'disabled' nelle traduzioni olandesi dimostra come possiamo gestire lingue parzialmente implementate senza compromettere la sicurezza dei tipi.

## La Sala Macchine: utils.ts

Mentre il centro di traduzione definisce la nostra struttura dati, le funzioni di utilità in `utils.ts` forniscono i meccanismi che fanno funzionare tutto insieme. Queste utility gestiscono tutto, dal rilevamento della lingua alla traduzione dei percorsi, formando la spina dorsale del nostro sistema di internazionalizzazione.

Ogni funzione di utilità è progettata per gestire un aspetto specifico del processo di internazionalizzazione mantenendo la sicurezza dei tipi. Le funzioni lavorano insieme per creare un sistema coeso che gestisce sia scenari semplici che complessi. Esaminiamo queste utility e comprendiamo come lavorano insieme:

```typescript
// src/i18n/utils.ts

import { ui, defaultLang, type Languages, type TranslationKeys } from './ui';

// URL-based language detection
export function getLangFromUrl(url: URL | string): Languages {
    // Extract language code from URL path
    const [, lang] = (typeof url === 'string' ? url : url.pathname).split('/');
    
    // Type guard to ensure language exists in our UI definitions
    return (lang in ui) ? lang as Languages : defaultLang;
}

// Translation function with type safety
export function translateFrom(lang: Languages, key: TranslationKeys): string {
    // Optional chaining with nullish coalescing for robust fallback
    return ui[lang]?.[key] ?? ui[defaultLang][key] ?? `#${key}#`;
}

// Hook-style translation function
export function useTranslate(lang: Languages) {
    return function translate(key: TranslationKeys): string {
        return translateFrom(lang, key);
    }
}

// Path translation with template support
export function translatePath(
    path: string, 
    targetLang: Languages = defaultLang
): string {
    const pathSegments = path.split('/');
    
    // Handle already localized paths
    if (pathSegments[1] in ui) {
        if (pathSegments[1] === targetLang) {
            return path;
        }
        return populateFromRoute(stripLangFromPath(path), targetLang);
    }
    
    // Handle non-localized paths
    return targetLang === defaultLang 
        ? path 
        : populateFromRoute(path, targetLang);
}

// Helper function to strip language prefix
export function stripLangFromPath(path: string): string {
    const availableLanguages = Object.keys(ui) as Languages[];
    return path
        .split('/')
        .filter(segment => !availableLanguages.includes(segment as Languages))
        .join('/');
}

// Template-based route population
export function populateFromRoute(
    path: string, 
    targetLang: Languages
): string {
    const variables: Record<string, string> = {
        lang: targetLang,
        path: path !== '/' ? path : ''
    };
    
    // Find matching route template
    for (const [route, template] of Object.entries(routesFromEnToLocalized)) {
        if (path.startsWith(route)) {
            return substituteTemplate(template, variables);
        }
    }
    
    return path;
}

// Template variable substitution
export function substituteTemplate(
    template: string,
    variables: Record<string, string>
): string {
    return template.replace(/{{(\w+)}}/g, (_, key) => {
        if (variables[key] === undefined) {
            console.warn(`Missing template variable: ${key}`);
            return `Missing value for template variable: ${key}`;
        }
        return variables[key];
    });
}
```

Queste utility dimostrano diversi modelli importanti. Il sistema di rilevamento della lingua è progettato per essere resiliente, tornando sempre alla lingua predefinita invece di generare errori, il che è cruciale per mantenere un'esperienza utente stabile. Il sistema di traduzione dei percorsi gestisce trasformazioni complesse dei percorsi mantenendo URL SEO-friendly, particolarmente importante per i siti ricchi di contenuti dove la struttura degli URL influisce sul posizionamento nei motori di ricerca. Inoltre, il sistema di template fornisce flessibilità per modelli di routing complessi mantenendo la sicurezza dei tipi, permettendoci di gestire strutture URL variate senza compromettere l'affidabilità.

## Sicurezza dei Tipi e Gestione degli Errori

La sicurezza dei tipi in un sistema di internazionalizzazione va oltre la prevenzione di semplici errori di digitazione. Si tratta di creare un sistema che guidi gli sviluppatori verso un uso corretto mentre rileva potenziali problemi prima che raggiungano la produzione. La nostra implementazione sfrutta il sistema di tipi di TypeScript per fornire diversi livelli di protezione.

La funzione `getLangFromUrl` garantisce che lavoriamo solo con lingue definite:

```typescript
function isValidLanguage(lang: string): lang is Languages {
    return lang in ui;
}
```

Il tipo `TranslationKeys` garantisce che possiamo richiedere solo traduzioni esistenti:

```typescript
// This would cause a TypeScript error
translateFrom('en', 'nonexistent.key'); // Error: Argument not assignable to TranslationKeys
```

Questi meccanismi di sicurezza dei tipi lavorano insieme per creare un'esperienza di sviluppo che rileva gli errori presto fornendo feedback utili attraverso l'integrazione IDE. Invece di scoprire traduzioni mancanti in produzione, gli sviluppatori ricevono feedback immediato durante lo sviluppo.

## Sistema di Traduzione dei Percorsi

La traduzione dei percorsi in un'applicazione multilingua presenta sfide uniche. Gli URL devono essere sia user-friendly che ottimizzati per SEO mantenendo una struttura coerente tra le lingue. Il nostro sistema di traduzione dei percorsi affronta queste sfide attraverso un approccio basato su template che fornisce flessibilità senza sacrificare la sicurezza dei tipi:

```typescript
export const routesFromEnToLocalized = {
    '/posts/{{lang}}/notes': '/{{lang}}/posts/{{lang}}/notes{{path}}',
    '/posts/notes': '/{{lang}}/posts/{{lang}}/notes{{path}}',
    '/posts': '/{{lang}}/posts/{{lang}}{{path}}',
    '/': '/{{lang}}{{path}}',
} as const;
```

Il nostro sistema di routing supporta diverse funzionalità avanzate. In primo luogo, gestisce l'aggiunta semplice di prefissi lingua (da '/about' a '/it/about'). In secondo luogo, permette trasformazioni complesse dei percorsi (da '/posts/notes' a '/it/posts/it/notes'). Mantiene anche la preservazione dei parametri del percorso e la rimozione del percorso della lingua predefinita. Il sistema gestisce gerarchie di contenuti complesse dove la struttura del percorso potrebbe differire tra le lingue, preserva i parametri di query e i frammenti hash durante la traduzione, mantiene URL SEO-friendly attraverso tutte le lingue supportate e gestisce elegantemente i casi limite come il percorso root e le traduzioni mancanti.

## Integrazione con Vue.js

L'integrazione del nostro sistema di internazionalizzazione type-safe con Vue.js presenta sfide uniche. Mentre le utility core rimangono le stesse, dobbiamo adattare il nostro approccio per lavorare all'interno del sistema di reattività di Vue e del ciclo di vita dei componenti. La differenza chiave sta in come gestiamo il rilevamento degli URL e i cambi di lingua in un ambiente client-side:

```typescript
// Vue component example
<script lang="ts" setup>
// imports...

// Reactive language based on URL
const currentLang = ref(defaultLang);

onMounted(() => {
    url = new URL(window.location.href);
    currentLang.value = getLangFromUrl(url); // Inizializza la lingua basata sull'URL
})

// Watch currentLang for changes and update translations
watchEffect(() => {
    url = new URL(window.location.href);
    currentLang.value = getLangFromUrl(url);
    translate = useTranslate(currentLang.value as Languages);
});
</script>

// [...]
<template>
// [...]
</template>
```

L'integrazione con Vue.js dimostra come il nostro sistema type-safe possa adattarsi a diversi framework mantenendo i suoi benefici fondamentali. La natura reattiva dei componenti Vue richiede un'attenta considerazione di quando e come aggiorniamo le traduzioni, ma il nostro sistema di tipi garantisce che questi aggiornamenti rimangano sicuri.

## Considerazioni sui Test

Il testing di un sistema di internazionalizzazione richiede un'attenta attenzione sia alla sicurezza dei tipi che al comportamento durante l'esecuzione. Il nostro approccio ai test verifica non solo il percorso felice ma anche i casi limite e le condizioni di errore:

```typescript
describe('i18n/utils', () => {
    it('should create a translation function', () => {
        const t = useTranslate('it');
        expect(t('nav.home')).toBe(ui.it['nav.home']); //Replace 'nav.home' with an actual key from your ui object
        // Please note the forceful typecasting needed to make it fail and test how it would do it in production.
        expect(t('nonexistentKey' as TranslationKeys)).toBe(ui.en['nonexistentKey'] ?? '#nonexistentKey#'); //Should handle missing keys gracefully.  Modify based on your desired behavior.
    });
});
```

Questi test dimostrano come il nostro sistema di tipi aiuti a garantire l'affidabilità pur permettendo di testare casi limite e condizioni di errore. La capacità di forzare errori di tipo nei nostri test aiuta a garantire che la nostra gestione degli errori funzioni come previsto in produzione.

## Conclusione

La costruzione di un robusto sistema di internazionalizzazione richiede un'attenta considerazione sia dell'esperienza dello sviluppatore che del comportamento durante l'esecuzione. Attraverso il nostro percorso di implementazione di questa soluzione i18n type-safe, abbiamo visto come il sistema di tipi avanzato di TypeScript possa trasformare ciò che è tradizionalmente un aspetto soggetto a errori dello sviluppo web in una base affidabile e manutenibile per applicazioni multilingua.

La potenza di questa implementazione non risiede solo nella sua capacità di rilevare errori in fase di compilazione, ma in come guida gli sviluppatori verso un uso corretto attraverso l'inferenza dei tipi di TypeScript e l'integrazione con l'IDE. Quando uno sviluppatore tenta di utilizzare una chiave di traduzione inesistente o struttura incorrettamente un percorso, riceve feedback immediato. Questo ciclo di feedback immediato riduce drasticamente il tempo speso nel debug dei problemi in produzione e garantisce la coerenza in tutta l'applicazione.

Ciò che rende questa soluzione particolarmente preziosa è la sua adattabilità attraverso diversi contesti di rendering. Che si lavori all'interno della generazione di siti statici di Astro o del sistema di componenti dinamici di Vue, le utility core rimangono coerenti e affidabili. Questa coerenza è cruciale per applicazioni più grandi dove il confine tra contenuto statico e dinamico spesso sfuma.

Guardando al futuro, questa base apre diverse possibilità di miglioramento:

1. L'integrazione con i sistemi di gestione delle traduzioni (TMS) potrebbe automatizzare il processo di mantenimento di ui.ts aggiornato, mantenendo la sicurezza dei tipi attraverso la generazione di codice.

2. Il sistema di traduzione dei percorsi potrebbe essere esteso per gestire modelli più complessi, come percorsi dinamici annidati o parametri opzionali, mantenendo la sua natura type-safe.

3. Si potrebbero implementare ottimizzazioni delle prestazioni attraverso lo splitting strategico del codice dei dati di traduzione, caricando solo le lingue necessarie per ogni sessione utente.

4. Il sistema dei tipi potrebbe essere ulteriormente migliorato per supportare strutture di traduzione annidate e meccanismi di fallback più sofisticati.

Più importante ancora, questa implementazione dimostra come il sistema di tipi di TypeScript possa essere sfruttato non solo per la prevenzione degli errori, ma come strumento per costruire migliori esperienze di sviluppo. La combinazione di sicurezza in fase di compilazione e flessibilità durante l'esecuzione crea un sistema che è sia affidabile che pratico per applicazioni del mondo reale.

Attraverso un'attenta attenzione alla sicurezza dei tipi, alla gestione degli errori e all'integrazione dei framework, abbiamo creato più di un semplice sistema di traduzione: abbiamo costruito una base per creare applicazioni veramente multilingua con cui gli sviluppatori possono lavorare con fiducia e su cui gli utenti possono fare affidamento in modo coerente.

Per i team che considerano un'implementazione simile, ricordate che il vero valore della sicurezza dei tipi va oltre il rilevamento degli errori. Crea una base di codice auto-documentante dove i tipi stessi servono come documentazione vivente delle capacità e dei vincoli del sistema. Questo diventa sempre più prezioso man mano che le applicazioni crescono e i membri del team cambiano.

Infine, una soluzione i18n ben implementata dovrebbe risultare quasi invisibile sia agli sviluppatori che agli utenti. Dovrebbe guidare gli sviluppatori verso un uso corretto senza ostacolarli, fornendo allo stesso tempo agli utenti un'esperienza senza soluzione di continuità indipendentemente dalla lingua scelta. Attraverso la combinazione del sistema di tipi di TypeScript, un'attenta gestione degli errori e un design API ponderato, abbiamo raggiunto esattamente questo obiettivo.