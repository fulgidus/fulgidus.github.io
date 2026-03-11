import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    sortPostsByDate,
    getPosts,
    getLastTenPosts,
    getAllPosts,
    isPostArray,
    isPageArray,
    getAllTags,
    getUniqueTags,
    getUniqueTagsWithCount,
    getAdjacentPosts,
    getDate,
    getHref,
    removeLangFromSlug,
    getTarget,
    getRelatedPosts,
} from '../src/utils/posts'
import { POST_KEY, PAGE_KEY } from '../src/types'

// ─── Mock data factories ──────────────────────────────────────────

function makePost(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? 'en/test-post',
        slug: overrides.slug ?? 'en/test-post',
        collection: POST_KEY as typeof POST_KEY,
        body: overrides.body ?? 'Test body content',
        data: {
            title: overrides.title ?? 'Test Post',
            pubDate: overrides.pubDate ?? '2025-01-15',
            description: overrides.description ?? 'A test post',
            tags: overrides.tags ?? ['test'],
            draft: overrides.draft ?? false,
            unlisted: overrides.unlisted ?? false,
            redirect: overrides.redirect ?? undefined,
            ...overrides.data,
        },
        render: vi.fn(),
    }
}

function makePage(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? 'en/test-page',
        slug: overrides.slug ?? 'en/test-page',
        collection: PAGE_KEY as typeof PAGE_KEY,
        body: overrides.body ?? 'Test page content',
        data: {
            title: overrides.title ?? 'Test Page',
            tags: overrides.tags ?? ['page-tag'],
            ...overrides.data,
        },
        render: vi.fn(),
    }
}

// ─── Mock astro:content ───────────────────────────────────────────

const mockGetCollection = vi.fn()

vi.mock('astro:content', () => ({
    getCollection: (...args: any[]) => mockGetCollection(...args),
}))

// ─── Test suites ──────────────────────────────────────────────────

describe('utils/posts', () => {
    beforeEach(() => {
        mockGetCollection.mockReset()
        // Reset import.meta.env.PROD to false for tests
        vi.stubEnv('PROD', false as any)
    })

    // ─── sortPostsByDate ──────────────────────────────────────────
    describe('sortPostsByDate', () => {
        it('sorts posts by pubDate descending (newest first)', () => {
            const posts = [
                makePost({ slug: 'en/old', pubDate: '2024-01-01' }),
                makePost({ slug: 'en/new', pubDate: '2025-06-15' }),
                makePost({ slug: 'en/mid', pubDate: '2024-06-15' }),
            ]
            const sorted = sortPostsByDate({ elements: posts as any }) as any[]
            expect(sorted[0].slug).toBe('en/new')
            expect(sorted[1].slug).toBe('en/mid')
            expect(sorted[2].slug).toBe('en/old')
        })

        it('sorts pages alphabetically by title', () => {
            const pages = [
                makePage({ slug: 'en/charlie', title: 'Charlie' }),
                makePage({ slug: 'en/alpha', title: 'Alpha' }),
                makePage({ slug: 'en/bravo', title: 'Bravo' }),
            ]
            const sorted = sortPostsByDate({ elements: pages as any }) as any[]
            expect(sorted[0].data.title).toBe('Alpha')
            expect(sorted[1].data.title).toBe('Bravo')
            expect(sorted[2].data.title).toBe('Charlie')
        })

        it('handles empty array', () => {
            const sorted = sortPostsByDate({ elements: [] as any })
            expect(sorted).toEqual([])
        })

        it('handles single post', () => {
            const posts = [makePost({ slug: 'en/only' })]
            const sorted = sortPostsByDate({ elements: posts as any })
            expect(sorted).toHaveLength(1)
        })

        it('is case-insensitive for page title sorting', () => {
            const pages = [
                makePage({ slug: 'en/b', title: 'bravo' }),
                makePage({ slug: 'en/a', title: 'Alpha' }),
            ]
            const sorted = sortPostsByDate({ elements: pages as any }) as any[]
            expect(sorted[0].data.title).toBe('Alpha')
            expect(sorted[1].data.title).toBe('bravo')
        })
    })

    // ─── getPosts ─────────────────────────────────────────────────
    describe('getPosts', () => {
        it('returns posts filtered by default language', async () => {
            const allPosts = [
                makePost({ slug: 'en/post-1' }),
                makePost({ slug: 'it/post-2' }),
                makePost({ slug: 'en/post-3' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts()
            expect(result).toHaveLength(2) // only en posts
        })

        it('returns posts filtered by specified language', async () => {
            const allPosts = [
                makePost({ slug: 'en/post-1' }),
                makePost({ slug: 'it/post-2' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts({ lang: 'it' })
            expect(result).toHaveLength(1)
            expect((result[0] as any).slug).toBe('it/post-2')
        })

        it('filters out unlisted posts by default', async () => {
            const allPosts = [
                makePost({ slug: 'en/listed' }),
                makePost({ slug: 'en/unlisted', unlisted: true }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts()
            expect(result).toHaveLength(1)
            expect((result[0] as any).slug).toBe('en/listed')
        })

        it('includes unlisted posts when withUnlisted is true', async () => {
            const allPosts = [
                makePost({ slug: 'en/listed' }),
                makePost({ slug: 'en/unlisted', unlisted: true }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts({ withUnlisted: true })
            expect(result).toHaveLength(2)
        })

        it('includes drafts by default (in non-production)', async () => {
            const allPosts = [
                makePost({ slug: 'en/published' }),
                makePost({ slug: 'en/draft', draft: true }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts()
            expect(result).toHaveLength(2)
        })

        it('excludes drafts when withDrafts is false', async () => {
            const allPosts = [
                makePost({ slug: 'en/published' }),
                makePost({ slug: 'en/draft', draft: true }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts({ withDrafts: false })
            expect(result).toHaveLength(1)
            expect((result[0] as any).slug).toBe('en/published')
        })

        it('filters by path when specified', async () => {
            const allPosts = [
                makePost({ slug: 'en/notes/note-1' }),
                makePost({ slug: 'en/talks/talk-1' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts({ path: 'notes' })
            expect(result).toHaveLength(1)
            expect((result[0] as any).slug).toBe('en/notes/note-1')
        })

        it('returns empty array for invalid collection key', async () => {
            const result = await getPosts({ collection: 'invalid' as any })
            expect(result).toEqual([])
        })

        it('handles pages collection', async () => {
            const allPages = [
                makePage({ slug: 'en/about' }),
                makePage({ slug: 'it/about' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPages.filter(p => filter(p))
            })

            const result = await getPosts({ collection: PAGE_KEY })
            expect(result).toHaveLength(1)
        })

        it('returns results sorted by date', async () => {
            const allPosts = [
                makePost({ slug: 'en/old', pubDate: '2024-01-01' }),
                makePost({ slug: 'en/new', pubDate: '2025-06-15' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getPosts()
            expect((result[0] as any).slug).toBe('en/new')
            expect((result[1] as any).slug).toBe('en/old')
        })
    })

    // ─── getLastTenPosts ──────────────────────────────────────────
    describe('getLastTenPosts', () => {
        it('returns at most 10 posts', async () => {
            const allPosts = Array.from({ length: 15 }, (_, i) =>
                makePost({ slug: `en/post-${i}`, pubDate: `2025-01-${String(i + 1).padStart(2, '0')}` })
            )
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getLastTenPosts()
            expect(result).toHaveLength(10)
        })

        it('returns all posts if fewer than 10', async () => {
            const allPosts = [
                makePost({ slug: 'en/post-1' }),
                makePost({ slug: 'en/post-2' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getLastTenPosts()
            expect(result).toHaveLength(2)
        })
    })

    // ─── getAllPosts ───────────────────────────────────────────────
    describe('getAllPosts', () => {
        it('filters by language', async () => {
            const allPosts = [
                makePost({ slug: 'en/post-1' }),
                makePost({ slug: 'it/post-2' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getAllPosts('en')
            expect(result).toHaveLength(1)
            expect(result[0].slug).toBe('en/post-1')
        })

        it('filters out unlisted posts', async () => {
            const allPosts = [
                makePost({ slug: 'en/listed' }),
                makePost({ slug: 'en/unlisted', unlisted: true }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getAllPosts()
            expect(result).toHaveLength(1)
        })

        it('defaults to en language', async () => {
            const allPosts = [
                makePost({ slug: 'en/post-1' }),
                makePost({ slug: 'it/post-2' }),
            ]
            mockGetCollection.mockImplementation((_key: string, filter: Function) => {
                return allPosts.filter(p => filter(p))
            })

            const result = await getAllPosts()
            expect(result).toHaveLength(1)
            expect(result[0].slug).toBe('en/post-1')
        })
    })

    // ─── isPostArray / isPageArray ────────────────────────────────
    describe('isPostArray', () => {
        it('returns true for an array of posts', () => {
            expect(isPostArray([makePost()] as any)).toBe(true)
        })

        it('returns false for an array of pages', () => {
            expect(isPostArray([makePage()] as any)).toBe(false)
        })

        it('returns false for empty array', () => {
            expect(isPostArray([] as any)).toBe(false)
        })
    })

    describe('isPageArray', () => {
        it('returns true for an array of pages', () => {
            expect(isPageArray([makePage()] as any)).toBe(true)
        })

        it('returns false for an array of posts', () => {
            expect(isPageArray([makePost()] as any)).toBe(false)
        })

        it('returns false for empty array', () => {
            expect(isPageArray([] as any)).toBe(false)
        })
    })

    // ─── getAllTags ────────────────────────────────────────────────
    describe('getAllTags', () => {
        it('extracts all tags from posts', () => {
            const posts = [
                makePost({ tags: ['a', 'b'] }),
                makePost({ slug: 'en/p2', tags: ['b', 'c'] }),
            ]
            const tags = getAllTags(posts as any)
            expect(tags).toEqual(['a', 'b', 'b', 'c'])
        })

        it('extracts all tags from pages', () => {
            const pages = [
                makePage({ tags: ['x', 'y'] }),
                makePage({ slug: 'en/p2', tags: ['z'] }),
            ]
            const tags = getAllTags(pages as any)
            expect(tags).toEqual(['x', 'y', 'z'])
        })

        it('returns empty array for empty input', () => {
            expect(getAllTags([] as any)).toEqual([])
        })

        it('handles posts with no tags (undefined)', () => {
            const posts = [makePost({ data: { tags: undefined }, tags: undefined })]
            // tags ?? [] should handle undefined
            const tags = getAllTags(posts as any)
            expect(tags).toEqual([])
        })
    })

    // ─── getUniqueTags ────────────────────────────────────────────
    describe('getUniqueTags', () => {
        it('returns unique tags', () => {
            const posts = [
                makePost({ tags: ['a', 'b'] }),
                makePost({ slug: 'en/p2', tags: ['b', 'c'] }),
            ]
            const tags = getUniqueTags(posts as any)
            expect(tags).toEqual(expect.arrayContaining(['a', 'b', 'c']))
            expect(tags).toHaveLength(3)
        })
    })

    // ─── getUniqueTagsWithCount ───────────────────────────────────
    describe('getUniqueTagsWithCount', () => {
        it('returns tags sorted by count descending', () => {
            const posts = [
                makePost({ tags: ['a', 'b'] }),
                makePost({ slug: 'en/p2', tags: ['b', 'c'] }),
                makePost({ slug: 'en/p3', tags: ['b', 'a'] }),
            ]
            const result = getUniqueTagsWithCount(posts as any)
            // b appears 3 times, a appears 2 times, c appears 1 time
            expect(result[0]).toEqual(['b', 3])
            expect(result[1]).toEqual(['a', 2])
            expect(result[2]).toEqual(['c', 1])
        })

        it('sorts alphabetically when counts are equal', () => {
            const posts = [
                makePost({ tags: ['b', 'a'] }),
            ]
            const result = getUniqueTagsWithCount(posts as any)
            // Both have count 1, should be alphabetical
            expect(result[0]).toEqual(['a', 1])
            expect(result[1]).toEqual(['b', 1])
        })

        it('returns empty array for empty input', () => {
            // isPostArray returns false for empty array, so getAllTags returns []
            // But getUniqueTagsWithCount expects CollectionPost[], which passes to getAllTags
            // The reduce on empty array returns empty Map
            const posts = [makePost({ tags: [] })]
            const result = getUniqueTagsWithCount(posts as any)
            expect(result).toEqual([])
        })
    })

    // ─── getAdjacentPosts ─────────────────────────────────────────
    describe('getAdjacentPosts', () => {
        const posts = [
            makePost({ slug: 'en/newest', pubDate: '2025-03-01' }),
            makePost({ slug: 'en/middle', pubDate: '2025-02-01' }),
            makePost({ slug: 'en/oldest', pubDate: '2025-01-01' }),
        ]

        it('returns previous and next for middle post', () => {
            const result = getAdjacentPosts(posts[1] as any, posts as any)
            expect(result.previous?.slug).toBe('en/oldest')
            expect(result.next?.slug).toBe('en/newest')
        })

        it('returns null for previous when at the oldest post', () => {
            const result = getAdjacentPosts(posts[2] as any, posts as any)
            expect(result.previous).toBeNull()
            expect(result.next?.slug).toBe('en/middle')
        })

        it('returns null for next when at the newest post', () => {
            const result = getAdjacentPosts(posts[0] as any, posts as any)
            expect(result.previous?.slug).toBe('en/middle')
            expect(result.next).toBeNull()
        })

        it('returns nulls when post is not found', () => {
            const unknownPost = makePost({ slug: 'en/unknown' })
            const result = getAdjacentPosts(unknownPost as any, posts as any)
            expect(result.previous).toBeNull()
            expect(result.next).toBeNull()
        })

        it('returns nulls for single post in array', () => {
            const single = [makePost({ slug: 'en/only' })]
            const result = getAdjacentPosts(single[0] as any, single as any)
            expect(result.previous).toBeNull()
            expect(result.next).toBeNull()
        })
    })

    // ─── getDate ──────────────────────────────────────────────────
    describe('getDate', () => {
        it('converts Date to ISO string', () => {
            const date = new Date('2025-01-15T00:00:00Z')
            expect(getDate(date)).toBe('2025-01-15T00:00:00.000Z')
        })

        it('converts string to ISO string', () => {
            const result = getDate('2025-01-15')
            expect(result).toContain('2025-01-15')
        })

        it('converts number (timestamp) to ISO string', () => {
            const timestamp = new Date('2025-01-15T00:00:00Z').getTime()
            expect(getDate(timestamp)).toBe('2025-01-15T00:00:00.000Z')
        })
    })

    // ─── getHref ──────────────────────────────────────────────────
    describe('getHref', () => {
        it('returns redirect URL for redirect posts', () => {
            const post = makePost({ redirect: 'https://example.com' })
            expect(getHref(post as any)).toBe('https://example.com')
        })

        it('returns /posts/ path with language stripped from slug', () => {
            const post = makePost({ slug: 'en/my-great-post' })
            expect(getHref(post as any)).toBe('/posts/my-great-post')
        })

        it('returns /posts/ path for Italian slug', () => {
            const post = makePost({ slug: 'it/mio-post' })
            expect(getHref(post as any)).toBe('/posts/mio-post')
        })
    })

    // ─── removeLangFromSlug ───────────────────────────────────────
    describe('removeLangFromSlug', () => {
        it('removes "en/" prefix from slug', () => {
            expect(removeLangFromSlug('en/my-post')).toBe('my-post')
        })

        it('removes "it/" prefix from slug', () => {
            expect(removeLangFromSlug('it/mio-post')).toBe('mio-post')
        })

        it('removes any two-letter prefix', () => {
            expect(removeLangFromSlug('fr/mon-post')).toBe('mon-post')
        })

        it('does not remove longer prefixes', () => {
            expect(removeLangFromSlug('eng/my-post')).toBe('eng/my-post')
        })

        it('returns original if no language prefix', () => {
            expect(removeLangFromSlug('my-post')).toBe('my-post')
        })

        it('handles nested paths after language prefix', () => {
            expect(removeLangFromSlug('en/notes/my-note')).toBe('notes/my-note')
        })

        // Regression test for string immutability bug:
        // String.replace() returns a NEW string and does not mutate the original.
        // This test verifies that the function correctly returns the new string
        // rather than accidentally returning the original.
        it('regression: replace() returns new string (string immutability)', () => {
            const original = 'en/my-post'
            const result = removeLangFromSlug(original)

            // The result should be the stripped version
            expect(result).toBe('my-post')
            // The original string should NOT be mutated (strings are immutable in JS)
            expect(original).toBe('en/my-post')
            // They should be different strings
            expect(result).not.toBe(original)
        })

        it('regression: replace() is used correctly (not discarding return value)', () => {
            // This tests that the function actually uses the return value of .replace()
            // A common bug pattern is: slug.replace(...); return slug; (which returns original)
            const slug = 'it/important-post'
            const result = removeLangFromSlug(slug)
            expect(result).toBe('important-post')
            // Verify the lang prefix was actually removed
            expect(result).not.toMatch(/^[a-z]{2}\//)
        })
    })

    // ─── getTarget ────────────────────────────────────────────────
    describe('getTarget', () => {
        it('returns "_blank" for redirect posts', () => {
            const post = makePost({ redirect: 'https://example.com' })
            expect(getTarget(post as any)).toBe('_blank')
        })

        it('returns "_self" for normal posts', () => {
            const post = makePost()
            expect(getTarget(post as any)).toBe('_self')
        })
    })

    // ─── getRelatedPosts ──────────────────────────────────────────
    describe('getRelatedPosts', () => {
        it('returns posts with overlapping tags', () => {
            const current = makePost({ slug: 'en/current', tags: ['a', 'b'] })
            const allPosts = [
                current,
                makePost({ slug: 'en/related', tags: ['a', 'c'], pubDate: '2025-02-01' }),
                makePost({ slug: 'en/unrelated', tags: ['d', 'e'], pubDate: '2025-01-01' }),
            ]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result).toHaveLength(1)
            expect(result[0].slug).toBe('en/related')
        })

        it('sorts by tag overlap count descending', () => {
            const current = makePost({ slug: 'en/current', tags: ['a', 'b', 'c'] })
            const allPosts = [
                current,
                makePost({ slug: 'en/one-match', tags: ['a'], pubDate: '2025-01-01' }),
                makePost({ slug: 'en/two-matches', tags: ['a', 'b'], pubDate: '2025-01-01' }),
            ]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result[0].slug).toBe('en/two-matches')
            expect(result[1].slug).toBe('en/one-match')
        })

        it('limits results to maxResults', () => {
            const current = makePost({ slug: 'en/current', tags: ['a'] })
            const allPosts = [
                current,
                makePost({ slug: 'en/r1', tags: ['a'], pubDate: '2025-01-01' }),
                makePost({ slug: 'en/r2', tags: ['a'], pubDate: '2025-02-01' }),
                makePost({ slug: 'en/r3', tags: ['a'], pubDate: '2025-03-01' }),
                makePost({ slug: 'en/r4', tags: ['a'], pubDate: '2025-04-01' }),
            ]

            const result = getRelatedPosts(current as any, allPosts as any, 2)
            expect(result).toHaveLength(2)
        })

        it('returns empty array when current post has no tags', () => {
            const current = makePost({ slug: 'en/current', tags: [] })
            const allPosts = [
                current,
                makePost({ slug: 'en/other', tags: ['a'] }),
            ]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result).toEqual([])
        })

        it('excludes the current post from results', () => {
            const current = makePost({ slug: 'en/current', tags: ['a'] })
            const allPosts = [current]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result).toEqual([])
        })

        it('excludes unlisted posts', () => {
            const current = makePost({ slug: 'en/current', tags: ['a'] })
            const allPosts = [
                current,
                makePost({ slug: 'en/unlisted', tags: ['a'], unlisted: true }),
            ]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result).toEqual([])
        })

        it('sorts by date when overlap is equal', () => {
            const current = makePost({ slug: 'en/current', tags: ['a'] })
            const allPosts = [
                current,
                makePost({ slug: 'en/older', tags: ['a'], pubDate: '2025-01-01' }),
                makePost({ slug: 'en/newer', tags: ['a'], pubDate: '2025-06-01' }),
            ]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result[0].slug).toBe('en/newer')
            expect(result[1].slug).toBe('en/older')
        })

        it('defaults to 3 max results', () => {
            const current = makePost({ slug: 'en/current', tags: ['a'] })
            const allPosts = [
                current,
                ...Array.from({ length: 5 }, (_, i) =>
                    makePost({ slug: `en/r${i}`, tags: ['a'], pubDate: `2025-0${i + 1}-01` })
                ),
            ]

            const result = getRelatedPosts(current as any, allPosts as any)
            expect(result).toHaveLength(3)
        })
    })
})
