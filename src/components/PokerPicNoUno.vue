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
</script>

<template>
    <span class="outer-span">
        <span class="inner-span">
            <img :src="props.src" :alt="props.alt" class="image" />
        </span>
    </span>
</template>

<style scoped>
.outer-span {
    background-color: #380541;
    border-radius: 50%;
    padding: 4px;
    display: inline-block;
}

.inner-span {
    aspect-ratio: 1 / 1;
    position: relative;
    display: inline-block;
    border-radius: 50%;
    overflow: hidden;
    border: 18px dashed #ffffff;
}

.inner-span::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 6px solid #ffffff;
    z-index: 1;
}

.inner-span::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 4px solid #380541;
    z-index: 1;
}

.image {
    margin: 0 !important;
    width: 100%;
    height: 100%;
    border-radius: 50%;
}
</style>