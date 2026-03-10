<script setup lang="ts">
    import { ui, type Languages } from '@/i18n/ui'

    const props = defineProps({
        lang: {
            type: String,
            required: true,
        },
        verbose: {
            type: Boolean,
            required: false,
            default: false,
        },
    })

    const langData = ui[props.lang as Languages]
</script>

<template>
    <template v-if="langData">
        <span v-if="props.verbose">
            {{ langData.language }} {{ langData.flag }}
        </span>
        <span v-else>
            {{ langData.flag }}
        </span>
    </template>
    <span v-else>#NO-LANG#</span>
</template>
