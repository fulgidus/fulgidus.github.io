<script lang="ts" setup>
import LanguageFlag from './LanguageFlag.vue';
import TagsList from './TagsList.vue';

interface Post {
    id: string
    slug: string
    body: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>
    collection: string
    render: () => void
}

withDefaults(defineProps<{
    list: Post[]
}>(), {
    list: () => [],
})

function sortPostsByDate(l: Post[]) {
    const sorted = l.reduce((acc, element) => {
        if (element.data.unlisted) {
            return [element, ...acc];
        }
        return [...acc, element];
    }, [] as Post[])

    return sorted
}

function getDate(date: string) {
    return new Date(date).toISOString()
}

function getHref(post: Post) {
    if (post.data.redirect) {
        return post.data.redirect
    }
    return `/posts/${post.slug}`
}

function getTarget(post: Post) {
    if (post.data.redirect) {
        return '_blank'
    }
    return '_self'
}

export type DateStringNumber = Date | string | number
function isSameYear(a: DateStringNumber, b: DateStringNumber) {
    return a && b && getYear(a) === getYear(b)
}

function getYear(date: DateStringNumber) {
    return new Date(date).getFullYear()
}
</script>

<template>
    <ul sm:min-h-38 min-h-28 mb-18>
        <template v-if="!list || list.length === 0">
            <div my-12 opacity-50>
                nothing here yet.
            </div>
        </template>
        <li v-for="(post, index) in sortPostsByDate(list) " :key="post.data.title" mb-8>
            <div v-if="!isSameYear(post.data.pubDate, list[index - 1]?.data.pubDate)" select-none relative h18
                pointer-events-none>
                <span text-7em color-transparent font-bold text-stroke-2 text-stroke-hex-aaa op14 absolute top--0.2em
                    font-title>
                    {{ getYear(post.data.pubDate) }}
                </span>
            </div>
            <a text-lg lh-tight nav-link flex="~ col gap-2" :aria-label="post.data.title" :target="getTarget(post)"
                :href="getHref(post)">
                <div flex="~ col md:row gap-2 md:items-center">
                    <div flex="~ gap-2 items-center text-wrap">
                        <span lh-normal>
                            <i v-if="post.data.draft" text-red-700 vertical-mid aria-label="Draft" i-ri-draft-line />
                            <i v-if="post.data.tags?.includes('made-with-ai')" text-violet-600 vertical-mid
                                aria-label="Made with AI" i-ri-bard-line />
                            {{ post.data.title }}
                        </span>
                    </div>
                </div>
                <div flex="~ col md:row gap-2 md:items-center">
                    <div opacity-50 text-sm flex="~ gap-1 wrap">
                        <i v-if="post.data.redirect" text-base i-ri-external-link-line />
                        <i v-if="post.data.recording || post.data.video" text-base i-ri:film-line />
                        <time v-if="post.data.pubDate" :datetime="getDate(post.data.pubDate)">{{
                            post.data.pubDate.split(',')[0]
                            }}</time>
                        <span v-if="post.data.duration">· {{ post.data.duration }}</span>
                        <TagsList :tags="post.data.tags" />
                        <LanguageFlag :lang="post.data.lang" />
                    </div>
                </div>
                <div opacity-50 text-sm>
                    <span v-if="post.data.image !== undefined">
                        <span v-if="post.data.imageSize === 'md'">
                            <img v-if="index % 2 === 0" :src="post.data.image?.src" :alt="post.data.imageAlt"
                                class="float-left mb-4 mr-4 opacity-100 max-h-6rem sm-max-h-12rem max-w-50% sm-max-w-30%" />
                            <img v-else :src="post.data.image?.src" :alt="post.data.imageAlt"
                                class="float-right mb-4 ml-4 opacity-100 max-h-6rem sm-max-h-12rem max-w-50% sm-max-w-30%" />
                        </span>
                        <span v-if="post.data.imageSize === 'sm'">
                            <img v-if="index % 2 === 0" :src="post.data.image?.src" :alt="post.data.imageAlt"
                                class="float-left mb-4 mr-4 opacity-100 max-h-4rem sm-max-h-8rem max-w-30% sm-max-w-25%" />
                            <img v-else :src="post.data.image?.src" :alt="post.data.imageAlt"
                                class="float-right mb-4 ml-4 opacity-100 max-h-4rem sm-max-h-8rem max-w-30% sm-max-w-25%" />
                        </span>
                        <span v-if="post.data.imageSize === 'xs'">
                            <img v-if="index % 2 === 0" :src="post.data.image?.src" :alt="post.data.imageAlt"
                                class="float-left mb-4 mr-4 opacity-100 max-h-3rem sm-max-h-6rem max-w-25% sm-max-w-25%" />
                            <img v-else :src="post.data.image?.src" :alt="post.data.imageAlt"
                                class="float-right mb-4 ml-4 opacity-100 max-h-3rem sm-max-h-6rem max-w-25% sm-max-w-25%" />
                        </span>
                    </span>
                    {{ post.data.description }}
                </div>
            </a>
        </li>
    </ul>
</template>
