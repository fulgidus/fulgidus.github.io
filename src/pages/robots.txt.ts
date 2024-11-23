import siteConfig from "@/site-config";
import { getCollection } from "astro:content";

interface Context {
    site: string
}


export async function generateDisallowedPaths() {
    const blogPosts = await getCollection('blog', p => p.data.unlisted);
    return blogPosts.map(p => `

User-agent: *
Disallow: ${siteConfig.basePath ?? '/'}posts/${p.slug}

User-agent: AdsBot-Google
Disallow: ${siteConfig.basePath ?? '/'}posts/${p.slug}

User-agent: AdsBot-Google-Mobile
Disallow: ${siteConfig.basePath ?? '/'}posts/${p.slug}

User-agent: *
Allow: /

`.trim()).join('\n\n');
}

export async function GET(context: Context) {
    const robots = `

User-agent: *
Disallow: 

${await generateDisallowedPaths()}

Sitemap: ${new URL('sitemap-index.xml', context.site).href}

`.trim()
    return new Response(robots, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
