<script setup lang="ts">
import type { Category } from '~/composables/usePublicApi'

const props = defineProps<{ category: Category }>()
const cardImage = computed(() => publicImageVariant(props.category.coverImage, 480))
</script>

<template>
  <NuxtLink
    :to="{ path: '/products', query: { category: category.slug } }"
    class="group block overflow-hidden rounded-2xl border border-default bg-elevated transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
  >
    <div class="relative aspect-[16/10] overflow-hidden bg-muted">
      <img
        v-if="category.coverImage"
        :src="cardImage"
        :alt="category.name"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        width="480"
        height="300"
      >
      <UIcon
        v-else
        :name="category.icon || 'i-lucide-boxes'"
        class="absolute inset-0 m-auto size-10 text-dimmed"
      />
    </div>
    <div class="p-5">
      <h3 class="font-semibold text-highlighted">{{ category.name }}</h3>
      <p
        v-if="category.summary"
        class="mt-2 line-clamp-2 text-sm leading-6 text-dimmed"
      >{{ category.summary }}</p>
      <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">查看产品 <UIcon
        name="i-lucide-arrow-up-right"
        class="size-4"
      /></span>
    </div>
  </NuxtLink>
</template>
