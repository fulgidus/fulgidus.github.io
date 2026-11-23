import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const imageSizeSchema = z.union([
    z.literal('xl'),
    z.literal('lg'),
    z.literal('md'),
    z.literal('sm'),
    z.literal('xs'),
]).default('md')
export type ImageSize = z.infer<typeof imageSizeSchema>
// const supportedLanguagesSchema = z.union([
//     z.literal('en'),
//     z.literal('it'),
//     z.literal('zh'),
// ]).default('en')
// export type SupportedLanguages = z.infer<typeof supportedLanguagesSchema>
export type SupportedLanguages = 'en' | 'it' | 'zh'
export type ImageFormat = "png" | "jpg" | "jpeg" | "tiff" | "webp" | "gif" | "svg" | "avif"

const pages = defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/pages' }),
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        image: z
            .object({
                src: z.string(),
                alt: z.string(),
            })
            .optional(),
        tags: z.array(z.string()).default([]),
    }),
})
const blog = defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
    schema: ({ image }) => z.object({
        title: z.string(),
        description: z.string().optional(),
        duration: z.string().optional(),
        // image().refine() is not supported by the content layer (image is resolved after
        // validation); the >= 800px width check now runs in getPosts() (src/utils/posts.ts).
        image: image().optional(),
        imageAlt: z.string().optional(),
        imageSize: imageSizeSchema,
        pubDate: z
            .string()
            .or(z.date())
            .transform((val: string | number | Date) => new Date(val)),
        draft: z.boolean().default(false),
        unlisted: z.boolean().default(false),
        lang: z.enum(['en', 'it']).default('en'),
        translationOf: z.string().optional(),
        tags: z.array(z.string()).default([]),
        redirect: z.string().optional(),
        video: z.boolean().default(false),
        series: z.string().optional(),
        seriesOrder: z.number().optional(),
        slides: z.object({
            src: z.string(),
            // slide number shown for each h2 of the post, in order; before the first h2 the dock shows slide 1
            byHeading: z.array(z.number().int().positive()).default([]),
        }).optional(),
    }),
})

export const collections = { pages, blog }
