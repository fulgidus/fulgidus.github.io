import type { CollectionEntry } from 'astro:content'

export const POST_KEY = 'blog'
export const PAGE_KEY = 'pages'

export type PostKey = typeof POST_KEY

export type CollectionPost = CollectionEntry<PostKey>

export type PageKey = typeof PAGE_KEY


export type CollectionPages = CollectionEntry<PageKey>

export type ProjectData = Array<{
  title: string
  projects: Array<{
    text: string
    description?: string
    icon?: string
    href: string
  }>
}>

export type PaginationLink = {
    url: string
    text?: string
    srLabel?: string
}