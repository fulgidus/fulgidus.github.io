<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  emailEntities: {
    type: String,
    required: true,
  },
})

const decodedEmail = ref('')

onMounted(() => {
  const decoder = document.createElement('textarea')
  decoder.innerHTML = props.emailEntities
  decodedEmail.value = decoder.textContent.trim()
})
</script>

<template>
  <a v-if="decodedEmail" :href="`mailto:${decodedEmail}`"> <!-- Won't be decoded if the client doesn't actually have a document -->
    <slot>
      {{ decodedEmail }} <!-- Fallback for Vue.js component -->
    </slot>
  </a>
</template>
