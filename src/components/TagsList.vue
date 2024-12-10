<script setup>


const props = defineProps({
    tags: {
        type: Array,
        required: true,
    },
    link: {
        type: Boolean,
        required: false,
        default: false,
    },
    verbose: {
        src: Boolean,
        required: false,
        default: false,
    },
    noDot: {
        src: Boolean,
        required: false,
        default: false,
    },
})

const sorted = props.tags.toSorted();
</script>

<template>
    <span v-if="props.verbose"><span v-if="!noDot">·&nbsp;</span>Tags:</span>
        <span v-for="(tag, i) in sorted" :key="i" class="h1.1rem">
            <span v-if="i === 0 && !props.verbose && !noDot">·&nbsp;</span>
            <span v-if="tag === 'made-with-ai'">
                <a v-if="props.link" :href="`/tags/${tag}`" data-astro-prefetch>
                    <span bg-violet-400 font-800>#{{ tag }}</span>
                </a>
                <template v-else>
                    <span bg-violet-400 font-800>#{{ tag }}</span>
                </template>
            </span>
            <span v-else>
                <a v-if="props.link" :href="`/tags/${tag}`" data-astro-prefetch>
                    <span>#{{ tag }}</span>
                </a>
                <template v-else>
                    <span>#{{ tag }}</span>
                </template>
            </span>
        </span>
</template>