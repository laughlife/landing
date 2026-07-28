<script setup lang="ts">
const colorMode = useColorMode()
const fallbackImage = usePublicFallbackImage()

const color = computed(() => colorMode.value === 'dark' ? '#111827' : '#ffffff')

useHead({
  htmlAttrs: { lang: 'zh-CN' },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [{ rel: 'icon', type: 'image/png', href: '/wuyue.png' }]
})

useSeoMeta({
  ogImage: computed(() => fallbackImage.value),
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp :toaster="{ expand: false }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
