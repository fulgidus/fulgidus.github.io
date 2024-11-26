import { describe, expect, it, vi } from 'vitest';
import { getPosts, getLastTenPosts, getAllPosts, getAllTags, getUniqueTags, getUniqueTagsWithCount, postSortingFunction, sortPostsByDate, getDate, getHref, getTarget } from './posts';
import { CollectionEntry, getCollection } from 'astro:content';
// Mock post data. Note that these are declared inside the test functions, avoiding the hoisting error
const createMockPost = (slug: string, data: Partial<CollectionEntry<'blog'>['data']>): CollectionEntry<'blog'> => ({
    slug: slug,
    data: {
        title: `Post ${slug}`,
        imageSize: 'xl',
        pubDate: `2024-03-${slug}`,
        tags: [`tag${slug}`],
        draft: false,
        unlisted: false,
        lang: 'en',
        video: false,
        ...data,
    },
    body: `${slug}.md`,
} as CollectionEntry<'blog'>);




vi.mock('astro:content', () => ({
    getCollection: vi.fn().mockResolvedValue([]), // Initialize with an empty array
}));

describe('utils/posts', () => {

    it('should sort posts by date', () => {
        const post1 = createMockPost('1', { pubDate: '2024-03-10' });
        const post2 = createMockPost('2', { pubDate: '2024-03-15' });
        const post3 = createMockPost('3', { pubDate: '2024-03-05' });
        const allPosts = [post1, post2, post3];
        vi.mocked(getCollection).mockResolvedValue(allPosts);
        const sortedPosts = sortPostsByDate(allPosts);
        expect(sortedPosts.map(p => p.data.title)).toEqual(['Post 2', 'Post 1', 'Post 3']);
    });
    
    it('should correctly sort posts using postSortingFunction', () => {
        const post1 = createMockPost('1', { pubDate: '2024-03-10' });
        const post2 = createMockPost('2', { pubDate: '2024-03-15' });
        const allPosts = [post1, post2];
        vi.mocked(getCollection).mockResolvedValue(allPosts);
        expect(postSortingFunction(post1, post2)).toBeLessThan(0);
        expect(postSortingFunction(post2, post1)).toBeGreaterThan(0);
        expect(postSortingFunction(post1, post1)).toBe(0);
    });

    it('should get posts with various filtering options', async () => {
        const post1 = createMockPost('1', { lang: 'en' });
        const post2 = createMockPost('2', { lang: 'en', draft: true });
        const post3 = createMockPost('3', { lang: 'en', unlisted: true });
        const post4 = createMockPost('4', { lang: 'it' });
        const allPosts = [post1, post2, post3, post4];
        vi.mocked(getCollection).mockResolvedValue(allPosts);


        expect((await getPosts({ lang: 'en', withDrafts: false, withUnlisted: false })).length).toBe(1);
        expect((await getPosts({ lang: 'en', withDrafts: true, withUnlisted: false })).length).toBe(2);
        expect((await getPosts({ lang: 'en', withDrafts: true, withUnlisted: true })).length).toBe(3);
        expect((await getPosts({ lang: 'it' })).length).toBe(1);
        expect((await getPosts({ path: '1' })).length).toBe(1);
        expect((await getPosts({ withUnlisted: true })).length).toBe(4);
    });


    it('should get last ten posts', async () => {
        const posts = Array.from({ length: 15 }, (_, i) => createMockPost(`${i + 1}`, {}));
        vi.mocked(getCollection).mockResolvedValue(posts);
        const lastTen = await getLastTenPosts();
        expect(lastTen.length).toBe(10);
    });

    it('should get all posts with filtering', async () => {
        const post1 = createMockPost('1', { lang: 'en' });
        const post2 = createMockPost('2', { lang: 'en', draft: true });
        const post3 = createMockPost('3', { lang: 'en', unlisted: true });
        const post4 = createMockPost('4', { lang: 'it' });
        const allPosts = [post1, post2, post3, post4];

        vi.mocked(getCollection).mockResolvedValue(allPosts);

        expect((await getAllPosts('en')).length).toBe(1);
        expect((await getAllPosts('it')).length).toBe(1);
    });

    it('should get all tags', () => {
        const post1 = createMockPost('1', { tags: ['tag1', 'tag2'] });
        const post2 = createMockPost('2', { tags: ['tag2', 'tag3'] });
        const allTags = getAllTags([post1, post2]);
        expect(allTags).toEqual(['tag1', 'tag2', 'tag2', 'tag3']);
    });

    it('should get unique tags', () => {
        const post1 = createMockPost('1', { tags: ['tag1', 'tag2'] });
        const post2 = createMockPost('2', { tags: ['tag2', 'tag3'] });
        const uniqueTags = getUniqueTags([post1, post2]);
        expect(uniqueTags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should get unique tags with count', () => {
        const post1 = createMockPost('1', { tags: ['tag1', 'tag2'] });
        const post2 = createMockPost('2', { tags: ['tag2', 'tag3'] });
        const uniqueTagsWithCount = getUniqueTagsWithCount([post1, post2]);
        expect(uniqueTagsWithCount).toEqual([['tag2', 2], ['tag1', 1], ['tag3', 1]]);
    });

    it('should format date correctly', () => {
        expect(getDate('2024-03-10')).toMatch(/2024-03-10T.*/);
        expect(getDate(new Date())).toMatch(/T.*/);
        expect(getDate(1678611200000)).toMatch(/2023-03-10T.*/);
    });

    it('should get correct href', () => {
        const post1 = createMockPost('1', {});
        expect(getHref(post1)).toBe('/posts/1');
        const post2 = createMockPost('2', { redirect: '/redirect-url' });
        expect(getHref(post2)).toBe('/redirect-url');
    });

    it('should get correct target', () => {
        const post1 = createMockPost('1', {});
        expect(getTarget(post1)).toBe('_self');
        const post2 = createMockPost('2', { redirect: '/redirect-url' });
        expect(getTarget(post2)).toBe('_blank');
    });
});