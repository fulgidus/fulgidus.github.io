<script lang="ts" setup>
import { useMouseInElement, useWindowScroll, useWindowSize } from '@vueuse/core'

const { y: scrollY } = useWindowScroll()
const { height: totalY } = useWindowSize()
const { elementHeight } = useMouseInElement()

function goBack() {
    window.history.back();
}
</script>

<template>
    <button aria-label="Scroll to top" fixed right-5 sm:right-30 bottom-15 w-12 h-12 text-lg op0 hover:op100
        rounded-full flex="~ items-center justify-center" border-2 border-dark dark:border-light transition duration-300
        z-100 print:hidden :class="!(elementHeight > totalY && scrollY > (elementHeight - totalY - 1)) ? 'op0 pointer-events-none' : 'op75'"
        @click="goBack()">
        <i i-ri-arrow-go-back-line />
    </button>
</template>
