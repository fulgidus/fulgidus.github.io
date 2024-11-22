import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import type { CollectionPosts, PostKey } from '@/types'

//Actual function that orders posts in /blog
export function postSortingFunction(itemA: CollectionPosts, itemB: CollectionPosts) {
    return new Date(itemB.data.pubDate).getTime() - new Date(itemA.data.pubDate).getTime()
}

export function sortPostsByDate(posts: Array<CollectionEntry<'blog'>>) {
    return posts.sort(postSortingFunction)
}

export async function getPosts(path?: string, collection: PostKey = 'blog') {
    return sortPostsByDate(await getCollection(collection, (post) => {
        if (import.meta.env.PROD) {
            if (post.data.draft) {
                return false
            }
        }
        if (path) {
            if (!post.slug.includes(path)) {
                return false
            }
        }
        return true
    }))
}

export async function getLastTenPosts(path?: string, collection: PostKey = 'blog') {
    return (await getPosts(path, collection)).slice(0, 10)
}



/** Note: this function filters out draft posts based on the environment */
export async function getAllPosts() {
    return await getCollection('blog', ({ data }) => {
        return !data.unlisted && (import.meta.env.PROD ? data.draft !== true : true)
    })
}


/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getAllTags(posts: Array<CollectionEntry<'blog'>>) {
    return posts.flatMap((post) => [...post.data.tags ?? []])
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTags(posts: Array<CollectionEntry<'blog'>>) {
    return [...new Set(getAllTags(posts))]
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTagsWithCount(
    posts: Array<CollectionEntry<'blog'>>
): Array<[string, number]> {
    return [
        ...getAllTags(posts).reduce(
            (acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
            new Map<string, number>()
        )
    ].sort((a, b) => b[1] - a[1])
}