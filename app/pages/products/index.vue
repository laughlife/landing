<script setup lang="ts">
import type { Category, Paginated, Product } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const siteOrigin = usePublicSiteOrigin()
const { request } = usePublicApi()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const keyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword : '')
const category = computed(() => typeof route.query.category === 'string' ? route.query.category : '')
const sort = computed(() => typeof route.query.sort === 'string' ? route.query.sort : 'latest')
const searchInput = ref(keyword.value)
const query = computed(() => ({ page: page.value, pageSize: 12, keyword: keyword.value || undefined, category: category.value || undefined, sortBy: sort.value }))

const { data: categories } = await useAsyncData('public:categories', () => request<Category[]>('/api/public/categories'))
const { data: result, pending, error } = await useAsyncData(() => `public:products:${JSON.stringify(query.value)}`, () => request<Paginated<Product>>('/api/public/products', { query: query.value }), { watch: [query] })

const flattenedCategories = computed(() => {
  const flatten = (items: Category[], prefix = ''): Array<{ label: string, value: string }> => items.flatMap(item => [
    { label: `${prefix}${item.name}`, value: item.slug },
    ...flatten(item.children ?? [], `${prefix}— `)
  ])
  return flatten(categories.value ?? [])
})

const selectedCategory = computed(() => {
  const find = (items: Category[]): Category | undefined => {
    for (const item of items) {
      if (item.slug === category.value) return item
      const nested = find(item.children ?? [])
      if (nested) return nested
    }
  }
  return find(categories.value ?? [])
})
const canonical = computed(() => {
  const url = new URL('/products', siteOrigin.value)
  if (selectedCategory.value) url.searchParams.set('category', selectedCategory.value.slug)
  return url.toString()
})
const pageTitle = computed(() => selectedCategory.value?.seoTitle || (selectedCategory.value ? `${selectedCategory.value.name}产品` : '产品中心'))
const pageDescription = computed(() => selectedCategory.value?.seoDescription || selectedCategory.value?.summary || '浏览南阳市吴月商贸行已发布的产品信息。')
useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  keywords: computed(() => selectedCategory.value?.seoKeywords),
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogUrl: canonical,
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  robots: computed(() => keyword.value || page.value > 1 ? 'noindex,follow' : 'index,follow')
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: selectedCategory.value
    ? [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': new URL('/', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 2, 'name': '产品中心', 'item': new URL('/products', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 3, 'name': selectedCategory.value.name, 'item': canonical.value }
          ]
        })
      }]
    : []
}))

function replaceQuery(next: Record<string, string | number | undefined>) {
  const merged = { ...route.query, ...next }
  const cleaned = Object.fromEntries(Object.entries(merged).filter(([, value]) => Boolean(value)))
  return router.push({ query: cleaned })
}

function submitSearch() {
  return replaceQuery({ keyword: searchInput.value.trim() || undefined, page: undefined })
}

function changeCategory(event: Event) {
  return replaceQuery({ category: (event.target as HTMLSelectElement).value || undefined, page: undefined })
}

function changeSort(event: Event) {
  return replaceQuery({ sort: (event.target as HTMLSelectElement).value || undefined, page: undefined })
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20">
    <SectionHeading
      eyebrow="产品中心"
      title="产品信息与应用方案"
      description="通过分类、关键词和排序快速找到需要了解的产品。"
      align="left"
    />
    <div class="mt-10 rounded-2xl border border-default bg-elevated p-4 sm:p-5">
      <form
        class="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"
        @submit.prevent="submitSearch"
      >
        <input
          v-model="searchInput"
          type="search"
          aria-label="搜索产品"
          class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
          placeholder="搜索产品名称、型号或关键词"
        >
        <select
          :value="category"
          aria-label="筛选产品分类"
          class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
          @change="changeCategory"
        >
          <option value="">
            全部分类
          </option><option
            v-for="item in flattenedCategories"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select>
        <select
          :value="sort"
          aria-label="产品排序"
          class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
          @change="changeSort"
        >
          <option value="latest">
            最新发布
          </option><option value="sortOrder">
            默认排序
          </option><option value="name">
            名称排序
          </option>
        </select>
        <UButton
          type="submit"
          label="搜索"
          icon="i-lucide-search"
        />
      </form>
    </div>

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
        <ProductCard
          v-for="product in result.items"
          :key="product.id"
          :product="product"
        />
      </div>
      <SiteEmptyState
        v-else
        class="mt-10"
        title="未找到相关产品"
        description="请调整关键词或筛选条件后重试。"
        icon="i-lucide-search-x"
      />
      <nav
        v-if="result.pagination.totalPages > 1"
        class="mt-10 flex items-center justify-center gap-3"
        aria-label="产品分页"
      >
        <UButton
          label="上一页"
          color="neutral"
          variant="soft"
          :disabled="page <= 1"
          @click="replaceQuery({ page: page - 1 })"
        />
        <span class="text-sm text-dimmed">第 {{ result.pagination.page }} / {{ result.pagination.totalPages }} 页，共 {{ result.pagination.total }} 个产品</span>
        <UButton
          label="下一页"
          color="neutral"
          variant="soft"
          :disabled="page >= result.pagination.totalPages"
          @click="replaceQuery({ page: page + 1 })"
        />
      </nav>
    </template>
  </div>
</template>
