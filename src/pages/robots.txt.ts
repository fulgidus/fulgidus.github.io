import siteConfig from "@/site-config";
import { getCollection } from "astro:content";

interface Context {
    site: string
}


export async function generateDisallowedPaths() {
    const blogPosts = await getCollection('blog', p => p.data.unlisted);
    const base = siteConfig.basePath ?? '/'
    return blogPosts.map(p => `Disallow: ${base}posts/${p.slug}`).join('\n');
}

export async function GET(context: Context) {
    const unlistedRules = await generateDisallowedPaths()

    const robots = `
User-agent: *
Disallow: /well/
${unlistedRules}
Allow: /

User-agent: AdsBot-Google
Disallow: /well/
${unlistedRules}

User-agent: AdsBot-Google-Mobile
Disallow: /well/
${unlistedRules}

Sitemap: ${new URL('sitemap-index.xml', context.site).href}
`.trim()
    return new Response(robots, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
