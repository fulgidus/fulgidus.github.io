import type { DateTimeFormatOptions } from "./utils/date"

const DATE_OPTIONS: DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
}
export const siteConfig = {
    author: 'Alessio Corsi',
    title: 'The Fulgidus Chronicles',
    description: 'Code, Creativity, and Curious Explorations',
    email: 'alessio.corsi@gmail.com',
    basePath: '/',
    siteImage: {
        src: '/img/og-image.png',
        alt: 'The Fulgidus Chronicles',
    },
    socialLinks: [
        {
            text: 'GitHub',
            href: 'https://github.com/fulgidus',
            icon: 'i-simple-icons-github',
            header: 'i-ri-github-line',
        },
        /* {
          text: 'Twitter',
          href: '',
          icon: 'i-simple-icons-x',
          header: 'i-ri-twitter-x-line',
        }, */
        {
            text: 'LinkedIn',
            href: 'https://www.linkedin.com/in/fulgidus',
            icon: 'i-simple-icons-linkedin',
            header: 'i-ri-linkedin-line',
        },
        {
            text: 'Instagram',
            href: 'https://www.instagram.com/fulgidus',
            icon: 'i-simple-icons-instagram',
        },
        /* {
          text: 'Youtube',
          href: '',
          icon: 'i-simple-icons-youtube',
        }, */
    ],
    header: {
        logo: {
            src: '/img/logo.svg',
            alt: 'Logo Image',
        },
        navLinks: [
            {
                text: 'nav.blog',
                href: '/blog',
            },
            {
                text: 'nav.notes',
                href: '/blog/notes',
            },
            /* {
              text: 'Talks',
              href: '/blog/talks',
            }, */
            {
                text: 'nav.projects',
                href: '/projects',
            },
        ],
    },
    page: {
        blogLinks: {
            en: [
                {
                    text: 'Blog',
                    href: '/blog',
                },
                {
                    text: 'Notes',
                    href: '/blog/notes',
                },
                /* {
                  text: 'Talks',
                  href: '/blog/talks',
                }, */
            ],
            it: [
                {
                    text: 'Blog',
                    href: '/it/blog',
                },
                {
                    text: 'Note',
                    href: '/it/blog/notes',
                },
                /* {
                  text: 'Talks',
                  href: '/blog/talks',
                }, */
            ]
        },
    },
    footer: {
        navLinks: [
            {
                text: 'Posts Props',
                href: '/posts-props',
            },
            {
                text: 'Markdown Style',
                href: '/md-style',
            },
            {
                text: 'All Tags',
                href: '/tags',
            },
        ],
    },

    // Date.prototype.toLocaleDateString() parameters, found in src/utils/date.ts.
    date: {
        locale: 'en-GB',
        options: DATE_OPTIONS
    }
}

export default siteConfig
