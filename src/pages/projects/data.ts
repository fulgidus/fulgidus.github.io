import type { ProjectData } from '@/types'

export const projectData: ProjectData = [
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
