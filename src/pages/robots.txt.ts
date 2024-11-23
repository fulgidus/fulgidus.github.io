import siteConfig from "@/site-config";
import { getCollection } from "astro:content";

interface Context {
    site: string
}


export async function generateDisallowedPaths() {
    const blogPosts = await getCollection('blog', p => p.data.unlisted || p.data.draft);
    return blogPosts.map(p => `Disallow: ${siteConfig.basePath}posts/${p.slug}`).join('\n');
}

export async function GET(context: Context) {
    const robots = `

User-agent: *
Sitemap: ${new URL('sitemap-index.xml', context.site).href}
Allow: /
${await generateDisallowedPaths()}

`.trim()
    return new Response(robots, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
