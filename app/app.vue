<script setup lang="ts">
const colorMode = useColorMode()

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
  ogImage: '/wuyue.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtLayout>
    <UApp :toaster="{ expand: false }">
      <NuxtPage />
    </UApp>
  </NuxtLayout>
</template>
