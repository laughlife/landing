<script setup lang="ts">
import type { Paginated, Partner } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const { request } = usePublicApi()
const siteOrigin = usePublicSiteOrigin()
const { data: result, pending, error } = await useAsyncData('public:partners', () => request<Paginated<Partner>>('/api/public/partners', { query: { page: 1, pageSize: 100 } }))
const partners = computed(() => result.value?.items ?? [])
const canonical = computed(() => new URL('/partners', siteOrigin.value).toString())
useSeoMeta({ title: '合作伙伴', description: '了解南阳市吴月商贸行的合作伙伴与合作类型。', ogUrl: canonical })
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20">
    <SectionHeading
      eyebrow="合作伙伴"
      title="与优秀伙伴共建长期价值"
      description="我们珍视每一段合作关系，也期待与更多伙伴建立互信协作。"
    />
    <SiteLoadState
      class="mt-10"
      :pending="pending"
      :error="error"
    />
    <div
      v-if="partners.length && !pending && !error"
      class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <PartnerCard
        v-for="partner in partners"
        :key="partner.id"
        :partner="partner"
      />
    </div>
    <SiteEmptyState
      v-else-if="result && !pending && !error"
      class="mt-10"
      title="合作伙伴信息正在更新"
    />
  </div>
</template>
