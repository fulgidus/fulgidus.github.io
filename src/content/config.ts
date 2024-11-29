import siteConfig from '@/site-config'
import { defineCollection, z } from 'astro:content'

const imageSizeSchema = z.union([
    z.literal('xl'),
    z.literal('lg'),
    z.literal('md'),
    z.literal('sm'),
    z.literal('xs'),
]).default('md')
export type ImageSize = z.infer<typeof imageSizeSchema>
const supportedLanguagesSchema = z.union([
    z.literal('en'),
    z.literal('it'),
    z.literal('zh'),
]).default('en')
export type SupportedLanguages = z.infer<typeof supportedLanguagesSchema>
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
        lang: supportedLanguagesSchema,
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
            .transform((val: string | number | Date) => new Date(val).toLocaleDateString(siteConfig.date.locale, siteConfig.date.options)),
        draft: z.boolean().default(false),
        unlisted: z.boolean().default(false),
        lang: supportedLanguagesSchema,
        tags: z.array(z.string()).default([]),
        redirect: z.string().optional(),
        video: z.boolean().default(false),
    }),
})

export const collections = { pages, blog }
