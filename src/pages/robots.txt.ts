interface Context {
    site: string
}

// Unlisted posts are deliberately NOT listed here: robots.txt is public, so a Disallow line
// would hand out the very URL that only its owner is supposed to know, and a crawler that
// may not fetch a page never sees its noindex meta. They carry noindex and stay out of
// lists, RSS, sitemap and search instead.
export async function GET(context: Context) {
    const robots = `
User-agent: *
Disallow: /well/
Allow: /

User-agent: AdsBot-Google
Disallow: /well/

User-agent: AdsBot-Google-Mobile
Disallow: /well/

Sitemap: ${new URL('sitemap-index.xml', context.site).href}
`.trim()
    return new Response(robots, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
