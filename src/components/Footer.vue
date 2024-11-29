<script lang="ts" setup>
import { defaultLang, Languages } from '@/i18n/ui';
import { getLangFromUrl, translatePath, useTranslate } from '@/i18n/utils';
import siteConfig from '@/site-config'
import { getLinkTarget } from '@/utils/link'
import { onMounted, ref, watchEffect } from 'vue';


const currentLang = ref<Languages>(defaultLang);
let currentUrl: URL | undefined
let translate: (key: string) => string
onMounted(() => {
    currentUrl = new URL(window.location.href);
    currentLang.value = getLangFromUrl(currentUrl); // Update currentLang reactively
    translate = useTranslate(currentLang.value );
})
watchEffect(() => {
    currentUrl = new URL(window.location.href);
    currentLang.value = getLangFromUrl(currentUrl); // Update currentLang reactively
    translate = useTranslate(currentLang.value as Languages);
});
</script>

<template>
    <footer
        class="w-full mt-18 pt-6 pb-8 max-w-4xl text-sm flex flex-col gap-4 border-main border-t !border-op-50 text-dark dark:text-white print:static print:bottom-0 important:print:w-full important:print:p-0 important:print:m-0">
        <div v-if="siteConfig.footer.navLinks && siteConfig.footer.navLinks.length > 0"
            class="flex flex-wrap gap-4 align-center justify-center print:hidden">
            <template v-for="(link, index) in siteConfig.footer.navLinks" :key="link.text">
                <span v-if="index > 0" op-70>|</span>
                <a :aria-label="`${link.text}`" :target="getLinkTarget(link.href)" class="nav-link flex items-center"
                    :href="translatePath(link.href, currentLang)" data-astro-prefetch>
                    {{ translate(link.text) }}
                </a>

            </template>
        </div>
        <div flex align-center justify-between>
            <a nav-link href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank">CC BY-NC-SA 4.0</a>
            <span op-70>&nbsp;&nbsp;&copy;&nbsp;&nbsp;{{ new Date().getFullYear() }}&nbsp;&nbsp;{{ siteConfig.author
                }}.</span>
        </div>
    </footer>
</template>
