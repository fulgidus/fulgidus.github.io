<!-- eslint-disable vue/multi-word-component-names -->
<script lang="ts" setup>
import { useEventListener, useWindowScroll } from '@vueuse/core'
import { computed, onMounted, ref, watchEffect } from 'vue'
import ThemeToggle from './ThemeToggle.vue'
import { getLinkTarget } from '@/utils/link'
import siteConfig from '@/site-config'
import { getLangFromUrl, useTranslations, useTranslatedPath, useStripLangFromPath } from '../i18n/utils';
import { defaultLang, ui } from '@/i18n/ui'

const navLinks = siteConfig.header.navLinks || []

const socialLinks = computed(() => {
    return siteConfig.socialLinks.filter((link: Record<string, unknown>) => {
        if (link.header && typeof link.header === 'boolean') {
            return link
        }
        else if (link.header && typeof link.header === 'string') {
            link.icon = link.header.includes('i-') ? link.header : link.icon
            return link
        }
        else {
            return false
        }
    })
})
// Define languages
const languages = computed(() => {
    // Dynamically construct languages array based on available translations
    const availableLanguages = Object.keys(ui) as (keyof typeof ui)[]
    return availableLanguages.map(lang => [lang, ui[lang].language])
})

const navDrawerOpen = ref(false); // Reactive state for drawer visibility
const isHeaderHidden = ref(false); // Reactive state for header visibility
const previousScrollPosition = ref(0); // Store previous scroll position
const amAtTopScrollPosition = ref(true);

const { y: scroll } = useWindowScroll();

// Reactive language based on URL
const currentLang = ref(defaultLang);


let url: URL | undefined
let t: (key: string) => string // Simplified type
let tp: (path: string, lang?: string) => string // Simplified type
let sp: (path: string, lang?: string) => string // Simplified type

onMounted(() => {
    url = new URL(window.location.href);
    currentLang.value = getLangFromUrl(url); // Update currentLang reactively
    t = useTranslations(currentLang.value as keyof typeof ui);
    console.log(`Header onMounted currentLang: ${currentLang.value}`)
    tp = useTranslatedPath(currentLang.value as keyof typeof ui);
    sp = useStripLangFromPath(currentLang.value as keyof typeof ui);

    useEventListener('scroll', () => {
        const currentScrollPosition = scroll.value;
        amAtTopScrollPosition.value = currentScrollPosition === 0;
        const isScrollingDown = currentScrollPosition > previousScrollPosition.value;


        // Adjust threshold as needed
        if (isScrollingDown && currentScrollPosition > 150) {
            isHeaderHidden.value = true; // Hide when scrolling down
            navDrawerOpen.value = false; // Close drawer when scrolling down
        } else if (!isScrollingDown) { //Show when scrolling up and below threshold
            isHeaderHidden.value = false; // Show when scrolling up
            navDrawerOpen.value = false; // Close drawer when scrolling up
        }
        previousScrollPosition.value = currentScrollPosition;
    });
    // const navMask = document.querySelector('.nav-drawer-mask') as HTMLElement

    // navMask?.addEventListener('touchmove', (event) => {
    //     event.preventDefault()
    // })

    // const headerEl = document.querySelector('#header') as HTMLElement
    // if (!headerEl) {
    //     return
    // }

    // if (document.documentElement.scrollTop > 100) {
    //     headerEl.classList.add('header-bg-blur')
    // }

    // window.addEventListener('scroll', () => {
    //     if (scroll.value < 150) {
    //         headerEl.classList.remove('header-hide')
    //         return
    //     }

    //     if (scroll.value - oldScroll.value > 150) {
    //         headerEl.classList.add('header-hide')
    //         oldScroll.value = scroll.value
    //     }

    //     if (oldScroll.value - scroll.value > 150) {
    //         headerEl.classList.remove('header-hide')
    //         oldScroll.value = scroll.value
    //     }
    // })
})


// Watch currentLang for changes and update translations
watchEffect(() => {
    t = useTranslations(currentLang.value as keyof typeof ui);
    tp = useTranslatedPath(currentLang.value as keyof typeof ui);
    sp = useStripLangFromPath(currentLang.value as keyof typeof ui);

    console.log(`Header watchEffect currentLang: ${currentLang.value}`)
});


function toggleNavDrawer() {
    navDrawerOpen.value = !navDrawerOpen.value;
}
</script>

<template>
    <Transition name="slide-fade">
        <header v-if="!isHeaderHidden" id="header" :class="{ 'header-bg-blur': scroll > 20, '!hidden': isHeaderHidden }"
            class="!fixed bg-transparent z-899 w-screen h-20 px-6 flex justify-between items-center relative print:hidden">
            <div class="flex items-center h-full">
                <!-- Logo -->
                <a :href="tp(siteConfig.basePath)" aria-label="Header Logo Image" mr-6 b-rd-full>
                    <img :src="siteConfig.header.logo.src" :alt="siteConfig.header.logo.alt"
                        class="h-12 aspect-ratio-square b-rd-full">
                </a>
                <!-- End of logo -->

                <!-- Navigation menu buttons -->
                <!-- Always visible on larger screens -->
                <nav aria-label="menu navigation" class="sm:flex hidden flex-wrap gap-x-6 position-initial flex-row">
                    <a v-for="link in navLinks" :key="link.text" :aria-label="t(link.text)" :href="tp(link.href)">
                        {{ t(link.text) }}
                    </a>
                </nav>
                <!-- End of navigation menu buttons -->

                <!-- Hamburger menu button on smaller screens -->
                <div class="sm:hidden h-full flex items-center" @click="toggleNavDrawer">
                    <i i-ri-menu-2-line />
                </div>
                <!-- End of hamburger menu button on smaller screens -->
            </div>
            <div class="flex gap-x-6">
                <!-- Menu social links -->
                <a v-for="link in socialLinks" :key="link.text" :aria-label="`${link.text}`" :class="link.icon" nav-link
                    :target="getLinkTarget(link.href)" :href="link.href" />
                <!-- Language selection -->
                <a v-for="([lang, label]) in languages" :key="lang" :aria-label="`${label}`"
                    :class="{ 'underline font-bold' : lang === currentLang}"
                    :href="tp(url !== undefined ? sp(url.pathname) : '/', lang)" nav-link>{{label}}</a>

                <a nav-link target="_blank" href="/rss.xml" i-ri-rss-line aria-label="RSS" />
                <ThemeToggle />
            </div>
        </header>
    </Transition>
    <Transition name="nav-drawer"> <!-- Add a transition -->
        <nav v-if="navDrawerOpen" class="nav-drawer bg-white dark:bg-black" aria-label="menu navigation">
            <i i-ri-menu-2-fill @click="toggleNavDrawer" />
            <a v-for="link in navLinks" :key="link.text" :aria-label="t(link.text)" :href="tp(link.href)"
                @click="toggleNavDrawer">
                {{ t(link.text) }}-
            </a>
        </nav>
    </Transition>
    <Transition name="nav-drawer-mask"> <!-- Add a transition -->
        <div v-if="navDrawerOpen" class="nav-drawer-mask" @click="toggleNavDrawer" />
    </Transition>
</template>

<style scoped>
/* .nav-drawer {
    transform: translateX(-100%);
    --at-apply: box-border fixed h-screen z-999 left-0 top-0 min-w-32vw max-w-50vw bg-main p-6 text-lg flex flex-col gap-5 transition-all;
}

.nav-drawer-mask {
    display: none;
    --at-apply: transition-all;
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
} */
.slide-fade {
    --at-apply: transition-all;
    transition: all 0.3s ease-out;
    transform: translateY(0);
}

.slide-fade-enter-active {
    transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
    transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(-100%);
    opacity: 0;
}


.header-bg-blur {
    backdrop-filter: blur(5px);
    /* Add blur effect */
}



.nav-drawer {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    min-width: 32vw;
    max-width: 50vw;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: flex-start;
    gap: 16px;

    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    overflow-y: auto;
}

.nav-drawer-mask {
    display: block;
    --at-apply: transition-all;
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
}

.nav-drawer-mask-enter-active,
.nav-drawer-mask-leave-active {
    transition: display 0.3s ease-out;
}

.nav-drawer-mask-enter-from,
.nav-drawer-mask-leave-to {
    display: none;
}
</style>
