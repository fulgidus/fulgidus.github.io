<template>
    <div class="language-dropdown">
        <button @click="toggleDropdown" class="dropdown-toggle flex items-center justify-between gap-1"
            :aria-label="t('changeLanguage')">
            {{ ui[currentLang]?.flag }}<i i-ri-arrow-down-s-line />
        </button>
        <transition name="slide-fade">
            <ul v-if="isDropdownOpen" class="dropdown-menu bg-main">
                <li v-for="([lang, label]) in languages" :key="lang" class="dropdown-item">
                    <a :href="tp(url !== undefined ? sp(url.pathname) : '/', lang)" nav-link p-2 flex items-center justify-between gap-2
                        @click="changeLanguage(lang)">
                        <span class="flag-icon" v-if="ui[lang]?.flag">{{ui[lang].flag}}</span>
                        {{ label }}
                    </a>
                </li>
            </ul>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watchEffect, onMounted } from 'vue';
import { getLangFromUrl, useTranslations, useTranslatedPath, useStripLangFromPath } from '../i18n/utils';
import { defaultLang, ui } from '@/i18n/ui';


const isDropdownOpen = ref(false);
const currentLang = ref(defaultLang);
let url: URL | undefined
let t: (key: string) => string // Simplified type
let tp: (path: string, lang?: string) => string // Simplified type
let sp: (path: string, lang?: string) => string // Simplified type



onMounted(() => {
    url = new URL(window.location.href);
    currentLang.value = getLangFromUrl(url); // Update currentLang reactively
    t = useTranslations(currentLang.value as keyof typeof ui);
    console.log(`LangDropdown onMounted currentLang: ${currentLang.value}`)
    tp = useTranslatedPath(currentLang.value as keyof typeof ui);
    sp = useStripLangFromPath(currentLang.value as keyof typeof ui);
})


// Watch currentLang for changes and update translations
watchEffect(() => {
    url = new URL(window.location.href);
    t = useTranslations(currentLang.value as keyof typeof ui);
    tp = useTranslatedPath(currentLang.value as keyof typeof ui);
    sp = useStripLangFromPath(currentLang.value as keyof typeof ui);

    console.log(`LangDropdown watchEffect currentLang: ${currentLang.value}
    url: ${url?.pathname}
    stripped: ${sp(url?.pathname)}
    translated to en: ${tp(url?.pathname, 'en')}
    translated to it: ${tp(url?.pathname, 'it')}
`)
});



// const currentLangLabel = computed(() => {
//     return ui[currentLang.value as keyof typeof ui]?.language || 'Language';
// });

const languages = computed(() => {
    const availableLanguages = Object.keys(ui) as (keyof typeof ui)[]
    return availableLanguages.map(lang => [lang, ui[lang].language])
});


const toggleDropdown = () => {
    isDropdownOpen.value = !isDropdownOpen.value;
};

const changeLanguage = (lang: string) => {
    currentLang.value = lang;
    isDropdownOpen.value = false;
    console.log(`LangDropdown changeLanguage currentLang: ${currentLang.value}`)

};
</script>


<style scoped>
.language-dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-toggle {
    /* existing styles */
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    border: 1px solid #ccc;
    /* Or your desired border */
    z-index: 10;
    list-style: none;
    text-wrap: nowrap;
    margin: 0;
}

.dropdown-item {
}

.slide-fade-enter-active {
    transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
    transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(-20px);
    opacity: 0;
}

</style>
