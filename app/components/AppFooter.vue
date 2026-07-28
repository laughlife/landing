<script setup lang="ts">
import type { SiteInfo } from '~/composables/usePublicApi'

withDefaults(defineProps<{ site?: SiteInfo | null }>(), {
  site: null
})

const links = [
  { label: '产品中心', to: '/products' },
  { label: '服务项目', to: '/services' },
  { label: '合作伙伴', to: '/partners' },
  { label: '联系我们', to: '/contact' }
]
</script>

<template>
  <UFooter
    :ui="{
      container: 'border-t border-default lg:py-8',
      right: 'gap-x-0 flex-wrap'
    }"
  >
    <template #left>
      <div class="text-sm text-dimmed">
        <p>
          {{ site?.footerText || site?.copyright || '南阳市吴月商贸行（个人独资）' }}
        </p>
        <p
          v-if="site?.icpNumber"
          class="mt-1"
        >
          {{ site.icpNumber }}
        </p>
      </div>
    </template>

    <template #right>
      <UButton
        v-for="link in links"
        :key="link.label"
        :label="link.label"
        :to="link.to"
        color="neutral"
        variant="link"
        class="font-normal"
        size="sm"
      />
    </template>
  </UFooter>
</template>
