<script setup lang="ts">
/* eslint-disable vue/no-v-html -- Rich text is sanitized by the public API before rendering. */
import type { Article } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteOrigin = usePublicSiteOrigin()
const { request } = usePublicApi()
const slug = computed(() => String(route.params.slug))
const { data: article } = await useAsyncData(() => `public:article:${slug.value}`, () => request<Article>(`/api/public/articles/${encodeURIComponent(slug.value)}`), { watch: [slug] })
if (!article.value) throw createError({ statusCode: 404, statusMessage: '文章不存在' })
const canonical = computed(() => new URL(route.path, siteOrigin.value).toString())
const title = computed(() => article.value?.seoTitle || article.value?.title || '新闻资讯')
const description = computed(() => article.value?.seoDescription || article.value?.summary || '')
useSeoMeta({
  title,
  description,
  keywords: computed(() => article.value?.seoKeywords),
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogImage: computed(() => article.value?.coverImage),
  articlePublishedTime: computed(() => article.value?.publishedAt),
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: computed(() => article.value?.coverImage)
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: article.value
    ? [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          'headline': article.value.title,
          'description': description.value,
          'image': article.value.coverImage ? [new URL(article.value.coverImage, siteOrigin.value).toString()] : undefined,
          'datePublished': article.value.publishedAt,
          'author': article.value.author ? { '@type': 'Person', 'name': article.value.author } : undefined
        })
      }, {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': new URL('/', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 2, 'name': '新闻资讯', 'item': new URL('/news', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 3, 'name': article.value.title, 'item': canonical.value }
          ]
        })
      }]
    : []
}))
</script>

<template>
  <article
    v-if="article"
    class="mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-16"
  >
    <nav
      class="mb-8 flex items-center gap-2 text-sm text-dimmed"
      aria-label="面包屑"
    >
      <NuxtLink to="/">首页</NuxtLink><UIcon
        name="i-lucide-chevron-right"
        class="size-4"
      /><NuxtLink to="/news">新闻资讯</NuxtLink>
    </nav>
    <p
      v-if="article.publishedAt"
      class="text-sm text-primary"
    >
      <time :datetime="article.publishedAt">{{ new Date(article.publishedAt).toLocaleDateString('zh-CN') }}</time><span v-if="article.author"> · {{ article.author }}</span>
    </p>
    <h1 class="mt-4 text-3xl font-semibold tracking-tight text-highlighted sm:text-5xl">
      {{ article.title }}
    </h1>
    <p
      v-if="article.summary"
      class="mt-6 text-lg leading-8 text-toned"
    >
      {{ article.summary }}
    </p>
    <img
      v-if="article.coverImage"
      :src="article.coverImage"
      :alt="article.title"
      class="mt-10 aspect-[16/9] w-full rounded-2xl object-cover"
    >
    <!-- eslint-disable-next-line vue/no-v-html --><div
      v-if="article.content"
      class="rich-content mt-10 leading-8 text-toned"
      v-html="article.content"
    />
    <div class="mt-12 border-t border-default pt-6">
      <UButton
        label="返回新闻列表"
        to="/news"
        color="neutral"
        variant="soft"
        leading-icon="i-lucide-arrow-left"
      />
    </div>
    <section
      v-if="article.relatedArticles?.length"
      class="mt-16"
    >
      <SectionHeading
        eyebrow="推荐阅读"
        title="更多公司动态"
        align="left"
      />
      <div class="mt-8 grid gap-5 sm:grid-cols-2">
        <ArticleCard
          v-for="related in article.relatedArticles"
          :key="related.id"
          :article="related"
        />
      </div>
    </section>
  </article>
</template>
