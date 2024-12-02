import type { ProjectData } from '@/types'

export const projectData: ProjectData = [
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
