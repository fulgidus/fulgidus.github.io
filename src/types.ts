import type { CollectionEntry } from 'astro:content'

export type PostKey = 'blog'

export type CollectionPost = CollectionEntry<PostKey>

export type Pages = 'pages'

export type CollectionPages = CollectionEntry<Pages>

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