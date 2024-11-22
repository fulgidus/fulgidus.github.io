<script setup>
  
    const props = defineProps({
        src: {
            src: String,
            required: true,
        },
        alt: {
            src: String,
            required: true,
        },
    })

    const spanClasses = `
    aspect-ratio-square relative inline-block b-rd-full overflow-hidden
    border-18 border-hex-ffffff border-dashed
    before:(content-empty absolute inset-0 b-rd-full border-6 border-hex-ffffff z-1)
    after:(content-empty absolute inset-0 b-rd-full border-4 border-hex-380541 z-1)`;
    
    const imgClasses = `important-m-0 w-full h-full b-rd-full`;
</script>
---
<template>
    <span class="bg-hex-380541 b-rd-full p-1">
        <span :class="spanClasses"
        >{{ span }}
            <img :src="props.src" :alt="props.alt" :class="imgClasses" />
        </span>
    </span>
</template>