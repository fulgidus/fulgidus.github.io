<!-- eslint-disable vue/multi-word-component-names -->
<script lang="ts" setup>
import { useEventListener, useWindowScroll } from '@vueuse/core'
import { computed, onMounted, ref, watchEffect, onBeforeMount } from 'vue'
import ThemeToggle from './ThemeToggle.vue'
import { getLinkTarget } from '@/utils/link'
import siteConfig from '@/site-config'
import { getLangFromUrl, useTranslate, translatePath, /* useStripLangFromPath */ } from '../i18n/utils';
import { defaultLang, Languages } from '@/i18n/ui'
import LanguageDropdown from './LanguageDropdown.vue'

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
// // Define languages
// const languages = computed(() => {
//     // Dynamically construct languages array based on available translations
//     const availableLanguages = Object.keys(ui) as (Languages)[]
//     return availableLanguages.map(lang => [lang, ui[lang].language])
// })

const navDrawerOpen = ref(false); // Reactive state for drawer visibility
const isHeaderHidden = ref(false); // Reactive state for header visibility
const previousScrollPosition = ref(0); // Store previous scroll position
const amAtTopScrollPosition = ref(true);

const { y: scroll } = useWindowScroll();

// Reactive language based on URL
const currentLang = ref(defaultLang);


let url: URL | undefined
let translate: (key: string) => string // Simplified type

onBeforeMount(()=> {
    const noJsHeader = document.getElementById('no-js-header')
    noJsHeader?.remove()
});

onMounted(() => {
    url = new URL(window.location.href);
    currentLang.value = getLangFromUrl(url); // Update currentLang reactively
    translate = useTranslate(currentLang.value as Languages);

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
    url = new URL(window.location.href);
    translate = useTranslate(currentLang.value as Languages);
});


function toggleNavDrawer() {
    navDrawerOpen.value = !navDrawerOpen.value;
}
</script>

<template>
    <Transition name="slide-fade">
        <header v-if="!isHeaderHidden" id="header" :class="{ 'header-bg-blur': scroll > 20, '!hidden': isHeaderHidden }"
            class="slide-fade !fixed bg-transparent z-899 w-screen h-20 px-6 flex justify-between items-center relative print:hidden">
            <div class="flex items-center h-full">
                <!-- Logo -->
                <a :href="translatePath(siteConfig.basePath, currentLang as Languages)" :aria-label="siteConfig.header.logo.alt"
                    class="mr-4 b-rd-full">
                    <img :src="siteConfig.header.logo.src" :alt="siteConfig.header.logo.alt"
                        class="h-12 aspect-ratio-square b-rd-full">
                </a>
                <!-- End of logo -->

                <!-- Navigation menu buttons -->
                <!-- Always visible on larger screens -->
                <nav aria-label="Menu navigation" class="sm:flex hidden flex-wrap gap-x-6 position-initial flex-row">
                    <a v-for="link in navLinks" :key="link.text" :aria-label="translate(link.text)"
                        :href="translatePath(link.href, currentLang as Languages)">
                        {{ translate(link.text) }}
                    </a>
                </nav>
                <!-- End of navigation menu buttons -->

                <!-- Hamburger menu button on smaller screens -->
                <div class="sm:hidden h-full flex items-center" @click="toggleNavDrawer">
                    <i i-ri-menu-2-line />
                </div>
                <!-- End of hamburger menu button on smaller screens -->
            </div>
            <div class="flex gap-x-3 flex-wrap items-center justify-end">
                <!-- Menu social links -->
                <a v-for="link in socialLinks" :key="link.text" :aria-label="`${link.text}`" :class="link.icon" nav-link
                    :target="getLinkTarget(link.href)" :href="link.href" />
                <!-- Language selection -->
                <LanguageDropdown />

                <a nav-link target="_blank" :href="translatePath('/rss.xml', currentLang as Languages)" i-ri-rss-line aria-label="RSS" />
                <ThemeToggle />
            </div>
        </header>
    </Transition>
    <Transition name="nav-drawer"> <!-- Add a transition -->
        <nav v-if="navDrawerOpen" class="nav-drawer bg-main gap-6 p-6 items-center justify-start w-auto" aria-label="menu navigation">
            <i i-ri-menu-2-fill @click="toggleNavDrawer" class="self-start"/>
            <a v-for="link in navLinks" :key="link.text" :aria-label="translate(link.text)"
                :href="translatePath(link.href, currentLang as Languages)" @click="toggleNavDrawer">
                {{ translate(link.text) }}
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
.dropdown-item {}

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
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: center;

    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    overflow-y: auto;
}

.nav-drawer-enter-active {
    transition: all 0.3s ease-out;
}

.nav-drawer-leave-active {
    transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.nav-drawer-enter-from,
.nav-drawer-leave-to {
    transform: translateX(-100%);
    opacity: 0;
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
