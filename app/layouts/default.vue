<script setup lang="ts">
import type { SiteInfo } from '~/composables/usePublicApi'

const { request } = usePublicApi()
const { data: site } = await useAsyncData('public:site', () => request<SiteInfo | null>('/api/public/site'))
const fallbackImage = usePublicFallbackImage()
fallbackImage.value = site.value?.fallbackImage || PUBLIC_FALLBACK_IMAGE
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <AppHeader :site="site" />
    <UMain>
      <slot />
    </UMain>
    <AppFooter :site="site" />
  </div>
</template>
