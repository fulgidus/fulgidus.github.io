<script lang="ts" setup>
import { useWindowScroll } from '@vueuse/core'

const { y: scrollY } = useWindowScroll()

function toTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    })
}
</script>

<template>
    <button aria-label="Scroll to top" fixed right-5 sm:right-30 bottom-30 w-12 h-12 text-lg hover:op100 rounded-full
        flex="~ items-center justify-center" border-2 border-dark dark:border-light transition duration-300 z-100
        print:hidden :class="scrollY > 300 ? 'op75' : 'op0 pointer-events-none'" @click="toTop()">
        <i i-ri-arrow-up-line />
    </button>
</template>
