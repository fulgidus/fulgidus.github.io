import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import { CollectionPages, PAGE_KEY, POST_KEY, type CollectionPost, type PageKey, type PostKey } from '@/types'
import { defaultLang, Languages } from '@/i18n/ui'
import { getLangFromSlug } from '@/i18n/utils'

type SortParams = { elements: CollectionPost[]|CollectionPages[] }
export function sortPostsByDate(params: SortParams): CollectionPost[] | CollectionPages[] {
    const { elements } = params;
    // Check for pubDate property before sorting by date
    if (isPostArray(elements)) {
        return elements.sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());
    } else {
        // If pubDate isn't available, sort alphabetically by title.
        return elements.sort((a, b) =>
            a.data.title.toLowerCase().localeCompare(b.data.title.toLowerCase())
        );
    }
}

type GetPostsParams = {
    path?: string
    lang?: Languages
    collection?: PostKey | PageKey
    withUnlisted?: boolean
    withDrafts?: boolean
}

function isPostKey(collection: PostKey | PageKey): collection is PostKey {
    return typeof collection === 'string' && collection.startsWith(POST_KEY)
}

function isPages(collection: PostKey | PageKey): collection is PageKey {
    return typeof collection === 'string' && collection.startsWith(PAGE_KEY); // Or any other way to distinguish Pages
}
type GetPostsReturnType =
    GetPostsParams['collection'] extends PageKey ? Array<CollectionPages> :
    Array<CollectionPost> // fallback if collection is not PostKey or PageKey

export async function getPosts(params: GetPostsParams = {}): Promise<GetPostsReturnType> {
    const { path, lang = defaultLang, collection = POST_KEY, withUnlisted = false, withDrafts = true } = params;
    console.log(`getPosts called with path: ${path}, lang: ${lang}, collection: ${collection}, withUnlisted: ${withUnlisted}, withDrafts: ${withDrafts}`);
    if (!isPostKey(collection) && !isPages(collection)) {
        return [] as GetPostsReturnType; // Explicitly handle invalid cases with fallback.
    }
    if (isPostKey(collection)) {
        const returned = sortPostsByDate({
            elements: await getCollection(collection, (post) => {
                if ((import.meta.env.PROD && post.data.draft)
                    || (!withDrafts && post.data.draft) // FAIL when wihtout draft and it's a draft
                || (getLangFromSlug(post.slug) !== lang)
                || (!withUnlisted && post.data.unlisted) // FAIL if unlisted
                || (path && !post.slug.includes(path))) { // Fail if it doesn't match search
                    return false
                }
                return true
            })
        }) as GetPostsReturnType
        console.log(`getPosts returned posts: {${returned.map(p => p.slug).join(', ')}}`)
        return returned
    }
    if (isPages(collection)) {
        const pages = await getCollection(collection, (page) => {
            if ((getLangFromSlug(page.slug) !== lang)
                || (path && !page.slug.includes(path))) {
                return false
            }
            return true
        })
        const returned = sortPostsByDate({ elements: pages }) as GetPostsReturnType
        console.log(`getPosts returned pages: {${returned.map(p => p.slug).join(', ')}}`)
        return returned
    }
    return []
}

export async function getLastTenPosts(params: GetPostsParams = {}) {
    return (await getPosts(params)).slice(0, 10)
}

/** Note: this function filters out draft posts based on the environment */
export async function getAllPosts(lang: Languages = defaultLang) {
    return await getCollection(POST_KEY, (item) => {
        if (getLangFromSlug(item.slug) !== lang) { // FAIL when post has language different from either default or specified
            return false
        }
        if (item.data.unlisted) { // FAIL when post is unlisted
            return false
        }
        if (import.meta.env.PROD && item.data.draft) { // FAIL when is draft under PROD env
            return false
        }
        return true
    })
}

// function isPostKey(collection: PostKey | Pages): collection is PostKey {
//     return typeof collection === 'string' && collection.startsWith(PostKey)
// }
export function isPostArray(elements: Array<CollectionPost> | Array<CollectionPages>): elements is Array<CollectionPost> {
    return (Array.isArray(elements) && elements.length > 0 && (elements[0] as CollectionPost).collection === POST_KEY)
}
export function isPageArray(elements: Array<CollectionPost> | Array<CollectionPages>): elements is Array<CollectionEntry<PageKey>> {
    return (Array.isArray(elements) && elements.length > 0 && (elements[0] as CollectionPages).collection === PAGE_KEY)
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getAllTags(posts: Array<CollectionPost> | Array<CollectionPages>) {
    if (isPostArray(posts)) {
        return posts.flatMap((post) => [...post.data.tags ?? []])
    }
    if (isPageArray(posts)) {
        return posts.flatMap((post) => [...post.data.tags ?? []])
    }
    return []
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTags(posts: Array<CollectionPost> | Array<CollectionPages>) {
    return Array.from(new Set(getAllTags(posts)))
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTagsWithCount(
    posts: Array<CollectionPost>
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
