<script setup lang="ts">
import type { Article, Paginated } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const siteOrigin = usePublicSiteOrigin()
const { request } = usePublicApi()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const query = computed(() => ({ page: page.value, pageSize: 12 }))
const { data: result, pending, error } = await useAsyncData(() => `public:articles:${page.value}`, () => request<Paginated<Article>>('/api/public/articles', { query: query.value }), { watch: [query] })
const canonical = computed(() => new URL('/news', siteOrigin.value).toString())
useSeoMeta({
  title: '新闻资讯',
  description: '关注南阳市吴月商贸行的公司动态与行业资讯。',
  ogTitle: '新闻资讯',
  ogDescription: '关注南阳市吴月商贸行的公司动态与行业资讯。',
  ogUrl: canonical,
  twitterTitle: '新闻资讯',
  twitterDescription: '关注南阳市吴月商贸行的公司动态与行业资讯。'
})
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))

function go(pageNumber: number) {
  return router.push({ query: pageNumber > 1 ? { page: pageNumber } : {} })
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20">
    <SectionHeading
      eyebrow="新闻资讯"
      title="关注公司动态与行业资讯"
      description="及时了解最新动态、服务信息与行业观察。"
    />
    <SiteLoadState
      class="mt-10"
      :pending="pending"
      :error="error"
    />
    <template v-if="result && !pending && !error">
      <div
        v-if="result.items.length"
        class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <ArticleCard
          v-for="article in result.items"
          :key="article.id"
          :article="article"
        />
      </div><SiteEmptyState
        v-else
        class="mt-10"
        title="暂无新闻资讯"
      /><nav
        v-if="result.pagination.totalPages > 1"
        class="mt-10 flex items-center justify-center gap-3"
        aria-label="新闻分页"
      >
        <UButton
          label="上一页"
          color="neutral"
          variant="soft"
          :disabled="page <= 1"
          @click="go(page - 1)"
        /><span class="text-sm text-dimmed">第 {{ result.pagination.page }} / {{ result.pagination.totalPages }} 页</span><UButton
          label="下一页"
          color="neutral"
          variant="soft"
          :disabled="page >= result.pagination.totalPages"
          @click="go(page + 1)"
        />
      </nav>
    </template>
  </div>
</template>
