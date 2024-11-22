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
})

const sorted = props.tags.toSorted();
</script>

<template>
    <span v-if="props.verbose">·&nbsp;Tags:</span>
    <span v-for="(tag, i) in sorted" :key="i">
        <span v-if="i === 0 && !props.verbose">·</span>
        <span>&nbsp;</span>
        <span v-if="tag === 'made-with-ai'">
            <a v-if="props.link" :href="`/tags/${tag}`">
                <span bg-violet-400 font-800>#{{ tag }}</span>
            </a>
            <template v-else>
                <span bg-violet-400 font-800>#{{ tag }}</span>
            </template>
        </span>
        <span v-else>
            <a v-if="props.link" :href="`/tags/${tag}`">
                <span>#{{ tag }}</span>
            </a>
            <template v-else>
                <span>#{{ tag }}</span>
            </template>
        </span>
    </span>
</template>