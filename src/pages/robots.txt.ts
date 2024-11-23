import siteConfig from "@/site-config";
import { getCollection } from "astro:content";

interface Context {
    site: string
}


export async function generateDisallowedPaths() {
    const blogPosts = await getCollection('blog', p => p.data.unlisted || p.data.draft);
    return blogPosts.map(p => `User-agent: *\nDisallow: ${siteConfig.basePath ?? '/'}posts/${p.slug}\nCrawl-Delay: 5`).join('\n\n');
}

export async function GET(context: Context) {
    const robots = `

User.agent: *
Disallow:
Crawl-Delay: 5

${await generateDisallowedPaths()}

Sitemap: ${new URL('sitemap-index.xml', context.site).href}

`.trim()
    return new Response(robots, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
