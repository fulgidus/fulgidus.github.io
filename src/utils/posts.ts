import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import type { CollectionPost, PostKey } from '@/types'
import { defaultLang, ui } from '@/i18n/ui'

// import type { ImageSize } from '@/content/config'
// import type { ImageMetadata } from 'astro'
// export interface BlogPost {
//     id: string;
//     slug: string;
//     body: string;
//     data: {
//         title: string;
//         description: string;
//         pubDate: DateStringNumber;
//         image: ImageMetadata;
//         imageAlt: string | null;
//         imageSize: ImageSize;
//         tags: string[];
//         redirect?: string;
//         // ... other properties of post.data
//         [key: string]: unknown; // Allows other arbitrary properties
//     };
//     collection: string;
//     render: () => void;
// }

//Actual function that orders posts in /blog
export function postSortingFunction(itemA: CollectionPost, itemB: CollectionPost) {
    return new Date(itemB.data.pubDate).getTime() - new Date(itemA.data.pubDate).getTime()
}

export function sortPostsByDate(posts: Array<CollectionEntry<'blog'>>) {
    return posts.sort(postSortingFunction)
}

type GetPostsParams = {
    path?: string
    lang?: keyof typeof ui
    collection?: PostKey
    withUnlisted?: boolean
    withDrafts?: boolean
}

export async function getPosts(params: GetPostsParams = {}) {
    const { path, lang = defaultLang, collection = 'blog', withUnlisted = false, withDrafts = true } = params;
    console.log(`
----------------------------------------------------------------------------------------------------------------------------------------------------------
getPosts filtering by
lang: ${lang}
path: ${path}
collection: ${collection}
withUnlisted: ${withUnlisted}
`)
    return sortPostsByDate(await getCollection(collection, (post) => {
        if ((import.meta.env.PROD && post.data.draft)
            || (!withDrafts && post.data.draft) // FAIL when wihtout draft and it's a draft
            || (post.data.lang && post.data.lang !== lang)
            || (!withUnlisted && post.data.unlisted) // FAIL if unlisted
            || (path && !post.slug.includes(path))) { // Fail if it doesn't match search
            return false
        }
        return true
    }))
}


export async function getLastTenPosts(params: GetPostsParams = {}) {
    return (await getPosts(params)).slice(0, 10)
}



/** Note: this function filters out draft posts based on the environment */
export async function getAllPosts(lang: keyof typeof ui = defaultLang) {
    return await getCollection('blog', ({ data }) => {
        if (data.lang && data.lang !== lang) { // FAIL when post has language different from either default or specified
            return false
        }
        if (data.unlisted) { // FAIL when post is unlisted
            return false
        }
        if (import.meta.env.PROD && data.draft) { // FAIL when is draft under PROD env
            return false
        }
        return true
    })
}


/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getAllTags(posts: Array<CollectionEntry<'blog'>>) {
    return posts.flatMap((post) => [...post.data.tags ?? []])
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTags(posts: Array<CollectionEntry<'blog'>>) {
    return Array.from(new Set(getAllTags(posts)))
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTagsWithCount(
    posts: Array<CollectionEntry<'blog'>>
): Array<[string, number]> {
    return Array.from(
        getAllTags(posts).reduce(
            (acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
            new Map<string, number>()
        )
    ).sort((a, b) => b[1] - a[1])
}

export type DateStringNumber = Date | string | number;

export function getDate(date: DateStringNumber) {
    return new Date(date).toISOString();
}

export function getHref(post: CollectionPost): string {
    if (post.data.redirect) {
        return post.data.redirect;
    }
    return `/posts/${post.slug}`;
}

export function getTarget(post: CollectionPost) {
    if (post.data.redirect) {
        return "_blank";
    }
    return "_self";
}
