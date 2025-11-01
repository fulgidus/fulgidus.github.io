import type { ProjectData } from '@/types'

export const projectData: ProjectData = [
    {
        title: 'Progetti FOSS mantenuti',
        projects: [
            {
                text: 'ZigNet',
                description: 'Un server MCP ibrido deterministico/stocastico per assistere su Zig. Fornisce completamento del codice, controllo errori, e altre feature da IDE agli sviluppatori Zig usando il Model Context Protocol.',
                icon: 'i-ri-lightbulb-flash-line',
                href: 'https://github.com/fulgidus/zignet',
            },

        ],
    },
    {
        title: 'Esperimenti con Rust',
        projects: [
            {
                text: 'Robo-Dino',
                description: 'Una simulazione interattiva di neuroevoluzione sviluppata con Rust, WebAssembly e TypeScript. Guarda centinaia di dinosauri imparare a saltare gli ostacoli grazie a reti neurali in continua evoluzione — tutto renderizzato in tempo reale con HTML5 Canvas. Niente framework, niente backend, solo pura intelligenza artificiale e sopravvivenza a pixel.',
                icon: 'i-carbon-machine-learning-model',
                href: 'https://github.com/fulgidus/robo-dino',
            },

        ],
    },
    {
        title: 'Sfide di coding',
        projects: [
            {
                text: 'Advent of code 2024',
                description: 'Questo repository contiene le mie soluzioni per le sfide del Calendario dell\'Avvento del Codice 2024. Serve come registro personale dei miei progressi e soluzioni.',
                icon: 'i-carbon-strategy-play',
                href: 'https://github.com/fulgidus/advent-of-code-2024',
            },

        ],
    },
    {
        title: 'Esperimenti crypto',
        projects: [
            {
                text: 'Verba Volant Scripta Manent (VVSM)',
                description: 'POC di come un\'app distribuita (dapp) che gira sulla Tezos Virtual Machine (TVM) può memorizzare dati in modo sicuro e coerente con la flessibilità richiesta dagli utenti aziendali.',
                icon: 'i-ri-bit-coin-line',
                href: 'https://fulgidus.github.io/verba-volant/',
            },

        ],
    },
]
