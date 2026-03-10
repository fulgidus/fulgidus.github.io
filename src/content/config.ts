import { defineCollection, z } from 'astro:content'

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
    schema: ({ image }) => z.object({
        title: z.string(),
        description: z.string().optional(),
        duration: z.string().optional(),
        image: image().refine(img => img.width >= 800 || img.format === 'svg', {
            message: 'Image must be at least 800 pixels wide (or .svg)',
        }).optional(),
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
        marp: z.boolean().default(false),
        marpTheme: z.string().optional(),
        marpAspectRatio: z.enum(['16:9', '4:3']).default('16:9'),
    }),
})

export const collections = { pages, blog }
