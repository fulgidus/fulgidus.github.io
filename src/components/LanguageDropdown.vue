<template>
    <div class="language-dropdown">
        <button @click="toggleDropdown" class="dropdown-toggle flex items-center justify-between gap-1"
            :aria-label="translate('changeLanguage')">
            {{ ui[currentLang]?.flag }}<i i-ri-arrow-down-s-line />
        </button>
        <transition name="slide-fade">
            <ul v-if="isDropdownOpen" class="dropdown-menu bg-main">
                <li v-for="([lang, label]) in languages" :key="lang" class="dropdown-item">
                    <a v-if="ui[lang]?.disabled !== 'true'" :href="translatePath(url !== undefined ? stripLangFromPath(url.pathname) : '/', lang as Languages)" nav-link p-2 flex items-center justify-between gap-2
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
import { getLangFromUrl, stripLangFromPath, translatePath, useTranslate } from '../i18n/utils';
import { defaultLang, Languages, ui } from '@/i18n/ui';


const isDropdownOpen = ref(false);
const currentLang = ref(defaultLang);
let url: URL | undefined
let translate: (key: string) => string // Simplified type



onMounted(() => {
    url = new URL(window.location.href);
    currentLang.value = getLangFromUrl(url); // Update currentLang reactively
    translate = useTranslate(currentLang.value as Languages);
})


// Watch currentLang for changes and update translations
watchEffect(() => {
    url = new URL(window.location.href);
    translate = useTranslate(currentLang.value as Languages);
});



// const currentLangLabel = computed(() => {
//     return ui[currentLang.value as Languages]?.language || 'Language';
// });

const languages = computed(() => {
    const availableLanguages = Object.keys(ui) as Languages[]
    return availableLanguages.map(lang => [lang, ui[lang].language])
});


const toggleDropdown = () => {
    isDropdownOpen.value = !isDropdownOpen.value;
};

const changeLanguage = (lang: string) => {
    currentLang.value = lang;
    isDropdownOpen.value = false;
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
