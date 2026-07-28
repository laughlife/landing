<script setup lang="ts">
import type { ServiceItem } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const { request } = usePublicApi()
const siteOrigin = usePublicSiteOrigin()
const { data: services, pending, error } = await useAsyncData('public:services', () => request<ServiceItem[]>('/api/public/services'))
const canonical = computed(() => new URL('/services', siteOrigin.value).toString())
useSeoMeta({ title: '服务项目', description: '了解南阳市吴月商贸行提供的服务项目与合作流程。', ogTitle: '服务项目', ogDescription: '了解南阳市吴月商贸行提供的服务项目与合作流程。', ogUrl: canonical, twitterTitle: '服务项目', twitterDescription: '了解南阳市吴月商贸行提供的服务项目与合作流程。' })
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20">
    <SectionHeading
      eyebrow="服务项目"
      title="以专业服务响应业务需求"
      description="从需求沟通到持续支持，为合作提供清晰、可靠的服务路径。"
    />
    <SiteLoadState
      class="mt-10"
      :pending="pending"
      :error="error"
    />
    <div
      v-if="services?.length && !pending && !error"
      class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ServiceCard
        v-for="service in services"
        :key="service.id"
        :service="service"
      />
    </div>
    <SiteEmptyState
      v-else-if="services && !pending && !error"
      class="mt-10"
      title="服务项目正在更新"
    />
  </div>
</template>
