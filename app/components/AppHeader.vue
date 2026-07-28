<script setup lang="ts">
import type { SiteInfo } from '~/composables/usePublicApi'

defineProps<{ site?: SiteInfo | null }>()

const colorMode = useColorMode()

const items = [
  { label: '首页', to: '/' },
  { label: '产品中心', to: '/products' },
  { label: '服务项目', to: '/services' },
  { label: '合作伙伴', to: '/partners' },
  { label: '公司介绍', to: '/about' },
  { label: '新闻资讯', to: '/news' },
  { label: '联系我们', to: '/contact' }
]

const isDark = computed(() => colorMode.value === 'dark')
const colorModeLabel = computed(() => isDark.value ? '切换为浅色模式' : '切换为深色模式')

function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <UHeader :ui="{ root: 'border-b border-default/70 bg-default/85 backdrop-blur-xl' }">
    <template #left>
      <NuxtLink
        to="/"
        class="flex items-center gap-3"
        aria-label="南阳市吴月商贸行首页"
      >
        <SiteImage
          :src="site?.logo"
          :alt="site?.siteName || '南阳市吴月商贸行'"
          class="size-9 shrink-0 rounded-md object-contain"
        />
        <span class="text-sm font-semibold tracking-wide sm:text-base">{{ site?.siteName || '南阳市吴月商贸行' }}</span>
      </NuxtLink>
    </template>

    <UNavigationMenu
      :items="items"
      variant="link"
      :ui="{ link: 'text-sm' }"
    />

    <template #right>
      <UButton
        :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
        :aria-label="colorModeLabel"
        color="neutral"
        variant="ghost"
        square
        @click="toggleColorMode"
      />
      <UButton
        label="咨询合作"
        to="/contact"
        color="primary"
        class="hidden sm:inline-flex"
      />
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
      />
      <div class="mt-4 flex items-center gap-2">
        <UButton
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          :label="colorModeLabel"
          color="neutral"
          variant="soft"
          class="flex-1"
          @click="toggleColorMode"
        />
        <UButton
          label="咨询合作"
          to="/contact"
          class="flex-1"
        />
      </div>
    </template>
  </UHeader>
</template>
