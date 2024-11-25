<script setup>
    const props = defineProps({
        lang: {
            src: String,
            required: true,
        },
        verbose: {
            src: Boolean,
            required: false,
            default: false,
        },
    })
</script>
---
<template>
    <template v-if="props.lang">
        <span v-if="props.verbose">
            <span v-if="props.lang.includes('pirate')">Language: Pirate 🏴‍☠️</span>
            <span v-else-if="props.lang.includes('en')">Language: English 🇬🇧</span>
            <span v-else-if="props.lang.includes('it')">Lingua: Italiano 🇮🇹</span>
            <span v-else-if="props.lang.includes('zh')">语言：中文 🇨🇳</span>
        </span>
        <span v-else>
            <span v-if="props.lang.includes('pirate')" important-o100 dark:c-blueGray>🏴‍☠️</span>
            <span v-else-if="props.lang.includes('en')">🇬🇧</span>
            <span v-else-if="props.lang.includes('it')">🇮🇹</span>
            <span v-else-if="props.lang.includes('zh')">🇨🇳</span>
        </span>
    </template>
    <span v-else>#NO-LANG#</span>
</template>