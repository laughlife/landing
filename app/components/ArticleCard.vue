<script setup lang="ts">
import type { Article } from '~/composables/usePublicApi'

const props = defineProps<{ article: Article }>()
const cardImage = computed(() => publicImageVariant(props.article.coverImage, 480))
</script>

<template>
  <NuxtLink
    :to="`/news/${article.slug}`"
    class="group block overflow-hidden rounded-2xl border border-default bg-elevated transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
  >
    <div class="relative aspect-[16/9] overflow-hidden bg-muted">
      <img
        v-if="article.coverImage"
        :src="cardImage"
        :alt="article.title"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        width="480"
        height="270"
      >
      <UIcon
        v-else
        name="i-lucide-newspaper"
        class="absolute inset-0 m-auto size-10 text-dimmed"
      />
    </div>
    <div class="p-5">
      <time
        v-if="article.publishedAt"
        :datetime="article.publishedAt"
        class="text-xs text-dimmed"
      >{{ new Date(article.publishedAt).toLocaleDateString('zh-CN') }}</time>
      <h3 class="mt-2 line-clamp-2 font-semibold text-highlighted">{{ article.title }}</h3>
      <p
        v-if="article.summary"
        class="mt-2 line-clamp-2 text-sm leading-6 text-dimmed"
      >{{ article.summary }}</p>
    </div>
  </NuxtLink>
</template>
