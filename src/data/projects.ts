import type { ProjectData } from '@/types'
import type { Languages } from '@/i18n/ui'

const enProjectData: ProjectData = [
    {
        title: 'Mantained FOSS projects',
        projects: [
            {
                text: 'ZigNet',
                description: 'A hybrid deterministic/stocastic MCP server for Zig coding assistance. It provides code completion, error checking, and other IDE-like features for Zig developers using the Model Context Protocol.',
                icon: 'i-ri-lightbulb-flash-line',
                href: 'https://github.com/fulgidus/zignet',
            },

        ],
    },
    {
        title: 'Rust experiments',
        projects: [
            {
                text: 'Robo-Dino',
                description: 'An interactive neuroevolution simulation built with Rust, WebAssembly, and TypeScript. Watch hundreds of dinosaurs learn to jump over obstacles through evolving neural networks — all rendered in real time with HTML5 Canvas. No frameworks, no backend, just pure AI and pixel survival.',
                icon: 'i-carbon-machine-learning-model',
                href: 'https://github.com/fulgidus/robo-dino',
            },

        ],
    },
    {
        title: 'Code challenges',
        projects: [
            {
                text: 'Advent of code 2024',
                description: 'This repository contains my solutions for the Code Advent Calendar 2024 challenges. It serves as a personal record of my progress and solutions.',
                icon: 'i-carbon-strategy-play',
                href: 'https://github.com/fulgidus/advent-of-code-2024',
            },

        ],
    },
    {
        title: 'Crypto experiments',
        projects: [
            {
                text: 'Verba Volant Scripta Manent (VVSM)',
                description: 'POC of how a distributed app (dapp) running on the Tezos Virtual Machine (TVM) can store data securely and consistently with the flexibility required by business users.',
                icon: 'i-ri-bit-coin-line',
                href: 'https://fulgidus.github.io/verba-volant/',
            },

        ],
    },
    {
        title: 'Community',
        projects: [
            {
                text: 'TorinoJS',
                description: 'Co-organizer of TorinoJS, a local community in Torino hosting async events about JavaScript, Node.js, IoT, and open source web technologies. We bring developers together to share knowledge, learn from each other, and grow the local tech scene.',
                icon: 'i-ri-team-line',
                href: 'https://torino.js.org',
            },

        ],
    },
    // {
    //     title: 'Test Group',
    //     projects: [
    //         {
    //             text: 'Internal project',
    //             description: 'Your project description information is a long piece of text.',
    //             icon: 'i-carbon-campsite',
    //             href: '/projects/proj1',
    //         },
    //         {
    //             text: 'Project Name',
    //             description: 'Your project description information is a long piece of text.',
    //             icon: 'i-carbon-campsite',
    //             href: 'https://fulgidus.duckdns.org:5008',
    //         },
    //     ],
    // },
]

const itProjectData: ProjectData = [
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
    {
        title: 'Community',
        projects: [
            {
                text: 'TorinoJS',
                description: 'Co-organizzatore di TorinoJS, una community torinese che organizza eventi asincroni su JavaScript, Node.js, IoT e tecnologie web open source. Riuniamo sviluppatori per condividere conoscenze, imparare gli uni dagli altri e far crescere la scena tech locale.',
                icon: 'i-ri-team-line',
                href: 'https://torino.js.org',
            },

        ],
    },
]

export const projectDataByLang: Record<Languages, ProjectData> = {
    en: enProjectData,
    it: itProjectData,
    nl: enProjectData, // fallback
}
