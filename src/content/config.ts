import siteConfig from '@/site-config'
import { defineCollection, z } from 'astro:content'

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
  }),
})

const blog = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().optional(),
    duration: z.string().optional(),
    image: image().refine(img => img.width >= 800, {
      message: 'Cover image must be at least 800 pixels wide!',
    }).optional(),
    imageAlt: z.string().optional(),
    imageSize: z.literal('xl')
      .or(z.literal('lg'))
      .or(z.literal('md'))
      .or(z.literal('sm'))
      .or(z.literal('xs'))
      .optional(),
    pubDate: z
      .string()
      .or(z.date())
      .transform((val: string | number | Date) => new Date(val).toLocaleDateString(siteConfig.date.locale, siteConfig.date.options)),
    draft: z.boolean().default(false).optional(),
    unlisted: z.boolean().default(false).optional(),
    lang: z.string().default('en').optional(),
    tags: z.array(z.string()).default([]).optional(),
    redirect: z.string().optional(),
    video: z.boolean().default(false).optional(),
  }),
})

export const collections = { pages, blog }
