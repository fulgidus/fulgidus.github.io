import type { ProjectData } from '@/types'

export const projectData: ProjectData = [
  {
    title: 'Crypto experiments',
    projects: [
      {
        text: 'Verba Volant Scripta Manent (VVSM)',
        description: 'POC of how a distributed app (dapp) running on the Tezos Virtual Machine (TVM) can store data securely and consistently with the flexibility required by business users.',
        icon: 'i-carbon-schematics',
        href: 'https://fulgidus.github.io/verba-volant/',
      },

    ],
  },
  {
    title: 'Test Group',
    projects: [
      {
        text: 'Internal project',
        description: 'Your project description information is a long piece of text.',
        icon: 'i-carbon-campsite',
        href: '/projects/proj1',
      },
      {
        text: 'Project Name',
        description: 'Your project description information is a long piece of text.',
        icon: 'i-carbon-campsite',
        href: 'https://fulgidus.duckdns.org:5008',
      },
    ],
  },
]