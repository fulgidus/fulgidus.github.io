<script setup lang="ts">
import { Languages } from "@/i18n/ui";
import {
    getLangFromUrl, useTranslate
} from "@/i18n/utils";

import { ref } from 'vue';

type Props = {
    id?: string;
    shareTitle: string;
};

const { id = "default-share-id", shareTitle } = defineProps<Props>();
// Dynamically construct languages array based on available translations
// const availableLanguages = Object.keys(ui) as (Languages)[];
// const languages = availableLanguages.map((lang) => [lang, ui[lang].language]);
const currentLang = getLangFromUrl(window.location.pathname);
const t = useTranslate(currentLang as Languages);

const isHidden = ref(true);

function toggleModal() {
    isHidden.value = !isHidden.value;
}

function shareOn(platform: string) {
    switch (platform) {
        case 'telegram':
            window.open(`https://t.me/share/url?url=${encodeURI(window.location.href)}&text=${encodeURI(shareTitle)}`, '_blank');
            break;
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURI(window.location.href)}&title=${encodeURI(window.location.href)}`, '_blank');
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?url=${encodeURI(window.location.href)}`, '_blank');
            break;
        case 'bluesky':
            window.open(`https://bsky.app/intent/compose?text=${encodeURI(shareTitle)}${encodeURI('\n')}${encodeURI(window.location.href)}`, '_blank');
            break;
        case 'mastodon':
            window.open(`https://mastodon.social/share?text=${encodeURI(window.location.href)}`, '_blank');
            break;
        case 'reddit':
            window.open(`https://www.reddit.com/submit?url=${encodeURI(window.location.href)}`, '_blank');
            break;
        case 'linkedin':
            window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURI(window.location.href)}`, '_blank');
            break;
        case 'email':
            window.open(`mailto:?subject=${encodeURI(shareTitle)}&body=${encodeURI(window.location.href)}`, '_blank');
            break;
        default:
            break;
    }
    isHidden.value = true;
}
function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    isHidden.value = true;
}
</script>

<template>
    <span class="flex flex-nowrap flex-row items-center justify-center sm-justify-start pos-relative gap-4 overflow-hidden mr-2 text-xl sm-text-base">
        <transition name="slide-right">
            <span v-if="isHidden" class="pos-relative h-6">
                <button @click.prevent="toggleModal"
                    class="flex flex-nowrap flex-row items-center justify-center pos-relative gap-4 overflow-hidden w-100% h-6"><i
                        i-ri-share-line />{{ t('sharePost.button')
                    }}</button>

                <span
                    class="flex flex-nowrap flex-row items-center content-center w-100% float-left invisible translate-y--100% h-6 gap-2 px-3">
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('telegram')"><i
                            i-ri-telegram-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('whatsapp')"><i
                            i-ri-whatsapp-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('reddit')"><i
                            i-ri-reddit-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('bluesky')"><i
                            i-ri-bluesky-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('twitter')"><i
                            i-ri-twitter-x-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('linkedin')"><i
                            i-ri-linkedin-box-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="shareOn('email')"><i
                            i-ri-mail-line /></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="copyLink"><i
                            i-ri-file-copy-line /><!-- {{t('sharePost.copy')}} --></button>
                    <button class="flex flex-nowrap items-center justify-center" @click="() => isHidden = true"><i
                            i-ri-close-circle-line /><!-- {{t('sharePost.copy')}} --></button>
                </span>
            </span>
        </transition>
        <transition name=" slide-left">
            <span v-if="!isHidden" :id="id" class=" flex flex-nowrap items-center justify-center gap-2 px-3 h-6">
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('telegram')"><i
                        i-ri-telegram-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('whatsapp')"><i
                        i-ri-whatsapp-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('reddit')"><i
                        i-ri-reddit-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('bluesky')"><i
                        i-ri-bluesky-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('twitter')"><i
                        i-ri-twitter-x-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('linkedin')"><i
                        i-ri-linkedin-box-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="shareOn('email')"><i
                        i-ri-mail-line /></button>
                <button class="flex flex-nowrap items-center justify-center" @click="copyLink"><i
                        i-ri-file-copy-line /><!-- {{t('sharePost.copy')}} --></button>
                <button class="flex flex-nowrap items-center justify-center" @click="() => isHidden = true"><i
                        i-ri-close-circle-line /><!-- {{t('sharePost.copy')}} --></button>
            </span>
        </transition>
    </span>
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
    transition: all .3s cubic-bezier(0.075, 0.82, 0.165, 1);

}

.slide-left-enter-from,
.slide-left-leave-to {
    transform: translateX(100%);
    opacity: 0;
}

.slide-left-enter-to,
.slide-left-leave-from {
    transform: translateX(0);
    opacity: 1;
}

.slide-right-enter-active,
.slide-right-leave-active {
    transition: all .3s cubic-bezier(0.075, 0.82, 0.165, 1);
    position: absolute;

}

.slide-right-enter-from,
.slide-right-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}

.slide-right-enter-to,
.slide-right-leave-from {
    transform: translateX(0);
    opacity: 1;
}
</style>
